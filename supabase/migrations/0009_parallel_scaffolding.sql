-- =====================================================================
-- 0009_parallel_scaffolding.sql
--
-- Found by the smoke test: in a parallel batch a trainee could not see the
-- job orders.
--
-- One read rule was applied to every table: you see a row if the batch is
-- collaborative, or you are its trainer, or you made it. For a candidate or
-- a submission that is exactly right — parallel mode exists so that trainees
-- cannot see each other's work. But companies, contacts and job orders are
-- made by the trainer, and under the same rule a trainee owned none of them
-- and so saw none of them. A parallel batch had nothing to recruit against.
--
-- The desk and the work on it are different things. The client list, the
-- contacts and the requirements are the scaffolding everybody on the batch
-- works from, whatever the mode. What is private in parallel mode is what a
-- trainee produces: candidates, submissions, notes and their activity.
--
-- Safe to run more than once.
-- =====================================================================

create or replace function app.can_read_shared(p_batch uuid) returns boolean
language sql stable security definer set search_path = public, app as $$
  select app.is_member_of(p_batch)
$$;
comment on function app.can_read_shared(uuid) is
  'For the desk itself — clients, contacts, job orders. Visible to everyone '
  'on the batch in either mode. Contrast app.can_read, which hides one '
  'trainee''s work from another when the batch is parallel.';

drop policy if exists co_read on companies;
create policy co_read on companies for select
  using ( app.can_read_shared(batch_id) );

drop policy if exists ct_read on contacts;
create policy ct_read on contacts for select
  using ( app.can_read_shared(batch_id) );

drop policy if exists jo_read on job_orders;
create policy jo_read on job_orders for select
  using ( app.can_read_shared(batch_id) );
