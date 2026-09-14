-- =====================================================================
-- 01_policies.sql — run against the local database built by run_local.sh.
-- Every check either passes silently or aborts with a message naming what
-- broke. Exit code is what CI reads.
-- =====================================================================
\set ON_ERROR_STOP on
\timing off

create or replace function t_ok(cond boolean, msg text) returns void
language plpgsql as $$
begin
  if not cond then raise exception 'FAILED: %', msg; end if;
  raise notice 'ok   %', msg;
end $$;

-- Asserts that a statement is rejected, and that the message is useful.
create or replace function t_blocked(stmt text, msg text, expect text default null)
returns void language plpgsql as $$
declare e text;
begin
  begin
    execute stmt;
  exception when others then
    e := sqlerrm;
    if expect is not null and position(lower(expect) in lower(e)) = 0 then
      raise exception 'FAILED: % — blocked, but the message was "%" and should mention "%"',
        msg, e, expect;
    end if;
    raise notice 'ok   % (blocked: %)', msg, left(e, 70);
    return;
  end;
  raise exception 'FAILED: % — the statement was allowed and should not have been', msg;
end $$;

-- ---------------------------------------------------------------- seed
-- Done as the owner, which is what the admin Edge Function does with the
-- service_role key. There is no client-side path to creating a user.
insert into auth.users (id,email) values
  ('00000000-0000-0000-0000-0000000000a1','admin@corp.example'),
  ('00000000-0000-0000-0000-0000000000a2','trainer.a@corp.example'),
  ('00000000-0000-0000-0000-0000000000a3','trainer.b@corp.example'),
  ('00000000-0000-0000-0000-0000000000b1','E1001@b.trainees.local'),
  ('00000000-0000-0000-0000-0000000000b2','E1002@b.trainees.local'),
  ('00000000-0000-0000-0000-0000000000b3','E1003@b.trainees.local');

insert into profiles (id,role,full_name,employee_id,email) values
  ('00000000-0000-0000-0000-0000000000a1','super_admin','S Admin',null,'admin@corp.example'),
  ('00000000-0000-0000-0000-0000000000a2','trainer','Trainer A',null,'trainer.a@corp.example'),
  ('00000000-0000-0000-0000-0000000000a3','trainer','Trainer B',null,'trainer.b@corp.example'),
  ('00000000-0000-0000-0000-0000000000b1','trainee','Asha R','E1001',null),
  ('00000000-0000-0000-0000-0000000000b2','trainee','Bilal K','E1002',null),
  ('00000000-0000-0000-0000-0000000000b3','trainee','Chen W','E1003',null);

insert into batches (id,name,join_code,mode,created_by) values
  ('00000000-0000-0000-0000-00000000c001','Batch 7 — Light Industrial','BATCH7',
   'collaborative','00000000-0000-0000-0000-0000000000a2'),
  ('00000000-0000-0000-0000-00000000c002','Batch 8 — IT','BATCH8',
   'collaborative','00000000-0000-0000-0000-0000000000a3');

insert into batch_members (batch_id,user_id,role_in_batch) values
  ('00000000-0000-0000-0000-00000000c001','00000000-0000-0000-0000-0000000000a2','trainer'),
  ('00000000-0000-0000-0000-00000000c001','00000000-0000-0000-0000-0000000000b1','trainee'),
  ('00000000-0000-0000-0000-00000000c001','00000000-0000-0000-0000-0000000000b2','trainee'),
  ('00000000-0000-0000-0000-00000000c002','00000000-0000-0000-0000-0000000000a3','trainer'),
  ('00000000-0000-0000-0000-00000000c002','00000000-0000-0000-0000-0000000000b3','trainee');

\echo ''
\echo '-- 1. trainer creates the desk -------------------------------------'
set role app_user;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a2',false);

insert into companies (id,batch_id,name,created_by) values
  ('00000000-0000-0000-0000-00000000d001','00000000-0000-0000-0000-00000000c001',
   'Meridian Logistics','00000000-0000-0000-0000-0000000000a2');

insert into contacts (id,batch_id,company_id,name,title,created_by) values
  ('00000000-0000-0000-0000-00000000d002','00000000-0000-0000-0000-00000000c001',
   '00000000-0000-0000-0000-00000000d001','Dana Vale','Operations Manager',
   '00000000-0000-0000-0000-0000000000a2');

insert into job_orders (id,batch_id,company_id,contact_id,title,description,
                        employment_type,pay_rate,bill_rate,openings,created_by)
values ('00000000-0000-0000-0000-00000000d003','00000000-0000-0000-0000-00000000c001',
        '00000000-0000-0000-0000-00000000d001','00000000-0000-0000-0000-00000000d002',
        'Warehouse Operative','Night shift, 4 on 4 off. Forklift licence preferred.',
        'Contract',14.50,21.00,3,'00000000-0000-0000-0000-0000000000a2');

