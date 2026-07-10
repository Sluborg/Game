// The effect notes must never state mechanics that aren't true for the beat
// (Review #1 Designer B3 / Adversary B2): no "next check" claims on a final or
// bonus beat, and a passed recovery must not claim the next check is eased
// (the resolver still carries −1 after a recovery).

import { describe, it, expect } from "vitest";
import { effectNote, gradeAt } from "./storyText";
import { GRADE_ZONES } from "../../game/guild";
import type { Beat, Grade } from "../../game/guild";

function beat(grade: Grade, branch?: Beat["branch"]): Beat {
  return { id: "x", type: "combat", location: "y", grade, roll: 0.5, text: "t", score: 50, branch };
}

describe("effectNote", () => {
  it("a passed recovery never claims the next check is eased", () => {
    for (const g of ["crit", "good", "ok"] as const) {
      const note = effectNote(beat(g, "recovery"), true) ?? "";
      expect(note.toLowerCase()).not.toContain("eased");
      expect(note.toLowerCase()).not.toContain("next");
    }
  });

  it("bonus beats never reference a next check", () => {
    for (const g of ["crit", "good", "ok", "poor", "fail"] as const) {
      const note = effectNote(beat(g, "bonus"), true) ?? "";
      expect(note.toLowerCase()).not.toContain("next");
    }
  });

  it("the final beat never references a next check", () => {
    for (const g of ["crit", "good", "ok", "poor", "fail"] as const) {
      const note = effectNote(beat(g), false) ?? "";
      expect(note.toLowerCase()).not.toContain("next");
    }
  });

  it("momentum claims appear only mid-quest on main beats", () => {
    expect(effectNote(beat("good"), true)).toContain("eased");
    expect(effectNote(beat("poor"), true)).toContain("harder");
  });

  it("the fail note is generic enough to precede either a recovery or a success card", () => {
    const note = effectNote(beat("fail"), true) ?? "";
    expect(note).toBe("It goes wrong.");
    expect(effectNote(beat("fail"), false)).toBe("It goes wrong.");
  });
});

// The live meter ticker's zone lookup must match GRADE_ZONES exactly — a
// boundary mismatch would flash the wrong grade word mid-rise (Review #1/#2
// Adversary). Boundaries are derived from the zones, never restated.
describe("gradeAt", () => {
  it("maps every zone's own bounds to that zone (crit inclusive at its floor)", () => {
    for (const [g, [lo, hi]] of Object.entries(GRADE_ZONES) as [Grade, [number, number]][]) {
      expect(gradeAt(lo)).toBe(g); // every lower bound is inclusive
      // Just below the upper bound stays in-zone; crit's 100 is inclusive too.
      expect(gradeAt(g === "crit" ? hi : hi - 0.01)).toBe(g);
    }
  });

  it("is monotonic — a rising fill can never tick DOWN a grade", () => {
    const order: Grade[] = ["fail", "poor", "ok", "good", "crit"];
    let last = 0;
    for (let pct = 0; pct <= 100; pct += 0.5) {
      const idx = order.indexOf(gradeAt(pct));
      expect(idx).toBeGreaterThanOrEqual(last);
      last = idx;
    }
  });

  it("clamps sanely outside [0,100]", () => {
    expect(gradeAt(-1)).toBe("fail");
    expect(gradeAt(101)).toBe("crit");
  });
});
