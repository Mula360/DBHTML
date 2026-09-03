import type { MeetingRow, MomContent } from "@/lib/database.types";

export const MEETING_STATUSES: MeetingRow["status"][] = [
  "Draft",
  "AgendaSent",
  "InProgress",
  "MoMDraft",
  "Approved",
  "Published",
];

/** Forward-only flow, with a one-step "un-send" back to Draft before InProgress. */
export const MEETING_STATUS_NEXT: Record<
  MeetingRow["status"],
  MeetingRow["status"][]
> = {
  Draft: ["AgendaSent"],
  AgendaSent: ["Draft", "InProgress"],
  InProgress: ["MoMDraft"],
  MoMDraft: ["Approved"],
  Approved: ["Published", "MoMDraft"],
  Published: [],
};

export const EMPTY_MOM: MomContent = {
  decisions: [],
  actionItems: [],
  announcements: [],
  nextSteps: [],
};

export function normaliseMom(content: MomContent | null): MomContent {
  return { ...EMPTY_MOM, ...(content ?? {}) };
}
