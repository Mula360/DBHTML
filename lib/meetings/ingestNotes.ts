import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  MemberRow,
  MomContent,
  MeetingAttendanceRow,
} from "@/lib/database.types";
import { extractMom } from "@/lib/ai/mom";
import { normaliseMom } from "@/lib/meetings";
import { matchMember } from "./matchMember";
import { recomputeQuorum } from "./ingestAttendance";

type DB = SupabaseClient<Database>;

export interface IngestNotesResult {
  ok: boolean;
  decisions: number;
  actionItems: number;
  attendanceMarked: number;
  note?: string;
}

/**
 * Turn Gemini meeting notes (or pasted text) into a Draft MoM plus staged
 * virtual attendance. Never overwrites an existing non-Draft MoM, and never
 * overwrites attendance rows marked `manual` or `meet_api`.
 */
export async function ingestNotes(
  db: DB,
  meetingId: string,
  notesText: string,
  opts: { source: "notes" | "meet_api" | "manual" },
): Promise<IngestNotesResult> {
  if (!notesText.trim()) {
    return { ok: false, decisions: 0, actionItems: 0, attendanceMarked: 0, note: "empty notes" };
  }

  const { data: members } = await db
    .from("members")
    .select("id, name, google_email, email")
    .eq("is_active", true);
  const memberList = (members ?? []) as Pick<
    MemberRow,
    "id" | "name" | "google_email" | "email"
  >[];

  const extracted = await extractMom(
    notesText,
    memberList.map((m) => m.name),
    { kind: "notes" },
  );

  const { data: existing } = await db
    .from("moms")
    .select("id, status, content_json")
    .eq("meeting_id", meetingId)
    .maybeSingle();

  const prev = normaliseMom(
    (existing?.content_json ?? null) as MomContent | null,
  );

  if (!existing || existing.status === "Draft") {
    const content: MomContent = normaliseMom({
      ...prev,
      decisions: extracted.decisions,
      actionItems: extracted.action_items.map((a) => ({
        title: a.task,
        assignee: matchMember(a.assignee, memberList),
        due: a.due_date,
      })),
    });
    await db
      .from("moms")
      .upsert(
        { meeting_id: meetingId, content_json: content, status: "Draft" },
        { onConflict: "meeting_id" },
      );
  }

  // Attendance from members_present — never clobber manual / meet_api rows.
  let attendanceMarked = 0;
  if (extracted.members_present.length > 0) {
    const { data: rows } = await db
      .from("meeting_attendance")
      .select("member_id, source")
      .eq("meeting_id", meetingId);
    const locked = new Set(
      ((rows ?? []) as Pick<MeetingAttendanceRow, "member_id" | "source">[])
        .filter((r) => r.source === "manual" || r.source === "meet_api")
        .map((r) => r.member_id),
    );
    const upserts = extracted.members_present
      .map((n) => matchMember(n, memberList))
      .filter((id): id is string => Boolean(id) && !locked.has(id!))
      .map((member_id) => ({
        meeting_id: meetingId,
        member_id,
        status: "present" as const,
        attendance_mode: "virtual" as const,
        source: opts.source,
        auto_marked: true,
      }));
    if (upserts.length > 0) {
      await db
        .from("meeting_attendance")
        .upsert(upserts, { onConflict: "meeting_id,member_id" });
      attendanceMarked = upserts.length;
      await recomputeQuorum(db, meetingId);
    }
  }

  await db
    .from("meetings")
    .update({
      notes_text: notesText.slice(0, 200_000),
      notes_ingested_at: new Date().toISOString(),
    })
    .eq("id", meetingId);

  return {
    ok: true,
    decisions: extracted.decisions.length,
    actionItems: extracted.action_items.length,
    attendanceMarked,
  };
}
