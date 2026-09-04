import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionMember, hasPosition, OFFICERS } from "@/lib/auth";
import { computeQuorum } from "@/lib/quorum";
import { MEETING_STATUS_NEXT, normaliseMom } from "@/lib/meetings";
import { getCurrentTerm } from "@/lib/portfolios";
import type {
  MeetingRow,
  MeetingAttendanceRow,
  MomRow,
  MemberRow,
} from "@/lib/database.types";
import { googleConfigured } from "@/lib/google/auth";
import { StatusFlow } from "./StatusFlow";
import { NotesImport } from "./NotesImport";
import { AttendanceGrid } from "./AttendanceGrid";
import { MomEditor } from "./MomEditor";
import { PublishControls } from "./PublishControls";

export const dynamic = "force-dynamic";

export default async function MeetingDetail({
  params,
}: {
  params: { id: string };
}) {
  const db = createClient();
  const { member, position } = await getSessionMember();

  const { data: meeting } = await db
    .from("meetings")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (!meeting) notFound();
  const m = meeting as MeetingRow;

  const [{ data: members }, { data: attRows }, { data: mom }, { data: config }] =
    await Promise.all([
      db.from("members").select("*").eq("is_active", true).order("name"),
      db.from("meeting_attendance").select("*").eq("meeting_id", params.id),
      db.from("moms").select("*").eq("meeting_id", params.id).maybeSingle(),
      db
        .from("compliance_config")
        .select("quorum_fraction, virtual_counts_for_quorum, terms!inner(is_current)")
        .eq("terms.is_current", true)
        .maybeSingle(),
    ]);

  const memberList = (members ?? []) as MemberRow[];
  const attendance = (attRows ?? []) as MeetingAttendanceRow[];
  const momRow = (mom ?? null) as MomRow | null;

  const term = await getCurrentTerm(db);
  let ecCount = memberList.length;
  if (term) {
    const { count } = await db
      .from("member_positions")
      .select("id", { count: "exact", head: true })
      .eq("term_id", term.id)
      .is("end_date", null);
    ecCount = count ?? memberList.length;
  }

  const quorum = computeQuorum(attendance, ecCount, {
    quorumFraction: config?.quorum_fraction ?? 0.3334,
    virtualCountsForQuorum: config?.virtual_counts_for_quorum ?? false,
  });

  const isOfficer = hasPosition(position, OFFICERS);
  const canManage = isOfficer || m.created_by === member.id;
  const momContent = normaliseMom(momRow?.content_json ?? null);

  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 820 }}>
      <Link href="/meetings" style={{ fontSize: 13 }}>
        ← All meetings
      </Link>

      <div className="card" style={{ display: "grid", gap: 6 }}>
        <h1 style={{ fontSize: 22 }}>{m.title}</h1>
        <p style={{ color: "#667" }}>
          {m.date}
          {m.time ? ` · ${m.time}` : ""}
          {m.meet_link && (
            <>
              {" · "}
              <a href={m.meet_link} target="_blank" rel="noreferrer">
                Join
              </a>
            </>
          )}
        </p>
        <div>
          <span className="badge">{m.status}</span>
        </div>
        {m.agenda_text && (
          <pre
            style={{
              whiteSpace: "pre-wrap",
              font: "inherit",
              background: "var(--surface)",
              padding: 12,
              borderRadius: 8,
              marginTop: 6,
            }}
          >
            {m.agenda_text}
          </pre>
        )}
        {canManage && (
          <div style={{ marginTop: 8 }}>
            <StatusFlow
              meetingId={m.id}
              options={MEETING_STATUS_NEXT[m.status] ?? []}
            />
          </div>
        )}
      </div>

      <div
        className={`card ${quorum.met ? "rag-green" : "rag-red"}`}
        style={{ fontWeight: 600 }}
      >
        {attendance.length === 0
          ? "Attendance not marked yet."
          : quorum.met
            ? `Quorum met (${quorum.counted}/${quorum.present} present, need ${quorum.required}).`
            : `NO QUORUM — decisions at this meeting are not binding under Rule 26 (${quorum.counted} counted, need ${quorum.required}).`}
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 8 }}>Minutes from Google Meet notes</h3>
        <NotesImport
          meetingId={m.id}
          canManage={canManage}
          googleReady={googleConfigured()}
          notesDocUrl={m.notes_doc_url}
          meetSyncedAt={m.meet_synced_at}
          meetDurationMinutes={m.meet_duration_minutes}
          notesIngestedAt={m.notes_ingested_at}
        />
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 10 }}>Attendance</h3>
        <AttendanceGrid
          meetingId={m.id}
          members={memberList.map((x) => ({ id: x.id, name: x.name }))}
          initial={attendance}
          readOnly={m.status === "Published" || !isOfficer}
        />
        {!isOfficer && (
          <p style={{ fontSize: 12, color: "#889", marginTop: 6 }}>
            Attendance is recorded by the Secretary or President.
          </p>
        )}
      </div>

      {m.status !== "Draft" && m.status !== "AgendaSent" && (
        <div className="card">
          <h3 style={{ marginBottom: 10 }}>Minutes</h3>
          <MomEditor
            meetingId={m.id}
            members={memberList.map((x) => ({ id: x.id, name: x.name }))}
            initial={momContent}
            readOnly={m.status === "Published"}
          />
          {canManage && m.status !== "Published" && (
            <div style={{ marginTop: 14, borderTop: "1px solid var(--line)", paddingTop: 14 }}>
              <PublishControls
                meetingId={m.id}
                status={m.status}
                momStatus={momRow?.status ?? null}
                quorumMet={m.quorum_met}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
