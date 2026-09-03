import type { DB } from "./shared";
import type { SocietyMemberRow } from "@/lib/database.types";
import { daysBetween } from "@/lib/dates";

/**
 * Recompute society (general) member status from renewal_due_date:
 *   Life type                        → "Life"
 *   today >= due + 60d               → "Lapsed"
 *   today >= due - 30d               → "Due"
 *   otherwise                        → "Active"
 * Members with no renewal_due_date are left untouched.
 */
export function computeStatus(
  m: Pick<SocietyMemberRow, "membership_type" | "renewal_due_date">,
  today: string,
): SocietyMemberRow["status"] | null {
  if ((m.membership_type ?? "").toLowerCase() === "life") return "Life";
  if (!m.renewal_due_date) return null;
  const daysToDue = daysBetween(today, m.renewal_due_date); // negative once past due
  if (daysToDue <= -60) return "Lapsed";
  if (daysToDue <= 30) return "Due";
  return "Active";
}

export async function runSocietyMemberStatusRecompute(
  db: DB,
  today: string,
): Promise<Record<string, number>> {
  const { data } = await db
    .from("society_members")
    .select("id, membership_type, renewal_due_date, status")
    .eq("is_deleted", false);

  let changed = 0;
  for (const m of (data ?? []) as SocietyMemberRow[]) {
    const next = computeStatus(m, today);
    if (next && next !== m.status) {
      await db
        .from("society_members")
        .update({ status: next, updated_at: new Date().toISOString() })
        .eq("id", m.id);
      changed++;
    }
  }
  return { society_members_scanned: (data ?? []).length, status_changed: changed };
}
