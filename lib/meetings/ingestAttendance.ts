import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, MeetingAttendanceRow } from "@/lib/database.types";
import { computeQuorum } from "@/lib/quorum";
import { matchMember, type MatchableMember } from "./matchMember";
import type { MeetParticipant } from "@/lib/google/meet";

type DB = SupabaseClient<Database>;

export interface IngestAttendanceResult {
  matched: number;
  present: number;
  unmatched: string[];
}

/**
 * Write virtual attendance from Google Meet participant data.
 * A participant is marked `present` only if their summed time on the call is
 * >= `fraction` of the total meeting duration; otherwise `absent` with minutes
 * recorded. Rows already marked `source: 'manual'` are never overwritten.
 */
export async function ingestMeetAttendance(
  db: DB,
  meetingId: string,
  participants: MeetParticipant[],
  meetingMinutes: number,
  fraction: number,
  members: MatchableMember[],
): Promise<IngestAttendanceResult> {
  const { data: existingRows } = await db
    .from("meeting_attendance")
    .select("member_id, source")
    .eq("meeting_id", meetingId);
  const manual = new Set(
    ((existingRows ?? []) as Pick<MeetingAttendanceRow, "member_id" | "source">[])
      .filter((r) => r.source === "manual")
      .map((r) => r.member_id),
  );

  const threshold = Math.max(1, meetingMinutes * fraction);
  const unmatched: string[] = [];
  const rows: Partial<MeetingAttendanceRow>[] = [];

  for (const p of participants) {
    const id = matchMember(p.email ?? p.displayName, members);
    if (!id) {
      unmatched.push(p.displayName);
      continue;
    }
    if (manual.has(id)) continue;
    const isPresent = p.minutesPresent >= threshold;
    rows.push({
      meeting_id: meetingId,
      member_id: id,
      status: isPresent ? "present" : "absent",
      attendance_mode: "virtual",
      minutes_present: p.minutesPresent,
      source: "meet_api",
      auto_marked: true,
    });
  }

  if (rows.length > 0) {
    await db
      .from("meeting_attendance")
      .upsert(rows, { onConflict: "meeting_id,member_id" });
  }

  await recomputeQuorum(db, meetingId);

  return {
    matched: rows.length,
    present: rows.filter((r) => r.status === "present").length,
    unmatched,
  };
}

/** Recompute meetings.quorum_met from the current attendance rows + config. */
export async function recomputeQuorum(
  db: DB,
  meetingId: string,
): Promise<void> {
  const [{ data: att }, { data: config }] = await Promise.all([
    db
      .from("meeting_attendance")
      .select("status, attendance_mode")
      .eq("meeting_id", meetingId),
    db
      .from("compliance_config")
      .select("quorum_fraction, virtual_counts_for_quorum, terms!inner(is_current)")
      .eq("terms.is_current", true)
      .maybeSingle(),
  ]);

  const { data: term } = await db
    .from("terms")
    .select("id")
    .eq("is_current", true)
    .maybeSingle();
  let ecCount = (att ?? []).length;
  if (term) {
    const { count } = await db
      .from("member_positions")
      .select("id", { count: "exact", head: true })
      .eq("term_id", term.id)
      .is("end_date", null);
    ecCount = count ?? ecCount;
  }

  const q = computeQuorum(
    (att ?? []) as Pick<
      MeetingAttendanceRow,
      "status" | "attendance_mode"
    >[],
    ecCount,
    {
      quorumFraction: config?.quorum_fraction ?? 0.3334,
      virtualCountsForQuorum: config?.virtual_counts_for_quorum ?? false,
    },
  );
  await db.from("meetings").update({ quorum_met: q.met }).eq("id", meetingId);
}
