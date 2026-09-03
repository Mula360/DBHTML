import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSessionMember, hasPosition, OFFICERS } from "@/lib/auth";
import { computeAllObligations, getCurrentConfig } from "@/lib/compliance-compute";
import { getComplianceYear } from "@/lib/compliance";
import { istToday } from "@/lib/dates";

export const dynamic = "force-dynamic";

const RAG_CLASS = { green: "rag-green", amber: "rag-amber", red: "rag-red" } as const;

export default async function CompliancePage() {
  const db = createClient();
  const { position } = await getSessionMember();
  const config = await getCurrentConfig(db);

  if (!config) {
    return (
      <div className="card">
        No current term / compliance config found. Seed the database first.
      </div>
    );
  }

  const today = istToday();
  const year = getComplianceYear(today, config);
  const rows = await computeAllObligations(db, config, today);

  const cols = [
    { key: "trips", head: `Field trips (min ${config.min_field_trips})` },
    { key: "meetings", head: `Meetings (min ${config.min_meetings})` },
    { key: "events", head: `Events (min ${config.min_events})` },
    { key: "pitta", head: `Pitta (${config.pitta_window_days}d)` },
  ] as const;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1>Baseline Obligations</h1>
        {hasPosition(position, OFFICERS) && (
          <Link href="/settings" style={{ fontSize: 13 }}>
            Edit minimums →
          </Link>
        )}
      </div>
      <p style={{ color: "#667" }}>
        Compliance year <b>{year.label}</b> ({year.start} → {year.end}). RAG is
        pace-based: amber = keeping pace, red = behind pace.
      </p>

      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "#667" }}>
              <th style={c}>Member</th>
              {cols.map((col) => (
                <th key={col.key} style={c}>
                  {col.head}
                </th>
              ))}
              <th style={c}>Overall</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.member.id} style={{ borderTop: "1px solid var(--line)" }}>
                <td style={c}>
                  {r.member.name}
                  <div style={{ color: "#889", fontSize: 11 }}>{r.position}</div>
                </td>
                {r.obligations.map((o) => (
                  <td key={o.key} style={c}>
                    <span className={`badge ${RAG_CLASS[o.rag]}`}>
                      {o.achieved} / {o.minimum}
                    </span>
                  </td>
                ))}
                <td style={c}>
                  <span className={`badge ${RAG_CLASS[r.overall]}`}>
                    {r.overall === "green" ? "Met" : r.overall === "amber" ? "On pace" : "Behind"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const c: React.CSSProperties = { padding: "9px 12px", verticalAlign: "top" };
