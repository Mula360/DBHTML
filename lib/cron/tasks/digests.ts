import type { DB } from "./shared";
import type { ActionItemRow, MemberRow } from "@/lib/database.types";
import { addDays } from "@/lib/dates";
import { notifyMember } from "@/lib/mailer";
import {
  getUpcomingWalks,
  getUpcomingMeetings,
  getUpcomingEvents,
} from "./shared";
import { getMembersByPosition, getPortfolioMembers } from "@/lib/portfolios";

const OPEN: ("Open" | "InProgress")[] = ["Open", "InProgress"];

async function activeMembers(db: DB): Promise<MemberRow[]> {
  const { data } = await db.from("members").select("*").eq("is_active", true);
  return (data ?? []) as MemberRow[];
}

function urgencyLines(items: ActionItemRow[], today: string): string[] {
  const weekEnd = addDays(today, 7);
  const overdue = items.filter((i) => i.due_date && i.due_date < today);
  const thisWeek = items.filter(
    (i) => i.due_date && i.due_date >= today && i.due_date <= weekEnd,
  );
  const later = items.filter((i) => !i.due_date || i.due_date > weekEnd);
  const fmt = (label: string, list: ActionItemRow[]) =>
    list.length ? `${label}: ${list.map((i) => i.title).join("; ")}` : null;
  return [
    fmt(`Overdue (${overdue.length})`, overdue),
    fmt(`Due this week (${thisWeek.length})`, thisWeek),
    fmt(`Upcoming (${later.length})`, later),
  ].filter((l): l is string => l !== null);
}

/** Monday: each member gets their own open items + the week's calendar. */
export async function runWeeklyDigest(
  db: DB,
  today: string,
): Promise<Record<string, number>> {
  const members = await activeMembers(db);
  const [walks, meetings, events] = await Promise.all([
    getUpcomingWalks(db, 7, today),
    getUpcomingMeetings(db, 7, today),
    getUpcomingEvents(db, 7, today),
  ]);
  const calendar: string[] = [
    ...meetings.map((m) => `Meeting: ${m.title} — ${m.date}`),
    ...walks.map((w) => `Walk: ${w.title} — ${w.date}`),
    ...events.map((e) => `Event: ${e.title} — ${e.date}`),
  ];

  let sent = 0;
  for (const m of members) {
    const { data: rows } = await db
      .from("action_items")
      .select("*")
      .eq("assigned_to", m.id)
      .in("status", OPEN);
    const items = (rows ?? []) as ActionItemRow[];
    if (items.length === 0 && calendar.length === 0) continue;
    await notifyMember(db, m, {
      type: "weekly_digest",
      title: "Your Monday digest",
      lines: [
        items.length
          ? "Your open action items:"
          : "No open action items — nice.",
        ...urgencyLines(items, today),
        calendar.length ? "This week:" : "",
        ...calendar,
      ].filter(Boolean),
      link: "/my-tasks",
    });
    sent++;
  }
  await db.from("digest_log").insert({
    type: "weekly",
    recipients_json: { count: sent },
  });
  return { weekly_digest_sent: sent };
}

/** 1st of month: EC-wide summary + renewals-due for Member Engagement + Treasurer. */
export async function runMonthlyDigest(
  db: DB,
  today: string,
): Promise<Record<string, number>> {
  const members = await activeMembers(db);
  const monthAgo = addDays(today, -30);

  const { data: closedRows } = await db
    .from("action_items")
    .select("id")
    .gte("completed_at", `${monthAgo}T00:00:00Z`)
    .eq("status", "Done");
  const { data: overdueRows } = await db
    .from("action_items")
    .select("id")
    .in("status", OPEN)
    .not("due_date", "is", null)
    .lt("due_date", today);
  const { data: updateRows } = await db
    .from("portfolio_updates")
    .select("portfolio_name")
    .gte("created_at", `${monthAgo}T00:00:00Z`);

  const updateCounts = new Map<string, number>();
  for (const u of updateRows ?? []) {
    const k = (u as { portfolio_name: string }).portfolio_name;
    updateCounts.set(k, (updateCounts.get(k) ?? 0) + 1);
  }
  const events = await getUpcomingEvents(db, 45, today);

  const baseLines = [
    `Action items closed in the last 30 days: ${(closedRows ?? []).length}`,
    `Action items currently overdue: ${(overdueRows ?? []).length}`,
    `Portfolio updates logged: ${
      [...updateCounts.entries()].map(([k, n]) => `${k} ${n}`).join(", ") || "none"
    }`,
    events.length ? `Upcoming events: ${events.map((e) => `${e.title} (${e.date})`).join(", ")}` : "",
  ].filter(Boolean);

  for (const m of members) {
    await notifyMember(db, m, {
      type: "monthly_digest",
      title: "EC monthly digest",
      lines: baseLines,
      link: "/dashboard",
    });
  }

  // Renewals-due list — restricted recipients.
  const { data: dueSoon } = await db
    .from("society_members")
    .select("name, renewal_due_date, status")
    .eq("is_deleted", false)
    .in("status", ["Due", "Lapsed"])
    .not("renewal_due_date", "is", null)
    .lte("renewal_due_date", addDays(today, 30))
    .order("renewal_due_date");

  const engagement = await getPortfolioMembers(db, "MemberEngagement");
  const treasury = await getMembersByPosition(db, ["Treasurer", "VP-1"]);
  const recipients = [
    ...(engagement.lead ? [engagement.lead] : []),
    ...engagement.support,
    ...treasury,
  ];
  const dedup = new Map(recipients.map((r) => [r.id, r]));
  if ((dueSoon ?? []).length > 0) {
    for (const r of dedup.values()) {
      await notifyMember(db, r, {
        type: "renewals_due",
        title: `${(dueSoon ?? []).length} membership renewal(s) due within 30 days`,
        lines: (dueSoon ?? []).map(
          (s) =>
            `• ${(s as { name: string }).name} — due ${(s as { renewal_due_date: string }).renewal_due_date}`,
        ),
        link: "/membership",
      });
    }
  }

  await db.from("digest_log").insert({
    type: "monthly",
    recipients_json: { members: members.length },
  });
  return {
    monthly_digest_sent: members.length,
    renewals_flagged: (dueSoon ?? []).length,
  };
}
