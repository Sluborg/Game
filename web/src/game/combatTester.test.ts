import { describe, expect, it } from "vitest";
import {
  CombatSim,
  HERO_PRESETS,
  MONSTER_DEFS,
  arenaLayout,
  armorMitOf,
  attackTimeOf,
  dodgeOf,
  maxHpOf,
  type SimConfig,
} from "./combatTester";

// Run a sim to completion with a fixed RNG, stepping in small wall-clock chunks.
function runToEnd(config: SimConfig, rng: () => number, maxSeconds = 120) {
  const sim = new CombatSim(config, rng);
  sim.start();
  const stepMs = 100;
  for (let t = 0; t < (maxSeconds * 1000) / stepMs; t++) {
    sim.update(stepMs, 1);
    if (sim.phase === "done") break;
  }
  return sim;
}

describe("lean-1v1 curves match the Combat System worked example", () => {
  const warrior = HERO_PRESETS.Medium.attrs; // Str10 Dex6 Sta10 Per5 armor10 sword1.6
  const goblin = MONSTER_DEFS.Goblin.attrs; // Str3 Dex5 Sta4 Per4 armor2 crude1.4

  it("HP: Warrior 120, Goblin 44", () => {
    expect(maxHpOf(warrior)).toBe(120);
    expect(maxHpOf(goblin)).toBe(44);
  });

  it("dodge: Warrior 23%, Goblin 20%", () => {
    expect(Math.round(dodgeOf(warrior) * 100)).toBe(23);
    expect(Math.round(dodgeOf(goblin) * 100)).toBe(20);
  });

  it("Warrior swing ~1.45s", () => {
    expect(attackTimeOf(warrior)).toBeCloseTo(1.45, 1);
  });

  it("Warrior armor mitigates ~30%", () => {
    expect(Math.round(armorMitOf(warrior) * 100)).toBe(30);
  });

  it("every chance clamps below the 90% cap", () => {
    const godlike = { Str: 999, Dex: 999, Sta: 999, Per: 999, armor: 999, weaponBase: 1.6 };
    expect(dodgeOf(godlike)).toBeLessThanOrEqual(0.9);
    expect(armorMitOf(godlike)).toBeLessThanOrEqual(0.9);
  });
});

describe("arena layout is data-driven", () => {
  it("places stacks left-to-right on the top row and the hero centre-bottom", () => {
    const cells = arenaLayout(2);
    expect(cells).toHaveLength(6);
    const monsterCells = cells.filter((c) => c.role === "monster");
    expect(monsterCells.map((c) => c.stackIndex)).toEqual([0, 1]);
    const hero = cells.find((c) => c.role === "hero");
    expect(hero).toMatchObject({ row: 1, col: 1 });
  });
});

describe("fight resolution", () => {
  // rng = 0.99: never dodges, never crits, ~120% variance — deterministic.
  const noLuck = () => 0.99;

  it("a Strong hero beats a single goblin and ends damaged but alive", () => {
    const sim = runToEnd({ heroPreset: "Strong", stacks: [{ kind: "Goblin", size: 1 }] }, noLuck);
    expect(sim.phase).toBe("done");
    expect(sim.result).toBe("VICTORY");
    expect(sim.stacks.flat()).toHaveLength(0);
    expect(sim.hero.hp).toBeGreaterThan(0);
    expect(sim.hero.hp).toBeLessThan(sim.hero.maxHp);
  });

  it("a Weak hero is overwhelmed by three full troll stacks", () => {
    const sim = runToEnd(
      {
        heroPreset: "Weak",
        stacks: [
          { kind: "Troll", size: 3 },
          { kind: "Troll", size: 3 },
          { kind: "Troll", size: 3 },
        ],
      },
      () => 0.5,
    );
    expect(sim.result).toBe("DEFEAT");
    expect(sim.hero.hp).toBe(0);
  });

  it("killing the front member leaves the rest of the stack at full hp (no spillover)", () => {
    const sim = new CombatSim(
      { heroPreset: "Strong", stacks: [{ kind: "Goblin", size: 3 }] },
      noLuck,
    );
    sim.start();
    const goblinMaxHp = MONSTER_DEFS.Goblin.attrs.Sta * 8 + MONSTER_DEFS.Goblin.attrs.Str * 4;
    // Step until at least one goblin has been killed.
    for (let i = 0; i < 200 && sim.stacks[0].length === 3; i++) sim.update(100, 1);
    expect(sim.stacks[0].length).toBeLessThan(3);
    // Any not-yet-engaged member is still at full hp.
    if (sim.stacks[0].length > 1) {
      expect(sim.stacks[0][sim.stacks[0].length - 1].hp).toBe(goblinMaxHp);
    }
  });
});
