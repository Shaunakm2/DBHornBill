-- =====================================================================
-- 02_smoke.sql — the whole population, every combination.
--
-- Not a policy unit test. This builds a realistic training operation and
-- then tries, from each account in turn, everything that account might
-- plausibly attempt — including the things it should not be able to do.
--
--   SA          super admin
--   T1, T2      trainers
--   E1 E2       trainees on B1 (collaborative)
--   E3 E4       trainees on B2 (parallel)
--   E5          trainee on B3 (archived)
--   E6          trainee on no batch at all
--   E7          deactivated trainee, still a member of B1
--   E8          trainee on BOTH B1 and B2
-- =====================================================================
\set ON_ERROR_STOP on

create or replace function s_ok(cond boolean, msg text) returns void
language plpgsql as $$
begin
  if not cond then raise exception 'FAILED: %', msg; end if;
  raise notice 'ok   %', msg;
end $$;

create or replace function s_blocked(stmt text, msg text) returns void
language plpgsql as $$
begin
  begin execute stmt;
  exception when others then raise notice 'ok   % (%)', msg, left(sqlerrm,58); return;
  end;
  raise exception 'FAILED: % — allowed, and should not have been', msg;
end $$;

-- A refused UPDATE does not raise: row-level security filters the row away
-- and the statement succeeds having changed nothing. That is correct at the
-- database and dangerous at the interface, where "0 rows" looks like success.
-- These checks assert the data is untouched AND record the silence.
create or replace function s_noeffect(stmt text, probe text, expected text, msg text)
returns void language plpgsql as $$
declare got text;
begin
  begin execute stmt; exception when others then
    raise notice 'ok   % (refused outright: %)', msg, left(sqlerrm,40); return;
  end;
  execute probe into got;
  if got is distinct from expected then
    raise exception 'FAILED: % — the row actually changed to %', msg, got;
  end if;
  raise notice 'ok   % (silently affected no rows)', msg;
end $$;

create or replace function be(u text) returns void language sql as $$
  select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-11111111'||u,false)::void
$$;

-- ---------------------------------------------------------------- people
insert into auth.users (id,email) values
 ('00000000-0000-0000-0000-11111111a001','sa@corp.example'),
 ('00000000-0000-0000-0000-11111111a011','t1@corp.example'),
 ('00000000-0000-0000-0000-11111111a012','t2@corp.example'),
 ('00000000-0000-0000-0000-11111111b001',null),
 ('00000000-0000-0000-0000-11111111b002',null),
 ('00000000-0000-0000-0000-11111111b003',null),
 ('00000000-0000-0000-0000-11111111b004',null),
 ('00000000-0000-0000-0000-11111111b005',null),
 ('00000000-0000-0000-0000-11111111b006',null),
 ('00000000-0000-0000-0000-11111111b007',null),
 ('00000000-0000-0000-0000-11111111b008',null);

insert into profiles (id,role,full_name,employee_id,email,is_active) values
 ('00000000-0000-0000-0000-11111111a001','super_admin','S Admin',null,'sa@corp.example',true),
 ('00000000-0000-0000-0000-11111111a011','trainer','T One','E9001','t1@corp.example',true),
 ('00000000-0000-0000-0000-11111111a012','trainer','T Two',null,'t2@corp.example',true),
 ('00000000-0000-0000-0000-11111111b001','trainee','Asha R','S1001',null,true),
 ('00000000-0000-0000-0000-11111111b002','trainee','Bilal K','S1002',null,true),
 ('00000000-0000-0000-0000-11111111b003','trainee','Chen W','S1003',null,true),
 ('00000000-0000-0000-0000-11111111b004','trainee','Dia P','S1004',null,true),
 ('00000000-0000-0000-0000-11111111b005','trainee','Emeka O','S1005',null,true),
 ('00000000-0000-0000-0000-11111111b006','trainee','Fay L','S1006',null,true),
 ('00000000-0000-0000-0000-11111111b007','trainee','Gita M','S1007',null,false),
 ('00000000-0000-0000-0000-11111111b008','trainee','Hari N','S1008',null,true);

insert into batches (id,name,join_code,mode,status,desk_type,created_by) values
 ('00000000-0000-0000-0000-11111111c001','Batch 1','SMOKE1','collaborative','active','d180',
  '00000000-0000-0000-0000-11111111a011'),
 ('00000000-0000-0000-0000-11111111c002','Batch 2','SMOKE2','parallel','active','d180',
  '00000000-0000-0000-0000-11111111a012'),
 ('00000000-0000-0000-0000-11111111c003','Batch 3','SMOKE3','collaborative','active','d180',
  '00000000-0000-0000-0000-11111111a011');

