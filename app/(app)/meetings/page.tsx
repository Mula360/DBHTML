import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { MeetingRow } from "@/lib/database.types";

export const dynamic = "force-dynamic";

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
  const presentByMeeting = new Map<string, number>();
  for (const a of att ?? []) {
    if (a.status === "present") {
      presentByMeeting.set(
        a.meeting_id,
        (presentByMeeting.get(a.meeting_id) ?? 0) + 1,
      );
    }
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Meetings &amp; MoM</h1>
        <Link className="btn" href="/meetings/new">
          + New meeting
        </Link>
      </div>

      <form className="card">
        <input name="q" placeholder="Search by title…" defaultValue={searchParams.q} />
      </form>

      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "#667" }}>
              <th style={cell}>Meeting</th>
              <th style={cell}>Date</th>
              <th style={cell}>Status</th>
              <th style={cell}>Present</th>
              <th style={cell}>Quorum</th>
            </tr>
          </thead>
          <tbody>
            {meetings.map((m) => (
              <tr key={m.id} style={{ borderTop: "1px solid var(--line)" }}>
                <td style={cell}>
                  <Link href={`/meetings/${m.id}`}>{m.title}</Link>
                </td>
                <td style={cell}>
                  {m.date}
                  {m.time ? ` · ${m.time}` : ""}
                </td>
                <td style={cell}>{m.status}</td>
                <td style={cell}>{presentByMeeting.get(m.id) ?? "—"}</td>
                <td style={cell}>
                  {m.quorum_met === null ? (
                    "—"
                  ) : (
                    <span className={`badge ${m.quorum_met ? "rag-green" : "rag-red"}`}>
                      {m.quorum_met ? "Met" : "No quorum"}
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {meetings.length === 0 && (
              <tr>
                <td style={cell} colSpan={5}>
                  No meetings yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const cell: React.CSSProperties = { padding: "10px 14px" };
