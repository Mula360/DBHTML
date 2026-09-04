/**
 * Hand-authored until a Supabase project exists. Once it does, regenerate with:
 *   npx supabase gen types typescript --local > lib/database.types.ts
 * (or `--project-id <ref>`). Keep the `Database` export name stable.
 */

type Uuid = string;
type Timestamptz = string;
type DateStr = string;

export type MemberRow = {
  id: Uuid;
  auth_id: Uuid | null;
  name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  ebird_username: string | null;
  joined_at: DateStr | null;
  is_active: boolean;
  google_email: string | null;
}

export type TermRow = {
  id: Uuid;
  label: string;
  start_date: DateStr;
  end_date: DateStr;
  is_current: boolean;
}

export type PositionName =
  | "President"
  | "VP-1"
  | "VP-2"
  | "Secretary"
  | "Treasurer"
  | "EC1"
  | "EC2"
  | "EC3"
  | "EC4"
  | "EC5";

export type MemberPositionRow = {
  id: Uuid;
  member_id: Uuid;
  term_id: Uuid;
  position: PositionName;
  start_date: DateStr;
  end_date: DateStr | null;
  vacancy_reason: string | null;
}

export type PortfolioAssignmentRow = {
  id: Uuid;
  term_id: Uuid;
  portfolio_name: string;
  lead_member_id: Uuid | null;
  support_member_ids: Uuid[];
}

export type ComplianceConfigRow = {
  id: Uuid;
  term_id: Uuid;
  year_start_month: number;
  year_end_month: number;
  min_field_trips: number;
  min_meetings: number;
  min_events: number;
  pitta_window_days: number;
  pitta_min_contributions: number;
  midyear_alert_month: number;
  yearend_report_month: number;
  yearend_report_day: number;
  apology_counts_as_attended: boolean;
  allow_event_trip_double_count: boolean;
  virtual_counts_for_quorum: boolean;
  quorum_fraction: number;
}

export type ActionItemRow = {
  id: Uuid;
  title: string;
  description: string | null;
  assigned_to: Uuid;
  due_date: DateStr | null;
  status: "Open" | "InProgress" | "Done" | "Dropped";
  priority: string;
  portfolio_tag: string | null;
  source_meeting_id: Uuid | null;
  created_by: Uuid | null;
  created_at: Timestamptz;
  completed_at: Timestamptz | null;
  dropped_reason: string | null;
}

export type MeetingRow = {
  id: Uuid;
  title: string;
  date: DateStr;
  time: string | null;
  agenda_text: string | null;
  meet_link: string | null;
  status:
    | "Draft"
    | "AgendaSent"
    | "InProgress"
    | "MoMDraft"
    | "Approved"
    | "Published";
  quorum_met: boolean | null;
  notes_doc_url: string | null;
  notes_text: string | null;
  conference_record_id: string | null;
  meet_duration_minutes: number | null;
  notes_ingested_at: Timestamptz | null;
  meet_synced_at: Timestamptz | null;
  created_by: Uuid | null;
  created_at: Timestamptz;
}

export type WalkRow = {
  id: Uuid;
  title: string;
  location: string;
  date: DateStr;
  meet_time: string | null;
  meet_point: string | null;
  type: "Local" | "Outstation";
  ebird_list_url: string | null;
  photos_drive_url: string | null;
  created_by: Uuid | null;
  created_at: Timestamptz;
}

export type MeetingAttendanceRow = {
  id: Uuid;
  meeting_id: Uuid;
  member_id: Uuid;
  status: "present" | "absent" | "apology";
  attendance_mode: "in_person" | "virtual";
  marked_at: Timestamptz;
  minutes_present: number | null;
  source: "manual" | "meet_api" | "notes";
  auto_marked: boolean;
}

export type MomContent = {
  decisions: string[];
  actionItems: { title: string; assignee: string | null; due: string | null }[];
  announcements: string[];
  nextSteps: string[];
  notes?: string;
  actionItemsCreated?: boolean;
  noQuorumNotice?: boolean;
};

