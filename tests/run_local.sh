#!/usr/bin/env bash
# Rebuilds a throwaway local database, applies every migration, then runs the
# policy tests. Requires a local Postgres; nothing here touches Supabase.
set -euo pipefail
PSQL="psql -h ${PGHOST:-/tmp} -p ${PGPORT:-5433} -v ON_ERROR_STOP=1 -q"
DB=${DB:-ats}

$PSQL -d postgres -c "drop database if exists $DB;"
$PSQL -d postgres -c "create database $DB;"

# Minimal Supabase stand-ins, before the migrations that reference them.
$PSQL -d "$DB" <<'SQL'
create schema auth;
create extension if not exists pgcrypto;
create table auth.users (id uuid primary key default gen_random_uuid(), email text);
create or replace function auth.uid() returns uuid language sql stable as $fn$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$fn$;
do $do$ begin
  if not exists (select 1 from pg_roles where rolname = 'app_user') then
    create role app_user nologin;
  end if;
  -- Supabase's own roles. Created here only so the grant checks in the tests
  -- can assert who may execute what.
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin;
  end if;
end $do$;
SQL

for f in supabase/migrations/*.sql; do
  echo "-- applying $f"
  $PSQL -d "$DB" -f "$f"
done

# Grants after the tables exist. app_user is not a superuser, so RLS applies.
$PSQL -d "$DB" <<'SQL'
grant usage on schema public, auth, app to app_user;
grant select, insert, update, delete on all tables in schema public to app_user;
grant usage, select on all sequences in schema public to app_user;
grant execute on all functions in schema app to app_user;
grant execute on all functions in schema auth to app_user;
-- In Supabase a signed-in browser session runs as `authenticated`. Making the
-- test role a member of it means the grants the tests assert are the grants
-- the tests are actually subject to.
grant authenticated to app_user;
-- The Edge Functions run as service_role, which in Supabase bypasses RLS.
-- The local stand-in needs the same shape or the sign-in path cannot be
-- tested at all — and that is the path that broke in production.
grant usage on schema public, auth, app to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
grant execute on all functions in schema app to service_role;
alter role service_role bypassrls;
SQL

echo "-- schema applied"
