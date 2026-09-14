// supabase/functions/trainee-login/index.ts
//
// A trainee types an employee ID and a batch code. Nothing else. This
// function turns that into a real Supabase session, so every policy
// downstream is acting on a real identity rather than a shared anonymous one.
//
// The service_role key is read from the environment and never leaves this
// process. Nothing here is importable by the browser bundle.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY     = Deno.env.get("SUPABASE_ANON_KEY")!;

/* Origins are compared after normalising: a trailing slash on the secret is
   the commonest way this breaks, and the browser compares the header to the
   Origin byte for byte. Several origins may be listed, comma separated, so a
   staging copy or a local build can be allowed alongside the live site. */
const ALLOWED = (Deno.env.get("ALLOWED_ORIGIN") ?? "*")
  .split(",")
  .map((o) => o.trim().replace(/\/+$/, "").toLowerCase())
  .filter(Boolean);

function corsFor(req: Request): Record<string, string> {
  const origin = (req.headers.get("Origin") ?? "").replace(/\/+$/, "");
  const allow = ALLOWED.includes("*")
    ? "*"
    : ALLOWED.includes(origin.toLowerCase())
      ? origin                       // echo it back exactly as sent
      : ALLOWED[0] ?? "";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}


let cors: Record<string, string> = {};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

// Crude but sufficient: a batch code is public on a whiteboard, so the pair
// is guessable by brute force if nothing slows it down. Per-IP, in memory,
// resets when the function goes cold. Enough to stop a script, not a state.
const attempts = new Map<string, { n: number; until: number }>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const rec = attempts.get(ip);
  if (rec && rec.until > now && rec.n >= 10) return true;
  if (!rec || rec.until <= now) attempts.set(ip, { n: 1, until: now + 60_000 });
  else rec.n++;
  return false;
}

Deno.serve(async (req) => {
  cors = corsFor(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (rateLimited(ip)) {
    return json({ error: "Too many attempts. Wait a minute and try again." }, 429);
  }

  let employee_id = "", batch_code = "";
  try {
    ({ employee_id = "", batch_code = "" } = await req.json());
  } catch {
    return json({ error: "Malformed request." }, 400);
  }
  if (!employee_id.trim() || !batch_code.trim()) {
    return json({ error: "Enter both your employee ID and the batch code." }, 400);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  const { data, error } = await admin.rpc("trainee_login_lookup", {
    p_employee_id: employee_id,
    p_join_code: batch_code,
  });

  // The database writes these messages so the trainee sees one sentence that
  // tells them what to fix, rather than a generic failure.
  if (error) return json({ error: error.message }, 401);
  if (!data || data.length === 0) {
    return json({ error: "That employee ID and batch code do not match." }, 401);
  }

  const row = data[0];

  const pub = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { data: session, error: signInError } = await pub.auth.signInWithPassword({
    email: row.auth_email,
    password: row.password,
  });
  if (signInError || !session.session) {
    return json({ error: "Sign-in failed. Ask your trainer to check the account." }, 401);
  }

  await admin.rpc("record_login", { p_user: row.user_id, p_batch: row.batch_id });

  return json({
    session: session.session,
    batch: { id: row.batch_id, name: row.batch_name },
  });
});
