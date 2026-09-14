// supabase/functions/admin-users/index.ts
//
// Creating users, resetting a trainer's password and deactivating an account.
// The caller's own token is verified here and their role is read from the
// database — not from anything the browser sent. Hiding these buttons in the
// UI is presentation; this check is the actual control.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TRAINEE_DOMAIN = Deno.env.get("TRAINEE_EMAIL_DOMAIN") ?? "trainees.invalid";

const cors = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const randomPassword = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(24)))
    .map((b) => "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 55])
    .join("");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return json({ error: "Not signed in." }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  const { data: caller, error: authError } = await admin.auth.getUser(token);
  if (authError || !caller.user) return json({ error: "Session is not valid." }, 401);

  const { data: profile } = await admin
    .from("profiles").select("role, is_active").eq("id", caller.user.id).single();

  if (!profile?.is_active || profile.role !== "super_admin") {
    return json({ error: "Only the super admin can manage accounts." }, 403);
  }

  const body = await req.json().catch(() => ({}));
  const action = body.action as string;

  switch (action) {
    // ------------------------------------------------ create a trainer or admin
    case "create_staff": {
      const { email, full_name, role } = body;
      if (!email || !full_name || !["trainer", "super_admin"].includes(role)) {
        return json({ error: "Need an email, a name and a role of trainer or super_admin." }, 400);
      }
      const password = randomPassword();
      const { data: created, error } = await admin.auth.admin.createUser({
        email, password, email_confirm: true,
      });
      if (error) return json({ error: error.message }, 400);

      await admin.from("profiles").insert({
        id: created.user.id, role, full_name, email, created_by: caller.user.id,
      });
      // Returned once, shown once, never stored anywhere the browser can reach.
      return json({ user_id: created.user.id, email, temporary_password: password });
    }

    // ------------------------------------------------ create a trainee
    case "create_trainee": {
      const { employee_id, full_name } = body;
      if (!employee_id || !full_name) {
        return json({ error: "Need an employee ID and a name." }, 400);
      }
      const auth_email = `${String(employee_id).trim().toLowerCase()}@${TRAINEE_DOMAIN}`;
      const password = randomPassword();

      const { data: created, error } = await admin.auth.admin.createUser({
        email: auth_email, password, email_confirm: true,
      });
      if (error) return json({ error: error.message }, 400);

      await admin.from("profiles").insert({
        id: created.user.id, role: "trainee", full_name,
        employee_id: String(employee_id).trim().toUpperCase(),
        created_by: caller.user.id,
      });
      // The trainee never learns this and never needs to. Nothing to reset.
      await admin.from("auth_secrets").insert({
        user_id: created.user.id, password, auth_email,
      });
      return json({ user_id: created.user.id, employee_id });
    }

    // ------------------------------------------------ reset a staff password
    case "reset_password": {
      const { user_id } = body;
      const { data: target } = await admin
        .from("profiles").select("role").eq("id", user_id).single();
      if (!target) return json({ error: "No such user." }, 404);
      if (target.role === "trainee") {
        return json({
          error: "Trainees do not have passwords. They sign in with their employee ID "
               + "and the batch code, so there is nothing to reset.",
        }, 400);
      }
      const password = randomPassword();
      const { error } = await admin.auth.admin.updateUserById(user_id, { password });
      if (error) return json({ error: error.message }, 400);
      return json({ temporary_password: password });
    }

    // ------------------------------------------------ deactivate
    // Never delete. The activity record is the point, and it has to stay
    // attributable after the person has left.
    case "set_active": {
      const { user_id, is_active } = body;
      const { error } = await admin
        .from("profiles").update({ is_active: !!is_active }).eq("id", user_id);
      if (error) return json({ error: error.message }, 400);
      return json({ user_id, is_active: !!is_active });
    }

    default:
      return json({ error: "Unknown action." }, 400);
  }
});
