-- =====================================================================
-- 0001_schema.sql
-- Recruitment ATS training platform — tables and reference data.
--
-- Design notes that matter:
--   * A batch is the tenant boundary. Everything domain-level carries
--     batch_id. Cross-batch visibility is impossible by construction.
--   * Status lists and the transition matrix are DATA, not enums, so a
--     trainer can rename a stage without a migration. This mirrors the
--     per-tenant configuration in the platform being taught.
--   * Every row records who made it and who last touched it. Every
--     material act also lands in activity, which is append-only and is
--     the footprint record the trainee and the trainer both read.
-- =====================================================================

create schema if not exists app;
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- enums
-- Only structural things are enums. Anything a trainer might reword is a
-- lookup table instead.
create type app_role     as enum ('super_admin','trainer','trainee');
create type batch_status as enum ('active','archived');
create type batch_mode   as enum ('collaborative','parallel');
create type note_target  as enum ('candidate','job_order','contact','company','submission');

-- ---------------------------------------------------------------- people
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  role          app_role not null,
  full_name     text not null,
  employee_id   text unique,              -- trainees log in with this; null for staff
  email         text,
  is_active     boolean not null default true,
  created_by    uuid references profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint trainee_needs_employee_id
    check (role <> 'trainee' or employee_id is not null)
);
comment on column profiles.employee_id is
  'One identity per person across every batch, so activity history follows them.';

-- ---------------------------------------------------------------- batches
create table batches (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  join_code     text not null unique,     -- second login field for trainees
  mode          batch_mode   not null default 'collaborative',
  status        batch_status not null default 'active',
  desk_type     text not null default 'd180'
                  check (desk_type in ('d180','d360','dvms')),
  starts_on     date,
  ends_on       date,
  created_by    uuid not null references profiles(id),
  archived_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint join_code_shape check (join_code ~ '^[A-Z0-9-]{4,24}$')
);

create table batch_members (
  batch_id      uuid not null references batches(id) on delete cascade,
  user_id       uuid not null references profiles(id) on delete cascade,
  role_in_batch app_role not null check (role_in_batch in ('trainer','trainee')),
  joined_at     timestamptz not null default now(),
  primary key (batch_id, user_id)
);
create index on batch_members(user_id);

-- ------------------------------------------------- configurable picklists
-- Global defaults live with batch_id null; a batch may override a label
-- or hide a stage without affecting anyone else.
create table submission_statuses (
  code        text primary key,
  label       text not null,
  stage_order int  not null,
  set_by      app_role not null,          -- who is allowed to move INTO this state
  is_terminal boolean not null default false,
  is_open     boolean not null default true,
  min_desk    int not null default 1      -- 1 = 180 and above, 2 = 360+, 3 = VMS only
);

create table submission_transitions (
  from_code text not null references submission_statuses(code),
  to_code   text not null references submission_statuses(code),
  actor     app_role not null,
  primary key (from_code, to_code, actor)
);

create table rejection_reasons (
  code        text primary key,
  label       text not null,
  sort_order  int not null,
  coachable   boolean not null default false  -- true = trainee could have prevented it
);
comment on column rejection_reasons.coachable is
  'Separates "the trainee got it wrong" from "the market moved". The split '
  'is the single most useful number in the end-of-batch report.';

create table note_actions (
  code text primary key, label text not null, sort_order int not null
);

create table candidate_sources (
  code text primary key, label text not null, sort_order int not null
);

-- ---------------------------------------------------------------- desk data
create table companies (
  id          uuid primary key default gen_random_uuid(),
  batch_id    uuid not null references batches(id) on delete cascade,
  name        text not null,
  industry    text,
  location    text,
  created_by  uuid not null references profiles(id),
  updated_by  uuid references profiles(id),
  version     int  not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (batch_id, name)
);

