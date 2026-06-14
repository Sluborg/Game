import { describe, expect, it } from "vitest";
import { upgradeCost } from "./buildings";
import { MAX_HERO_LEVEL } from "./constants";
import { advanceDay } from "./dayEngine";
import {
  buildBuilding,
  createInitialState,
  goldPerDayTotal,
  recruitHero,
  upgradeBuilding,
} from "./economy";
import { createHero, gainExperience, recruitCost } from "./heroes";
import { evaluateMilestones } from "./milestones";
import type { Building } from "./types";

describe("economy", () => {
  it("starts with the same seed roster as the Kotlin game", () => {
    const s = createInitialState();
    expect(s.gold).toBe(200);
    expect(s.day).toBe(1);
    expect(s.buildings.map((b) => b.type).sort()).toEqual(["PALACE", "TAVERN"]);
    expect(s.heroes).toHaveLength(1);
    expect(s.heroes[0].name).toBe("Gunter");
    expect(s.heroes[0].heroClass).toBe("WARRIOR");
  });

  it("collects building income when a day ends", () => {
    const s = createInitialState(); // Palace 30/day, Tavern 0
    expect(goldPerDayTotal(s.buildings)).toBe(30);
    const { state } = advanceDay(s); // day 1 -> 2, no threat
    expect(state.day).toBe(2);
    expect(state.gold).toBe(230);
    expect(state.totalGoldEarned).toBe(30);
  });

  it("preserves the building upgrade-cost formula (baseCost * level * 1.5)", () => {
    const blacksmith: Building = { id: 9, type: "BLACKSMITH", level: 1 };
    expect(upgradeCost(blacksmith)).toBe(450); // 300 * 1 * 1.5
    expect(upgradeCost({ ...blacksmith, level: 2 })).toBe(900);
    expect(upgradeCost({ ...blacksmith, level: 3 })).toBe(1350);
  });

  it("deducts gold and enforces prerequisites on build/upgrade/recruit", () => {
    let s = createInitialState();
    s = { ...s, gold: 5000 };

    // Cannot recruit a Wizard without a Mage Guild.
    const noWizard = recruitHero(s, "WIZARD");
    expect(noWizard.heroes).toHaveLength(1);

    // Build the Mage Guild, then recruit succeeds and gold is deducted.
    s = buildBuilding(s, "MAGE_GUILD");
    expect(s.gold).toBe(5000 - 800);
    const withWizard = recruitHero(s, "WIZARD");
    expect(withWizard.heroes).toHaveLength(2);
    expect(withWizard.gold).toBe(s.gold - recruitCost("WIZARD"));
  });

  it("upgrades a building level and raises its income", () => {
    let s = createInitialState();
    s = { ...s, gold: 1000 };
    const palace = s.buildings.find((b) => b.type === "PALACE")!;
    s = upgradeBuilding(s, palace.id);
    const upgraded = s.buildings.find((b) => b.id === palace.id)!;
    expect(upgraded.level).toBe(2);
    expect(goldPerDayTotal(s.buildings)).toBe(60); // 30 * 2
  });
});

describe("heroes", () => {
  it("levels up, rescaling maxHp and healing 20 (capped)", () => {
    const warrior = createHero(1, "Test", "WARRIOR"); // base 120 HP
    const leveled = gainExperience(warrior, 100); // 100 XP -> level 2
    expect(leveled.level).toBe(2);
    expect(leveled.maxHp).toBe(132); // 120 + (2-1)*12
    expect(leveled.hp).toBe(132); // 120 + 20, capped at 132
    expect(leveled.experience).toBe(0);
  });

  it("never exceeds the level cap", () => {
    const warrior = createHero(1, "Test", "WARRIOR");
    const maxed = gainExperience(warrior, 10_000_000);
    expect(maxed.level).toBe(MAX_HERO_LEVEL);
  });

  it("uses class-based recruit costs", () => {
    expect(recruitCost("WARRIOR")).toBe(150);
    expect(recruitCost("RANGER")).toBe(200);
    expect(recruitCost("ROGUE")).toBe(175);
    expect(recruitCost("PALADIN")).toBe(250);
    expect(recruitCost("WIZARD")).toBe(300);
  });
});

describe("milestones", () => {
  it("awards a milestone reward exactly once", () => {
    let s = createInitialState();
    s = { ...s, gold: 1000 };
    // Recruit a second hero (Rogue needs only the starting Tavern) ->
    // 'second_hero' milestone (200g) should fire next day.
    s = recruitHero(s, "ROGUE");
    expect(evaluateMilestones(s).find((m) => m.id === "second_hero")!.isCompleted).toBe(true);

    const goldBefore = s.gold;
    const income = goldPerDayTotal(s.buildings);
    const after = advanceDay(s).state;
    expect(after.completedMilestones).toContain("second_hero");
    expect(after.gold).toBe(goldBefore + income + 200);

    // Advancing again must NOT re-award it.
    const goldBefore2 = after.gold;
    const after2 = advanceDay(after).state;
    expect(after2.gold).toBe(goldBefore2 + income);
  });
});
