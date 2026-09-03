import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSessionMember, hasPosition, OFFICERS } from "@/lib/auth";
import { computeAllObligations, getCurrentConfig } from "@/lib/compliance-compute";
import { getComplianceYear } from "@/lib/compliance";
import { istToday } from "@/lib/dates";
import { PageHead, Avatar } from "@/components/ui";
import type { Obligation } from "@/lib/compliance-compute";

export const dynamic = "force-dynamic";

const CELL = {
  green: { bg: "#E9F7EF", fg: "#1B7A45", bd: "#CDEBDA" },
  amber: { bg: "#FDF1E4", fg: "#B4661A", bd: "#F4DCC2" },
  red: { bg: "#FBEAE7", fg: "#A32D1F", bd: "#F1D3CD" },
} as const;
const OVERALL = {
  green: { bg: "#E9F7EF", fg: "#1B7A45", label: "GREEN" },
  amber: { bg: "#FDF1E4", fg: "#B4661A", label: "AMBER" },
  red: { bg: "#FBEAE7", fg: "#A32D1F", label: "RED" },
} as const;

function Cell({ o }: { o: Obligation }) {
  const c = CELL[o.rag];
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: 12,
        fontWeight: 700,
        padding: "5px 10px",
        borderRadius: 6,
        background: c.bg,
        color: c.fg,
        border: `1px solid ${c.bd}`,
      }}
    >
      {o.achieved} of {o.minimum}
    </span>
  );
}

function noteFor(obs: Obligation[]): string {
  const reds = obs.filter((o) => o.rag === "red");
  const ambers = obs.filter((o) => o.rag === "amber");
  if (reds.length >= 3) return "Behind on most obligations";
  const bad = [...reds, ...ambers];
  if (bad.length === 0) return "Clear";
  return bad
    .map((o) =>
      o.key === "pitta"
        ? "Pitta below window"
        : `${o.minimum - o.achieved} ${o.key === "trips" ? "trip" : o.key === "meetings" ? "meeting" : "event"}${o.minimum - o.achieved === 1 ? "" : "s"} short`,
    )
    .slice(0, 1)
    .join(", ");
}

export default async function CompliancePage() {
  const db = createClient();
  const { position } = await getSessionMember();
  const config = await getCurrentConfig(db);

  if (!config) {
    return <div className="card muted">No current term / compliance config found.</div>;
  }

  const today = istToday();
  const year = getComplianceYear(today, config);
  const rows = await computeAllObligations(db, config, today);

  const heads = [
    `FIELD TRIPS · MIN ${config.min_field_trips}`,
    `MEETINGS · MIN ${config.min_meetings}`,
    `EVENTS · MIN ${config.min_events}`,
    `PITTA · ${config.pitta_min_contributions} / ${Math.round(config.pitta_window_days / 30)} MTHS`,
  ];

  return (
    <div>
      <PageHead
        title={`Baseline obligations · ${year.label}`}
        sub="Four minimums per member, from the Roles & Responsibilities document. Tallies come from meeting attendance, walk coordinator records, event helper ticks and the Pitta contribution log."
        actions={
          <Link href="/reports" className="btn">
            Export year-end PDF
          </Link>
        }
      />

      <div
        className="row"
        style={{ gap: 16, fontSize: 11.5, color: "var(--ink-soft)", marginTop: 16 }}
      >
        <span className="row" style={{ gap: 6 }}>
          <span style={sw("#00A860")} /> Met
        </span>
        <span className="row" style={{ gap: 6 }}>
          <span style={sw("#E67E22")} /> Below pace
        </span>
        <span className="row" style={{ gap: 6 }}>
          <span style={sw("#C0392B")} /> At risk
        </span>
      </div>

      {config.midyear_alert_month && (
        <div className="banner amber">
          <b>Pace is checked against the calendar.</b> A member is amber while
          keeping up with the elapsed fraction of the year and red once they fall
          behind it. The mid-year alert goes out on the 1st of month{" "}
          {config.midyear_alert_month}.
        </div>
      )}

      <div
        className="card flush"
        style={{ marginTop: 16, overflow: "auto" }}
      >
        <div style={{ minWidth: 1060 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "250px repeat(4,1fr) 190px",
              padding: "11px 18px",
              background: "var(--paper-tint)",
              borderBottom: "1px solid var(--line)",
              font: "600 10px var(--font-ui)",
              letterSpacing: "0.07em",
              color: "var(--ink-faint)",
            }}
          >
            <div>MEMBER</div>
            {heads.map((h) => (
              <div key={h}>{h}</div>
            ))}
            <div>OVERALL</div>
          </div>
          {rows.map((r) => {
            const ov = OVERALL[r.overall];
            return (
              <div
                key={r.member.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "250px repeat(4,1fr) 190px",
                  alignItems: "center",
                  padding: "0 18px",
                  minHeight: 54,
                  borderBottom: "1px solid #f2f6f8",
                }}
              >
                <div className="row" style={{ gap: 11 }}>
                  <Avatar name={r.member.name} size={32} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{r.member.name}</div>
                    <div style={{ fontSize: 10.5, color: "var(--blue)", fontWeight: 600 }}>
                      {r.position ?? "—"}
                    </div>
                  </div>
                </div>
                {r.obligations.map((o) => (
                  <div key={o.key}>
                    <Cell o={o} />
                  </div>
                ))}
                <div className="row" style={{ gap: 9 }}>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "4px 8px",
                      borderRadius: 5,
                      background: ov.bg,
                      color: ov.fg,
                    }}
                  >
                    {ov.label}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>
                    {noteFor(r.obligations)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {hasPosition(position, OFFICERS) && (
        <p style={{ marginTop: 14, fontSize: 12 }}>
          <Link href="/settings">Edit the minimums and rules in Settings →</Link>
        </p>
      )}
    </div>
  );
}

const sw = (c: string): React.CSSProperties => ({
  width: 11,
  height: 11,
  borderRadius: 3,
  background: c,
  display: "inline-block",
});
