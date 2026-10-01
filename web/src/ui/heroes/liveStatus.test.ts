// Heroes status is LIVE and worded exactly like the Hall's party strip (Codex P2
// on PR #45): one helper, so the two screens can never disagree about a party.

import { describe, expect, it } from "vitest";
import { HEROES } from "./mockHeroes";
import { heroStatus } from "./liveStatus";
import { partyStatus } from "../guild/partyStatus";
import { createInitialState, PARTY_DATA, TICKS_PER_DAY, type Assignment, type GuildState } from "../../game/guild";

const withParty = (state: GuildState, id: string, patch: Partial<GuildState["parties"][number]>): GuildState => ({
  ...state,
  parties: state.parties.map((p) => (p.id === id ? { ...p, ...patch } : p)),
});

const assignment = (over: Partial<Assignment>): Assignment =>
  ({ questId: "q", tier: "ruins", questTitle: "The Sunken Ruins", seed: 1, dispatchedTick: 0, returnTick: 12, durationDays: 3, ...over }) as Assignment;

describe("heroStatus — live, Hall-worded", () => {
  it("every roster hero belongs to a sim party (the Idle guard never fires)", () => {
    const s = createInitialState(1);
    for (const h of HEROES) expect(heroStatus(h.id, s).kind, h.id).not.toBe("idle");
  });

  it("a fresh run shows everyone in the hall — no mock 'On quest' leftovers", () => {
    const s = createInitialState(1);
    for (const h of HEROES) {
      const st = heroStatus(h.id, s);
      expect(st.text, h.id).not.toMatch(/Sunken Ruins/);
      expect(st.kind, h.id).toBe("guild");
    }
  });

  it("a party out on a quest: its members read the Hall's exact line, with the day count", () => {
    const vigil = PARTY_DATA.find((p) => p.id === "iron-vigil")!;
    const s = { ...withParty(createInitialState(1), "iron-vigil", { assignment: assignment({}) }), tick: TICKS_PER_DAY };
    const hall = partyStatus(s.parties.find((p) => p.id === "iron-vigil")!, s.tick).text;
    expect(hall).toBe("Out — The Sunken Ruins · day 2 of 3");
    for (const id of vigil.memberIds) expect(heroStatus(id, s)).toEqual({ kind: "quest", text: hall });
    // …while the other party, untouched, is still home.
    expect(heroStatus("brok", s).kind).toBe("guild");
  });

  it("a standing shift reads as away; rest and train read as home", () => {
    const base = createInitialState(1);
    expect(heroStatus("mira", withParty(base, "lone-mira", { assignment: assignment({ tier: "standing", questTitle: "Night watch" }) }))).toEqual({
      kind: "quest",
      text: "On a shift — Night watch",
    });
    expect(heroStatus("brok", withParty(base, "free-blades", { activity: { kind: "rest", untilTick: 9 } }))).toEqual({ kind: "guild", text: "Resting" });
    expect(heroStatus("brok", withParty(base, "free-blades", { activity: { kind: "train", untilTick: 9 } }))).toEqual({ kind: "guild", text: "Training" });
  });

  it("just back from a quest (no assignment, no activity): in the hall", () => {
    const s = withParty(createInitialState(1), "iron-vigil", { assignment: null, activity: null });
    expect(heroStatus("ysolt", s)).toEqual({ kind: "guild", text: "In the hall" });
  });

  it("guard: a party missing from the state falls back to an unknown instead of throwing", () => {
    const s = { ...createInitialState(1), parties: [] };
    expect(heroStatus("ysolt", s)).toEqual({ kind: "idle", text: "Whereabouts unknown" });
  });
});
