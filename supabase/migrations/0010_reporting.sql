-- =====================================================================
-- 0010_reporting.sql
--
-- The staff reporting surface.
--
-- These are functions rather than views because of the visibility rule they
-- have to implement: a trainer works their own batches, and can read the
-- numbers for every other batch without being able to touch the records
-- inside them. A view inherits the policies of its base tables, which would
-- give a trainer either everything or nothing. A definer function can hand
-- back aggregates for batches whose rows the caller may not read.
--
-- Every one of them refuses a trainee outright. Reporting across other
-- people's desks is staff work.
--
-- Each row carries `mine`, so the interface can show at a glance which
-- batches the reader actually runs.
--
-- Safe to run more than once.
-- =====================================================================

create or replace function app.assert_staff() returns void
language plpgsql stable security definer set search_path = public, app as $$
begin
  if not (app.is_super_admin() or app.my_role() = 'trainer') then
    raise exception 'Reporting is available to trainers and administrators.'
      using errcode = 'insufficient_privilege';
  end if;
end $$;

-- ------------------------------------------------------- batch summary
create or replace function app.rpt_batches()
returns table (
  batch_id uuid, batch_name text, join_code text, mode text, status text,
  desk_type text, trainer text, mine boolean, trainees bigint,
  job_orders bigint, open_jobs bigint, candidates bigint, submissions bigint,
  sent_to_client bigint, awaiting_review bigint, awaiting_trainee bigint,
  oldest_waiting_hours numeric, started date, last_activity timestamptz)
language sql stable security definer set search_path = public, app as $$
  select b.id, b.name, b.join_code, b.mode::text, b.status::text, b.desk_type,
         p.full_name, app.is_trainer_of(b.id),
         (select count(*) from batch_members m
           where m.batch_id = b.id and m.role_in_batch = 'trainee'),
         (select count(*) from job_orders j where j.batch_id = b.id),
         (select count(*) from job_orders j where j.batch_id = b.id and j.status = 'Open'),
         (select count(*) from candidates c where c.batch_id = b.id),
         (select count(*) from submissions s where s.batch_id = b.id),
         (select count(*) from submissions s where s.batch_id = b.id and s.sendout_at is not null),
         (select count(*) from submissions s where s.batch_id = b.id and s.status = 'internal'),
         (select count(*) from submissions s where s.batch_id = b.id and s.status = 'query'),
         (select round(max(extract(epoch from now() - s.updated_at))/3600, 1)
            from submissions s where s.batch_id = b.id and s.status = 'internal'),
         b.starts_on,
         (select max(a.at) from activity a where a.batch_id = b.id)
  from batches b
  join profiles p on p.id = b.created_by
  where app.is_super_admin() or app.my_role() = 'trainer'
  order by (app.is_trainer_of(b.id)) desc, b.status, b.created_at desc
$$;

-- ---------------------------------------------------------- scorecard
-- p_batch null means every batch the caller may report on.
create or replace function app.rpt_scorecard(p_batch uuid default null)
returns table (
  batch_name text, mine boolean, employee_id text, trainee text,
  candidates_added bigint, notes_written bigint, avg_note_length numeric,
  submissions bigint, sent_internal bigint, sent_to_client bigint,
  interviews bigint, rejected bigint, rejected_coachable bigint,
  pct_internal_to_client numeric, avg_hours_to_sendout numeric,
  avg_summary_length numeric, queries_received bigint, queries_answered bigint,
  avg_hours_to_answer numeric, last_seen timestamptz)
language sql stable security definer set search_path = public, app as $$
  select v.batch_name, app.is_trainer_of(v.batch_id), v.employee_id, v.trainee,
         v.candidates_added, v.notes_written, v.avg_note_length,
         v.submissions, v.sent_internal, v.sent_to_client, v.interviews,
         v.rejected, v.rejected_coachable, v.pct_internal_to_client,
         v.avg_hours_to_sendout, v.avg_summary_length,
         v.queries_received, v.queries_answered, v.avg_hours_to_answer, v.last_seen
  from v_trainee_scorecard v
  where (app.is_super_admin() or app.my_role() = 'trainer')
    and (p_batch is null or v.batch_id = p_batch)
  order by v.batch_name, v.trainee
$$;

-- -------------------------------------------------------- rejections
create or replace function app.rpt_rejections(p_batch uuid default null)
returns table (batch_name text, mine boolean, reason text, coachable boolean,
               stage text, n bigint, pct numeric)
language sql stable security definer set search_path = public, app as $$
  select b.name, app.is_trainer_of(b.id), rr.label, rr.coachable,
         coalesce(ss.label, s.rejection_stage), count(*),
         round(100.0 * count(*) / nullif(sum(count(*)) over (partition by b.id), 0), 1)
  from submissions s
  join batches b on b.id = s.batch_id
  join rejection_reasons rr on rr.code = s.rejection_code
  left join submission_statuses ss on ss.code = s.rejection_stage
  where s.status = 'rejected'
    and (app.is_super_admin() or app.my_role() = 'trainer')
    and (p_batch is null or s.batch_id = p_batch)
  group by b.id, b.name, rr.label, rr.coachable, coalesce(ss.label, s.rejection_stage)
  order by b.name, count(*) desc
$$;