insert into batch_members (batch_id,user_id,role_in_batch) values
 ('00000000-0000-0000-0000-11111111c001','00000000-0000-0000-0000-11111111a011','trainer'),
 ('00000000-0000-0000-0000-11111111c001','00000000-0000-0000-0000-11111111b001','trainee'),
 ('00000000-0000-0000-0000-11111111c001','00000000-0000-0000-0000-11111111b002','trainee'),
 ('00000000-0000-0000-0000-11111111c001','00000000-0000-0000-0000-11111111b007','trainee'),
 ('00000000-0000-0000-0000-11111111c001','00000000-0000-0000-0000-11111111b008','trainee'),
 ('00000000-0000-0000-0000-11111111c002','00000000-0000-0000-0000-11111111a012','trainer'),
 ('00000000-0000-0000-0000-11111111c002','00000000-0000-0000-0000-11111111b003','trainee'),
 ('00000000-0000-0000-0000-11111111c002','00000000-0000-0000-0000-11111111b004','trainee'),
 ('00000000-0000-0000-0000-11111111c002','00000000-0000-0000-0000-11111111b008','trainee'),
 ('00000000-0000-0000-0000-11111111c003','00000000-0000-0000-0000-11111111a011','trainer'),
 ('00000000-0000-0000-0000-11111111c003','00000000-0000-0000-0000-11111111b005','trainee');

set role app_user;

\echo ''
\echo '=== 1. trainers build their desks ================================='
select be('a011');
insert into companies (id,batch_id,name,created_by) values
 ('00000000-0000-0000-0000-11111111d001','00000000-0000-0000-0000-11111111c001','Northwind',
  '00000000-0000-0000-0000-11111111a011'),
 ('00000000-0000-0000-0000-11111111d003','00000000-0000-0000-0000-11111111c003','Pemberton',
  '00000000-0000-0000-0000-11111111a011');
insert into job_orders (id,batch_id,company_id,title,description,employment_type,
                        pay_rate,bill_rate,openings,created_by) values
 ('00000000-0000-0000-0000-11111111e001','00000000-0000-0000-0000-11111111c001',
  '00000000-0000-0000-0000-11111111d001','Warehouse Operative','Nights.','Contract',
  14.5,21,2,'00000000-0000-0000-0000-11111111a011'),
 ('00000000-0000-0000-0000-11111111e003','00000000-0000-0000-0000-11111111c003',
  '00000000-0000-0000-0000-11111111d003','Picker','Days.','Contract',
  12,17,1,'00000000-0000-0000-0000-11111111a011');
select s_ok((select ref from job_orders where id='00000000-0000-0000-0000-11111111e001')='JO-0001',
            'per-batch references restart at 1 in each batch');
select s_ok((select ref from job_orders where id='00000000-0000-0000-0000-11111111e003')='JO-0001',
            'a second batch has its own JO-0001, not JO-0002');

select be('a012');
insert into companies (id,batch_id,name,created_by) values
 ('00000000-0000-0000-0000-11111111d002','00000000-0000-0000-0000-11111111c002','Halcyon',
  '00000000-0000-0000-0000-11111111a012');
insert into job_orders (id,batch_id,company_id,title,description,employment_type,
                        pay_rate,bill_rate,created_by) values
 ('00000000-0000-0000-0000-11111111e002','00000000-0000-0000-0000-11111111c002',
  '00000000-0000-0000-0000-11111111d002','Care Assistant','Days.','Contract',
  15,22,'00000000-0000-0000-0000-11111111a012');

select s_ok((select count(*) from job_orders)=1,'a trainer sees only their own batch''s job orders');
-- The probe has to run as someone who can see the row: T2 cannot read it
-- either, so from there "unchanged" and "invisible" look identical.
update job_orders set title='hijacked' where id='00000000-0000-0000-0000-11111111e001';
select be('a011');
select s_ok((select title from job_orders where id='00000000-0000-0000-0000-11111111e001')
            ='Warehouse Operative',
            'a trainer cannot edit another trainer''s job order (silently affects no rows)');
