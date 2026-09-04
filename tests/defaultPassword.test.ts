import { describe, it, expect } from "vitest";
import { defaultPassword } from "@/lib/auth/defaultPassword";

describe("defaultPassword", () => {
  it("last 4 digits + Titlecase last name", () => {
    expect(defaultPassword("Anita Rao", "+91 98765 43210")).toBe("3210Rao");
  });
  it("handles a multi-word name (last token only)", () => {
    expect(defaultPassword("Srikanth Bhamidipati", "9000012345")).toBe(
      "2345Bhamidipati",
    );
  });
  it("normalises case regardless of input casing", () => {
    expect(defaultPassword("anita RAO", "1234567890")).toBe("7890Rao");
  });
  it("pads a short phone number", () => {
    expect(defaultPassword("Anita Rao", "12")).toBe("0012Rao");
  });
});
