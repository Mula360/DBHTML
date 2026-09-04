"use client";

import { useFormState, useFormStatus } from "react-dom";
import {
  updateComplianceConfig,
  updateMyProfile,
  updateMeetingsWorkspace,
  type Result,
} from "./actions";
import type { ComplianceConfigRow } from "@/lib/database.types";

const initial: Result = {};

function Save({ label = "Save" }: { label?: string }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn" type="submit" disabled={pending}>
      {pending ? "Saving…" : label}
    </button>
  );
}

function Msg({ state }: { state: Result }) {
  if (state.error)
    return (
      <p className="card rag-red" style={{ fontSize: 13 }}>
        {state.error}
      </p>
    );
  if (state.message)
    return (
      <p className="card rag-green" style={{ fontSize: 13 }}>
        {state.message}
      </p>
    );
  return null;
}

export function ProfileForm({
  phone,
  ebird,
  avatar,
  googleEmail,
}: {
  phone: string;
  ebird: string;
  avatar: string;
  googleEmail: string;
}) {
  const [state, action] = useFormState(updateMyProfile, initial);
  return (
    <form action={action} style={{ display: "grid", gap: 10 }}>
      <L label="Phone">
        <input name="phone" defaultValue={phone} />
      </L>
      <L label="eBird username">
        <input name="ebird_username" defaultValue={ebird} />
      </L>
      <L label="Avatar URL">
        <input name="avatar_url" defaultValue={avatar} />
      </L>
      <L label="Google Workspace email (only if different from your login email — used to match you in Google Meet attendance)">
        <input name="google_email" type="email" defaultValue={googleEmail} />
      </L>
      <Save label="Update profile" />
      <Msg state={state} />
    </form>
  );
}

export function MeetingsWorkspaceForm({
  meetCode,
  notesFolderId,
  autoIngest,
  attendanceFraction,
  googleReady,
}: {
  meetCode: string;
  notesFolderId: string;
  autoIngest: boolean;
  attendanceFraction: number;
  googleReady: boolean;
}) {
  const [state, action] = useFormState(updateMeetingsWorkspace, initial);
  return (
    <form action={action} style={{ display: "grid", gap: 10 }}>
      <p style={{ fontSize: 12, color: "var(--ink-mute)" }}>
        Google credentials:{" "}
        <b>{googleReady ? "configured" : "not configured (manual notes only)"}</b>
      </p>
      <L label="Standing Meet code (e.g. abc-defg-hij)">
        <input name="meet_space_code" defaultValue={meetCode} />
      </L>
      <L label="Notes Drive folder ID (optional)">
        <input name="notes_folder_id" defaultValue={notesFolderId} />
      </L>
      <L label="Attendance fraction (0–1) — present if on the call this share of its length">
        <input
          name="attendance_fraction"
          type="number"
          step="0.05"
          min="0.05"
          max="1"
          defaultValue={String(attendanceFraction)}
        />
      </L>
      <label
        style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}
      >
        <input
          type="checkbox"
          name="auto_ingest_enabled"
          defaultChecked={autoIngest}
          style={{ width: "auto" }}
        />
        Auto-ingest attendance &amp; notes from Google Meet each night
      </label>
      <Save label="Save Workspace settings" />
      <Msg state={state} />
    </form>
  );
}

const NUM: { name: keyof ComplianceConfigRow; label: string; step?: string }[] = [
  { name: "min_field_trips", label: "Min field trips / year" },
  { name: "min_meetings", label: "Min meetings / year" },
  { name: "min_events", label: "Min events / year" },
  { name: "pitta_min_contributions", label: "Min Pitta contributions" },
  { name: "pitta_window_days", label: "Pitta rolling window (days)" },
  { name: "year_start_month", label: "Compliance year start month (1–12)" },
  { name: "year_end_month", label: "Compliance year end month (1–12)" },
  { name: "midyear_alert_month", label: "Mid-year alert month" },
  { name: "yearend_report_month", label: "Year-end report month" },
  { name: "yearend_report_day", label: "Year-end report day" },
  { name: "quorum_fraction", label: "Quorum fraction (Rule 26)", step: "0.0001" },
];

const BOOL: { name: keyof ComplianceConfigRow; label: string }[] = [
  { name: "apology_counts_as_attended", label: "Apology counts as attended" },
  { name: "allow_event_trip_double_count", label: "Allow event/trip double-count" },
  { name: "virtual_counts_for_quorum", label: "Virtual attendance counts for quorum" },
];

export function ComplianceForm({ config }: { config: ComplianceConfigRow }) {
  const [state, action] = useFormState(updateComplianceConfig, initial);
  return (
    <form action={action} style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
        {NUM.map((f) => (
          <L key={f.name} label={f.label}>
            <input
              name={f.name}
              type="number"
              step={f.step ?? "1"}
              defaultValue={String(config[f.name] ?? "")}
            />
          </L>
        ))}
      </div>
      <div style={{ display: "grid", gap: 6 }}>
        {BOOL.map((f) => (
          <label
            key={f.name}
            style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}
          >
            <input
              type="checkbox"
              name={f.name}
              defaultChecked={Boolean(config[f.name])}
              style={{ width: "auto" }}
            />
            {f.label}
          </label>
        ))}
      </div>
      <Save label="Save minimums" />
      <Msg state={state} />
    </form>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 4, fontSize: 12, fontWeight: 600 }}>
      {label}
      {children}
    </label>
  );
}