export type MomRow = {
  id: Uuid;
  meeting_id: Uuid;
  content_json: MomContent | null;
  status: "Draft" | "Approved" | "Published";
  approved_by: Uuid | null;
  approved_at: Timestamptz | null;
  emailed_at: Timestamptz | null;
}

export type NotificationRow = {
  id: Uuid;
  member_id: Uuid;
  type: string | null;
  title: string | null;
  body: string | null;
  link: string | null;
  read_at: Timestamptz | null;
  created_at: Timestamptz;
}

export type ActionCommentRow = {
  id: Uuid;
  action_item_id: Uuid;
  member_id: Uuid;
  comment: string;
  created_at: Timestamptz;
}

export type StatutoryItemRow = {
  id: Uuid;
  title: string;
  authority: string | null;
  due_date: DateStr | null;
  status: "Pending" | "InProgress" | "Done";
  document_url: string | null;
  term_id: Uuid | null;
  recurring_yearly: boolean;
}

export type SocietyMemberRow = {
  id: Uuid;
  name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  membership_type: string | null;
  membership_number: string | null;
  joined_date: DateStr | null;
  last_renewal_date: DateStr | null;
  renewal_due_date: DateStr | null;
  status: "Active" | "Due" | "Lapsed" | "Life";
  notes: string | null;
  is_deleted: boolean;
  created_at: Timestamptz;
  updated_at: Timestamptz;
}

export type ComplianceConfigAuditRow = {
  id: Uuid;
  config_id: Uuid | null;
  changed_by: Uuid | null;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  changed_at: Timestamptz;
}

export type WalkCoordinatorRow = {
  id: Uuid;
  walk_id: Uuid;
  member_id: Uuid;
}

export type WalkAttendanceRow = {
  id: Uuid;
  walk_id: Uuid;
  member_id: Uuid;
  rsvp_status: "attending" | "not_attending" | null;
  actually_attended: boolean | null;
}

export type EventRow = {
  id: Uuid;
  title: string;
  type: "AGM" | "AnnualDinner" | "BirdRace" | "AWC" | "HBASeason" | "Outreach" | "Other";
  date: DateStr | null;
  venue: string | null;
  portfolio_tag: string | null;
  lead_id: Uuid | null;
  status: "Planning" | "Confirmed" | "Done";
  outcome_notes: string | null;
}

export type EventHelperRow = {
  id: Uuid;
  event_id: Uuid;
  member_id: Uuid;
  confirmed_by_lead: boolean;
}

export type AgmChecklistRow = {
  id: Uuid;
  event_id: Uuid;
  notice_deadline: DateStr | null;
  notice_sent_date: DateStr | null;
  venue_named_in_notice: boolean;
  nominations_open: DateStr | null;
  nominations_close: DateStr | null;
  quorum_required: number;
  post_agm_filings_done: boolean;
}

export type PittaIssueRow = {
  id: Uuid;
  issue_number: string | null;
  theme: string | null;
  target_publish_date: DateStr | null;
  actual_publish_date: DateStr | null;
  status: "Planning" | "Writing" | "Layout" | "Published";
}

export type PittaContributionRow = {
  id: Uuid;
  issue_id: Uuid | null;
  member_id: Uuid;
  contribution_title: string;
  submitted_at: DateStr;
}

export type PortfolioUpdateRow = {
  id: Uuid;
  portfolio_name: string;
  update_text: string;
  created_by: Uuid | null;
  created_at: Timestamptz;
}

export type HbaSeasonRow = {
  id: Uuid;
  season_name: string | null;
  start_date: DateStr | null;
  end_date: DateStr | null;
  coverage_target_pct: number | null;
  current_pct: number | null;
  briefing_done: boolean;
  teams_allocated: boolean;
  data_submitted: boolean;
  pitta_report_done: boolean;
}

export type AwcSiteRow = {
  id: Uuid;
  year: number | null;
  site_name: string | null;
  assigned_team: string | null;
  count_done: boolean;
  species_count: number | null;
  submitted_wi: boolean;
}

export type DocumentRow = {
  id: Uuid;
  title: string;
  category: "ByeLaws" | "MoMArchive" | "Finance" | "HBA" | "AWC" | "Handover" | "Other";
  url: string;
  added_by: Uuid | null;
  term_id: Uuid | null;
  created_at: Timestamptz;
}

