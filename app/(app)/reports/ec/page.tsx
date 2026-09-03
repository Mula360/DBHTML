import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { computeAllObligations, getCurrentConfig } from "@/lib/compliance-compute";
import { PORTFOLIOS } from "@/app/(app)/nav";
import { prettyPortfolio } from "@/lib/constants";
import type {
  MeetingRow,
  MeetingAttendanceRow,
  MemberRow,
  ActionItemRow,
  PortfolioUpdateRow,
} from "@/lib/database.types";

export const dynamic = "force-dynamic";
const RAG = { green: "rag-green", amber: "rag-amber", red: "rag-red" } as const;
const ATT_COLOR: Record<string, string> = {
  present: "var(--rag-green-bg)",
  apology: "var(--rag-amber-bg)",
  absent: "var(--rag-red-bg)",
};

export default async function EcReport() {
  const db = createClient();
  const config = await getCurrentConfig(db);

  const [{ data: members }, { data: meetings }, { data: att }, { data: items }, { data: updates }] =
    await Promise.all([
      db.from("members").select("id, name").eq("is_active", true).order("name"),
      db.from("meetings").select("*").order("date"),
      db.from("meeting_attendance").select("*"),
      db.from("action_items").select("*"),
      db.from("portfolio_updates").select("*"),
    ]);

  const memberList = (members ?? []) as Pick<MemberRow, "id" | "name">[];
  const mtgs = (meetings ?? []) as MeetingRow[];
  const attRows = (att ?? []) as MeetingAttendanceRow[];
  const attKey = new Map(
    attRows.map((a) => [`${a.meeting_id}:${a.member_id}`, a]),
  );

  const obligations = config
    ? await computeAllObligations(db, config)
    : [];

  const openByPortfolio = new Map<string, number>();
  for (const i of (items ?? []) as ActionItemRow[])
    if ((i.status === "Open" || i.status === "InProgress") && i.portfolio_tag)
      openByPortfolio.set(
        i.portfolio_tag,
        (openByPortfolio.get(i.portfolio_tag) ?? 0) + 1,
      );
  const lastUpdate = new Map<string, string>();
  for (const u of (updates ?? []) as PortfolioUpdateRow[]) {
    const cur = lastUpdate.get(u.portfolio_name);
    if (!cur || u.created_at > cur) lastUpdate.set(u.portfolio_name, u.created_at);
  }

  return (
    <div style={{ display: "grid", gap: 20 }} className="printable">
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h1>EC-wide report</h1>
        <Link href="/reports" className="no-print" style={{ fontSize: 13 }}>
          ← Reports
        </Link>
      </div>

      <section>
        <h3 style={{ marginBottom: 8 }}>Baseline obligations</h3>
        <div className="card" style={{ padding: 0, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "#667" }}>
                <th style={c}>Member</th>
                <th style={c}>Trips</th>
                <th style={c}>Meetings</th>
                <th style={c}>Events</th>
                <th style={c}>Pitta</th>
                <th style={c}>Overall</th>
              </tr>
            </thead>
            <tbody>
              {obligations.map((r) => (
                <tr key={r.member.id} style={{ borderTop: "1px solid var(--line)" }}>
                  <td style={c}>{r.member.name}</td>
                  {r.obligations.map((o) => (
                    <td key={o.key} style={c}>
                      <span className={`badge ${RAG[o.rag]}`}>
                        {o.achieved}/{o.minimum}
                      </span>
                    </td>
                  ))}
                  <td style={c}>
                    <span className={`badge ${RAG[r.overall]}`}>{r.overall}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 style={{ marginBottom: 8 }}>Portfolio status</h3>
        <div className="card" style={{ padding: 0, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "#667" }}>
                <th style={c}>Portfolio</th>
                <th style={c}>Open items</th>
                <th style={c}>Last update</th>
              </tr>
            </thead>
            <tbody>
              {PORTFOLIOS.map((p) => (
                <tr key={p} style={{ borderTop: "1px solid var(--line)" }}>
                  <td style={c}>{prettyPortfolio(p)}</td>
                  <td style={c}>{openByPortfolio.get(p) ?? 0}</td>
                  <td style={c}>
                    {lastUpdate.get(p)
                      ? new Date(lastUpdate.get(p)!).toLocaleDateString("en-IN")
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 style={{ marginBottom: 8 }}>Attendance heatmap</h3>
        <div className="card" style={{ padding: 0, overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr>
                <th style={c}>Member</th>
                {mtgs.map((m) => (
                  <th key={m.id} style={{ ...c, whiteSpace: "nowrap" }}>
                    {m.date.slice(5)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {memberList.map((mem) => (
                <tr key={mem.id} style={{ borderTop: "1px solid var(--line)" }}>
                  <td style={{ ...c, whiteSpace: "nowrap" }}>{mem.name}</td>
                  {mtgs.map((m) => {
                    const a = attKey.get(`${m.id}:${mem.id}`);
                    return (
                      <td
                        key={m.id}
                        title={a?.status ?? "—"}
                        style={{
                          ...c,
                          textAlign: "center",
                          background: a ? ATT_COLOR[a.status] : "transparent",
                        }}
                      >
                        {a
                          ? a.status === "present"
                            ? a.attendance_mode === "virtual"
                              ? "V"
                              : "P"
                            : a.status === "apology"
                              ? "A"
                              : "✗"
                          : "·"}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr style={{ borderTop: "2px solid var(--brand-deep)" }}>
                <td style={{ ...c, fontWeight: 700 }}>Quorum</td>
                {mtgs.map((m) => (
                  <td key={m.id} style={{ ...c, textAlign: "center" }}>
                    {m.quorum_met === null ? "·" : m.quorum_met ? "✓" : "✗"}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: 11, color: "#889" }}>
          P present · V virtual · A apology · ✗ absent
        </p>
      </section>
    </div>
  );
}

const c: React.CSSProperties = { padding: "6px 10px" };
