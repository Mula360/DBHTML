-- ============================================================================
-- Data API grants — Deccan Birders EC Portal
--
-- New Supabase projects ship with "Automatically expose new tables" OFF and no
-- default privileges for the API roles — so tables our migrations create are
-- unreachable until granted, for BOTH `authenticated` and `service_role`.
--
--   authenticated : the logged-in EC member. RLS (migration 0002) still
--                   decides which rows they see.
--   service_role  : trusted server code (cron dispatcher, auth callback,
--                   login pre-check). Bypasses RLS; needs table privileges.
--   anon          : browser before login. Granted NOTHING on app tables —
--                   the login pre-check runs server-side as service_role and
--                   every other route requires a session.
--
-- Safe to re-run.
-- ============================================================================

grant usage on schema public to authenticated, service_role;

grant select, insert, update, delete
  on all tables in schema public to authenticated, service_role;

grant usage, select
  on all sequences in schema public to authenticated, service_role;

grant execute
  on all routines in schema public to authenticated, service_role;

-- Keep future objects working without re-granting.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated, service_role;
alter default privileges in schema public
  grant usage, select on sequences to authenticated, service_role;
alter default privileges in schema public
  grant execute on routines to authenticated, service_role;
