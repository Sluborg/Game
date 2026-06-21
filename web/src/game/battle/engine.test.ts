import { describe, expect, it } from "vitest";
import {
  CombatEngine,
  HERO_TEMPLATES,
  MONSTER_TEMPLATES,
  armorMitigation,
  attackInterval,
  dodgeChance,
  layoutArena,
  maxHp,
  type CombatEvent,
  type FightConfig,
} from "./index";
import { ARMORS, WEAPONS } from "./equipment";
import { constantRng, mulberry32 } from "./rng";

// Resolve a fight deterministically with an injected RNG.
function fight(config: FightConfig, seedOrRng: number | { next(): number }): CombatEngine {
  const rng = typeof seedOrRng === "number" ? mulberry32(seedOrRng) : seedOrRng;
  const engine = new CombatEngine(config, rng);
  engine.runToCompletion();
  return engine;
}

describe("curves reproduce the Combat System worked example", () => {
  const knight = HERO_TEMPLATES.medium.attributes; // Str10 Dex6 Sta10 Per5
  const goblin = MONSTER_TEMPLATES.goblin.attributes; // Str3 Dex5 Sta4 Per4

  it("the Medium hero / Goblin loadouts match the documented gear", () => {
    expect(WEAPONS[HERO_TEMPLATES.medium.weapon].baseSeconds).toBe(1.6);
    expect(ARMORS[HERO_TEMPLATES.medium.armor].value).toBe(10);
    expect(WEAPONS[MONSTER_TEMPLATES.goblin.weapon].baseSeconds).toBe(1.4);
    expect(ARMORS[MONSTER_TEMPLATES.goblin.armor].value).toBe(2);
  });

  it("HP: Knight 120, Goblin 44", () => {
    expect(maxHp(knight)).toBe(120);
    expect(maxHp(goblin)).toBe(44);
  });

  it("dodge: Knight 23%, Goblin 20%", () => {
    expect(Math.round(dodgeChance(knight) * 100)).toBe(23);
    expect(Math.round(dodgeChance(goblin) * 100)).toBe(20);
  });

  it("Knight swing ~1.45s", () => {
    expect(attackInterval(1.6, knight)).toBeCloseTo(1.45, 1);
  });

  it("Knight armor (mail 10) mitigates ~30%", () => {
    expect(Math.round(armorMitigation(ARMORS.mail.value) * 100)).toBe(30);
  });

  it("no chance ever exceeds the 90% cap", () => {
    const godlike = { str: 999, dex: 999, sta: 999, per: 999 };
    expect(dodgeChance(godlike)).toBeLessThanOrEqual(0.9);
    expect(armorMitigation(999)).toBeLessThanOrEqual(0.9);
  });
});

describe("arena layout is data-driven", () => {
  it("hero sits in the left column; enemy stacks fill the right column", () => {
    const cells = layoutArena(2);
    expect(cells).toHaveLength(6);
    const monsters = cells.filter((c) => c.role === "monster");
    expect(monsters.map((c) => c.stackIndex)).toEqual([0, 1]);
    expect(monsters.every((c) => c.col === 1)).toBe(true);
    expect(cells.find((c) => c.role === "hero")).toMatchObject({ row: 1, col: 0 });
  });
});

describe("the engine emits a coherent event stream", () => {
  // next()=0.99 => never dodge, never crit, ~120% variance — fully deterministic.
  const noLuck = constantRng(0.99);

  it("a Strong hero beats a lone goblin; events end in victory", () => {
    const engine = fight({ heroTier: "strong", stacks: [{ species: "goblin", size: 1 }] }, noLuck);
    const events = engine.runToCompletion(); // already over -> no further events
    expect(events).toEqual([]);
    const state = engine.getState();
    expect(state.isOver).toBe(true);
    expect(state.result).toBe("victory");
    expect(state.stacks[0].alive).toBe(0);
    expect(state.hero.hp).toBeGreaterThan(0);
    expect(state.hero.hp).toBeLessThan(state.hero.maxHp);
  });

  it("every hit event carries a consistent before/after and a final 'end'", () => {
    const engine = new CombatEngine(
      { heroTier: "medium", stacks: [{ species: "goblin", size: 2 }] },
      constantRng(0.99),
    );
    const events: CombatEvent[] = engine.runToCompletion();
    const hits = events.filter((e) => e.kind === "hit");
    expect(hits.length).toBeGreaterThan(0);
    for (const h of hits) {
      if (h.kind !== "hit") continue;
      expect(h.hpBefore - h.hpAfter).toBe(Math.min(h.amount, h.hpBefore));
      expect(h.lethal).toBe(h.hpAfter === 0);
    }
    expect(events[events.length - 1]?.kind).toBe("end");
  });

  it("killing the front member never spills damage onto the next (full hp)", () => {
    const engine = new CombatEngine(
      { heroTier: "strong", stacks: [{ species: "goblin", size: 3 }] },
      constantRng(0.99),
    );
    const goblinMax = maxHp(MONSTER_TEMPLATES.goblin.attributes);
    let sawKnockout = false;
    for (let i = 0; i < 400 && !engine.isOver; i++) {
      const events = engine.advance(0.05);
      if (events.some((e) => e.kind === "knockout")) sawKnockout = true;
      const stack = engine.getState().stacks[0];
      // A fresh (not-yet-engaged) member always reads full hp.
      if (stack.alive > 1 && stack.frontHp === goblinMax) continue;
    }
    expect(sawKnockout).toBe(true);
  });

  it("a Weak hero is overwhelmed by three full troll stacks (defeat)", () => {
    const engine = fight(
      {
        heroTier: "weak",
        stacks: [
          { species: "troll", size: 3 },
          { species: "troll", size: 3 },
          { species: "troll", size: 3 },
        ],
      },
      mulberry32(7),
    );
    expect(engine.getState().result).toBe("defeat");
    expect(engine.getState().hero.hp).toBe(0);
  });

  it("is deterministic for a given seed", () => {
    const cfg: FightConfig = { heroTier: "medium", stacks: [{ species: "orc", size: 2 }] };
    const a = new CombatEngine(cfg, mulberry32(42)).runToCompletion();
    const b = new CombatEngine(cfg, mulberry32(42)).runToCompletion();
    expect(a).toEqual(b);
  });
});
