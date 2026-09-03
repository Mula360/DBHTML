import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHead } from "@/components/ui";
import type { MeetingRow } from "@/lib/database.types";

export const dynamic = "force-dynamic";

const STATUS_BAR: Record<MeetingRow["status"], string> = {
  Draft: "#B9C4CC",
  AgendaSent: "#3078C0",
  InProgress: "#E67E22",
  MoMDraft: "#E67E22",
  Approved: "#00A860",
  Published: "#00A860",
};
const STATUS_PILL: Record<MeetingRow["status"], { bg: string; fg: string }> = {
  Draft: { bg: "#EEF3F7", fg: "#4A5A66" },
  AgendaSent: { bg: "#EEF5FB", fg: "#1B5A8C" },
  InProgress: { bg: "#FDF1E4", fg: "#B4661A" },
  MoMDraft: { bg: "#FDF1E4", fg: "#B4661A" },
  Approved: { bg: "#E9F7EF", fg: "#1B7A45" },
  Published: { bg: "#E9F7EF", fg: "#1B7A45" },
};

export default async function MeetingsPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const db = createClient();
  let query = db.from("meetings").select("*");
  if (searchParams.q) query = query.ilike("title", `%${searchParams.q}%`);
  const { data: rows } = await query.order("date", { ascending: false });
  const meetings = (rows ?? []) as MeetingRow[];

  const { data: att } = await db
    .from("meeting_attendance")
    .select("meeting_id, status");
  const present = new Map<string, number>();
  for (const a of att ?? [])
    if (a.status === "present")
      present.set(a.meeting_id, (present.get(a.meeting_id) ?? 0) + 1);

  const held = meetings.filter((m) => m.status === "Published").length;

  return (
    <div>
      <PageHead
        title="Meetings & MoM"
        sub={`${held} of ${meetings.length || 0} meetings held this term`}
        actions={
          <Link href="/meetings/new" className="btn">
            + New meeting
          </Link>
        }
      />

      <form className="card" style={{ marginTop: 14 }}>
        <input name="q" placeholder="Search by title…" defaultValue={searchParams.q} />
      </form>

      <div className="card flush" style={{ marginTop: 16 }}>
        <div className="eyebrow" style={{ padding: "14px 18px 11px" }}>
          Every meeting · most recent first
        </div>
        {meetings.map((m) => {
          const p = STATUS_PILL[m.status];
          return (
            <Link
              key={m.id}
              href={`/meetings/${m.id}`}
              style={{
                display: "block",
                padding: "13px 18px",
                borderTop: "1px solid #f2f6f8",
                borderLeft: `3px solid ${STATUS_BAR[m.status]}`,
                color: "var(--ink)",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                {m.title}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--ink-mute)", marginBottom: 8 }}>
                {new Date(`${m.date}T00:00:00Z`).toLocaleDateString("en-GB", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
                {m.time ? ` · ${m.time}` : ""}
              </div>
              <div className="row" style={{ gap: 9 }}>
                <span
                  style={{
                    fontSize: 9.5,
                    fontWeight: 700,
                    padding: "3px 7px",
                    borderRadius: 5,
                    background: p.bg,
                    color: p.fg,
                  }}
                >
                  {m.status === "MoMDraft" ? "MoM DRAFT" : m.status.toUpperCase()}
                </span>
                <span style={{ fontSize: 11, color: "#9aa7b0" }}>
                  {present.get(m.id) != null
                    ? `${present.get(m.id)} present`
                    : m.quorum_met === false
                      ? "no quorum"
                      : "attendance not marked"}
                </span>
              </div>
            </Link>
          );
        })}
        {meetings.length === 0 && (
          <div style={{ padding: 18 }} className="muted">
            No meetings yet.
          </div>
        )}
        <div
          style={{
            padding: "14px 18px",
            borderTop: "1px solid #f2f6f8",
            background: "var(--paper-tint)",
            fontSize: 11.5,
            color: "var(--ink-mute)",
            lineHeight: 1.45,
          }}
        >
          <b style={{ color: "var(--ink)" }}>Attendance rule.</b> Members below the
          meeting minimum in a rolling year are flagged on the Compliance page.
        </div>
      </div>
    </div>
  );
}