create table contacts (
  id          uuid primary key default gen_random_uuid(),
  batch_id    uuid not null references batches(id) on delete cascade,
  company_id  uuid not null references companies(id) on delete cascade,
  name        text not null,
  title       text,
  email       text,
  phone       text,
  created_by  uuid not null references profiles(id),
  updated_by  uuid references profiles(id),
  version     int  not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index on contacts(batch_id, company_id);

create table job_orders (
  id            uuid primary key default gen_random_uuid(),
  batch_id      uuid not null references batches(id) on delete cascade,
  company_id    uuid not null references companies(id),
  contact_id    uuid references contacts(id),
  ref           text not null,                       -- JO-0001, shown to trainees
  title         text not null,
  description   text not null,
  employment_type text not null default 'Contract'
                  check (employment_type in ('Contract','Direct Hire')),
  category      text,
  location      text,
  openings      int  not null default 1 check (openings > 0),
  pay_rate      numeric(10,2),
  bill_rate     numeric(10,2),
  salary        numeric(12,2),
  flat_fee      numeric(12,2),
  status        text not null default 'Open'
                  check (status in ('Open','Covered','Filled','Closed','Cancelled')),
  submission_target int not null default 3,          -- what "covered" means here
  created_by    uuid not null references profiles(id),
  updated_by    uuid references profiles(id),
  version       int  not null default 1,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (batch_id, ref),
  -- A contract role needs hourly rates; a permanent role needs salary and fee.
  -- Getting this wrong once killed 30% of the flow in the single-player build.
  constraint pricing_matches_type check (
    (employment_type = 'Contract'   and pay_rate is not null and bill_rate is not null)
    or (employment_type = 'Direct Hire' and salary is not null)
  ),
  constraint margin_positive check (
    employment_type <> 'Contract' or bill_rate > pay_rate
  )
);
create index on job_orders(batch_id, status);

-- Empty assignment set = open pool, anyone in the batch may work it.
create table job_assignments (
  job_id      uuid not null references job_orders(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  assigned_by uuid not null references profiles(id),
  assigned_at timestamptz not null default now(),
  primary key (job_id, user_id)
);
create index on job_assignments(user_id);

create table candidates (
  id            uuid primary key default gen_random_uuid(),
  batch_id      uuid not null references batches(id) on delete cascade,
  ref           text not null,
  name          text not null,
  email         text,
  phone         text,
  location      text,
  occupation    text,
  skills        text[] not null default '{}',
  source        text references candidate_sources(code),
  pool_ref      text,            -- seed-pool id when sourced from the local pool
  external_url  text,            -- where an externally sourced candidate came from
  desired_rate  numeric(10,2),
  availability  text,
  resume_text   text,
  status        text not null default 'Active',
  created_by    uuid not null references profiles(id),
  updated_by    uuid references profiles(id),
  version       int  not null default 1,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (batch_id, ref)
);
create index on candidates(batch_id);
create index on candidates(batch_id, lower(email));
create index on candidates(batch_id, phone);
-- Deliberately NOT unique. A duplicate candidate is a warning the trainee
-- must read and act on, not an error the database hides.

create table submissions (
  id              uuid primary key default gen_random_uuid(),
  batch_id        uuid not null references batches(id) on delete cascade,
  job_id          uuid not null references job_orders(id) on delete cascade,
  candidate_id    uuid not null references candidates(id) on delete cascade,
  owner_id        uuid not null references profiles(id),   -- the trainee whose work this is
  status          text not null references submission_statuses(code),
  summary         text,                                    -- the write-up sent to the AM
  pay_expectation numeric(10,2),
  bill_rate       numeric(10,2),
  rejection_code  text references rejection_reasons(code),
  rejection_stage text,
  rejection_note  text,
  submitted_at    timestamptz,      -- first Internal Submission
  sendout_at      timestamptz,      -- moved to Client Submission
  closed_at       timestamptz,
  created_by      uuid not null references profiles(id),
  updated_by      uuid references profiles(id),
  version         int  not null default 1,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- The collision that teaches the most. Two trainees cannot both submit
  -- the same person to the same role; the second must be told who got there first.
  unique (job_id, candidate_id)
);
create index on submissions(batch_id, status);
create index on submissions(owner_id);
create index on submissions(job_id);

-- The query loop. kind='query' is the trainer asking; kind='response' is
-- the trainee answering. Both are immutable once written.
create table sub_messages (
  id            uuid primary key default gen_random_uuid(),
  batch_id      uuid not null references batches(id) on delete cascade,
  submission_id uuid not null references submissions(id) on delete cascade,
  author_id     uuid not null references profiles(id),
  kind          text not null check (kind in ('query','response','note','decision')),
  body          text not null check (length(btrim(body)) > 0),
  created_at    timestamptz not null default now()
);
create index on sub_messages(submission_id, created_at);

create table notes (
  id           uuid primary key default gen_random_uuid(),
  batch_id     uuid not null references batches(id) on delete cascade,
  target_type  note_target not null,
  target_id    uuid not null,
  action       text references note_actions(code),
  body         text not null check (length(btrim(body)) > 0),
  author_id    uuid not null references profiles(id),
  created_at   timestamptz not null default now()
);
create index on notes(batch_id, target_type, target_id, created_at desc);
-- No updated_at and no update policy. Notes are a record of what was said
-- at the time. Rewriting them quietly is precisely the habit to prevent.

create table notifications (
  id          uuid primary key default gen_random_uuid(),
  batch_id    uuid not null references batches(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  kind        text not null,
  body        text not null,
  link_type   text,
  link_id     uuid,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index on notifications(user_id, read_at, created_at desc);

create table activity (
  id          bigserial primary key,
  batch_id    uuid not null references batches(id) on delete cascade,
  actor_id    uuid references profiles(id),
  verb        text not null,
  entity_type text not null,
  entity_id   uuid,
  detail      jsonb not null default '{}'::jsonb,
  at          timestamptz not null default now()
);
create index on activity(batch_id, at desc);
create index on activity(actor_id, at desc);
create index on activity(entity_type, entity_id);
-- Append only. No update or delete policy is ever granted, to anyone.

-- ---------------------------------------------------------------- reference data
insert into submission_statuses (code,label,stage_order,set_by,is_terminal,is_open,min_desk) values
  ('sourced',   'Sourced',                   1,'trainee',false,true, 1),
  ('internal',  'Internal Submission',       2,'trainee',false,true, 1),
  ('query',     'Awaiting Trainee Response', 3,'trainer',false,true, 1),
  ('client',    'Client Submission',         4,'trainer',false,true, 1),
  ('interview', 'Interview Scheduled',       5,'trainer',false,true, 1),
  ('offer',     'Offer Extended',            6,'trainer',false,true, 2),
  ('placed',    'Placed',                    7,'trainer',true, false,2),
  ('rejected',  'Rejected',                  8,'trainer',true, false,1),
  ('withdrawn', 'Withdrawn',                 9,'trainee',true, false,1);

-- The transition matrix. A trigger enforces this, so adding a stage later
-- is an insert here rather than a code change.
insert into submission_transitions (from_code,to_code,actor) values
  ('sourced',  'internal', 'trainee'),
  ('sourced',  'withdrawn','trainee'),
  ('internal', 'query',    'trainer'),
  ('internal', 'client',   'trainer'),
  ('internal', 'rejected', 'trainer'),
  ('query',    'internal', 'trainee'),   -- trainee answers, back into the queue
  ('query',    'rejected', 'trainer'),
  ('client',   'interview','trainer'),
  ('client',   'rejected', 'trainer'),
  ('interview','offer',    'trainer'),
  ('interview','rejected', 'trainer'),
  ('offer',    'placed',   'trainer'),
  ('offer',    'rejected', 'trainer');

insert into rejection_reasons (code,label,sort_order,coachable) values
  ('skills',     'Skills do not match the requirement', 1,true),
  ('writeup',    'Write-up insufficient to represent',  2,true),
  ('rate',       'Rate or salary expectation too high', 3,true),
  ('location',   'Location or shift not workable',      4,true),
  ('availability','Not available in the window',        5,true),
  ('screening',  'Screening questions not covered',     6,true),
  ('comms',      'Communication not at required level', 7,false),
  ('withdrew',   'Candidate withdrew',                  8,false),
  ('filled',     'Role filled elsewhere',               9,false),
  ('onhold',     'Requirement put on hold',            10,false);

insert into note_actions (code,label,sort_order) values
  ('screen','Candidate screened',1),('call','Outbound call',2),
  ('cv','CV reviewed',3),('avail','Availability confirmed',4),
  ('rate','Rate discussed',5),('client','Client discussion',6),
  ('followup','Follow-up',7),('other','Other',8);

insert into candidate_sources (code,label,sort_order) values
  ('pool','Internal database',1),('job_board','Job board',2),
  ('linkedin','Professional network',3),('referral','Referral',4),
  ('inbound','Inbound application',5),('other','Other',6);
