import { describe, it, expect } from "vitest";
import { dueTone } from "@/lib/actionItems";
import { computeStatus } from "@/lib/cron/tasks/societyMembers";
import type { ActionItemRow } from "@/lib/database.types";

const base: ActionItemRow = {
  id: "1",
  title: "x",
  description: null,
  assigned_to: "m",
  due_date: null,
  status: "Open",
  priority: "Normal",
  portfolio_tag: null,
  source_meeting_id: null,
  created_by: null,
  created_at: "",
  completed_at: null,
  dropped_reason: null,
};

describe("dueTone", () => {
  const today = "2026-09-03";
  it("overdue when past and open", () => {
    expect(dueTone({ ...base, due_date: "2026-09-01" }, today)).toBe("overdue");
  });
  it("soon within 3 days", () => {
    expect(dueTone({ ...base, due_date: "2026-09-05" }, today)).toBe("soon");
  });
  it("later beyond 3 days", () => {
    expect(dueTone({ ...base, due_date: "2026-10-01" }, today)).toBe("later");
  });
  it("done regardless of date", () => {
    expect(
      dueTone({ ...base, status: "Done", due_date: "2026-01-01" }, today),
    ).toBe("done");
  });
});

describe("society member computeStatus", () => {
  const today = "2026-09-03";
  it("Life type is always Life", () => {
    expect(
      computeStatus({ membership_type: "Life", renewal_due_date: null }, today),
    ).toBe("Life");
  });
  it("null due date leaves status untouched", () => {
    expect(
      computeStatus({ membership_type: "Annual", renewal_due_date: null }, today),
    ).toBeNull();
  });
  it("Due within 30 days of the due date", () => {
    expect(
      computeStatus(
        { membership_type: "Annual", renewal_due_date: "2026-09-20" },
        today,
      ),
    ).toBe("Due");
  });
  it("Active when comfortably before renewal", () => {
    expect(
      computeStatus(
        { membership_type: "Annual", renewal_due_date: "2026-12-01" },
        today,
      ),
    ).toBe("Active");
  });
  it("Lapsed 60+ days past due", () => {
    expect(
      computeStatus(
        { membership_type: "Annual", renewal_due_date: "2026-07-01" },
        today,
      ),
    ).toBe("Lapsed");
  });
});
