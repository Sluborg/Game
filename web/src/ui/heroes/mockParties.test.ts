// Guards for the mock party layer. These aren't game mechanics — they assert the
// scaffolding data stays internally consistent so a later mock edit can't silently
// break the Parties view (unresolved ids, a hero in two parties, a boss leaking
// into Solo, a rumor stat laundered into the rating, or a NaN rating).

import { describe, expect, it } from "vitest";
import { HEROES } from "./mockHeroes";
import { PARTIES, PARTY_VIEWS, SOLO, heroRating } from "./mockParties";

const KNOWN = new Set(HEROES.map((h) => h.id));

describe("mockParties", () => {
  it("every party references only real heroes, and the boss is a member", () => {
    for (const p of PARTIES) {
      expect(KNOWN.has(p.bossId), `boss ${p.bossId}`).toBe(true);
      expect(p.memberIds.includes(p.bossId), `boss in ${p.name}`).toBe(true);
      for (const id of p.memberIds) expect(KNOWN.has(id), `member ${id}`).toBe(true);
    }
  });

  it("no hero belongs to more than one party", () => {
    const seen = new Set<string>();
    for (const p of PARTIES)
      for (const id of p.memberIds) {
        expect(seen.has(id), `${id} in two parties`).toBe(false);
        seen.add(id);
      }
  });

  it("SOLO is the exact complement of party membership (no overlap, full cover)", () => {
    const affiliated = new Set(PARTIES.flatMap((p) => p.memberIds));
    const soloIds = new Set(SOLO.map((h) => h.id));
    for (const h of HEROES) expect(soloIds.has(h.id)).toBe(!affiliated.has(h.id));
    for (const id of soloIds) expect(affiliated.has(id)).toBe(false);
  });

  it("rating is certainty-weighted, clamped to 0–5, and never NaN", () => {
    for (const h of HEROES) {
      const r = heroRating(h);
      if (r !== null) {
        expect(Number.isNaN(r)).toBe(false);
        expect(r).toBeGreaterThanOrEqual(0);
        expect(r).toBeLessThanOrEqual(5);
      }
      // A hero with no verified/claimed stat (all rumor) must rate null, not a
      // laundered guess (§5 — rumor "?" is genuinely unknown).
      const noTrusted = h.attributes.every((a) => a.certainty === "rumor");
      if (noTrusted) expect(r).toBeNull();
    }
  });

  it("discounts a claimed stat below the same value verified (§5 weighting)", () => {
    // Two synthetic 1-attribute heroes: same raw value, different certainty.
    const base = HEROES[0];
    const mk = (certainty: "verified" | "claimed") => ({
      ...base,
      attributes: [{ ...base.attributes[0], value: 16, certainty }],
    });
    const verified = heroRating(mk("verified"))!;
    const claimed = heroRating(mk("claimed"))!;
    // A lone attribute yields the same mean regardless of weight, so weighting is
    // only visible in a MIX — assert the mixed case pulls toward the verified stat.
    const mixed = heroRating({
      ...base,
      attributes: [
        { ...base.attributes[0], value: 4, certainty: "verified" },
        { ...base.attributes[0], value: 16, certainty: "claimed" },
      ],
    })!;
    const unweightedMean = ((4 + 16) / 2 / 18) * 5; // 2.78 if claimed counted fully
    expect(mixed).toBeLessThan(Math.round(unweightedMean * 10) / 10);
    expect(verified).toBe(claimed); // single-attr: weight cancels, sanity check
  });

  it("builds a view per party with an ordered, boss-first member list", () => {
    expect(PARTY_VIEWS.length).toBe(PARTIES.length);
    for (const v of PARTY_VIEWS) {
      expect(v.members[0].id).toBe(v.boss.id);
      expect(v.members.length).toBe(v.party.memberIds.length);
      if (v.avgRating !== null) expect(Number.isNaN(v.avgRating)).toBe(false);
    }
  });
});
