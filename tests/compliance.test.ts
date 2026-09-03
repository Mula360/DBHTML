import { describe, it, expect } from "vitest";
import { getComplianceYear, paceRag } from "@/lib/compliance";

const cfg = { year_start_month: 9, year_end_month: 8 };

describe("getComplianceYear", () => {
  it("wraps Sept–Aug window", () => {
    expect(getComplianceYear("2026-10-15", cfg)).toMatchObject({
      start: "2026-09-01",
      end: "2027-08-31",
      label: "2026-27",
    });
  });

  it("dates before the start month belong to the previous window", () => {
    expect(getComplianceYear("2027-03-01", cfg)).toMatchObject({
      start: "2026-09-01",
      end: "2027-08-31",
    });
  });

  it("supports a calendar-year window", () => {
    expect(
      getComplianceYear("2026-06-01", { year_start_month: 1, year_end_month: 12 }),
    ).toMatchObject({ start: "2026-01-01", end: "2026-12-31" });
  });
});

describe("paceRag", () => {
  const start = "2026-09-01";
  const end = "2027-08-31";

  it("green once the minimum is met", () => {
    expect(paceRag(2, 2, start, end, "2026-10-01")).toBe("green");
  });

  it("amber when achievement keeps pace with elapsed time", () => {
    // ~50% through the year, 1 of 2 done
    expect(paceRag(1, 2, start, end, "2027-03-01")).toBe("amber");
  });

  it("red when behind pace", () => {
    // ~92% through the year, 0 of 2 done
    expect(paceRag(0, 2, start, end, "2027-07-15")).toBe("red");
  });
});
