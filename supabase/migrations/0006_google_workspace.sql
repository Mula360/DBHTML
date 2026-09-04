-- ============================================================================
-- Google Workspace meeting integration + generic app_config + ops tables
-- Replaces the Recall.ai bot flow (Phase 12). Meet REST API supplies virtual
-- attendance + durations; Gemini "take notes for me" Docs supply the minutes.
-- ============================================================================

-- ---- generic key/jsonb settings store ----------------------------------
create table app_config (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_by uuid references members,
  updated_at timestamptz default now()
);

-- ---- meetings: drop Recall.ai columns, add Google Meet columns ---------
alter table meetings drop column if exists recall_bot_id;
alter table meetings drop column if exists transcript_text;

alter table meetings add column notes_doc_url text;
alter table meetings add column notes_text text;              -- Gemini notes / pasted text
alter table meetings add column conference_record_id text;    -- Meet API conferenceRecords/<id>
alter table meetings add column meet_duration_minutes int;    -- from conferenceRecord start/end
alter table meetings add column notes_ingested_at timestamptz;
alter table meetings add column meet_synced_at timestamptz;

-- ---- meeting_attendance: provenance + duration ------------------------
alter table meeting_attendance add column minutes_present int;
alter table meeting_attendance add column source text default 'manual';  -- manual | meet_api | notes
alter table meeting_attendance add column auto_marked boolean default false;

-- ---- members: Workspace identity for Meet participant matching --------
alter table members add column google_email text;

-- ---- dispatcher run log (observability) ------------------------------
create table cron_runs (
  id uuid primary key default gen_random_uuid(),
  ran_at timestamptz default now(),
  ist_date text,
  tasks_ran text[] default '{}',
  counts jsonb default '{}'::jsonb,
  errors jsonb default '{}'::jsonb,
  duration_ms int
);

-- ---- auth throttling (service-role only) -----------------------------
create table auth_attempts (
  id uuid primary key default gen_random_uuid(),
  identifier text not null,          -- lowercased email, or sha256(ip)
  kind text not null,                -- magic_link | password
  attempted_at timestamptz default now(),
  ok boolean default false
);
create index auth_attempts_lookup on auth_attempts (identifier, attempted_at);

-- ---- RLS -------------------------------------------------------------
alter table app_config enable row level security;
alter table cron_runs enable row level security;
alter table auth_attempts enable row level security;

-- app_config: world-readable to members, officer writes. The login page reads
-- it pre-auth via the service-role client (which bypasses RLS).
create policy app_config_read on app_config for select to authenticated using (true);
create policy app_config_insert on app_config for insert to authenticated
  with check (is_officer());
create policy app_config_update on app_config for update to authenticated
  using (is_officer()) with check (is_officer());

-- cron_runs: officers only; rows are written by the service-role cron client.
create policy cron_runs_read on cron_runs for select to authenticated using (is_officer());

-- auth_attempts: no client access at all (server-side rate limiter uses the
-- service-role client).

grant select, insert, update on app_config to authenticated, service_role;
grant select on cron_runs to authenticated, service_role;
grant insert on cron_runs to service_role;
grant select, insert, delete on auth_attempts to service_role;

-- ---- seed defaults --------------------------------------------------
insert into app_config (key, value) values
  ('meetings_workspace', jsonb_build_object(
      'meet_space_code', null,
      'notes_folder_id', null,
      'auto_ingest_enabled', true,
      'attendance_fraction', 0.5
   )),
  ('login_hero', jsonb_build_object(
      'title', 'The Executive Committee portal.',
      'subtitle', 'Minutes, action items, portfolio work and baseline obligations for the 2026–2028 committee.'
   ))
on conflict (key) do nothing;