select t_ok((select ref from job_orders where id='00000000-0000-0000-0000-00000000d003')='JO-0001',
            'job order gets a per-batch reference');

select t_blocked($$
  insert into job_orders (batch_id,company_id,title,description,employment_type,
                          pay_rate,bill_rate,created_by)
  values ('00000000-0000-0000-0000-00000000c001','00000000-0000-0000-0000-00000000d001',
          'Underpriced role','x','Contract',20,18,'00000000-0000-0000-0000-0000000000a2')$$,
  'a contract role priced at or below pay rate is refused', 'margin_positive');

select t_blocked($$
  insert into job_orders (batch_id,company_id,title,description,employment_type,created_by)
  values ('00000000-0000-0000-0000-00000000c001','00000000-0000-0000-0000-00000000d001',
          'Perm with no salary','x','Direct Hire','00000000-0000-0000-0000-0000000000a2')$$,
  'a direct hire with no salary is refused', 'pricing_matches_type');

insert into job_assignments (job_id,user_id,assigned_by) values
  ('00000000-0000-0000-0000-00000000d003','00000000-0000-0000-0000-0000000000b1',
   '00000000-0000-0000-0000-0000000000a2');

\echo ''
\echo '-- 2. cross-batch isolation ----------------------------------------'
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000b3',false);
select t_ok((select count(*) from job_orders)=0, 'a trainee in another batch sees no job orders');
select t_ok((select count(*) from companies)=0,  'a trainee in another batch sees no companies');
select t_ok((select count(*) from batches)=1,    'a trainee sees only their own batch');
select t_blocked($$
  insert into candidates (batch_id,name,created_by)
  values ('00000000-0000-0000-0000-00000000c001','Smuggled In',
          '00000000-0000-0000-0000-0000000000b3')$$,
  'a trainee cannot write into a batch they do not belong to','policy');

\echo ''
\echo '-- 3. trainee sources and submits ----------------------------------'
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000b1',false);
select t_ok((select count(*) from job_orders)=1,'the assigned trainee sees the job order');

insert into candidates (id,batch_id,name,email,phone,occupation,source,created_by)
values ('00000000-0000-0000-0000-00000000e001','00000000-0000-0000-0000-00000000c001',
        'Rohit Menon','rohit.menon@mail.example','+1 555 0142','Warehouse Operative',
        'pool','00000000-0000-0000-0000-0000000000b1');
select t_ok((select ref from candidates where id='00000000-0000-0000-0000-00000000e001')='SC-0001',
            'a sourced candidate gets its own reference namespace, distinct from the local pool');

select t_blocked($$
  insert into submissions (batch_id,job_id,candidate_id,owner_id,status,created_by)
  values ('00000000-0000-0000-0000-00000000c001','00000000-0000-0000-0000-00000000d003',
          '00000000-0000-0000-0000-00000000e001','00000000-0000-0000-0000-0000000000b1',
          'client','00000000-0000-0000-0000-0000000000b1')$$,
  'a submission cannot be created straight into Client Submission','starts at Sourced');

insert into submissions (id,batch_id,job_id,candidate_id,owner_id,status,created_by)
values ('00000000-0000-0000-0000-00000000f001','00000000-0000-0000-0000-00000000c001',
        '00000000-0000-0000-0000-00000000d003','00000000-0000-0000-0000-00000000e001',
        '00000000-0000-0000-0000-0000000000b1','sourced',
        '00000000-0000-0000-0000-0000000000b1');

select t_blocked($$update submissions set status='internal'
                   where id='00000000-0000-0000-0000-00000000f001'$$,
  'submitting with no write-up is refused','summary');

select t_blocked($$update submissions set status='interview'
                   where id='00000000-0000-0000-0000-00000000f001'$$,
  'a trainee cannot skip the workflow entirely','not a step in this workflow');

update submissions
   set summary='5 years RF scanning, holds a counterbalance licence, available Monday, '
               'confirmed 14.50 and the 4-on-4-off pattern.',
       status='internal'
 where id='00000000-0000-0000-0000-00000000f001';

-- internal -> client is a real transition, but it belongs to the trainer.
-- The message must say so rather than pretending the step does not exist.
select t_blocked($$select app.advance_submission(
                   '00000000-0000-0000-0000-00000000f001','client',null)$$,
  'a trainee cannot send their own candidate to the client','account manager');
select t_blocked($$select app.advance_submission(
                   '00000000-0000-0000-0000-00000000f001','internal',99)$$,
  'a stale version is rejected rather than overwriting a colleague','Someone else changed');
select t_ok((select submitted_at is not null from submissions
             where id='00000000-0000-0000-0000-00000000f001'),
            'submitted_at is stamped on internal submission');
