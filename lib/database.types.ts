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
  recall_bot_id: string | null;
  transcript_text: string | null;
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
      compliance_config_audit: Table<Loose>;
      action_items: Table<ActionItemRow>;
      action_comments: Table<Loose>;
      meetings: Table<MeetingRow>;
      meeting_attendance: Table<Loose>;
      moms: Table<Loose>;
      walks: Table<WalkRow>;
      walk_coordinators: Table<Loose>;
      walk_attendance: Table<Loose>;
      events: Table<Loose>;
      event_helpers: Table<Loose>;
      agm_checklists: Table<Loose>;
      portfolio_updates: Table<Loose>;
      hba_seasons: Table<Loose>;
      awc_sites: Table<Loose>;
      pitta_issues: Table<Loose>;
      pitta_contributions: Table<Loose>;
      society_members: Table<Loose>;
      expense_claims: Table<Loose>;
      statutory_items: Table<Loose>;
      documents: Table<Loose>;
      notifications: Table<NotificationRow>;
      digest_log: Table<Loose>;
    };
    Views: { [_ in never]: never };
    Functions: {
      get_my_position: { Args: Record<PropertyKey, never>; Returns: string };
      auth_member_id: { Args: Record<PropertyKey, never>; Returns: string };
      has_position: { Args: { positions: string[] }; Returns: boolean };
      is_officer: { Args: Record<PropertyKey, never>; Returns: boolean };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}
