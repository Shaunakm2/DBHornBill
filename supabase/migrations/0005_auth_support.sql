-- =====================================================================
-- 0005_auth_support.sql
-- What makes "employee ID + batch code, no password" work without
-- weakening anything.
--
-- The trainee never has a password and never sets one, so there is nothing
-- for the super admin to reset — which was the requirement. Behind that,
-- every trainee is still an ordinary Supabase account with an ordinary
-- random password, so row-level security has a real identity to act on.
-- The password is generated at account creation, stored here, and read
-- only by the trainee-login Edge Function using the service_role key.
-- =====================================================================

create table auth_secrets (
  user_id  uuid primary key references profiles(id) on delete cascade,
  password text not null,
  auth_email text not null,
  created_at timestamptz not null default now()
);
alter table auth_secrets enable row level security;
-- Deliberately no policies. Row-level security with no policy denies every
-- client. Only the service_role key, which never leaves an Edge Function,
-- can read this table.

comment on table auth_secrets is
  'Machine-generated credentials for passwordless trainee sign-in. Never '
  'exposed to any browser. If this table is ever readable from the client, '
  'the deployment is misconfigured.';

-- Resolves the two fields a trainee types into an account, or explains why
-- it will not resolve. Runs as definer and is called only by the Edge
-- Function; the error text is written to be shown to a trainee as-is.
create or replace function app.trainee_login_lookup(p_employee_id text, p_join_code text)
returns table (auth_email text, password text, user_id uuid, batch_id uuid, batch_name text)
language plpgsql security definer set search_path = public, app as $$
declare v_user uuid; v_batch uuid; v_active boolean; v_status batch_status;
begin
  select id, is_active into v_user, v_active
    from profiles
   where upper(employee_id) = upper(btrim(p_employee_id)) and role = 'trainee';
  if v_user is null then
    raise exception 'That employee ID is not registered. Check it with your trainer.'
      using errcode = 'no_data_found';
  end if;
  if not v_active then
    raise exception 'That account has been deactivated. Speak to your trainer.'
      using errcode = 'insufficient_privilege';
  end if;

  select b.id, b.status into v_batch, v_status
    from batches b where upper(b.join_code) = upper(btrim(p_join_code));
  if v_batch is null then
    raise exception 'That batch code does not exist. Check the code on the board.'
      using errcode = 'no_data_found';
  end if;
  if v_status <> 'active' then
    raise exception 'That batch is closed.' using errcode = 'insufficient_privilege';
  end if;

  if not exists (select 1 from batch_members
                 where batch_id = v_batch and user_id = v_user and role_in_batch = 'trainee') then
    raise exception 'Your employee ID is not on that batch. Check the batch code.'
      using errcode = 'insufficient_privilege';
  end if;

  return query
    select s.auth_email, s.password, v_user, v_batch, b.name
      from auth_secrets s, batches b
     where s.user_id = v_user and b.id = v_batch;
end $$;
revoke all on function app.trainee_login_lookup(text,text) from public;

-- Sign-in is itself a footprint. A trainee who has not logged in and one who
-- logged in and did nothing are different conversations at the debrief.
create or replace function app.record_login(p_user uuid, p_batch uuid)
returns void language sql security definer set search_path = public, app as $$
  insert into activity (batch_id, actor_id, verb, entity_type, entity_id)
  values (p_batch, p_user, 'signed_in', 'session', null)
$$;
revoke all on function app.record_login(uuid,uuid) from public;
