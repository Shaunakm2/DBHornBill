-- =====================================================================
-- 0011_login_fix.sql
--
-- Trainee sign-in failed with: column reference "batch_id" is ambiguous.
--
-- The function returns a table whose columns include batch_id and user_id.
-- Inside a plpgsql function those output columns are in scope as names, so
-- the membership check
--
--     where batch_id = v_batch and user_id = v_user
--
-- could mean either the column of batch_members or the function's own output
-- column. Postgres will not guess, and refuses at run time rather than when
-- the function is created — which is why every test passed and the one path
-- nobody had exercised end to end was the one that broke.
--
-- Aliasing the table settles it. The output columns are also renamed with an
-- o_ prefix so the same trap cannot be set again by a later edit.
--
-- Safe to run more than once.
-- =====================================================================

drop function if exists public.trainee_login_lookup(text,text);
drop function if exists app.trainee_login_lookup(text,text);

create or replace function app.trainee_login_lookup(p_employee_id text, p_join_code text)
returns table (o_auth_email text, o_password text, o_user_id uuid,
               o_batch_id uuid, o_batch_name text)
language plpgsql security definer set search_path = public, app as $$
declare v_user uuid; v_batch uuid; v_active boolean; v_status batch_status;
begin
  select p.id, p.is_active into v_user, v_active
    from profiles p
   where upper(p.employee_id) = upper(btrim(p_employee_id)) and p.role = 'trainee';
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

  -- Aliased. bm.batch_id is the table's column; batch_id on its own would
  -- also match this function's output column, which is what broke sign-in.
  if not exists (select 1 from batch_members bm
                 where bm.batch_id = v_batch
                   and bm.user_id = v_user
                   and bm.role_in_batch = 'trainee') then
    raise exception 'Your employee ID is not on that batch. Check the batch code.'
      using errcode = 'insufficient_privilege';
  end if;

  return query
    select s.auth_email, s.password, v_user, v_batch, b.name
      from auth_secrets s
      join batches b on b.id = v_batch
     where s.user_id = v_user;
end $$;
revoke all on function app.trainee_login_lookup(text,text) from public;

-- The Edge Function reads these by name, so the wrapper keeps the original
-- column names and the rename stays inside the implementation.
create or replace function public.trainee_login_lookup(p_employee_id text, p_join_code text)
returns table (auth_email text, password text, user_id uuid,
               batch_id uuid, batch_name text)
language sql security definer set search_path = public, app as $$
  select o_auth_email, o_password, o_user_id, o_batch_id, o_batch_name
    from app.trainee_login_lookup(p_employee_id, p_join_code)
$$;
revoke all on function public.trainee_login_lookup(text,text)
  from public, anon, authenticated;
grant execute on function public.trainee_login_lookup(text,text) to service_role;

comment on function public.trainee_login_lookup(text,text) is
  'Service role only. Returns a stored credential; any browser-facing grant '
  'on this function is a password disclosure.';
