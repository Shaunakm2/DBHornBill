-- =====================================================================
-- 0003_triggers.sql
-- Behaviour the database owns, because the browser cannot be trusted to.
--
--   * record references (JO-0001, CD-0001) unique within a batch
--   * updated_at / updated_by / version on every write
--   * the submission transition matrix, including who is allowed to move
--     into each state and what must be present before they can
--   * activity, which is the footprint record
--   * notifications to the trainee when the trainer acts
-- =====================================================================

-- ---------------------------------------------------------------- refs
create table ref_counters (
  batch_id uuid not null references batches(id) on delete cascade,
  entity   text not null,
  n        int  not null default 0,
  primary key (batch_id, entity)
);
alter table ref_counters enable row level security;  -- no policy: definer only

create or replace function app.next_ref(p_batch uuid, p_entity text, p_prefix text)
returns text language plpgsql security definer set search_path = public, app as $$
declare v int;
begin
  insert into ref_counters (batch_id, entity, n) values (p_batch, p_entity, 1)
    on conflict (batch_id, entity) do update set n = ref_counters.n + 1
    returning n into v;
  return p_prefix || '-' || lpad(v::text, 4, '0');
end $$;

create or replace function app.set_job_ref() returns trigger
language plpgsql security definer set search_path = public, app as $$
begin
  if new.ref is null or new.ref = '' then
    new.ref := app.next_ref(new.batch_id, 'job_order', 'JO');
  end if;
  return new;
end $$;
create trigger t_job_ref before insert on job_orders
  for each row execute function app.set_job_ref();

create or replace function app.set_cand_ref() returns trigger
language plpgsql security definer set search_path = public, app as $$
begin
  if new.ref is null or new.ref = '' then
    new.ref := app.next_ref(new.batch_id, 'candidate', 'SC');
  end if;
  return new;
end $$;
create trigger t_cand_ref before insert on candidates
  for each row execute function app.set_cand_ref();

-- ---------------------------------------------------------------- stamps
create or replace function app.stamp() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  if to_jsonb(new) ? 'updated_by' then new.updated_by := auth.uid(); end if;
  if tg_op = 'UPDATE' and to_jsonb(new) ? 'version' then
    new.version := old.version + 1;
  end if;
  return new;
end $$;

create trigger t_stamp before update on companies   for each row execute function app.stamp();
create trigger t_stamp before update on contacts    for each row execute function app.stamp();
create trigger t_stamp before update on job_orders  for each row execute function app.stamp();
create trigger t_stamp before update on candidates  for each row execute function app.stamp();
create trigger t_stamp before update on submissions for each row execute function app.stamp();
create trigger t_stamp before update on batches     for each row execute function app.stamp();
create trigger t_stamp before update on profiles    for each row execute function app.stamp();

-- ---------------------------------------------------------------- activity
create or replace function app.log(p_batch uuid, p_verb text, p_type text,
                                   p_id uuid, p_detail jsonb default '{}'::jsonb)
returns void language sql security definer set search_path = public, app as $$
  insert into activity (batch_id, actor_id, verb, entity_type, entity_id, detail)
  values (p_batch, auth.uid(), p_verb, p_type, p_id, coalesce(p_detail,'{}'::jsonb))
$$;

create or replace function app.notify(p_batch uuid, p_user uuid, p_kind text,
                                      p_body text, p_link_type text, p_link_id uuid)
returns void language sql security definer set search_path = public, app as $$
  insert into notifications (batch_id, user_id, kind, body, link_type, link_id)
  select p_batch, p_user, p_kind, p_body, p_link_type, p_link_id
  where p_user is distinct from auth.uid()
$$;

create or replace function app.log_row() returns trigger
language plpgsql security definer set search_path = public, app as $$
declare v_batch uuid; v_label text;
begin
  v_batch := (to_jsonb(new)->>'batch_id')::uuid;
  v_label := coalesce(to_jsonb(new)->>'name', to_jsonb(new)->>'title',
                      to_jsonb(new)->>'ref', '');
  perform app.log(v_batch,
                  lower(tg_op) || '_' || tg_argv[0],
                  tg_argv[0], new.id,
                  jsonb_build_object('label', v_label));
  return new;
