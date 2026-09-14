-- =====================================================================
-- 0002_rls.sql
-- Helpers and row-level security.
--
-- The helpers are SECURITY DEFINER with a pinned search_path. That is
-- deliberate: a policy on batch_members that queries batch_members would
-- recurse. Reading membership through a definer function breaks the loop
-- and is the standard Supabase pattern.
--
-- Read rule, in one sentence: you see a row if it is in a batch you belong
-- to, and either the batch is collaborative, or you are a trainer of it,
-- or you made the row.
--
-- Write rule: the same, plus the batch must still be active. Archiving is
-- therefore enforced by the database, not by hiding buttons.
-- =====================================================================

-- ---------------------------------------------------------------- helpers
create or replace function app.uid() returns uuid
language sql stable as $$ select auth.uid() $$;

create or replace function app.my_role() returns app_role
language sql stable security definer set search_path = public, app as $$
  select role from profiles where id = auth.uid() and is_active
$$;

create or replace function app.is_super_admin() returns boolean
language sql stable security definer set search_path = public, app as $$
  select coalesce((select role = 'super_admin' from profiles
                   where id = auth.uid() and is_active), false)
$$;

create or replace function app.my_batches() returns table (batch_id uuid)
language sql stable security definer set search_path = public, app as $$
  select bm.batch_id from batch_members bm
  join profiles p on p.id = bm.user_id and p.is_active
  where bm.user_id = auth.uid()
$$;

create or replace function app.is_member_of(p_batch uuid) returns boolean
language sql stable security definer set search_path = public, app as $$
  select app.is_super_admin()
      or exists (select 1 from batch_members
                 where batch_id = p_batch and user_id = auth.uid())
$$;

create or replace function app.is_trainer_of(p_batch uuid) returns boolean
language sql stable security definer set search_path = public, app as $$
  select app.is_super_admin()
      or exists (select 1 from batch_members
                 where batch_id = p_batch and user_id = auth.uid()
                   and role_in_batch = 'trainer')
$$;

create or replace function app.batch_active(p_batch uuid) returns boolean
language sql stable security definer set search_path = public, app as $$
  select exists (select 1 from batches where id = p_batch and status = 'active')
$$;

create or replace function app.batch_collaborative(p_batch uuid) returns boolean
language sql stable security definer set search_path = public, app as $$
  select exists (select 1 from batches where id = p_batch and mode = 'collaborative')
$$;

-- The single read predicate every domain table uses.
create or replace function app.can_read(p_batch uuid, p_owner uuid) returns boolean
language sql stable security definer set search_path = public, app as $$
  select app.is_super_admin()
      or ( app.is_member_of(p_batch)
           and ( app.batch_collaborative(p_batch)
                 or app.is_trainer_of(p_batch)
                 or p_owner = auth.uid() ) )
$$;

-- The single write predicate. Note the batch_active() term.
create or replace function app.can_write(p_batch uuid) returns boolean
language sql stable security definer set search_path = public, app as $$
  select app.batch_active(p_batch)
     and ( app.is_super_admin() or app.is_member_of(p_batch) )
$$;

-- ---------------------------------------------------------------- enable RLS
alter table profiles              enable row level security;
alter table batches               enable row level security;
alter table batch_members         enable row level security;
alter table companies             enable row level security;
alter table contacts              enable row level security;
alter table job_orders            enable row level security;
alter table job_assignments       enable row level security;
alter table candidates            enable row level security;
alter table submissions           enable row level security;
alter table sub_messages          enable row level security;
alter table notes                 enable row level security;
alter table notifications         enable row level security;
alter table activity              enable row level security;
alter table submission_statuses   enable row level security;
alter table submission_transitions enable row level security;
alter table rejection_reasons     enable row level security;
alter table note_actions          enable row level security;
alter table candidate_sources     enable row level security;

-- Reference data is readable by anyone signed in and writable by no one
-- through the API. Changing a picklist is a migration or an admin function.
create policy ref_read on submission_statuses    for select using (auth.uid() is not null);
create policy ref_read on submission_transitions for select using (auth.uid() is not null);
create policy ref_read on rejection_reasons      for select using (auth.uid() is not null);
create policy ref_read on note_actions           for select using (auth.uid() is not null);
create policy ref_read on candidate_sources      for select using (auth.uid() is not null);

-- ---------------------------------------------------------------- profiles
-- You always see yourself. You see people you share a batch with, because a
-- shared desk needs to show who owns what. Nobody writes profiles through
-- the API: creation, deactivation and rename go through the admin function.
create policy profiles_self on profiles for select
  using ( id = auth.uid() or app.is_super_admin()
          or exists (select 1 from batch_members a
                     join batch_members b on a.batch_id = b.batch_id
                     where a.user_id = auth.uid() and b.user_id = profiles.id) );

-- ---------------------------------------------------------------- batches
create policy batches_read on batches for select
  using ( app.is_super_admin() or id in (select batch_id from app.my_batches()) );

create policy batches_insert on batches for insert
  with check ( app.my_role() in ('trainer','super_admin')
               and created_by = auth.uid() );

