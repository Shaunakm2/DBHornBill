-- =====================================================================
-- 0004_views.sql
-- Reporting. Views inherit the RLS of the tables beneath them, so a
-- trainee querying the scorecard sees only what they are allowed to see.
-- =====================================================================

-- What the trainer works from. One row per submission needing a decision,
-- oldest first, with how long it has been sitting.
create or replace view v_trainer_queue as
select s.id,
       s.batch_id,
       b.name              as batch_name,
       j.ref               as job_ref,
       j.title             as job_title,
       co.name             as company,
       c.name              as candidate,
       p.full_name         as trainee,
       s.status,
       ss.label            as status_label,
       s.summary,
       greatest(s.updated_at, coalesce(m.last_message, s.updated_at)) as last_activity,
       round(extract(epoch from now()
             - greatest(s.updated_at, coalesce(m.last_message, s.updated_at)))/3600, 1)
                           as hours_waiting,
       case when s.status = 'internal' then 'Review'
            when s.status = 'query'    then 'Waiting on trainee'
            when s.status = 'client'   then 'Awaiting client outcome'
       end                 as awaiting
from submissions s
join batches    b  on b.id  = s.batch_id
join job_orders j  on j.id  = s.job_id
join companies  co on co.id = j.company_id
join candidates c  on c.id  = s.candidate_id
join profiles   p  on p.id  = s.owner_id
join submission_statuses ss on ss.code = s.status
left join lateral (
  select max(created_at) as last_message from sub_messages where submission_id = s.id
) m on true
where s.status in ('internal','query','client','interview');

-- The end-of-batch report. One row per trainee per batch.
create or replace view v_trainee_scorecard as
with mem as (
  select bm.batch_id, bm.user_id
  from batch_members bm where bm.role_in_batch = 'trainee'
),
cand as (
  select batch_id, created_by as user_id,
         count(*) as candidates_added,
         count(*) filter (where source = 'pool')     as sourced_internal,
         count(*) filter (where source <> 'pool')    as sourced_external
  from candidates group by 1,2
),
nt as (
  select batch_id, author_id as user_id,
         count(*) as notes_written,
         round(avg(length(body))) as avg_note_length
  from notes group by 1,2
),
sub as (
  select s.batch_id, s.owner_id as user_id,
         count(*)                                             as submissions,
         count(*) filter (where s.submitted_at is not null)    as sent_internal,
         count(*) filter (where s.sendout_at   is not null)    as sent_to_client,
         count(*) filter (where s.status = 'interview')        as interviews,
         count(*) filter (where s.status = 'rejected')         as rejected,
         count(*) filter (where s.status = 'rejected'
                            and rr.coachable)                  as rejected_coachable,
         round(avg(extract(epoch from s.sendout_at - s.submitted_at)/3600)
               filter (where s.sendout_at is not null), 1)     as avg_hours_to_sendout,
         round(avg(length(s.summary)) filter (where s.summary is not null))
                                                               as avg_summary_length
  from submissions s
  left join rejection_reasons rr on rr.code = s.rejection_code
  group by 1,2
),
q as (
  select s.batch_id, s.owner_id as user_id,
         count(*) filter (where m.kind = 'query')    as queries_received,
         count(*) filter (where m.kind = 'response') as queries_answered,
         round(avg(extract(epoch from r.created_at - m.created_at)/3600), 1)
                                                     as avg_hours_to_answer
  from sub_messages m
  join submissions s on s.id = m.submission_id
  left join lateral (
    select min(created_at) as created_at from sub_messages r2
    where r2.submission_id = m.submission_id and r2.kind = 'response'
      and r2.created_at > m.created_at
  ) r on true
  where m.kind in ('query','response')
  group by 1,2
)
select mem.batch_id,
       b.name                          as batch_name,
       b.status                        as batch_status,
       mem.user_id,
       p.employee_id,
       p.full_name                     as trainee,
       coalesce(cand.candidates_added,0)   as candidates_added,
       coalesce(cand.sourced_internal,0)   as sourced_internal,
       coalesce(cand.sourced_external,0)   as sourced_external,
       coalesce(nt.notes_written,0)        as notes_written,
       nt.avg_note_length,
       coalesce(sub.submissions,0)         as submissions,
       coalesce(sub.sent_internal,0)       as sent_internal,
       coalesce(sub.sent_to_client,0)      as sent_to_client,
       coalesce(sub.interviews,0)          as interviews,
       coalesce(sub.rejected,0)            as rejected,
       coalesce(sub.rejected_coachable,0)  as rejected_coachable,
       case when coalesce(sub.sent_internal,0) = 0 then null
            else round(100.0 * sub.sent_to_client / sub.sent_internal, 1) end
                                           as pct_internal_to_client,
       sub.avg_hours_to_sendout,
       sub.avg_summary_length,
       coalesce(q.queries_received,0)      as queries_received,
       coalesce(q.queries_answered,0)      as queries_answered,
       q.avg_hours_to_answer,
       (select max(at) from activity a where a.actor_id = mem.user_id
          and a.batch_id = mem.batch_id) as last_seen
from mem
join batches  b on b.id = mem.batch_id
join profiles p on p.id = mem.user_id
left join cand on cand.batch_id = mem.batch_id and cand.user_id = mem.user_id
left join nt   on nt.batch_id   = mem.batch_id and nt.user_id   = mem.user_id
left join sub  on sub.batch_id  = mem.batch_id and sub.user_id  = mem.user_id
left join q    on q.batch_id    = mem.batch_id and q.user_id    = mem.user_id;

comment on view v_trainee_scorecard is
  'pct_internal_to_client is the headline number: of what the trainee sent to '
  'the account manager, how much was good enough to go to the client. '
  'rejected_coachable separates a trainee error from a market outcome.';

-- Where submissions die, for the batch as a whole. Drives the debrief.
create or replace view v_rejection_analysis as
select s.batch_id,
       rr.label       as reason,
       rr.coachable,
       s.rejection_stage,
       count(*)       as n,
       round(100.0 * count(*) / nullif(sum(count(*)) over (partition by s.batch_id),0), 1) as pct
from submissions s
join rejection_reasons rr on rr.code = s.rejection_code
where s.status = 'rejected'
group by 1,2,3,4;