end $$;

create trigger t_log after insert on candidates for each row execute function app.log_row('candidate');
create trigger t_log after insert on job_orders for each row execute function app.log_row('job_order');
create trigger t_log after insert on companies  for each row execute function app.log_row('company');

create or replace function app.log_note() returns trigger
language plpgsql security definer set search_path = public, app as $$
begin
  perform app.log(new.batch_id, 'note_added', new.target_type::text, new.target_id,
    jsonb_build_object('action', new.action, 'chars', length(new.body)));
  return new;
end $$;
create trigger t_log after insert on notes for each row execute function app.log_note();

-- ------------------------------------------------- submission state machine
create or replace function app.sub_guard() returns trigger
language plpgsql security definer set search_path = public, app as $$
declare
  v_actor   app_role;
  v_ok      boolean;
  v_trainer boolean;
  v_label   text;
  v_cand    text;
  v_job     text;
begin
  v_trainer := app.is_trainer_of(new.batch_id);
  v_actor   := case when v_trainer then 'trainer'::app_role else 'trainee'::app_role end;

  if tg_op = 'INSERT' then
    if new.status <> 'sourced' then
      raise exception 'A submission starts at Sourced. Add the candidate to the job first, '
                      'then write it up and submit it.'
        using errcode = 'check_violation';
    end if;
    return new;
  end if;

  if new.status = old.status then return new; end if;

  select exists (select 1 from submission_transitions
                 where from_code = old.status and to_code = new.status and actor = v_actor)
    into v_ok;

  if not v_ok then
    select label into v_label from submission_statuses where code = new.status;
    raise exception 'You cannot move this submission to % from %. %',
      coalesce(v_label,new.status),
      (select label from submission_statuses where code = old.status),
      case when exists (select 1 from submission_transitions
                        where from_code = old.status and to_code = new.status)
           then 'That step is the account manager''s to take.'
           else 'That is not a step in this workflow.' end
      using errcode = 'check_violation';
  end if;

  -- Gates. Each one exists because the missing thing is the lesson.
  if new.status = 'internal' and coalesce(btrim(new.summary),'') = '' then
    raise exception 'Write the submission summary before sending it to the account manager. '
                    'A name and a CV is not a submission.'
      using errcode = 'check_violation';
  end if;

  if new.status = 'internal' and old.status = 'query'
     and not exists (select 1 from sub_messages
                     where submission_id = new.id and kind = 'response'
                       and created_at > (select max(created_at) from sub_messages
                                         where submission_id = new.id and kind = 'query')) then
    raise exception 'Answer the account manager''s query before resubmitting.'
      using errcode = 'check_violation';
  end if;

  if new.status = 'query'
     and not exists (select 1 from sub_messages
                     where submission_id = new.id and kind = 'query') then
    raise exception 'Raise the query itself before moving the submission into Awaiting Trainee Response.'
      using errcode = 'check_violation';
  end if;

  if new.status = 'rejected' and new.rejection_code is null then
    raise exception 'A rejection needs a reason. The reason is what the trainee learns from.'
      using errcode = 'check_violation';
  end if;

  -- Timestamps
  if new.status = 'internal' and new.submitted_at is null then new.submitted_at := now(); end if;
  if new.status = 'client'   and new.sendout_at  is null then new.sendout_at  := now(); end if;
  if (select is_terminal from submission_statuses where code = new.status) then
    new.closed_at := now();
  end if;

  return new;
end $$;
create trigger t_sub_guard before insert or update on submissions
  for each row execute function app.sub_guard();

