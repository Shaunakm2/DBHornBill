-- =====================================================================
-- 0006_admin_fixes.sql
-- Two policy gaps that only appear once someone tries to administer the
-- system rather than work inside it.
--
-- 1. A trainer could not see a trainee who was not already on one of their
--    batches — which is every trainee they are about to add. The "people
--    you share a batch with" rule is right for trainees and wrong for
--    staff, who need a roster to build a batch from.
--
-- 2. A trainer could create a batch and then could not add themselves to
--    it. batch_members required is_trainer_of(batch_id), which reads
--    batch_members, which was still empty. The batch was born orphaned.
--
-- Safe to run more than once: every policy is dropped by its own name before
-- being created, so a partial run can simply be repeated.
-- =====================================================================

-- ---------------------------------------------------------------- profiles
drop policy if exists profiles_self on profiles;
drop policy if exists profiles_read on profiles;

create policy profiles_read on profiles for select
  using (
    id = auth.uid()
    or app.is_super_admin()
    -- Staff see the whole roster, because that is what assigning people to
    -- a batch requires.
    or app.my_role() = 'trainer'
    -- Trainees see the people they share a desk with, and no further.
    or exists (select 1 from batch_members a
               join batch_members b on a.batch_id = b.batch_id
               where a.user_id = auth.uid() and b.user_id = profiles.id)
  );

-- ---------------------------------------------------------------- batches
-- Membership was the only way to see a batch, so a trainer could not read
-- the batch they had just created — which also made the membership check
-- below fail, because it reads batches. Creator access breaks the circle.
drop policy if exists batches_read on batches;

create policy batches_read on batches for select
  using ( app.is_super_admin()
          or created_by = auth.uid()
          or id in (select batch_id from app.my_batches()) );

drop policy if exists batches_update on batches;

create policy batches_update on batches for update
  using ( app.is_trainer_of(id) or created_by = auth.uid() )
  with check ( app.is_trainer_of(id) or created_by = auth.uid() );

-- ------------------------------------------------------------ batch_members
drop policy if exists bm_read on batch_members;

create policy bm_read on batch_members for select
  using ( app.is_member_of(batch_id)
          or exists (select 1 from batches
                     where id = batch_id and created_by = auth.uid()) );

drop policy if exists bm_write on batch_members;

create policy bm_write on batch_members for insert
  with check (
    app.batch_active(batch_id)
    and ( app.is_trainer_of(batch_id)
          -- The creator of a batch may staff it, including adding
          -- themselves as its trainer. Without this the first insert is
          -- impossible and every new batch is stranded.
          or exists (select 1 from batches
                     where id = batch_id and created_by = auth.uid()) )
  );

drop policy if exists bm_delete on batch_members;

create policy bm_delete on batch_members for delete
  using (
    app.batch_active(batch_id)
    and ( app.is_trainer_of(batch_id)
          or exists (select 1 from batches
                     where id = batch_id and created_by = auth.uid()) )
  );

-- ---------------------------------------------------------------- roster
-- What the administration screen lists. Runs as definer so a trainer gets
-- the roster without widening what a trainee can read.
create or replace function app.roster()
returns table (id uuid, role app_role, full_name text, employee_id text,
               email text, is_active boolean, batches bigint)
language sql stable security definer set search_path = public, app as $$
  select p.id, p.role, p.full_name, p.employee_id, p.email, p.is_active,
         (select count(*) from batch_members m where m.user_id = p.id)
  from profiles p
  where app.is_super_admin() or app.my_role() = 'trainer'
  order by p.role, p.full_name
$$;
revoke all on function app.roster() from public;
