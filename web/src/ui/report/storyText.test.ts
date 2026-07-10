// The effect notes must never state mechanics that aren't true for the beat
// (Review #1 Designer B3 / Adversary B2): no "next check" claims on a final or
// bonus beat, and a passed recovery must not claim the next check is eased
// (the resolver still carries −1 after a recovery).

import { describe, it, expect } from "vitest";
import { effectNote } from "./storyText";
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
