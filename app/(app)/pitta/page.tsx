import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSessionMember, hasPosition } from "@/lib/auth";
import { istToday, daysBetween } from "@/lib/dates";
import { getCurrentConfig } from "@/lib/compliance-compute";
import { pittaWindowStart } from "@/lib/compliance";
import { PageHead, SectionLabel, Avatar } from "@/components/ui";
import { NewIssueForm } from "./ui";
import type {
  PittaIssueRow,
  PittaContributionRow,
  MemberRow,
  PositionName,
} from "@/lib/database.types";

export const dynamic = "force-dynamic";

const EDITORS: PositionName[] = ["VP-1", "Secretary", "President"];
const BAR: Record<PittaIssueRow["status"], string> = {
  Planning: "#B9C4CC",
  Writing: "#3078C0",
  Layout: "#E67E22",
  Published: "#00A860",
};
const PILL: Record<PittaIssueRow["status"], { bg: string; fg: string }> = {
  Planning: { bg: "#EEF3F7", fg: "#4A5A66" },
  Writing: { bg: "#EEF5FB", fg: "#1B5A8C" },
  Layout: { bg: "#FDF1E4", fg: "#B4661A" },
  Published: { bg: "#E9F7EF", fg: "#1B7A45" },
};

export default async function PittaPage() {
  const db = createClient();
  const { position } = await getSessionMember();
  const isEditor = hasPosition(position, EDITORS);
  const today = istToday();
  const config = await getCurrentConfig(db);

  const [{ data: issues }, { data: members }, { data: contribs }] = await Promise.all([
    db
      .from("pitta_issues")
      .select("*")
      .order("target_publish_date", { ascending: false, nullsFirst: false }),
    db.from("members").select("id, name").eq("is_active", true).order("name"),
    db.from("pitta_contributions").select("*").order("submitted_at", { ascending: false }),
  ]);

  const last = new Map<string, string>();
  const count = new Map<string, number>();
  for (const c of (contribs ?? []) as PittaContributionRow[]) {
    if (!last.has(c.member_id)) last.set(c.member_id, c.submitted_at);
    count.set(c.member_id, (count.get(c.member_id) ?? 0) + 1);
  }
  const windowStart = config ? pittaWindowStart(config, today) : today;

  return (
    <div>
      <PageHead
        title="Pitta Newsletter"
        sub="Every EC member reads this; write access sits with the Editor (VP-1). Contributions are credited when an issue goes out and feed the compliance obligation."
      />

      {isEditor && (
        <div style={{ marginTop: 14 }}>
          <NewIssueForm />
        </div>
      )}

      <SectionLabel>Issues</SectionLabel>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(272px,1fr))",
          gap: 14,
        }}
      >
        {((issues ?? []) as PittaIssueRow[]).map((i) => {
          const p = PILL[i.status];
          return (
            <Link
              key={i.id}
              href={`/pitta/${i.id}`}
              className="card"
              style={{ borderTop: `3px solid ${BAR[i.status]}`, color: "var(--ink)", display: "block" }}
            >
              <div className="row" style={{ gap: 9, alignItems: "baseline" }}>
                <div style={{ font: "400 26px/1 Georgia,serif" }}>
                  {i.issue_number ?? "—"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1.3 }}>
                    {i.theme ?? "untitled"}
                  </div>
                </div>
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
                  {i.status.toUpperCase()}
                </span>
              </div>
              <div style={{ fontSize: 11.5, color: "var(--ink-mute)", marginTop: 9 }}>
                {i.actual_publish_date
                  ? `Published ${i.actual_publish_date}`
                  : i.target_publish_date
                    ? `Target ${i.target_publish_date}`
                    : "No date set"}
              </div>
            </Link>
          );
        })}
        {(issues ?? []).length === 0 && (
          <div className="card muted">No issues yet.</div>
        )}
      </div>

      {isEditor && (
        <>
          <SectionLabel>
            Contribution interval · {config?.pitta_min_contributions ?? 1} per{" "}
            {config ? Math.round(config.pitta_window_days / 30) : 6} months
          </SectionLabel>
          <div className="card">
            {((members ?? []) as Pick<MemberRow, "id" | "name">[]).map((m) => {
              const lc = last.get(m.id);
              const inWindow = lc ? lc >= windowStart : false;
              return (
                <div
                  key={m.id}
                  className="row"
                  style={{ gap: 11, padding: "10px 0", borderBottom: "1px solid #f2f6f8" }}
                >
                  <Avatar name={m.name} size={30} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600 }}>{m.name}</div>
                    <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 2 }}>
                      {lc ? `Last ${lc}` : "None on record"} · {count.get(m.id) ?? 0} total
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                      color: inWindow ? "var(--g-fg)" : "var(--r-fg)",
                    }}
                  >
                    {inWindow
                      ? "in window"
                      : lc
                        ? `${daysBetween(lc, today)} days ago`
                        : "overdue"}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
