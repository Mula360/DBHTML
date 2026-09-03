import { describe, it, expect } from "vitest";
import { computeQuorum } from "@/lib/quorum";

type A = { status: "present" | "absent" | "apology"; attendance_mode: "in_person" | "virtual" };
const p = (mode: A["attendance_mode"] = "in_person"): A => ({
  status: "present",
  attendance_mode: mode,
});
const absent: A = { status: "absent", attendance_mode: "in_person" };

describe("computeQuorum (Rule 26)", () => {
  it("required is ceil(ec * fraction), min 1", () => {
    const r = computeQuorum([], 10, {
      quorumFraction: 0.3334,
      virtualCountsForQuorum: false,
    });
    expect(r.required).toBe(4);
    expect(r.met).toBe(false);
  });

  it("in-person present meets quorum", () => {
    const r = computeQuorum([p(), p(), p(), p(), absent], 10, {
      quorumFraction: 0.3334,
      virtualCountsForQuorum: false,
    });
    expect(r.counted).toBe(4);
    expect(r.met).toBe(true);
  });

  it("virtual does not count unless the bye-law flag is set", () => {
    const att = [p(), p(), p("virtual"), p("virtual")];
    expect(
      computeQuorum(att, 10, {
        quorumFraction: 0.3334,
        virtualCountsForQuorum: false,
      }).met,
    ).toBe(false);
    expect(
      computeQuorum(att, 10, {
        quorumFraction: 0.3334,
        virtualCountsForQuorum: true,
      }).met,
    ).toBe(true);
  });
});
