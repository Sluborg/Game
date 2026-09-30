// The effect notes must never state mechanics that aren't true for the beat
// (Review #1 Designer B3 / Adversary B2): no "next check" claims on a final or
// bonus beat, and a passed recovery must not claim the next check is eased
// (the resolver still carries −1 after a recovery).

import { describe, it, expect } from "vitest";
import { GRADE_LABEL, V3_LABEL, effectNote, gradeAt, isV3Beat, labelFor, logIsV3 } from "./storyText";
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

// ── v3 labels and notes (Wire A) ──────────────────────────────────────────────

const v3Beat = (grade: Grade, branch?: Beat["branch"]): Beat => ({
  ...beat(grade, branch),
  check: { dice: [4, 5], capability: 15, score: 24, target: 21, result: "success" },
});

describe("labelFor: one label source for ticker, landed word and aria", () => {
  it("v3 beats use the result names; v1 beats keep the benchmark words", () => {
    expect(isV3Beat(v3Beat("ok"))).toBe(true);
    expect(isV3Beat(beat("ok"))).toBe(false);
    expect(labelFor("ok", true)).toBe("Insufficient");
    expect(labelFor("ok", false)).toBe(GRADE_LABEL.ok);
    expect(labelFor("fail", true)).toBe("Critical Failure");
  });
  it("the v3 names are the ladder's, slot for slot, all distinct", () => {
    expect(V3_LABEL).toEqual({ crit: "Triumph", good: "Success", ok: "Insufficient", poor: "Failure", fail: "Critical Failure" });
    expect(new Set(Object.values(V3_LABEL)).size).toBe(5);
  });
  it("a stored log WITHOUT a check (an old v1 report) renders through the v1 path", () => {
    const old = JSON.parse(JSON.stringify(beat("good")));
    expect(isV3Beat(old)).toBe(false);
    expect(labelFor(old.grade, isV3Beat(old))).toBe(GRADE_LABEL.good);
  });
});

describe("logIsV3: per-report truth for the rules tag", () => {
  it("true if any beat carries a check; false for an old v1 report", () => {
    expect(logIsV3([beat("ok"), v3Beat("good")])).toBe(true);
    expect(logIsV3([beat("ok"), beat("good")])).toBe(false);
    expect(logIsV3([])).toBe(false);
  });
});

describe("effectNote for v3 Insufficient: short of the requirement is never read as a pass", () => {
  it("normal beat: not a 'steady' pass, no mechanics claim", () => {
    expect(effectNote(v3Beat("ok"), true)).toBe("Not enough, but no lasting harm.");
    expect(effectNote(v3Beat("ok"), false)).toBe("Not enough, but it held.");
  });
  it("bonus beat: not a 'modest haul'", () => {
    expect(effectNote(v3Beat("ok", "bonus"), false)).toBe("Not enough to find much.");
    expect(effectNote(beat("ok", "bonus"), false)).toBe("A modest haul.");
  });
  it("recovery: Insufficient is not worded as a clean pass", () => {
    expect(effectNote(v3Beat("ok", "recovery"), false)).toBe("Not enough, but they get through.");
    expect(effectNote(beat("ok", "recovery"), false)).toBe("They scrape out of the mess.");
  });
  it("v1 wording is unchanged", () => {
    expect(effectNote(beat("ok"), true)).toBe("They hold steady.");
  });
});
