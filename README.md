# Recruitment ATS — training platform

A multi-user practice environment for a 180° recruitment desk. Trainees work a
shared desk under a trainer who plays the account manager. Everything lives in
Postgres; nothing of value is held in the browser, so clearing the cache costs
nothing and a trainee can sign in from any machine and carry on.

The repository has two halves. `supabase/` is the data layer: schema,
security policies, workflow rules, reporting and the two server-side
functions authentication depends on. `client/` wires the existing front end
to it by replacing one module — the browser database — and leaving the rest
of the application alone. `client/INTEGRATION.md` lists the six edits.

---

## The model in one page

**A batch is the tenant boundary.** Every domain row carries `batch_id`. Inside
a batch, trainees see each other's candidates, job orders and pipeline, which is
how a real recruitment team works. Across batches nothing is visible at all,
and that is enforced by the database rather than by the user interface.

**Collaborative by default.** `batches.mode` is `collaborative` or `parallel`.
Collaborative is the default because the habits it builds — checking for a
duplicate before sourcing, reading a colleague's notes, seeing the board move —
are the ones being taught. Parallel exists for an assessment batch where you
want clean individual work. Both run on the same schema and one policy
predicate.

**Shared visibility, individual attribution.** Every row records `created_by`
and `updated_by`. Every material act lands in `activity`, which is append-only.
Nothing about a shared desk prevents a per-trainee assessment.

**Roles.**

| | Does |
|---|---|
| Super admin | Creates and deactivates accounts, resets staff passwords. Seeded in SQL; there is no path to creating one from a browser. |
| Trainer | Creates batches, clients, contacts and job orders; assigns work; acts as account manager on every submission; exports the batch report; archives. Sees only their own batches. |
| Trainee | Sources candidates, writes notes, makes internal submissions, answers queries. Cannot move a submission past internal submission. |

---

## Sign-in

**Trainees type an employee ID and a batch code. Nothing else.** There is no
trainee password, so the super admin is never asked to reset one — which was the
point.

Behind that, each trainee is still an ordinary Supabase account with a random
machine-generated password held in `auth_secrets`, a table with row-level
security enabled and no policies at all, readable only with the `service_role`
key inside an Edge Function. The trainee never sees it and never needs it. The
benefit is that row-level security acts on a real identity, so the activity
record is trustworthy enough to appraise someone on.

The honest limit: a batch code is written on a whiteboard and an employee ID is
guessable, so the pair is a weak secret. Inside a training environment holding
invented records that is an acceptable trade for removing the password-reset
burden, and the function rate-limits attempts per IP. It would not be
acceptable for real candidate data, and nothing here should ever hold any.

**Trainers and admins** use ordinary email and password sign-in.

Keep the Supabase session in `localStorage`. It holds a token, not work.
Turning persistence off only forces a fresh sign-in on every refresh and
protects nothing, because the data was never on the endpoint to begin with.

---

## The workflow

```
Sourced → Internal Submission → Client Submission → Interview Scheduled
              ↑          ↓
              └── Awaiting Trainee Response
                                 ↓
                             Rejected (reason required)
```

The transition matrix is data, in `submission_transitions`, with the role
allowed to make each move. Adding a stage later is an insert, not a code
change. A trigger enforces it, so no client can skip a step.

Four gates exist because the missing thing is the lesson:

- An internal submission with no write-up is refused.
- Moving to *Awaiting Trainee Response* with no query actually written is refused.
- Resubmitting without answering the query is refused.
- A rejection with no reason is refused.

`UNIQUE (job_id, candidate_id)` means two trainees cannot submit the same person
to the same role. The second attempt should not surface a database error: call
`app.existing_submission()` and say who got there first and when. That collision
is the most instructive thing on a shared desk.

Every status change is driven through `app.advance_submission()` rather than a
direct update. This is deliberate. A policy that filters a row away turns a
forbidden update into a *successful* statement affecting zero rows — the trainee
sees "saved" and nothing happened. The function raises a sentence instead, and
separates a permission failure from a version conflict.

---

## Concurrency

Candidates and submissions carry a `version` integer that a trigger increments.
Pass the version you read; if someone else has changed the row you get
`serialization_failure` and a message telling you to reload. Last-write-wins
silently destroys a colleague's notes, which is exactly the habit not to teach.

## Things that cannot be rewritten

Notes, query threads and the activity log have no update or delete path and
raise loudly if anything tries. They are a record of what was said at the time.

## Archiving

`batches.status = 'archived'` blocks every write at the database, including the
trainer's. An archived batch stays fully readable. Nothing is ever deleted;
people are deactivated, not removed, so their activity stays attributable after
they leave.

---

## Reporting

- `v_trainer_queue` — what needs a decision, oldest first, with hours waiting.
- `v_trainee_scorecard` — one row per trainee per batch. The headline number is
  `pct_internal_to_client`: of what the trainee sent to the account manager, how
  much was good enough to go to the client. `rejected_coachable` separates a
  trainee error from a market outcome.
- `v_rejection_analysis` — where submissions die across the batch. This is what
  the debrief should open with.

Views inherit the policies of the tables beneath them, so a trainee querying the
scorecard sees only what they are entitled to see.

---

## Standing it up

**If this is the first time, follow `SETUP.md` instead.** It goes from an
empty repository to a trainee signing in, with no prior Supabase knowledge
assumed. The summary below is for someone standing up a second project.

```bash
supabase link --project-ref <ref>
supabase db push                       # migrations in order

supabase secrets set TRAINEE_EMAIL_DOMAIN=trainees.internal
supabase secrets set ALLOWED_ORIGIN=https://<your-pages-domain>
supabase functions deploy trainee-login
supabase functions deploy admin-users
```

Then seed exactly one super admin by hand, in the SQL editor, against a user you
created in the Auth dashboard. Every other account is created through
`admin-users`.

```sql
insert into profiles (id, role, full_name, email)
values ('<auth-user-uuid>', 'super_admin', 'Name', 'admin@example.com');
```

### Before you invite anyone

- The `service_role` key belongs in Supabase function secrets and nowhere else.
  If it appears anywhere in the browser bundle, anyone who views source owns the
  project. The CI check in this repository greps for it.
- Free-tier projects pause after seven days of inactivity, which will bite
  between batches. Budget for a paid project if there are gaps.
- Decide now who resets a trainer's password at nine on a Monday evening, and
  who holds the project credentials after handover. It is the question that gets
  skipped and then hurts.

---

## The front end

The existing single-player application already has the desk, the rules and
the 3,012-candidate search pool. It reaches persistence through one narrow
module, so `client/sync.js` replaces that module and nothing else: the
in-memory model, the rendering and eighteen of the twenty test suites are
untouched.

The seeded pool stays local. It is generated from a fixed seed, so it is
identical on every machine and costs nothing to reproduce; a pool entry
becomes a real row only when someone sources them. Hundreds of rows per
batch, not megabytes.

Status changes go through `Store.advance()` rather than a direct update, for
the reason given above: a refused update would otherwise look like a
successful one.

## Tests

The policies are the security model, so they are tested rather than reasoned
about. `tests/01_policies.sql` runs 47 checks against a local Postgres: batch
isolation, collaborative versus owner-only reads, the duplicate collision, every
workflow gate, the notification routing, archive enforcement, immutability, and
that the credential store is invisible to every client role.

```bash
bash tests/run_local.sh                # builds a throwaway db, applies migrations
psql -d ats -v ON_ERROR_STOP=1 -f tests/01_policies.sql
```

Three real bugs surfaced this way while the schema was being written, two of
them the same silent-zero-rows failure described above. Run them after every
change to a policy or a trigger.
