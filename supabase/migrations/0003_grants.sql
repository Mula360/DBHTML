-- ============================================================================
-- Data API grants — Deccan Birders EC Portal
--
-- Supabase's "Automatically expose new tables" setting can be OFF (recommended).
-- These grants make our tables reachable through the Data API for the
-- `authenticated` role; RLS (migration 0002) still decides which rows.
--
-- The `anon` role (browser, pre-login) is deliberately granted NOTHING on
-- application tables — the login pre-check runs server-side with the
-- service_role key, and every other route requires a session.
-- ============================================================================

grant usage on schema public to authenticated;

grant select, insert, update, delete
  on all tables in schema public to authenticated;

grant usage, select
  on all sequences in schema public to authenticated;

grant execute
  on all routines in schema public to authenticated;

-- Keep future objects working without re-granting (harmless if the dashboard
-- toggle is later turned back on).
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant usage, select on sequences to authenticated;
alter default privileges in schema public
  grant execute on routines to authenticated;