export type ExpenseClaimRow = {
  id: Uuid;
  member_id: Uuid;
  amount: number;
  description: string | null;
  receipt_url: string | null;
  status: "Pending" | "Approved" | "Rejected" | "Settled";
  settled_at: Timestamptz | null;
  created_at: Timestamptz;
}

export type AppConfigRow = {
  key: string;
  value: unknown;
  updated_by: Uuid | null;
  updated_at: Timestamptz;
}

export type ContentEntryRow = {
  id: Uuid;
  category: "field_note" | "from_the_hide" | "on_birding";
  body: string;
  attribution: string | null;
  sort_order: number;
  is_active: boolean;
  created_by: Uuid | null;
  created_at: Timestamptz;
  updated_at: Timestamptz;
}

export type CollageImageRow = {
  id: Uuid;
  storage_path: string;
  alt: string | null;
  sort_order: number;
  is_active: boolean;
  created_by: Uuid | null;
  created_at: Timestamptz;
}

export type CronRunRow = {
  id: Uuid;
  ran_at: Timestamptz;
  ist_date: string | null;
  tasks_ran: string[];
  counts: Record<string, number>;
  errors: Record<string, string>;
  duration_ms: number | null;
}

export type AuthAttemptRow = {
  id: Uuid;
  identifier: string;
  kind: "magic_link" | "password";
  attempted_at: Timestamptz;
  ok: boolean;
}

// Generic table shape for tables not yet explicitly modelled.
type Loose = { id: Uuid; [key: string]: unknown };

interface Table<Row extends Record<string, unknown>> {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
}

export interface Database {
  public: {
    Tables: {
      members: Table<MemberRow>;
      terms: Table<TermRow>;
      member_positions: Table<MemberPositionRow>;
      portfolio_assignments: Table<PortfolioAssignmentRow>;
      compliance_config: Table<ComplianceConfigRow>;
      compliance_config_audit: Table<ComplianceConfigAuditRow>;
      action_items: Table<ActionItemRow>;
      action_comments: Table<ActionCommentRow>;
      meetings: Table<MeetingRow>;
      meeting_attendance: Table<MeetingAttendanceRow>;
      moms: Table<MomRow>;
      walks: Table<WalkRow>;
      walk_coordinators: Table<WalkCoordinatorRow>;
      walk_attendance: Table<WalkAttendanceRow>;
      events: Table<EventRow>;
      event_helpers: Table<EventHelperRow>;
      agm_checklists: Table<AgmChecklistRow>;
      portfolio_updates: Table<PortfolioUpdateRow>;
      hba_seasons: Table<HbaSeasonRow>;
      awc_sites: Table<AwcSiteRow>;
      pitta_issues: Table<PittaIssueRow>;
      pitta_contributions: Table<PittaContributionRow>;
      society_members: Table<SocietyMemberRow>;
      expense_claims: Table<ExpenseClaimRow>;
      statutory_items: Table<StatutoryItemRow>;
      documents: Table<DocumentRow>;
      notifications: Table<NotificationRow>;
      digest_log: Table<Loose>;
      app_config: Table<AppConfigRow>;
      content_entries: Table<ContentEntryRow>;
      collage_images: Table<CollageImageRow>;
      cron_runs: Table<CronRunRow>;
      auth_attempts: Table<AuthAttemptRow>;
    };
    Views: { [_ in never]: never };
    Functions: {
      get_my_position: { Args: Record<PropertyKey, never>; Returns: string };
      auth_member_id: { Args: Record<PropertyKey, never>; Returns: string };
      has_position: { Args: { positions: string[] }; Returns: boolean };
      is_officer: { Args: Record<PropertyKey, never>; Returns: boolean };
      can_manage_register: { Args: Record<PropertyKey, never>; Returns: boolean };
      app_session: { Args: Record<PropertyKey, never>; Returns: unknown };
      nav_badges: { Args: Record<PropertyKey, never>; Returns: unknown };
      society_member_summary: {
        Args: Record<PropertyKey, never>;
        Returns: unknown;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}