select be('a012');
select s_blocked($$insert into companies (batch_id,name,created_by)
  values ('00000000-0000-0000-0000-11111111c001','Sneaky',
          '00000000-0000-0000-0000-11111111a012')$$,
  'a trainer cannot add a client to another trainer''s batch');

\echo ''
\echo '=== 2. collaborative batch: two trainees, one desk ================'
select be('b001');
select s_ok((select count(*) from job_orders)=1,'E1 sees the batch job order');
insert into candidates (id,batch_id,name,email,phone,source,created_by) values
 ('00000000-0000-0000-0000-11111111f001','00000000-0000-0000-0000-11111111c001',
  'Rohit Menon','rohit@mail.example','+15550142','pool','00000000-0000-0000-0000-11111111b001');
insert into submissions (id,batch_id,job_id,candidate_id,owner_id,status,summary,created_by) values
 ('00000000-0000-0000-0000-11111111f101','00000000-0000-0000-0000-11111111c001',
  '00000000-0000-0000-0000-11111111e001','00000000-0000-0000-0000-11111111f001',
  '00000000-0000-0000-0000-11111111b001','sourced','Five years RF scanning, licence held.',
  '00000000-0000-0000-0000-11111111b001');
insert into notes (batch_id,target_type,target_id,action,body,author_id) values
 ('00000000-0000-0000-0000-11111111c001','candidate','00000000-0000-0000-0000-11111111f001',
  'screen','Screened twenty minutes, right to work seen.',
  '00000000-0000-0000-0000-11111111b001');

select be('b002');
select s_ok((select count(*) from candidates where batch_id='00000000-0000-0000-0000-11111111c001')=1,
            'E2 sees a colleague''s candidate in a collaborative batch');
select s_ok((select count(*) from notes)=1,'E2 can read a colleague''s screening note');
select s_blocked($$insert into submissions (batch_id,job_id,candidate_id,owner_id,status,created_by)
  values ('00000000-0000-0000-0000-11111111c001','00000000-0000-0000-0000-11111111e001',
          '00000000-0000-0000-0000-11111111f001','00000000-0000-0000-0000-11111111b002',
          'sourced','00000000-0000-0000-0000-11111111b002')$$,
  'E2 cannot submit the same candidate to the same job');
select s_ok((select owner_name from public.existing_submission(
              '00000000-0000-0000-0000-11111111e001','00000000-0000-0000-0000-11111111f001'))='Asha R',
            'the collision names who got there first');
select s_blocked($$select app.advance_submission(
                   '00000000-0000-0000-0000-11111111f101','internal',null)$$,
  'E2 cannot move a colleague''s submission');

\echo ''
\echo '=== 3. parallel batch: trainees are walled off ===================='
select be('b003');
insert into candidates (id,batch_id,name,source,created_by) values
 ('00000000-0000-0000-0000-11111111f003','00000000-0000-0000-0000-11111111c002',
  'Priya Raman','pool','00000000-0000-0000-0000-11111111b003');
select s_ok((select count(*) from job_orders)=1,
            'a trainee in a parallel batch can see the job order they must work');
select s_ok((select count(*) from companies)=1,
            'and the client it belongs to');
select be('b004');
select s_ok((select count(*) from candidates)=0,
            'in a parallel batch a trainee does not see a colleague''s candidate');
select s_ok((select count(*) from job_orders)=1,
            'but still sees the shared job order');
select be('a012');
select s_ok((select count(*) from candidates)=1,
            'the trainer of a parallel batch still sees everything in it');

\echo ''
\echo '=== 4. the account manager loop =================================='
select be('a011');
select s_blocked($$select app.advance_submission(
                   '00000000-0000-0000-0000-11111111f101','client',null)$$,
  'the trainer cannot skip the trainee''s internal submission');
select be('b001');
select app.advance_submission('00000000-0000-0000-0000-11111111f101','internal',null);
select be('a011');
insert into sub_messages (batch_id,submission_id,author_id,kind,body) values
 ('00000000-0000-0000-0000-11111111c001','00000000-0000-0000-0000-11111111f101',
  '00000000-0000-0000-0000-11111111a011','query','Counterbalance or reach licence?');
select app.advance_submission('00000000-0000-0000-0000-11111111f101','query',null);
select be('b001');
select s_blocked($$select app.advance_submission(
                   '00000000-0000-0000-0000-11111111f101','internal',null)$$,
  'the trainee cannot resubmit without answering the query');