select t_ok((select version from submissions where id='00000000-0000-0000-0000-00000000f001')=2,
            'version increments so a concurrent edit can be detected');

insert into notes (batch_id,target_type,target_id,action,body,author_id)
values ('00000000-0000-0000-0000-00000000c001','candidate',
        '00000000-0000-0000-0000-00000000e001','screen',
        'Screened 20 minutes. Right to work seen. Notice: none.',
        '00000000-0000-0000-0000-0000000000b1');
select t_blocked($$update notes set body='rewritten' where author_id='00000000-0000-0000-0000-0000000000b1'$$,
  'a note cannot be rewritten after the fact', 'cannot be changed');

\echo ''
\echo '-- 4. the shared desk ----------------------------------------------'
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000b2',false);
select t_ok((select count(*) from candidates)=1,
            'a colleague in a collaborative batch sees the candidate');
select t_ok((select count(*) from notes)=1,
            'a colleague can read the screening note');
select t_ok((select count(*) from submissions)=1,
            'a colleague can see the live submission');

select t_blocked($$
  insert into submissions (batch_id,job_id,candidate_id,owner_id,status,created_by)
  values ('00000000-0000-0000-0000-00000000c001','00000000-0000-0000-0000-00000000d003',
          '00000000-0000-0000-0000-00000000e001','00000000-0000-0000-0000-0000000000b2',
          'sourced','00000000-0000-0000-0000-0000000000b2')$$,
  'two trainees cannot submit the same candidate to the same job','duplicate key');

select t_ok((select owner_name from app.existing_submission(
              '00000000-0000-0000-0000-00000000d003',
              '00000000-0000-0000-0000-00000000e001'))='Asha R',
            'the collision names who got there first');

select t_ok((select count(*) from app.candidate_duplicates(
              '00000000-0000-0000-0000-00000000c001','ROHIT.MENON@mail.example',null,null))=1,
            'duplicate candidate check matches on email regardless of case');

select t_blocked($$select app.advance_submission(
                   '00000000-0000-0000-0000-00000000f001','client',null)$$,
  'a colleague cannot push someone else''s submission forward','only the owner');

\echo ''
\echo '-- 5. the account manager loop -------------------------------------'
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a2',false);
select t_ok((select count(*) from v_trainer_queue where status='internal')=1,
            'the submission appears in the trainer queue');

select t_blocked($$update submissions set status='query'
                   where id='00000000-0000-0000-0000-00000000f001'$$,
  'moving to Awaiting Trainee Response without asking anything is refused','query');

insert into sub_messages (batch_id,submission_id,author_id,kind,body)
values ('00000000-0000-0000-0000-00000000c001','00000000-0000-0000-0000-00000000f001',
        '00000000-0000-0000-0000-0000000000a2','query',
        'What did the candidate say about the night shift specifically, and is the '
        'forklift licence counterbalance or reach?');
update submissions set status='query' where id='00000000-0000-0000-0000-00000000f001';

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000b1',false);
select t_ok((select count(*) from notifications where kind='query')=1,
            'the trainee is notified that a query is waiting on them');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a2',false);

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000b1',false);
select t_blocked($$update submissions set status='internal'
                   where id='00000000-0000-0000-0000-00000000f001'$$,
  'resubmitting without answering the query is refused','Answer the account manager');

insert into sub_messages (batch_id,submission_id,author_id,kind,body)
values ('00000000-0000-0000-0000-00000000c001','00000000-0000-0000-0000-00000000f001',
        '00000000-0000-0000-0000-0000000000b1','response',
        'Counterbalance, renewed in March. He has worked nights for two years and '
        'asked only about the break pattern.');
update submissions set status='internal' where id='00000000-0000-0000-0000-00000000f001';
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a2',false);
select t_ok((select count(*) from notifications where kind='response')=1,
            'the trainer is notified that the query was answered');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000b1',false);

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a2',false);
update submissions set status='client' where id='00000000-0000-0000-0000-00000000f001';
select t_ok((select sendout_at is not null from submissions
             where id='00000000-0000-0000-0000-00000000f001'),
            'sendout_at is stamped on client submission');
update submissions set status='interview' where id='00000000-0000-0000-0000-00000000f001';
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000b1',false);
select t_ok((select count(*) from notifications where kind='interview')=1,
            'the trainee is notified that the client wants to interview');
select t_ok((select count(*) from notifications)=3,
            'a trainee sees only their own notifications');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a2',false);

\echo ''
\echo '-- 6. rejection needs a reason -------------------------------------'
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000b1',false);
insert into candidates (id,batch_id,name,email,source,created_by)
values ('00000000-0000-0000-0000-00000000e002','00000000-0000-0000-0000-00000000c001',
        'Priya Raman','priya.raman@mail.example','job_board',
        '00000000-0000-0000-0000-0000000000b1');
