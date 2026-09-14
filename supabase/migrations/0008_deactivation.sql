-- =====================================================================
-- 0008_deactivation.sql
--
-- Found by the smoke test: deactivating an account did not revoke anything.
--
-- app.my_role() and app.my_batches() both filtered on profiles.is_active, so
-- the two helpers that looked like the security boundary appeared correct.
-- But app.is_member_of() and app.is_trainer_of() read batch_members directly,
-- and every read and write policy goes through those. A trainee marked
-- inactive kept full access to the desk: the roster showed them as
-- deactivated while they carried on working.
--
-- The membership row is not the authority. The account is. One predicate now
-- decides it, and every helper consults it.
--
-- Safe to run more than once.
-- =====================================================================

create or replace function app.me_active() returns boolean
language sql stable security definer set search_path = public, app as $$
  select exists (select 1 from profiles
                 where id = auth.uid() and is_active)
$$;
comment on function app.me_active() is
  'Is the caller a live account? Deactivation has to be checked here rather '
  'than at each policy, because it is the one thing every policy shares.';

create or replace function app.is_super_admin() returns boolean
language sql stable security definer set search_path = public, app as $$
  select coalesce((select role = 'super_admin' from profiles
                   where id = auth.uid() and is_active), false)
$$;

create or replace function app.is_member_of(p_batch uuid) returns boolean
language sql stable security definer set search_path = public, app as $$
  select app.me_active()
     and ( app.is_super_admin()
           or exists (select 1 from batch_members
                      where batch_id = p_batch and user_id = auth.uid()) )
$$;

create or replace function app.is_trainer_of(p_batch uuid) returns boolean
language sql stable security definer set search_path = public, app as $$
  select app.me_active()
     and ( app.is_super_admin()
           or exists (select 1 from batch_members
                      where batch_id = p_batch and user_id = auth.uid()
                        and role_in_batch = 'trainer') )
$$;

-- Reading and writing both stop at a dead account, and so does anything that
-- keys off "a batch I belong to" — including the batch list itself, which is
-- what the application loads first.
create or replace function app.can_read(p_batch uuid, p_owner uuid) returns boolean
language sql stable security definer set search_path = public, app as $$
  select app.me_active()
     and ( app.is_super_admin()
           or ( app.is_member_of(p_batch)
                and ( app.batch_collaborative(p_batch)
                      or app.is_trainer_of(p_batch)
                      or p_owner = auth.uid() ) ) )
$$;

create or replace function app.can_write(p_batch uuid) returns boolean
language sql stable security definer set search_path = public, app as $$
  select app.me_active()
     and app.batch_active(p_batch)
     and ( app.is_super_admin() or app.is_member_of(p_batch) )
$$;

-- The batch list is read through a policy that calls my_batches(), which did
-- filter on is_active — but a creator clause was added in 0006 that did not.
drop policy if exists batches_read on batches;
create policy batches_read on batches for select
  using ( app.me_active()
          and ( app.is_super_admin()
                or created_by = auth.uid()
                or id in (select batch_id from app.my_batches()) ) );

-- Sign-in itself must refuse a dead account. app.trainee_login_lookup already
-- checks is_active for the trainee; nothing checked it for staff, who sign in
-- through Supabase auth directly. The profile lookup the client does on boot
-- is the place that catches it, and it needs a row it can act on.
create or replace function app.my_role() returns app_role
language sql stable security definer set search_path = public, app as $$
  select role from profiles where id = auth.uid() and is_active
$$;
