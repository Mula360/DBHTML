import { describe, it, expect } from "vitest";
import { istToday, istParts, addDays, daysBetween, isPast } from "@/lib/dates";

describe("dates (Asia/Kolkata)", () => {
  it("computes the IST calendar date across the UTC day boundary", () => {
    // 2026-09-02 20:00 UTC == 2026-09-03 01:30 IST
    const d = new Date("2026-09-02T20:00:00Z");
    expect(istToday(d)).toBe("2026-09-03");
  });

  it("weekday is IST-based", () => {
    // 2026-09-03 is a Thursday
    const p = istParts(new Date("2026-09-03T06:00:00Z"));
    expect(p).toMatchObject({ year: 2026, month: 9, day: 3, weekday: 4 });
  });

  it("addDays / daysBetween round-trip", () => {
    expect(addDays("2026-09-03", 7)).toBe("2026-09-10");
    expect(daysBetween("2026-09-03", "2026-09-10")).toBe(7);
    expect(daysBetween("2026-09-10", "2026-09-03")).toBe(-7);
  });

  it("isPast compares as ISO strings", () => {
    expect(isPast("2026-09-01", "2026-09-03")).toBe(true);
    expect(isPast("2026-09-03", "2026-09-03")).toBe(false);
  });
});
