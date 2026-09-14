-- Local-only. Stands in for the parts of Supabase the migrations depend on,
-- so the schema and every policy can be exercised in plain Postgres before
-- anything is pushed to a project. Never run this on Supabase.
create schema if not exists auth;

create table if not exists auth.users (
  id    uuid primary key default gen_random_uuid(),
  email text
);

create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

-- The application role. Not a superuser, so RLS actually applies to it —
-- testing as the owner would silently bypass every policy.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'app_user') then
    create role app_user nologin;
  end if;
end $$;

grant usage on schema public, auth, app to app_user;
grant select, insert, update, delete on all tables in schema public to app_user;
grant usage, select on all sequences in schema public to app_user;
grant execute on all functions in schema app, auth, public to app_user;
