"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionMember, hasPosition, OFFICERS } from "@/lib/auth";
import { getCurrentConfig } from "@/lib/compliance-compute";
import { setWorkspaceConfig } from "@/lib/google/config";
import { defaultPassword } from "@/lib/auth/defaultPassword";
import { setAuthPassword } from "@/lib/auth/adminPassword";
import type { ComplianceConfigRow, MemberRow } from "@/lib/database.types";

const MIN_PASSWORD_LEN = 8;

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

/** Self-service — the signed-in member sets their own password. */
export async function changeMyPassword(
  _prev: Result,
  fd: FormData,
): Promise<Result> {
  await getSessionMember();
  const next = String(fd.get("new_password") ?? "");
  const confirm = String(fd.get("confirm_password") ?? "");
  if (next.length < MIN_PASSWORD_LEN)
    return { error: `Password must be at least ${MIN_PASSWORD_LEN} characters.` };
  if (next !== confirm) return { error: "Passwords don't match." };

  const db = createClient();
  const { error } = await db.auth.updateUser({ password: next });
  if (error) return { error: error.message };
  return { ok: true, message: "Password changed." };
}

/**
 * Add an EC member: name, email, phone. Creates the members row and a Supabase
 * Auth account with the default password (last 4 digits of the phone number +
 * last name) so they can sign in immediately. Position/portfolio assignment is
 * still done separately.
 */
export async function addTeamMember(
  _prev: Result,
  fd: FormData,
): Promise<Result> {
  const { position } = await getSessionMember();
  if (!hasPosition(position, OFFICERS))
    return { error: "Only the President or Secretary can add members." };

  const name = String(fd.get("name") ?? "").trim();
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const phone = String(fd.get("phone") ?? "").trim();
  if (!name || !email.includes("@") || !phone)
    return { error: "Name, a valid email and phone are all required." };

  const password = defaultPassword(name, phone);
  const auth = await setAuthPassword(email, password);
  if ("error" in auth) return { error: auth.error };

  const db = createClient();
  const { error } = await db.from("members").upsert(
    { name, email, phone, auth_id: auth.authId, is_active: true },
    { onConflict: "email" },
  );
  if (error) return { error: error.message };

  revalidatePath("/settings");
  return {
    ok: true,
    message: `${name} added. Default password: ${password} — tell them to change it in Settings.`,
  };
}

/** Officer resets a member's password to the last4+lastname default. */
export async function resetPasswordToDefault(memberId: string): Promise<Result> {
  const { position } = await getSessionMember();
  if (!hasPosition(position, OFFICERS))
    return { error: "Only the President or Secretary can reset passwords." };
  const db = createClient();
  const { data: m } = await db
    .from("members")
    .select("name, email, phone")
    .eq("id", memberId)
    .maybeSingle();
  const target = m as Pick<MemberRow, "name" | "email" | "phone"> | null;
  if (!target) return { error: "Member not found." };
  if (!target.phone)
    return { error: "This member has no phone number on file." };

  const password = defaultPassword(target.name, target.phone);
  const auth = await setAuthPassword(target.email, password);
  if ("error" in auth) return { error: auth.error };
  await db
    .from("members")
    .update({ auth_id: auth.authId })
    .eq("id", memberId)
    .is("auth_id", null);

  revalidatePath("/settings");
  return { ok: true, message: `Reset to default: ${password}` };
}

/** Officer sets a member's password to a value they type in themselves. */
export async function resetPasswordCustom(
  _prev: Result,
  fd: FormData,
): Promise<Result> {
  const { position } = await getSessionMember();
  if (!hasPosition(position, OFFICERS))
    return { error: "Only the President or Secretary can reset passwords." };

  const memberId = String(fd.get("member_id") ?? "");
  const password = String(fd.get("password") ?? "");
  if (password.length < MIN_PASSWORD_LEN)
    return { error: `Password must be at least ${MIN_PASSWORD_LEN} characters.` };

  const db = createClient();
  const { data: m } = await db
    .from("members")
    .select("email")
    .eq("id", memberId)
    .maybeSingle();
  if (!m) return { error: "Member not found." };

  const auth = await setAuthPassword(m.email, password);
  if ("error" in auth) return { error: auth.error };
  await db
    .from("members")
    .update({ auth_id: auth.authId })
    .eq("id", memberId)
    .is("auth_id", null);

  revalidatePath("/settings");
  return { ok: true, message: "Password set." };
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