-- A trainer may edit and archive their own batch. Nobody deletes one.
create policy batches_update on batches for update
  using ( app.is_trainer_of(id) ) with check ( app.is_trainer_of(id) );

create policy bm_read on batch_members for select
  using ( app.is_member_of(batch_id) );
create policy bm_write on batch_members for insert
  with check ( app.is_trainer_of(batch_id) and app.batch_active(batch_id) );
create policy bm_delete on batch_members for delete
  using ( app.is_trainer_of(batch_id) and app.batch_active(batch_id) );

-- ---------------------------------------------------------------- desk tables
-- Companies, contacts and job orders are the trainer's to create. Trainees
-- read them and work them; they do not invent their own clients.
create policy co_read on companies for select using ( app.can_read(batch_id, created_by) );
create policy co_ins  on companies for insert with check ( app.is_trainer_of(batch_id) and app.batch_active(batch_id) );
create policy co_upd  on companies for update using ( app.is_trainer_of(batch_id) and app.batch_active(batch_id) )
                                         with check ( app.is_trainer_of(batch_id) );

create policy ct_read on contacts for select using ( app.can_read(batch_id, created_by) );
create policy ct_ins  on contacts for insert with check ( app.is_trainer_of(batch_id) and app.batch_active(batch_id) );
create policy ct_upd  on contacts for update using ( app.is_trainer_of(batch_id) and app.batch_active(batch_id) )
                                        with check ( app.is_trainer_of(batch_id) );

create policy jo_read on job_orders for select using ( app.can_read(batch_id, created_by) );
create policy jo_ins  on job_orders for insert with check ( app.is_trainer_of(batch_id) and app.batch_active(batch_id) );
create policy jo_upd  on job_orders for update using ( app.is_trainer_of(batch_id) and app.batch_active(batch_id) )
                                          with check ( app.is_trainer_of(batch_id) );

create policy ja_read on job_assignments for select
  using ( exists (select 1 from job_orders j where j.id = job_id and app.is_member_of(j.batch_id)) );
create policy ja_write on job_assignments for insert
  with check ( exists (select 1 from job_orders j where j.id = job_id
                       and app.is_trainer_of(j.batch_id) and app.batch_active(j.batch_id)) );
create policy ja_delete on job_assignments for delete
  using ( exists (select 1 from job_orders j where j.id = job_id
                  and app.is_trainer_of(j.batch_id) and app.batch_active(j.batch_id)) );

-- ---------------------------------------------------------------- candidates
-- Any batch member may add a candidate and any member may edit one, which is
-- how a shared database actually behaves. updated_by and activity carry the
-- attribution, and the version column stops one person silently overwriting
-- another's edit.
create policy cd_read on candidates for select using ( app.can_read(batch_id, created_by) );
create policy cd_ins  on candidates for insert with check ( app.can_write(batch_id) and created_by = auth.uid() );
create policy cd_upd  on candidates for update using ( app.can_write(batch_id) )
                                          with check ( app.can_write(batch_id) );

-- ---------------------------------------------------------------- submissions
-- A submission belongs to one trainee. Others in a collaborative batch can
-- see it — that is the point — but only the owner or a trainer may change it.
create policy sb_read on submissions for select using ( app.can_read(batch_id, owner_id) );
create policy sb_ins  on submissions for insert
  with check ( app.can_write(batch_id) and created_by = auth.uid()
               and ( owner_id = auth.uid() or app.is_trainer_of(batch_id) ) );
create policy sb_upd  on submissions for update
  using ( app.can_write(batch_id) and ( owner_id = auth.uid() or app.is_trainer_of(batch_id) ) )
  with check ( app.can_write(batch_id) );

create policy sm_read on sub_messages for select
  using ( exists (select 1 from submissions s where s.id = submission_id
                  and app.can_read(s.batch_id, s.owner_id)) );
create policy sm_ins on sub_messages for insert
  with check ( author_id = auth.uid()
               and exists (select 1 from submissions s where s.id = submission_id
                           and app.can_write(s.batch_id)
                           and ( s.owner_id = auth.uid() or app.is_trainer_of(s.batch_id) )) );
-- No update, no delete. The query thread is evidence.

-- ---------------------------------------------------------------- notes
create policy nt_read on notes for select using ( app.can_read(batch_id, author_id) );
create policy nt_ins  on notes for insert with check ( app.can_write(batch_id) and author_id = auth.uid() );
-- No update, no delete policy. Intentional.

-- ---------------------------------------------------------------- notifications
create policy nf_read on notifications for select using ( user_id = auth.uid() );
create policy nf_upd  on notifications for update using ( user_id = auth.uid() )
                                             with check ( user_id = auth.uid() );
-- Inserts come from triggers running as definer, not from the client.

-- ---------------------------------------------------------------- activity
-- Trainees see their own footprint plus the batch's, because a shared desk
-- shows who did what. Nothing may ever be updated or deleted.
create policy ac_read on activity for select
  using ( app.is_super_admin()
          or ( app.is_member_of(batch_id)
               and ( app.batch_collaborative(batch_id)
                     or app.is_trainer_of(batch_id)
                     or actor_id = auth.uid() ) ) );
