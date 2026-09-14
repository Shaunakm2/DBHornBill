-- =====================================================================
-- 0007_public_api.sql
--
-- Everything callable was defined in schema app. The REST API only exposes
-- public, so every one of these returned 404 — the roster the Manage screen
-- reads, the function that moves a submission, the duplicate check, and the
-- lookup trainee sign-in depends on. The failures were silent in places
-- because a 404 arrives as an empty result rather than an error.
--
-- The implementations stay in app. These are thin wrappers in public: the
-- surface the API is allowed to see, with grants set one function at a time
-- rather than by exposing a whole schema.
--
-- Safe to run more than once.
-- =====================================================================

-- ---------------------------------------------------------------- roster
create or replace function public.roster()
returns table (id uuid, role app_role, full_name text, employee_id text,
               email text, is_active boolean, batches bigint)
language sql stable security definer set search_path = public, app as $$
  select * from app.roster()
$$;
revoke all on function public.roster() from public, anon;
grant execute on function public.roster() to authenticated;

-- ------------------------------------------------------- advance_submission
create or replace function public.advance_submission(
  p_id uuid, p_to text, p_version int,
  p_summary text default null, p_rejection_code text default null,
  p_rejection_stage text default null, p_rejection_note text default null)
returns submissions
language sql security definer set search_path = public, app as $$
  select app.advance_submission(p_id, p_to, p_version, p_summary,
                                p_rejection_code, p_rejection_stage, p_rejection_note)
$$;
revoke all on function public.advance_submission(uuid,text,int,text,text,text,text)
  from public, anon;
grant execute on function public.advance_submission(uuid,text,int,text,text,text,text)
  to authenticated;

-- ------------------------------------------------------ existing_submission
create or replace function public.existing_submission(p_job uuid, p_candidate uuid)
returns table (owner_name text, status_label text, submitted timestamptz)
language sql stable security definer set search_path = public, app as $$
  select * from app.existing_submission(p_job, p_candidate)
$$;
revoke all on function public.existing_submission(uuid,uuid) from public, anon;
grant execute on function public.existing_submission(uuid,uuid) to authenticated;

-- ----------------------------------------------------- candidate_duplicates
create or replace function public.candidate_duplicates(
  p_batch uuid, p_email text, p_phone text, p_name text)
returns table (id uuid, ref text, name text, owner_name text, matched_on text)
language sql stable security definer set search_path = public, app as $$
  select * from app.candidate_duplicates(p_batch, p_email, p_phone, p_name)
$$;
revoke all on function public.candidate_duplicates(uuid,text,text,text) from public, anon;
grant execute on function public.candidate_duplicates(uuid,text,text,text) to authenticated;

-- --------------------------------------------------- trainee_login_lookup
-- This one returns a stored credential. It is called only by the
-- trainee-login Edge Function using the service key, and no browser role may
-- execute it: anon or authenticated access here would hand out passwords.
create or replace function public.trainee_login_lookup(p_employee_id text, p_join_code text)
returns table (auth_email text, password text, user_id uuid, batch_id uuid, batch_name text)
language sql security definer set search_path = public, app as $$
  select * from app.trainee_login_lookup(p_employee_id, p_join_code)
$$;
revoke all on function public.trainee_login_lookup(text,text)
  from public, anon, authenticated;
grant execute on function public.trainee_login_lookup(text,text) to service_role;

-- ---------------------------------------------------------- record_login
create or replace function public.record_login(p_user uuid, p_batch uuid)
returns void
language sql security definer set search_path = public, app as $$
  select app.record_login(p_user, p_batch)
$$;
revoke all on function public.record_login(uuid,uuid) from public, anon, authenticated;
grant execute on function public.record_login(uuid,uuid) to service_role;

comment on function public.trainee_login_lookup(text,text) is
  'Service role only. Returns a stored credential; any browser-facing grant '
  'on this function is a password disclosure.';