-- ---------------------------------------------------------- activity
create or replace function app.rpt_activity(p_batch uuid default null, p_limit int default 5000)
returns table (batch_name text, mine boolean, at timestamptz, actor text,
               employee_id text, verb text, entity_type text, detail text)
language sql stable security definer set search_path = public, app as $$
  select b.name, app.is_trainer_of(b.id), a.at, coalesce(p.full_name, 'system'),
         p.employee_id, a.verb, a.entity_type,
         coalesce(a.detail->>'label', a.detail->>'candidate',
                  nullif(concat_ws(' \u2192 ', a.detail->>'from', a.detail->>'to'), ''), '')
  from activity a
  join batches b on b.id = a.batch_id
  left join profiles p on p.id = a.actor_id
  where (app.is_super_admin() or app.my_role() = 'trainer')
    and (p_batch is null or a.batch_id = p_batch)
  order by a.at desc
  limit greatest(1, least(p_limit, 50000))
$$;

-- ------------------------------------------------------------- queue
create or replace function app.rpt_queue(p_batch uuid default null)
returns table (batch_name text, mine boolean, job_ref text, job_title text,
               company text, candidate text, trainee text, status_label text,
               awaiting text, hours_waiting numeric)
language sql stable security definer set search_path = public, app as $$
  select b.name, app.is_trainer_of(b.id), j.ref, j.title, co.name, c.name,
         p.full_name, ss.label,
         case when s.status = 'internal' then 'Review'
              when s.status = 'query'    then 'Waiting on trainee'
              when s.status = 'client'   then 'Awaiting client outcome'
              else ss.label end,
         round(extract(epoch from now() - s.updated_at) / 3600, 1)
  from submissions s
  join batches b on b.id = s.batch_id
  join job_orders j on j.id = s.job_id
  join companies co on co.id = j.company_id
  join candidates c on c.id = s.candidate_id
  join profiles p on p.id = s.owner_id
  join submission_statuses ss on ss.code = s.status
  where s.status in ('internal','query','client','interview')
    and (app.is_super_admin() or app.my_role() = 'trainer')
    and (p_batch is null or s.batch_id = p_batch)
  order by app.is_trainer_of(b.id) desc, s.updated_at
$$;

-- ------------------------------------------------------------ wrappers
create or replace function public.rpt_batches()
returns setof record language plpgsql stable security definer
set search_path = public, app as $$
begin
  perform app.assert_staff();
  return query select * from app.rpt_batches();
end $$;

-- The setof record form above is awkward to consume, so each report gets a
-- concrete signature instead.
drop function if exists public.rpt_batches();

create or replace function public.rpt_batches()
returns table (
  batch_id uuid, batch_name text, join_code text, mode text, status text,
  desk_type text, trainer text, mine boolean, trainees bigint,
  job_orders bigint, open_jobs bigint, candidates bigint, submissions bigint,
  sent_to_client bigint, awaiting_review bigint, awaiting_trainee bigint,
  oldest_waiting_hours numeric, started date, last_activity timestamptz)
language plpgsql stable security definer set search_path = public, app as $$
begin
  perform app.assert_staff();
  return query select * from app.rpt_batches();
end $$;

create or replace function public.rpt_scorecard(p_batch uuid default null)
returns table (
  batch_name text, mine boolean, employee_id text, trainee text,
  candidates_added bigint, notes_written bigint, avg_note_length numeric,
  submissions bigint, sent_internal bigint, sent_to_client bigint,
  interviews bigint, rejected bigint, rejected_coachable bigint,
  pct_internal_to_client numeric, avg_hours_to_sendout numeric,
  avg_summary_length numeric, queries_received bigint, queries_answered bigint,
  avg_hours_to_answer numeric, last_seen timestamptz)
language plpgsql stable security definer set search_path = public, app as $$
begin
  perform app.assert_staff();
  return query select * from app.rpt_scorecard(p_batch);
end $$;

create or replace function public.rpt_rejections(p_batch uuid default null)
returns table (batch_name text, mine boolean, reason text, coachable boolean,
               stage text, n bigint, pct numeric)
language plpgsql stable security definer set search_path = public, app as $$
begin
  perform app.assert_staff();
  return query select * from app.rpt_rejections(p_batch);
end $$;

create or replace function public.rpt_activity(p_batch uuid default null,
                                               p_limit int default 5000)
returns table (batch_name text, mine boolean, at timestamptz, actor text,
               employee_id text, verb text, entity_type text, detail text)
language plpgsql stable security definer set search_path = public, app as $$
begin
  perform app.assert_staff();
  return query select * from app.rpt_activity(p_batch, p_limit);
end $$;

create or replace function public.rpt_queue(p_batch uuid default null)
returns table (batch_name text, mine boolean, job_ref text, job_title text,
               company text, candidate text, trainee text, status_label text,
               awaiting text, hours_waiting numeric)
language plpgsql stable security definer set search_path = public, app as $$
begin
  perform app.assert_staff();
  return query select * from app.rpt_queue(p_batch);
end $$;

do $$
declare f text;
begin
  foreach f in array array[
    'public.rpt_batches()',
    'public.rpt_scorecard(uuid)',
    'public.rpt_rejections(uuid)',
    'public.rpt_activity(uuid,int)',
    'public.rpt_queue(uuid)'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
