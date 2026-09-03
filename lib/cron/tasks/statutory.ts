import type { DB } from "./shared";
import type { StatutoryItemRow } from "@/lib/database.types";
import { addDays } from "@/lib/dates";
import { notifyMember } from "@/lib/mailer";
import { getMembersByPosition } from "@/lib/portfolios";

/** Statutory items falling due in exactly 14 days → digest to the Secretary. */
export async function runStatutoryReminders(
  db: DB,
  today: string,
): Promise<Record<string, number>> {
  const { data } = await db
    .from("statutory_items")
    .select("*")
    .eq("due_date", addDays(today, 14))
    .neq("status", "Done");
  const items = (data ?? []) as StatutoryItemRow[];
  if (items.length === 0) return { statutory_due_14d: 0 };

  const secretaries = await getMembersByPosition(db, ["Secretary", "President"]);
  for (const s of secretaries) {
    await notifyMember(db, s, {
      type: "statutory_due",
      title: `${items.length} statutory item(s) due in 14 days`,
      lines: items.map(
        (i) => `• ${i.title}${i.authority ? ` (${i.authority})` : ""} — due ${i.due_date}`,
      ),
      link: "/statutory",
    });
  }
  return { statutory_due_14d: items.length };
}