-- ------------------------------------------- submission activity + notifications
create or replace function app.sub_after() returns trigger
language plpgsql security definer set search_path = public, app as $$
declare v_cand text; v_job text; v_label text; v_reason text;
begin
  select name into v_cand from candidates where id = new.candidate_id;
  select ref || ' ' || title into v_job from job_orders where id = new.job_id;
  select label into v_label from submission_statuses where code = new.status;

  if tg_op = 'INSERT' then
    perform app.log(new.batch_id,'submission_created','submission',new.id,
      jsonb_build_object('candidate',v_cand,'job',v_job));
    return new;
  end if;

  if new.status is distinct from old.status then
    perform app.log(new.batch_id,'submission_status','submission',new.id,
      jsonb_build_object('from',old.status,'to',new.status,'candidate',v_cand,'job',v_job));

    if new.status = 'query' then
      perform app.notify(new.batch_id,new.owner_id,'query',
        'The account manager has a query on ' || v_cand || ' for ' || v_job ||
        '. It is waiting on you.','submission',new.id);
    elsif new.status = 'client' then
      perform app.notify(new.batch_id,new.owner_id,'sendout',
        v_cand || ' has been submitted to the client for ' || v_job || '.',
        'submission',new.id);
    elsif new.status = 'interview' then
      perform app.notify(new.batch_id,new.owner_id,'interview',
        'The client wants to interview ' || v_cand || ' for ' || v_job || '.',
        'submission',new.id);
    elsif new.status = 'rejected' then
      select label into v_reason from rejection_reasons where code = new.rejection_code;
      perform app.notify(new.batch_id,new.owner_id,'rejected',
        v_cand || ' was rejected for ' || v_job || ' — ' || coalesce(v_reason,'no reason given') ||
        '. Read the note before your next submission.','submission',new.id);
    elsif new.status = 'internal' and old.status = 'query' then
      -- back to the trainer's queue
      insert into notifications (batch_id,user_id,kind,body,link_type,link_id)
      select new.batch_id, bm.user_id, 'response',
             'Query answered on ' || v_cand || ' for ' || v_job || '.','submission',new.id
      from batch_members bm
      where bm.batch_id = new.batch_id and bm.role_in_batch = 'trainer'
        and bm.user_id is distinct from auth.uid();
    elsif new.status = 'internal' and old.status = 'sourced' then
      insert into notifications (batch_id,user_id,kind,body,link_type,link_id)
      select new.batch_id, bm.user_id, 'submission',
             v_cand || ' submitted for ' || v_job || ' — waiting on your review.',
             'submission',new.id
      from batch_members bm
      where bm.batch_id = new.batch_id and bm.role_in_batch = 'trainer';
    end if;
  end if;
  return new;
end $$;
create trigger t_sub_after after insert or update on submissions
  for each row execute function app.sub_after();

-- ---------------------------------------------------------------- job coverage
create or replace function app.job_coverage() returns trigger
language plpgsql security definer set search_path = public, app as $$
declare v_sent int; v_target int; v_status text;
begin
  select count(*) into v_sent from submissions
   where job_id = new.job_id and status in ('client','interview','offer','placed');
  select submission_target, status into v_target, v_status from job_orders where id = new.job_id;
  if v_status = 'Open' and v_sent >= v_target then
    update job_orders set status = 'Covered' where id = new.job_id;
  elsif v_status = 'Covered' and v_sent < v_target then
    update job_orders set status = 'Open' where id = new.job_id;
  end if;
  return null;
end $$;
create trigger t_job_cover after insert or update of status on submissions
  for each row execute function app.job_coverage();

-- ---------------------------------------------------------------- immutability
-- Withholding an UPDATE policy stops the write, but it stops it silently:
-- the statement succeeds and reports zero rows, so a client that does not
-- check the row count believes the edit landed. For a record that exists to
-- be evidence, silence is the wrong failure. These are STATEMENT triggers on
-- purpose — a row trigger never fires when RLS has already filtered the row
-- away, which is exactly the case being guarded.
create or replace function app.immutable() returns trigger
language plpgsql as $$
begin
  if coalesce(current_setting('app.bypass_immutable', true), 'off') = 'on' then
    return null;
  end if;
  raise exception '% records cannot be changed or deleted once written. '
                  'Add a new entry instead.', tg_argv[0]
    using errcode = 'check_violation';
end $$;
comment on function app.immutable() is
  'Set app.bypass_immutable to on inside a maintenance transaction if a batch '
  'must genuinely be purged. Nothing in the application ever sets it.';

create trigger t_immutable before update or delete on notes
  for each statement execute function app.immutable('Note');