insert into sub_messages (batch_id,submission_id,author_id,kind,body) values
 ('00000000-0000-0000-0000-11111111c001','00000000-0000-0000-0000-11111111f101',
  '00000000-0000-0000-0000-11111111b001','response','Counterbalance, renewed in March.');
select app.advance_submission('00000000-0000-0000-0000-11111111f101','internal',null);
select be('a011');
select app.advance_submission('00000000-0000-0000-0000-11111111f101','client',null);
select app.advance_submission('00000000-0000-0000-0000-11111111f101','interview',null);
select s_ok((select status from submissions where id='00000000-0000-0000-0000-11111111f101')='interview',
            'the full loop reaches interview');
select be('b001');
select s_ok((select count(*) from notifications where kind='interview')=1,
            'the trainee is told about the interview');
select s_ok((select count(*) from notifications)>=3,
            'the trainee has the whole trail: query, sendout, interview');

\echo ''
\echo '=== 5. the deactivated account ==================================='
select be('b007');
select s_ok((select count(*) from job_orders)=0,
            'a deactivated trainee sees no job orders');
select s_ok((select count(*) from candidates)=0,
            'a deactivated trainee sees no candidates');
select s_blocked($$insert into candidates (batch_id,name,created_by)
  values ('00000000-0000-0000-0000-11111111c001','Ghost',
          '00000000-0000-0000-0000-11111111b007')$$,
  'a deactivated trainee cannot add a candidate');
select s_blocked($$insert into notes (batch_id,target_type,target_id,body,author_id)
  values ('00000000-0000-0000-0000-11111111c001','candidate',
          '00000000-0000-0000-0000-11111111f001','still here',
          '00000000-0000-0000-0000-11111111b007')$$,
  'a deactivated trainee cannot write a note');

\echo ''
\echo '=== 6. the trainee on no batch ==================================='
select be('b006');
select s_ok((select count(*) from batches)=0,'a trainee on no batch sees no batches');
select s_ok((select count(*) from job_orders)=0,'and no job orders');
select s_blocked($$insert into candidates (batch_id,name,created_by)
  values ('00000000-0000-0000-0000-11111111c001','Nope',
          '00000000-0000-0000-0000-11111111b006')$$,
  'and cannot write into a batch they are not on');

\echo ''
\echo '=== 7. the trainee on two batches ================================'
select be('b008');
select s_ok((select count(*) from batches)=2,'E8 sees both of their batches');
select s_ok((select count(*) from job_orders)=2,'E8 sees the job orders of both');
select s_ok((select count(*) from candidates)=1,
            'E8 sees B1''s shared candidate but not B2''s, because B2 is parallel');

\echo ''
\echo '=== 8. archiving ================================================='
select be('a011');
update batches set status='archived', archived_at=now()
 where id='00000000-0000-0000-0000-11111111c003';
select be('b005');
select s_ok((select count(*) from job_orders)=1,'an archived batch is still readable');
select s_blocked($$insert into candidates (batch_id,name,created_by)
  values ('00000000-0000-0000-0000-11111111c003','Too late',
          '00000000-0000-0000-0000-11111111b005')$$,
  'nothing can be written into an archived batch');
select be('a011');
select s_blocked($$insert into job_orders (batch_id,company_id,title,description,
    employment_type,pay_rate,bill_rate,created_by)
  values ('00000000-0000-0000-0000-11111111c003','00000000-0000-0000-0000-11111111d003',
          'Late','x','Contract',12,17,'00000000-0000-0000-0000-11111111a011')$$,
  'not even the trainer can write into an archived batch');

\echo ''
\echo '=== 9. the super admin ==========================================='
select be('a001');
select s_ok((select count(*) from batches where join_code like 'SMOKE%')=3,
            'the admin sees every batch');
select s_ok((select count(*) from candidates
             where batch_id::text like '%1111%')=2,'the admin sees every candidate');
select s_ok((select count(*) from public.roster() where employee_id like 'S10%')=8,
            'the admin sees every account created here');
select s_ok((select count(*) from v_trainee_scorecard where employee_id like 'S10%')=8,
            'the scorecard covers every trainee membership, including the dual one');

\echo ''
\echo '=== 10. reporting ================================================'
select be('a011');
select s_ok((select sent_to_client from v_trainee_scorecard
             where employee_id='S1001')=1,'E1''s sendout is counted');
select s_ok((select queries_received from v_trainee_scorecard
             where employee_id='S1001')=1,'E1''s query is counted');
