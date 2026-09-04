"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionMember, hasPosition, OFFICERS } from "@/lib/auth";
import { getCurrentConfig } from "@/lib/compliance-compute";
import { setWorkspaceConfig } from "@/lib/google/config";
import type { ComplianceConfigRow } from "@/lib/database.types";

export interface Result {
  error?: string;
  ok?: boolean;
  message?: string;
}

const NUMERIC_FIELDS: (keyof ComplianceConfigRow)[] = [
  "year_start_month",
  "year_end_month",
  "min_field_trips",
  "min_meetings",
  "min_events",
  "pitta_window_days",
  "pitta_min_contributions",
  "midyear_alert_month",
  "yearend_report_month",
  "yearend_report_day",
  "quorum_fraction",
];
const BOOL_FIELDS: (keyof ComplianceConfigRow)[] = [
  "apology_counts_as_attended",
  "allow_event_trip_double_count",
  "virtual_counts_for_quorum",
];

export async function updateComplianceConfig(
  _prev: Result,
  fd: FormData,
): Promise<Result> {
  const { member, position } = await getSessionMember();
  if (!hasPosition(position, OFFICERS)) {
    return { error: "Only the President or Secretary can change these." };
  }
  const db = createClient();
  const config = await getCurrentConfig(db);
  if (!config) return { error: "No current compliance config." };

  const next: Partial<ComplianceConfigRow> = {};
  const audit: {
    config_id: string;
    changed_by: string;
    field_name: string;
    old_value: string;
    new_value: string;
  }[] = [];

  for (const f of NUMERIC_FIELDS) {
    const raw = fd.get(f);
    if (raw === null) continue;
    const num = Number(raw);
    if (Number.isNaN(num)) return { error: `${f} must be a number.` };
    if (num !== config[f]) {
      (next as Record<string, unknown>)[f] = num;
      audit.push({
        config_id: config.id,
        changed_by: member.id,
        field_name: f,
        old_value: String(config[f]),
        new_value: String(num),
      });
    }
  }
  for (const f of BOOL_FIELDS) {
    const val = fd.get(f) === "on";
    if (val !== config[f]) {
      (next as Record<string, unknown>)[f] = val;
      audit.push({
        config_id: config.id,
        changed_by: member.id,
        field_name: f,
        old_value: String(config[f]),
        new_value: String(val),
      });
    }
  }

  if (audit.length === 0) return { ok: true, message: "No changes." };

  const { error } = await db
    .from("compliance_config")
    .update(next)
    .eq("id", config.id);
  if (error) return { error: error.message };

  await db.from("compliance_config_audit").insert(audit);

  revalidatePath("/compliance");
  revalidatePath("/settings");
  return { ok: true, message: `Saved. ${audit.length} field(s) changed.` };
}

export async function updateMyProfile(
  _prev: Result,
  fd: FormData,
): Promise<Result> {
  const { member } = await getSessionMember();
  const db = createClient();
  const gmail = String(fd.get("google_email") ?? "").trim().toLowerCase();
  if (gmail && !gmail.includes("@"))
    return { error: "Google email must be a valid address." };
  const { error } = await db
    .from("members")
    .update({
      phone: String(fd.get("phone") ?? "").trim() || null,
      ebird_username: String(fd.get("ebird_username") ?? "").trim() || null,
      avatar_url: String(fd.get("avatar_url") ?? "").trim() || null,
      google_email: gmail || null,
    })
    .eq("id", member.id);
  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { ok: true, message: "Profile updated." };
}

export async function updateMeetingsWorkspace(
  _prev: Result,
  fd: FormData,
): Promise<Result> {
  const { member, position } = await getSessionMember();
  if (!hasPosition(position, OFFICERS))
    return { error: "Only the President or Secretary can change these." };
  const db = createClient();
  const fraction = Number(fd.get("attendance_fraction"));
  if (Number.isNaN(fraction) || fraction <= 0 || fraction > 1)
    return { error: "Attendance fraction must be between 0 and 1." };
  await setWorkspaceConfig(
    db,
    {
      meet_space_code:
        String(fd.get("meet_space_code") ?? "").trim() || null,
      notes_folder_id:
        String(fd.get("notes_folder_id") ?? "").trim() || null,
      auto_ingest_enabled: fd.get("auto_ingest_enabled") === "on",
      attendance_fraction: fraction,
    },
    member.id,
  );
  revalidatePath("/settings");
  revalidatePath("/meetings");
  return { ok: true, message: "Google Workspace settings saved." };
}
