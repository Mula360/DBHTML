import type { DB } from "./shared";
import type { ActionItemRow, MemberRow } from "@/lib/database.types";
import { addDays } from "@/lib/dates";
import { notifyMember } from "@/lib/mailer";
import { getPortfolioMembers, getMembersByPosition } from "@/lib/portfolios";

const OPEN: ("Open" | "InProgress")[] = ["Open", "InProgress"];

async function membersById(db: DB, ids: string[]): Promise<Map<string, MemberRow>> {
  const uniq = [...new Set(ids)].filter(Boolean);
  if (uniq.length === 0) return new Map();
  const { data } = await db.from("members").select("*").in("id", uniq);
  return new Map((data ?? []).map((m) => [m.id, m as MemberRow]));
}

/**
 * Daily action-item tasks:
 *  - due in exactly 3 days   → remind the assignee
 *  - newly overdue (due yesterday) → tell assignee + portfolio lead
 *  - 7+ days overdue         → single escalation digest to President + Secretary
 */
export async function runActionItemReminders(
  db: DB,
  today: string,
): Promise<Record<string, number>> {
  const { data: rows } = await db
    .from("action_items")
    .select("*")
    .in("status", OPEN)
    .not("due_date", "is", null);
  const items = (rows ?? []) as ActionItemRow[];

  const dueSoon = items.filter((i) => i.due_date === addDays(today, 3));
  const newlyOverdue = items.filter((i) => i.due_date === addDays(today, -1));
  const escalated = items.filter((i) => i.due_date! <= addDays(today, -7));

  const assigneeMap = await membersById(db, [
    ...dueSoon.map((i) => i.assigned_to),
    ...newlyOverdue.map((i) => i.assigned_to),
  ]);

  for (const i of dueSoon) {
    const m = assigneeMap.get(i.assigned_to);
    if (!m) continue;
    await notifyMember(db, m, {
      type: "action_due_soon",
      title: `Due in 3 days: ${i.title}`,
      lines: [`Your action item "${i.title}" is due on ${i.due_date}.`],
      link: `/action-items/${i.id}`,
    });
  }

  for (const i of newlyOverdue) {
    const m = assigneeMap.get(i.assigned_to);
    if (m) {
      await notifyMember(db, m, {
        type: "action_overdue",
        title: `Overdue: ${i.title}`,
        lines: [`"${i.title}" was due ${i.due_date} and is now overdue.`],
        link: `/action-items/${i.id}`,
      });
    }
    if (i.portfolio_tag) {
      const { lead } = await getPortfolioMembers(db, i.portfolio_tag);
      if (lead && lead.id !== i.assigned_to) {
        await notifyMember(db, lead, {
          type: "action_overdue_lead",
          title: `Portfolio item overdue: ${i.title}`,
          lines: [
            `A ${i.portfolio_tag} action item assigned to ${m?.name ?? "a member"} is overdue (due ${i.due_date}).`,
          ],
          link: `/action-items/${i.id}`,
        });
      }
    }
  }

  if (escalated.length > 0) {
    const officers = await getMembersByPosition(db, ["President", "Secretary"]);
    const owners = await membersById(db, escalated.map((i) => i.assigned_to));
    const lines = [
      `${escalated.length} action item(s) are 7+ days overdue:`,
      ...escalated.map(
        (i) =>
          `• "${i.title}" — ${owners.get(i.assigned_to)?.name ?? "unassigned"}, due ${i.due_date}`,
      ),
    ];
    for (const o of officers) {
      await notifyMember(db, o, {
        type: "action_escalation",
        title: `${escalated.length} action item(s) badly overdue`,
        lines,
        link: `/action-items?status=Open&overdue=1`,
      });
    }
  }

  return {
    due_soon: dueSoon.length,
    newly_overdue: newlyOverdue.length,
    escalated: escalated.length,
  };
}