create trigger t_immutable before update or delete on sub_messages
  for each statement execute function app.immutable('Query and response');
create trigger t_immutable before update or delete on activity
  for each statement execute function app.immutable('Activity');

-- ---------------------------------------------------------------- advance
-- The one entry point for moving a submission. It exists because a policy
-- that filters a row away turns a forbidden UPDATE into a successful
-- statement affecting zero rows: the trainee sees "saved" and nothing has
-- happened. Routing through a definer function means every refusal has a
-- sentence attached, and version conflicts are distinguishable from
-- permission failures rather than both looking like silence.
create or replace function app.advance_submission(
  p_id uuid, p_to text, p_version int,
  p_summary text default null, p_rejection_code text default null,
  p_rejection_stage text default null, p_rejection_note text default null)
returns submissions
language plpgsql security definer set search_path = public, app as $$
declare s submissions; v_owner boolean; v_trainer boolean; v_out submissions;
begin
  select * into s from submissions where id = p_id;
  if not found then
    raise exception 'That submission no longer exists.' using errcode='no_data_found';
  end if;
  if not app.can_read(s.batch_id, s.owner_id) then
    raise exception 'That submission is not yours to see.' using errcode='insufficient_privilege';
  end if;
  if not app.batch_active(s.batch_id) then
    raise exception 'This batch is archived. It can be read but not changed.'
      using errcode='insufficient_privilege';
  end if;

  v_owner   := s.owner_id = auth.uid();
  v_trainer := app.is_trainer_of(s.batch_id);
  if not (v_owner or v_trainer) then
    raise exception 'This submission belongs to %. You can read it and add notes, '
                    'but only the owner or the account manager can move it.',
      (select full_name from profiles where id = s.owner_id)
      using errcode='insufficient_privilege';
  end if;

  if p_version is not null and p_version <> s.version then
    raise exception 'Someone else changed this submission while you were working on it. '
                    'Reload and check what changed before resubmitting.'
      using errcode='serialization_failure';
  end if;

  update submissions
     set status          = p_to,
         summary         = coalesce(p_summary, summary),
         rejection_code  = coalesce(p_rejection_code, rejection_code),
         rejection_stage = coalesce(p_rejection_stage, rejection_stage),
         rejection_note  = coalesce(p_rejection_note, rejection_note)
   where id = p_id
   returning * into v_out;
  return v_out;
end $$;
revoke all on function app.advance_submission(uuid,text,int,text,text,text,text) from public;

-- ------------------------------------------- helpers the UI calls directly
-- Who already has this candidate on this job. Runs as definer so the message
-- works even in a parallel batch where the row itself is not readable.
create or replace function app.existing_submission(p_job uuid, p_candidate uuid)
returns table (owner_name text, status_label text, submitted timestamptz)
language sql stable security definer set search_path = public, app as $$
  select p.full_name, ss.label, coalesce(s.submitted_at, s.created_at)
  from submissions s
  join profiles p on p.id = s.owner_id
  join submission_statuses ss on ss.code = s.status
  where s.job_id = p_job and s.candidate_id = p_candidate
$$;

-- Duplicate candidate warning. Deliberately a warning, not a constraint.
create or replace function app.candidate_duplicates(
  p_batch uuid, p_email text, p_phone text, p_name text)
returns table (id uuid, ref text, name text, owner_name text, matched_on text)
language sql stable security definer set search_path = public, app as $$
  select c.id, c.ref, c.name, p.full_name,
         case when p_email is not null and lower(c.email) = lower(p_email) then 'email'
              when p_phone is not null and regexp_replace(c.phone,'\D','','g')
                   = regexp_replace(p_phone,'\D','','g') then 'phone'
              else 'name' end
  from candidates c join profiles p on p.id = c.created_by
  where c.batch_id = p_batch
    and ( (p_email is not null and lower(c.email) = lower(p_email))
       or (p_phone is not null and length(regexp_replace(p_phone,'\D','','g')) >= 7
           and regexp_replace(c.phone,'\D','','g') = regexp_replace(p_phone,'\D','','g'))
       or (p_name is not null and lower(c.name) = lower(p_name)) )
  limit 10
$$;