insert into submissions (id,batch_id,job_id,candidate_id,owner_id,status,summary,created_by)
values ('00000000-0000-0000-0000-00000000f002','00000000-0000-0000-0000-00000000c001',
        '00000000-0000-0000-0000-00000000d003','00000000-0000-0000-0000-00000000e002',
        '00000000-0000-0000-0000-0000000000b1','sourced','Two years picking, no licence.',
        '00000000-0000-0000-0000-0000000000b1');
update submissions set status='internal' where id='00000000-0000-0000-0000-00000000f002';

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a2',false);
select t_blocked($$update submissions set status='rejected'
                   where id='00000000-0000-0000-0000-00000000f002'$$,
  'a rejection without a reason is refused','reason');
update submissions set status='rejected', rejection_code='skills', rejection_stage='internal',
       rejection_note='No forklift licence and the job says preferred, not optional.'
 where id='00000000-0000-0000-0000-00000000f002';
select t_ok((select closed_at is not null from submissions
             where id='00000000-0000-0000-0000-00000000f002'),'closed_at is stamped on a terminal status');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000b1',false);
select t_ok((select body like '%%No forklift licence%%' or body like '%%Skills do not match%%'
             from notifications where kind='rejected'),
            'the rejection notification carries the reason, not just the outcome');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a2',false);

\echo ''
\echo '-- 7. reporting ----------------------------------------------------'
select t_ok((select submissions from v_trainee_scorecard
             where employee_id='E1001')=2,'scorecard counts the trainee''s submissions');
select t_ok((select sent_to_client from v_trainee_scorecard
             where employee_id='E1001')=1,'scorecard counts what reached the client');
select t_ok((select pct_internal_to_client from v_trainee_scorecard
             where employee_id='E1001')=50.0,'scorecard computes internal-to-client conversion');
select t_ok((select queries_received from v_trainee_scorecard
             where employee_id='E1001')=1,'scorecard counts queries received');
select t_ok((select rejected_coachable from v_trainee_scorecard
             where employee_id='E1001')=1,'scorecard separates coachable rejections');
select t_ok((select count(*) from activity
             where actor_id='00000000-0000-0000-0000-0000000000b1')>=4,
            'the trainee footprint is recorded and readable');

\echo ''
\echo '-- 7b. administration ----------------------------------------------'
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a3',false);
select t_ok((select count(*) from app.roster() where employee_id='E1001')=1,
            'a trainer can see a trainee who is not yet on any of their batches');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000b1',false);
select t_ok((select count(*) from profiles where employee_id='E1003')=0,
            'a trainee still cannot see someone from another batch');

-- The first membership on a new batch is the one that used to be impossible.
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a3',false);
insert into batches (id,name,join_code,created_by)
values ('00000000-0000-0000-0000-00000000c003','Batch 9 — Trial','BATCH9',
        '00000000-0000-0000-0000-0000000000a3');
insert into batch_members (batch_id,user_id,role_in_batch)
values ('00000000-0000-0000-0000-00000000c003','00000000-0000-0000-0000-0000000000a3','trainer');
select t_ok((select count(*) from batch_members
             where batch_id='00000000-0000-0000-0000-00000000c003')=1,
            'a trainer can staff the batch they just created');
select t_blocked($$
  insert into batch_members (batch_id,user_id,role_in_batch)
  values ('00000000-0000-0000-0000-00000000c001','00000000-0000-0000-0000-0000000000b3','trainee')$$,
  'a trainer cannot add people to someone else''s batch','policy');

\echo ''
\echo '-- 8. archive is enforced by the database --------------------------'
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a2',false);
update batches set status='archived', archived_at=now()
 where id='00000000-0000-0000-0000-00000000c001';
select t_blocked($$
  insert into candidates (batch_id,name,created_by)
  values ('00000000-0000-0000-0000-00000000c001','Too Late',
          '00000000-0000-0000-0000-0000000000a2')$$,
  'no writes into an archived batch, even by the trainer','policy');
select t_ok((select count(*) from candidates)=2,'an archived batch is still fully readable');

\echo ''
\echo '-- 9. activity is append-only --------------------------------------'
select t_blocked($$update activity set verb='tampered' where id=(select min(id) from activity)$$,
  'activity cannot be altered','cannot be changed');
select t_blocked($$delete from activity where id=(select min(id) from activity)$$,
  'activity cannot be deleted','cannot be changed');
select t_blocked($$update sub_messages set body='softened' where kind='query'$$,
  'a query cannot be reworded after the trainee has answered it','cannot be changed');

select t_ok((select count(*) from auth_secrets)=0,
            'the credential store is invisible to every client role');

reset role;
\echo ''
\echo 'ALL POLICY AND WORKFLOW CHECKS PASSED'
