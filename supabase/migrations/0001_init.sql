-- ============================================================================
-- Deccan Birders EC Portal — initial schema
-- ============================================================================
create extension if not exists "pgcrypto";

-- ===== TERMS & POSITIONS (term history — Fix 7d) =====
create table terms (
  id uuid primary key default gen_random_uuid(),
  label text not null,              -- "2026-28"
  start_date date not null,         -- 2026-09-01
  end_date date not null,           -- 2028-08-31
  is_current boolean default false
);

create table members (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid references auth.users,
  name text not null,
  email text unique not null,
  phone text,
  avatar_url text,
  ebird_username text,
  joined_at date,
  is_active boolean default true
);

create table member_positions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references members not null,
  term_id uuid references terms not null,
  position text not null,           -- President | VP-1 | VP-2 | Secretary
                                    -- | Treasurer | EC1..EC5
  start_date date not null,         -- supports mid-term vacancy fills
  end_date date,                    -- null = current
  vacancy_reason text               -- resignation note if applicable
);

create table portfolio_assignments (
  id uuid primary key default gen_random_uuid(),
  term_id uuid references terms not null,
  portfolio_name text not null,     -- 11 portfolios
  lead_member_id uuid references members,
  support_member_ids uuid[] default '{}'
);

-- ===== DYNAMIC COMPLIANCE CONFIG (Fix 2 revised) =====
create table compliance_config (
  id uuid primary key default gen_random_uuid(),
  term_id uuid references terms unique not null,
  year_start_month int default 9,
  year_end_month int default 8,
  min_field_trips int default 2,
  min_meetings int default 8,
  min_events int default 2,
  pitta_window_days int default 180,
  pitta_min_contributions int default 1,
  midyear_alert_month int default 3,
  yearend_report_month int default 7,
  yearend_report_day int default 15,
  apology_counts_as_attended boolean default false,
  allow_event_trip_double_count boolean default false,
  virtual_counts_for_quorum boolean default false,  -- bye-law flag
  quorum_fraction numeric default 0.3334            -- Rule 26: 1/3 EC
);

create table compliance_config_audit (
  id uuid primary key default gen_random_uuid(),
  config_id uuid references compliance_config,
  changed_by uuid references members,
  field_name text, old_value text, new_value text,
  changed_at timestamptz default now()
);

-- ===== MEETINGS =====
create table meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  date date not null,
  time text,
  agenda_text text,
  meet_link text,
  status text default 'Draft',      -- Draft|AgendaSent|InProgress|
                                    -- MoMDraft|Approved|Published
  quorum_met boolean,               -- computed on attendance save
  recall_bot_id text,
  transcript_text text,
  created_by uuid references members,
  created_at timestamptz default now()
);

create table meeting_attendance (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid references meetings not null,
  member_id uuid references members not null,
  status text not null,             -- present|absent|apology
  attendance_mode text default 'in_person',  -- in_person|virtual
  marked_at timestamptz default now(),
  unique(meeting_id, member_id)
);

create table moms (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid references meetings unique not null,
  content_json jsonb,
  status text default 'Draft',
  approved_by uuid references members,
  approved_at timestamptz,
  emailed_at timestamptz
);

-- ===== ACTION ITEMS =====
create table action_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  assigned_to uuid references members not null,
  due_date date,                    -- date, NOT timestamptz (Fix 7a)
  status text default 'Open',       -- Open|InProgress|Done|Dropped
  priority text default 'Normal',
  portfolio_tag text,
  source_meeting_id uuid references meetings,
  created_by uuid references members,
  created_at timestamptz default now(),
  completed_at timestamptz,
  dropped_reason text
);

create table action_comments (
  id uuid primary key default gen_random_uuid(),
  action_item_id uuid references action_items not null,
  member_id uuid references members not null,
  comment text not null,
  created_at timestamptz default now()
);

-- ===== WALKS (species log REMOVED — eBird links instead) =====
create table walks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  location text not null,
  date date not null,
  meet_time text,
  meet_point text,
  type text default 'Local',        -- Local|Outstation
  ebird_list_url text,              -- source of truth for species
  photos_drive_url text,            -- Drive link, no uploads
  created_by uuid references members,
  created_at timestamptz default now()
);

-- many-to-many coordinators (co-coordination credit — point 5 fix)
create table walk_coordinators (
  id uuid primary key default gen_random_uuid(),
  walk_id uuid references walks not null,
  member_id uuid references members not null,
  unique(walk_id, member_id)
);

