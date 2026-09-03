import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSessionMember, hasPosition } from "@/lib/auth";
import { istToday, daysBetween } from "@/lib/dates";
import { getCurrentConfig } from "@/lib/compliance-compute";
import { pittaWindowStart } from "@/lib/compliance";
import type {
  PittaIssueRow,
  PittaContributionRow,
  MemberRow,
  PositionName,
} from "@/lib/database.types";
import { NewIssueForm } from "./ui";

export const dynamic = "force-dynamic";

const EDITORS: PositionName[] = ["VP-1", "Secretary", "President"];

export default async function PittaPage() {
  const db = createClient();
  const { position } = await getSessionMember();
  const isEditor = hasPosition(position, EDITORS);

  const { data: issues } = await db
    .from("pitta_issues")
    .select("*")
    .order("target_publish_date", { ascending: false, nullsFirst: false });

  const config = await getCurrentConfig(db);
  const today = istToday();

  // VP-1 widget: members with no contribution in the rolling window
  const { data: members } = await db
    .from("members")
    .select("id, name")
    .eq("is_active", true)
    .order("name");
  const { data: contribs } = await db
    .from("pitta_contributions")
    .select("member_id, submitted_at")
    .order("submitted_at", { ascending: false });

  const last = new Map<string, string>();
  for (const c of (contribs ?? []) as PittaContributionRow[])
    if (!last.has(c.member_id)) last.set(c.member_id, c.submitted_at);

  const windowStart = config ? pittaWindowStart(config, today) : today;
  const behind = ((members ?? []) as Pick<MemberRow, "id" | "name">[])
    .map((m) => ({
      name: m.name,
      last: last.get(m.id) ?? null,
      daysSince: last.get(m.id) ? daysBetween(last.get(m.id)!, today) : null,
      inWindow: last.get(m.id) ? last.get(m.id)! >= windowStart : false,
    }))
    .filter((m) => !m.inWindow);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Pitta Newsletter</h1>
      </div>

      {isEditor && <NewIssueForm />}

      <section className="card">
        <h3 style={{ marginBottom: 10 }}>Issues</h3>
        {(issues ?? []).length === 0 && (
          <p style={{ color: "#889" }}>No issues yet.</p>
        )}
        {((issues ?? []) as PittaIssueRow[]).map((i) => (
          <div
            key={i.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "8px 0",
              borderTop: "1px solid var(--line)",
              fontSize: 14,
            }}
          >
            <Link href={`/pitta/${i.id}`}>
              {i.issue_number ? `#${i.issue_number} · ` : ""}
              {i.theme ?? "untitled"}
            </Link>
            <span style={{ color: "#667" }}>
              {i.actual_publish_date
                ? `published ${i.actual_publish_date}`
                : i.target_publish_date
                  ? `target ${i.target_publish_date}`
                  : ""}{" "}
              <span className="badge">{i.status}</span>
            </span>
          </div>
        ))}
      </section>

      {isEditor && (
        <section className="card">
          <h3 style={{ marginBottom: 8 }}>
            No contribution in the rolling window
            {config ? ` (${config.pitta_window_days} days)` : ""}
          </h3>
          {behind.length === 0 && (
            <p style={{ color: "#889", fontSize: 14 }}>Everyone is current. 🎉</p>
          )}
          {behind.map((m) => (
            <div key={m.name} style={{ fontSize: 14, padding: "3px 0" }}>
              {m.name} —{" "}
              {m.last
                ? `last ${m.last} (${m.daysSince} days ago)`
                : "no contribution on record"}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
