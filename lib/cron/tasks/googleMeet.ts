import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, MemberRow } from "@/lib/database.types";
import { googleConfigured } from "@/lib/google/auth";
import {
  listConferenceRecords,
  listParticipants,
  type ConferenceRecord,
} from "@/lib/google/meet";
import { findNotesDoc, getDocText } from "@/lib/google/docs";
import { getWorkspaceConfig } from "@/lib/google/config";
import { ingestMeetAttendance } from "@/lib/meetings/ingestAttendance";
import { ingestNotes } from "@/lib/meetings/ingestNotes";
import { istToday } from "@/lib/dates";

type DB = SupabaseClient<Database>;

function minutesBetween(a: string, b?: string): number {
  if (!b) return 0;
  return Math.max(
    1,
    Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000),
  );
}

async function members(db: DB) {
  const { data } = await db
    .from("members")
    .select("id, name, google_email, email")
    .eq("is_active", true);
  return (data ?? []) as Pick<
    MemberRow,
    "id" | "name" | "google_email" | "email"
  >[];
}

interface MeetingLite {
  id: string;
  date: string;
  title: string;
  conference_record_id: string | null;
  meet_synced_at: string | null;
  notes_ingested_at: string | null;
}

/** Sync attendance + notes for one meeting from a known conference record. */
async function applyRecord(
  db: DB,
  meeting: MeetingLite,
  record: ConferenceRecord,
  folderId: string | null,
  fraction: number,
): Promise<{ attendance: number; notes: number }> {
  const memberList = await members(db);
  const durationMin = minutesBetween(record.startTime, record.endTime);

  const participants = await listParticipants(record.name);
  const att = await ingestMeetAttendance(
    db,
    meeting.id,
    participants,
    durationMin,
    fraction,
    memberList,
  );

  await db
    .from("meetings")
    .update({
      conference_record_id: record.name,
      meet_duration_minutes: durationMin,
      meet_synced_at: new Date().toISOString(),
    })
    .eq("id", meeting.id);

  let notesCount = 0;
  if (!meeting.notes_ingested_at) {
    const fileId = await findNotesDoc(folderId, meeting.date, "EC");
    if (fileId) {
      const text = await getDocText(fileId);
      if (text) {
        const res = await ingestNotes(db, meeting.id, text, {
          source: "meet_api",
        });
        notesCount = res.decisions;
        await db
          .from("meetings")
          .update({
            notes_doc_url: `https://docs.google.com/document/d/${fileId}/edit`,
          })
          .eq("id", meeting.id);
      }
    }
  }

  return { attendance: att.matched, notes: notesCount };
}

/**
 * Daily task: enumerate conference records for the standing Meet room and sync
 * any that map to a meeting not yet synced. Safe no-op when Google is not
 * configured or auto-ingest is disabled.
 */
export async function runGoogleMeetIngest(
  db: DB,
  today: string,
): Promise<Record<string, number>> {
  if (!googleConfigured()) return { google_meet_ingest: 0 };
  const cfg = await getWorkspaceConfig(db);
  if (!cfg.auto_ingest_enabled || !cfg.meet_space_code)
    return { google_meet_ingest: 0 };

  const since = new Date(
    new Date(`${today}T00:00:00Z`).getTime() - 25 * 86400000,
  ).toISOString();
  const records = await listConferenceRecords(cfg.meet_space_code, since);

  let synced = 0;
  let attendanceRows = 0;
  let momsDrafted = 0;

  for (const rec of records) {
    const recDate = istToday(new Date(rec.startTime));
    const { data: matches } = await db
      .from("meetings")
      .select(
        "id, date, title, conference_record_id, meet_synced_at, notes_ingested_at",
      )
      .eq("date", recDate);
    const rows = (matches ?? []) as MeetingLite[];
    if (rows.length !== 1) continue; // 0 or ambiguous → leave for the officer
    const meeting = rows[0];
    if (meeting.meet_synced_at && meeting.conference_record_id === rec.name)
      continue;

    const out = await applyRecord(
      db,
      meeting,
      rec,
      cfg.notes_folder_id,
      cfg.attendance_fraction,
    );
    synced += 1;
    attendanceRows += out.attendance;
    momsDrafted += out.notes > 0 ? 1 : 0;
  }

  return {
    google_meet_ingest: synced,
    google_meet_attendance_rows: attendanceRows,
    google_meet_moms_drafted: momsDrafted,
  };
}

/** Re-sync a single meeting on demand (officer "Re-sync from Google Meet"). */
export async function syncOneMeeting(
  db: DB,
  meetingId: string,
): Promise<{ ok: boolean; note?: string }> {
  if (!googleConfigured()) return { ok: false, note: "Google not configured." };
  const cfg = await getWorkspaceConfig(db);
  if (!cfg.meet_space_code)
    return { ok: false, note: "No standing Meet code set in Settings." };

  const { data: meeting } = await db
    .from("meetings")
    .select(
      "id, date, title, conference_record_id, meet_synced_at, notes_ingested_at",
    )
    .eq("id", meetingId)
    .maybeSingle();
  if (!meeting) return { ok: false, note: "Meeting not found." };

  const since = new Date(
    new Date(`${(meeting as MeetingLite).date}T00:00:00Z`).getTime() -
      2 * 86400000,
  ).toISOString();
  const records = await listConferenceRecords(cfg.meet_space_code, since);
  const match = records.find(
    (r) => istToday(new Date(r.startTime)) === (meeting as MeetingLite).date,
  );
  if (!match) return { ok: false, note: "No Meet call found for this date yet." };

  await applyRecord(
    db,
    meeting as MeetingLite,
    match,
    cfg.notes_folder_id,
    cfg.attendance_fraction,
  );
  return { ok: true };
}
