"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionMember } from "@/lib/auth";
import { computeQuorum } from "@/lib/quorum";
import { MEETING_STATUS_NEXT, normaliseMom } from "@/lib/meetings";
import { notifyMember } from "@/lib/mailer";
import { getCurrentTerm } from "@/lib/portfolios";
import { scheduleBot } from "@/lib/recall";
import type {
  MeetingRow,
  MomContent,
  MemberRow,
  MeetingAttendanceRow,
} from "@/lib/database.types";

export interface Result {
  error?: string;
  ok?: boolean;
}

const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

async function activeMembers(db: ReturnType<typeof createClient>) {
  const { data } = await db.from("members").select("*").eq("is_active", true);
  return (data ?? []) as MemberRow[];
}

async function activeEcCount(db: ReturnType<typeof createClient>) {
  const term = await getCurrentTerm(db);
  if (!term) return 0;
  const { count } = await db
    .from("member_positions")
    .select("id", { count: "exact", head: true })
    .eq("term_id", term.id)
    .is("end_date", null);
  return count ?? 0;
}

// ---------------------------------------------------------------------------

export async function createMeeting(_p: Result, fd: FormData): Promise<Result> {
  const { member } = await getSessionMember();
  const db = createClient();
  const title = s(fd, "title");
  const date = s(fd, "date");
  if (!title || !date) return { error: "Title and date are required." };

  const { data, error } = await db
    .from("meetings")
    .insert({
      title,
      date,
      time: s(fd, "time") || null,
      agenda_text: s(fd, "agenda_text") || null,
      meet_link: s(fd, "meet_link") || null,
      created_by: member.id,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };
  redirect(`/meetings/${data.id}`);
}

/** Phase 2 — activate the Recall.ai meeting bot for this meeting. */
export async function activateBot(meetingId: string): Promise<Result> {
  await getSessionMember();
  const db = createClient();
  const { data: meeting } = await db
    .from("meetings")
    .select("meet_link, recall_bot_id")
    .eq("id", meetingId)
    .maybeSingle();
  if (!meeting?.meet_link)
    return { error: "Add a Google Meet link to the meeting first." };
  if (meeting.recall_bot_id) return { error: "A bot is already scheduled." };

  const res = await scheduleBot(meeting.meet_link);
  if (res.skipped)
    return { error: "Meeting bot is not configured (RECALL_API_KEY unset)." };
  if (res.error) return { error: res.error };

  await db
    .from("meetings")
    .update({ recall_bot_id: res.botId })
    .eq("id", meetingId);
  revalidatePath(`/meetings/${meetingId}`);
  return { ok: true };
}

export async function advanceStatus(
  meetingId: string,
  next: MeetingRow["status"],
): Promise<Result> {
  const db = createClient();
  const { data: meeting } = await db
    .from("meetings")
    .select("*")
    .eq("id", meetingId)
    .maybeSingle();
  if (!meeting) return { error: "Not found." };
  const m = meeting as MeetingRow;

  if (!(MEETING_STATUS_NEXT[m.status] ?? []).includes(next)) {
    return { error: `Cannot move from ${m.status} to ${next}.` };
  }

  const { error } = await db
    .from("meetings")
    .update({ status: next })
    .eq("id", meetingId);
  if (error) return { error: error.message };

  if (next === "AgendaSent") {
    const members = await activeMembers(db);
    for (const rec of members) {
      await notifyMember(db, rec, {
        type: "meeting_agenda",
        title: `Agenda: ${m.title}`,
        lines: [
          `${m.title} — ${m.date}${m.time ? ` at ${m.time}` : ""}.`,
          m.meet_link ? `Join: ${m.meet_link}` : "",
          m.agenda_text ? `Agenda:\n${m.agenda_text}` : "Agenda to follow.",
        ].filter(Boolean),
        link: `/meetings/${meetingId}`,
      });
    }
  }

  revalidatePath(`/meetings/${meetingId}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------

export async function saveAttendance(
  meetingId: string,
  entries: {
    member_id: string;
    status: MeetingAttendanceRow["status"];
    attendance_mode: MeetingAttendanceRow["attendance_mode"];
  }[],
): Promise<Result> {
  await getSessionMember();
  const db = createClient();

  const { error: upErr } = await db.from("meeting_attendance").upsert(
    entries.map((e) => ({
      meeting_id: meetingId,
      member_id: e.member_id,
      status: e.status,
      attendance_mode:
        e.status === "present" ? e.attendance_mode : "in_person",
    })),
    { onConflict: "meeting_id,member_id" },
  );
  if (upErr) return { error: upErr.message };

  const [{ data: config }, ecCount] = await Promise.all([
    db
      .from("compliance_config")
      .select("quorum_fraction, virtual_counts_for_quorum, terms!inner(is_current)")
      .eq("terms.is_current", true)
      .maybeSingle(),
    activeEcCount(db),
  ]);

  const q = computeQuorum(entries, ecCount || entries.length, {
    quorumFraction: config?.quorum_fraction ?? 0.3334,
    virtualCountsForQuorum: config?.virtual_counts_for_quorum ?? false,
  });

  await db
    .from("meetings")
    .update({ quorum_met: q.met })
    .eq("id", meetingId);

  revalidatePath(`/meetings/${meetingId}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------

export async function saveMom(
  meetingId: string,
  content: MomContent,
): Promise<Result> {
  await getSessionMember();
  const db = createClient();
  const clean = normaliseMom(content);
  const { error } = await db
    .from("moms")
    .upsert(
      { meeting_id: meetingId, content_json: clean, status: "Draft" },
      { onConflict: "meeting_id" },
    );
  if (error) return { error: error.message };
  revalidatePath(`/meetings/${meetingId}`);
  return { ok: true };
}

/** Approve the MoM → create staged action items in Action Items (once). */
export async function approveMom(meetingId: string): Promise<Result> {
  const { member } = await getSessionMember();
  const db = createClient();

  const { data: mom } = await db
    .from("moms")
    .select("*")
    .eq("meeting_id", meetingId)
    .maybeSingle();
  if (!mom?.content_json) return { error: "Draft the MoM first." };
  const content = normaliseMom(mom.content_json);

  if (!content.actionItemsCreated && content.actionItems.length > 0) {
    const rows = content.actionItems
      .filter((a) => a.title.trim() && a.assignee)
      .map((a) => ({
        title: a.title.trim(),
        assigned_to: a.assignee!,
        due_date: a.due || null,
        portfolio_tag: null,
        source_meeting_id: meetingId,
        created_by: member.id,
      }));
    if (rows.length > 0) {
      const { error } = await db.from("action_items").insert(rows);
      if (error) return { error: error.message };
    }
    content.actionItemsCreated = true;
  }

  await db
    .from("moms")
    .update({
      content_json: content,
      status: "Approved",
      approved_by: member.id,
      approved_at: new Date().toISOString(),
    })
    .eq("meeting_id", meetingId);
  await db.from("meetings").update({ status: "Approved" }).eq("id", meetingId);

  revalidatePath(`/meetings/${meetingId}`);
  return { ok: true };
}

export async function publishMom(
  meetingId: string,
  confirmText: string,
): Promise<Result> {
  await getSessionMember();
  const db = createClient();

  const { data: meeting } = await db
    .from("meetings")
    .select("*")
    .eq("id", meetingId)
    .maybeSingle();
  const { data: mom } = await db
    .from("moms")
    .select("*")
    .eq("meeting_id", meetingId)
    .maybeSingle();
  if (!meeting || !mom) return { error: "Nothing to publish." };
  const m = meeting as MeetingRow;

  if (m.quorum_met === false && confirmText.trim() !== "PUBLISH ANYWAY") {
    return {
      error:
        'This meeting had no quorum. Type "PUBLISH ANYWAY" to publish with a no-quorum notice.',
    };
  }

  const content = normaliseMom(mom.content_json);
  content.noQuorumNotice = m.quorum_met === false;

  await db
    .from("moms")
    .update({
      content_json: content,
      status: "Published",
      emailed_at: new Date().toISOString(),
    })
    .eq("meeting_id", meetingId);
  await db.from("meetings").update({ status: "Published" }).eq("id", meetingId);

  const members = await activeMembers(db);
  for (const rec of members) {
    await notifyMember(db, rec, {
      type: "mom_published",
      title: `Minutes: ${m.title}`,
      lines: [
        content.noQuorumNotice
          ? "NOTE: this meeting did not have quorum under Rule 26; decisions are not binding."
          : "",
        `Decisions: ${content.decisions.join("; ") || "none recorded"}`,
        `Announcements: ${content.announcements.join("; ") || "none"}`,
      ].filter(Boolean),
      link: `/meetings/${meetingId}`,
    });
  }

  revalidatePath(`/meetings/${meetingId}`);
  return { ok: true };
}
