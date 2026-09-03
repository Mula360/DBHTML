import { PORTFOLIOS } from "@/app/(app)/nav";

/** Portfolio tag options for action items / events (11 portfolios + General). */
export const PORTFOLIO_TAGS = [...PORTFOLIOS, "General"] as const;
export type PortfolioTag = (typeof PORTFOLIO_TAGS)[number];

export const ACTION_STATUSES = [
  "Open",
  "InProgress",
  "Done",
  "Dropped",
] as const;
export type ActionStatus = (typeof ACTION_STATUSES)[number];

export const ACTION_PRIORITIES = ["Low", "Normal", "High"] as const;

/** Allowed status transitions. Dropped requires a reason (enforced in the action). */
export const STATUS_NEXT: Record<ActionStatus, ActionStatus[]> = {
  Open: ["InProgress", "Done", "Dropped"],
  InProgress: ["Open", "Done", "Dropped"],
  Done: ["Open", "InProgress"],
  Dropped: ["Open"],
};

export function prettyPortfolio(tag: string): string {
  return tag.replace(/([a-z])([A-Z])/g, "$1 $2");
}
