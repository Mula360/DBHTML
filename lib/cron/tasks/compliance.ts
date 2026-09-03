import type { DB } from "./shared";
import type { ComplianceConfigRow, MemberRow } from "@/lib/database.types";
import { computeAllObligations } from "@/lib/compliance-compute";
import { daysBetween } from "@/lib/dates";
import { notifyMember } from "@/lib/mailer";
import { getMembersByPosition } from "@/lib/portfolios";

async function membersById(db: DB, ids: string[]) {
  const uniq = [...new Set(ids)].filter(Boolean);
  if (uniq.length === 0) return new Map<string, MemberRow>();
  const { data } = await db.from("members").select("*").in("id", uniq);
  return new Map((data ?? []).map((m) => [m.id, m as MemberRow]));
}

/** Mid-year: alert members behind pace on any obligation; copy the Secretary. */
export async function runMidyearPaceAlert(
  db: DB,
  config: ComplianceConfigRow,
  today: string,
): Promise<Record<string, number>> {
  const rows = await computeAllObligations(db, config, today);
  const behind = rows.filter((r) => r.obligations.some((o) => o.rag === "red"));
  if (behind.length === 0) return { midyear_behind: 0 };

  const memMap = await membersById(db, behind.map((b) => b.member.id));
  for (const b of behind) {
    const m = memMap.get(b.member.id);
    if (!m) continue;
    const short = b.obligations
      .filter((o) => o.rag !== "green")
      .map((o) => `${o.label}: ${o.achieved}/${o.minimum}`);
    await notifyMember(db, m, {
      type: "compliance_pace_alert",
      title: "Mid-year check — you're behind on baseline obligations",
      lines: ["You are behind pace on:", ...short.map((s) => `• ${s}`)],
      link: "/compliance",
    });
  }

  const secretaries = await getMembersByPosition(db, ["Secretary", "President"]);
  for (const s of secretaries) {
    await notifyMember(db, s, {
      type: "compliance_pace_alert_officer",
      title: `Mid-year check — ${behind.length} member(s) behind pace`,
      lines: behind.map(
        (b) => `• ${b.member.name}: ${b.obligations.filter((o) => o.rag === "red").map((o) => o.label).join(", ")}`,
      ),
      link: "/compliance",
    });
  }
  return { midyear_behind: behind.length };
}

/** Nudge a member ~30 days before their Pitta rolling window lapses. */
export async function runPittaNudge(
  db: DB,
  config: ComplianceConfigRow,
  today: string,
  monthStart: boolean,
): Promise<Record<string, number>> {
  const { data: members } = await db
    .from("members")
    .select("*")
    .eq("is_active", true);
  const { data: contribs } = await db
    .from("pitta_contributions")
    .select("member_id, submitted_at")
    .order("submitted_at", { ascending: false });

  const last = new Map<string, string>();
  for (const c of contribs ?? [])
    if (!last.has(c.member_id)) last.set(c.member_id, c.submitted_at);

  let nudged = 0;
  for (const m of (members ?? []) as MemberRow[]) {
    const lc = last.get(m.id);
    const daysSince = lc ? daysBetween(lc, today) : Infinity;
    const dueSoon = lc && daysSince === config.pitta_window_days - 30;
    const never = !lc && monthStart;
    if (dueSoon || never) {
      await notifyMember(db, m, {
        type: "pitta_nudge",
        title: "Pitta contribution nudge",
        lines: [
          lc
            ? `Your last Pitta contribution was ${lc} — the ${config.pitta_window_days}-day window lapses in ~30 days.`
            : `You have no Pitta contribution on record. The minimum is ${config.pitta_min_contributions} per rolling ${config.pitta_window_days} days.`,
        ],
        link: "/pitta",
      });
      nudged++;
    }
  }
  return { pitta_nudged: nudged };
}

/** Year-end: email officers a link to the compliance report; log it. */
export async function runYearendReport(
  db: DB,
  config: ComplianceConfigRow,
  today: string,
): Promise<Record<string, number>> {
  const rows = await computeAllObligations(db, config, today);
  const met = rows.filter((r) => r.overall === "green").length;
  const officers = await getMembersByPosition(db, ["President", "Secretary"]);
  for (const o of officers) {
    await notifyMember(db, o, {
      type: "yearend_compliance_report",
      title: "Year-end compliance report is ready",
      lines: [
        `${met} of ${rows.length} members met all four baseline obligations.`,
        ...rows.map(
          (r) =>
            `• ${r.member.name}: ${r.overall}${
              r.overall !== "green"
                ? ` (${r.obligations.filter((o) => o.rag !== "green").map((o) => o.label).join(", ")})`
                : ""
            }`,
        ),
      ],
      link: "/reports",
    });
  }
  await db.from("digest_log").insert({
    type: "yearend_compliance",
    recipients_json: { met, total: rows.length },
  });
  return { yearend_members: rows.length, yearend_met: met };
}
