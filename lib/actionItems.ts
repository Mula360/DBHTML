import type { ActionItemRow } from "@/lib/database.types";
import { addDays } from "@/lib/dates";

export type DueTone = "overdue" | "soon" | "later" | "none" | "done";

/** Render-time urgency for an action item (never stored). */
export function dueTone(item: ActionItemRow, today: string): DueTone {
  if (item.status === "Done" || item.status === "Dropped") return "done";
  if (!item.due_date) return "none";
  if (item.due_date < today) return "overdue";
  if (item.due_date <= addDays(today, 3)) return "soon";
  return "later";
}

export const TONE_CLASS: Record<DueTone, string> = {
  overdue: "rag-red",
  soon: "rag-amber",
  later: "",
  none: "",
  done: "rag-green",
};

export function isOpen(item: Pick<ActionItemRow, "status">): boolean {
  return item.status === "Open" || item.status === "InProgress";
}