create table walk_attendance (
  id uuid primary key default gen_random_uuid(),
  walk_id uuid references walks not null,
  member_id uuid references members not null,
  rsvp_status text,                 -- attending|not_attending
  actually_attended boolean,
  unique(walk_id, member_id)
);

-- ===== EVENTS =====
create table events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text not null,               -- AGM|AnnualDinner|BirdRace|AWC|
                                    -- HBASeason|Outreach|Other
  date date,
  venue text,
  portfolio_tag text,
  lead_id uuid references members,
  status text default 'Planning',   -- Planning|Confirmed|Done
  outcome_notes text
);

create table event_helpers (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events not null,
  member_id uuid references members not null,
  confirmed_by_lead boolean default false,  -- lead confirms assists
  unique(event_id, member_id)
);

-- AGM statutory calculator (bye-law addition 1)
create table agm_checklists (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events unique not null,
  notice_deadline date,             -- computed: AGM - 15d - 2d buffer
  notice_sent_date date,
  venue_named_in_notice boolean default false,
  nominations_open date,
  nominations_close date,
  quorum_required int default 20,   -- Rule 26 AGM quorum
  post_agm_filings_done boolean default false
);

-- ===== PORTFOLIOS =====
create table portfolio_updates (
  id uuid primary key default gen_random_uuid(),
  portfolio_name text not null,
  update_text text not null,
  created_by uuid references members,
  created_at timestamptz default now()
);

create table hba_seasons (
  id uuid primary key default gen_random_uuid(),
  season_name text, start_date date, end_date date,
  coverage_target_pct int, current_pct int default 0,
  briefing_done boolean default false,
  teams_allocated boolean default false,
  data_submitted boolean default false,
  pitta_report_done boolean default false
);

create table awc_sites (
  id uuid primary key default gen_random_uuid(),
  year int, site_name text, assigned_team text,
  count_done boolean default false, species_count int,
  submitted_wi boolean default false
);

-- ===== PITTA =====
create table pitta_issues (
  id uuid primary key default gen_random_uuid(),
  issue_number text, theme text,
  target_publish_date date, actual_publish_date date,
  status text default 'Planning'    -- Planning|Writing|Layout|Published
);

create table pitta_contributions (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid references pitta_issues,
  member_id uuid references members not null,
  contribution_title text not null,
  submitted_at date not null
);

-- ===== MEMBERSHIP REGISTER (~570 general members — Fix 6) =====
create table society_members (
  id uuid primary key default gen_random_uuid(),
  name text not null, email text, phone text, city text,
  membership_type text,             -- Annual|Life|Student
  membership_number text,
  joined_date date,
  last_renewal_date date,
  renewal_due_date date,
  status text default 'Active',     -- Active|Due|Lapsed|Life
  notes text,
  is_deleted boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ===== FINANCE (claims only in v1; full ledger v1.5 optional) =====
create table expense_claims (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references members not null,
  amount numeric not null,
  description text,
  receipt_url text,                 -- Drive link
  status text default 'Pending',    -- Pending|Approved|Rejected|Settled
  settled_at timestamptz,
  created_at timestamptz default now()
);

-- ===== STATUTORY TRACKER (bye-law addition 4) =====
create table statutory_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,              -- "Post-AGM Registrar filing" etc.
  authority text,                   -- Registrar|IT Dept|Auditor|Other
  due_date date,
  status text default 'Pending',    -- Pending|InProgress|Done
  document_url text,
  term_id uuid references terms,
  recurring_yearly boolean default false
);

-- ===== DOCUMENTS (links only — Fix 7e) =====
create table documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null,           -- ByeLaws|MoMArchive|Finance|HBA|
                                    -- AWC|Handover|Other
  url text not null,
  added_by uuid references members,
  term_id uuid references terms,
  created_at timestamptz default now()
);

-- ===== NOTIFICATIONS =====
create table notifications (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references members not null,
  type text, title text, body text, link text,
  read_at timestamptz,
  created_at timestamptz default now()
);

create table digest_log (
  id uuid primary key default gen_random_uuid(),
  type text, sent_at timestamptz default now(),
  recipients_json jsonb
);

-- ===== Helpful indexes =====
create index on member_positions (member_id, term_id);
create index on member_positions (term_id) where end_date is null;
create index on action_items (assigned_to, status);
create index on action_items (due_date);
create index on meeting_attendance (meeting_id);
create index on walk_coordinators (member_id);
create index on notifications (member_id) where read_at is null;
create index on society_members (status) where is_deleted = false;