select s_ok((select count(*) from v_trainer_queue)>=1,'the trainer queue is populated');
select be('b001');
select s_ok((select count(*) from v_trainee_scorecard where employee_id='S1002')=1,
            'in a collaborative batch a trainee can see a colleague''s scorecard row');

\echo ''
\echo '=== 11. staff reporting =========================================='
select be('a011');
select s_ok((select count(*) from public.rpt_batches() where join_code like 'SMOKE%')=3,
            'a trainer can read the numbers for every batch');
select s_ok((select bool_and(mine) from public.rpt_batches()
             where join_code in ('SMOKE1','SMOKE3')),
            'their own batches are flagged as theirs');
select s_ok((select mine from public.rpt_batches() where join_code='SMOKE2')=false,
            'another trainer''s batch is flagged as not theirs');
select s_ok((select trainees from public.rpt_batches() where join_code='SMOKE1')=4,
            'the batch summary counts trainees');
select s_ok((select sent_to_client from public.rpt_batches() where join_code='SMOKE1')=1,
            'and counts what reached the client');

-- Read-only means read-only: the numbers for another trainer's batch are
-- visible, the records behind them are not.
select s_ok((select count(*) from candidates
             where batch_id='00000000-0000-0000-0000-11111111c002')=0,
            'a trainer still cannot read another batch''s candidate records');

select s_ok((select count(*) from public.rpt_scorecard() where employee_id like 'S10%')>=5,
            'the scorecard covers every batch the trainer may report on');
select s_ok((select count(*) from public.rpt_scorecard(
              '00000000-0000-0000-0000-11111111c001'))=4,
            'the scorecard can be narrowed to one batch');
select s_ok((select count(*) from public.rpt_activity()) > 0,'the activity report returns rows');
select s_ok((select count(*) from public.rpt_queue()) >= 1,'the queue report returns rows');

select be('a001');
select s_ok((select count(*) from public.rpt_batches() where join_code like 'SMOKE%')=3,
            'the administrator sees the same batch summary');

-- A trainee must not be able to report across other people's desks.
select be('b001');
select s_blocked($$select count(*) from public.rpt_batches()$$,
  'a trainee cannot run the batch summary');
select s_blocked($$select count(*) from public.rpt_scorecard()$$,
  'a trainee cannot run the scorecard report');
select s_blocked($$select count(*) from public.rpt_activity()$$,
  'a trainee cannot run the activity report');

\echo ''
\echo '=== 12. trainee sign-in =========================================='
-- Never exercised end to end before, which is exactly why an ambiguous
-- column reference reached a live classroom. Run as the service role,
-- because that is who the Edge Function is.
reset role;
set role service_role;

insert into auth_secrets (user_id, password, auth_email) values
 ('00000000-0000-0000-0000-11111111b001','pw-e1','s1001@trainees.invalid'),
 ('00000000-0000-0000-0000-11111111b007','pw-e7','s1007@trainees.invalid'),
 ('00000000-0000-0000-0000-11111111b005','pw-e5','s1005@trainees.invalid')
on conflict (user_id) do nothing;

select s_ok((select o_batch_name from app.trainee_login_lookup('S1001','SMOKE1'))='Batch 1',
            'a trainee signs in with their employee ID and batch code');
select s_ok((select o_auth_email from app.trainee_login_lookup('s1001','smoke1'))
            ='s1001@trainees.invalid',
            'the lookup is case insensitive on both fields');
select s_ok((select o_password from app.trainee_login_lookup(' S1001 ','SMOKE1'))='pw-e1',
            'and tolerates stray whitespace');

select s_blocked($$select app.trainee_login_lookup('S1001','SMOKE2')$$,
  'the right ID against the wrong batch code is refused');
select s_blocked($$select app.trainee_login_lookup('S9999','SMOKE1')$$,
  'an unknown employee ID is refused');
select s_blocked($$select app.trainee_login_lookup('S1001','NOSUCH')$$,
  'an unknown batch code is refused');
select s_blocked($$select app.trainee_login_lookup('S1007','SMOKE1')$$,
  'a deactivated trainee cannot sign in');
select s_blocked($$select app.trainee_login_lookup('S1005','SMOKE3')$$,
  'a trainee on an archived batch cannot sign in');

reset role;
set role app_user;
select s_blocked($$select public.trainee_login_lookup('S1001','SMOKE1')$$,
  'a browser session still cannot call the credential lookup');

reset role;
\echo ''
\echo 'SMOKE TEST COMPLETE'
