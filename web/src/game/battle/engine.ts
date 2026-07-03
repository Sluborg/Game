// CombatEngine — the pure, framework-agnostic fight simulation.
//
// It is a tick sim on a shared clock: every unit swings on its own cooldown.
// The engine has no notion of wall time, frames, or React — callers push it
// forward with advance(dt) and read back (a) the events that happened and
// (b) a state snapshot for rendering. Construct a fresh engine per fight.

import {
  armorMitigation,
  attackInterval,
  baseDamage,
  critChance,
  dodgeChance,
  initiative,
  maxHp,
  openingDelay,
  rollVariance,
  type Attributes,
} from "./attributes";
import { ARMORS, WEAPONS } from "./equipment";
import type { CombatEvent, FightResult } from "./events";
import type { GridSpec } from "./grid";
import { mulberry32, type Rng } from "./rng";
import {
  HERO_TEMPLATES,
  MONSTER_TEMPLATES,
  type BodySprite,
  type HeroTier,
  type MonsterSpecies,
  type Side,
  type UnitTemplate,
} from "./units";
import type { ArmorSprite, WeaponSprite } from "./equipment";

export interface StackSpec {
  species: MonsterSpecies;
  size: number;
}

export interface FightConfig {
  heroTier: HeroTier;
  stacks: StackSpec[];
  grid?: GridSpec;
}

/** Everything the renderer needs to draw a model — no stats leak in. */
export interface Appearance {
  body: BodySprite;
  weapon: WeaponSprite;
  armor: ArmorSprite;
}

export interface HeroView {
  id: string;
  cellId: string;
  name: string;
  appearance: Appearance;
  hp: number;
  maxHp: number;
  alive: boolean;
}

export interface StackView {
  cellId: string;
  stackIndex: number;
  species: MonsterSpecies;
  name: string;
  appearance: Appearance;
  alive: number;
  frontHp: number;
  frontMaxHp: number;
}

export interface CombatStateView {
  simTime: number;
  isOver: boolean;
  result: FightResult | null;
  hero: HeroView;
  stacks: StackView[];
}

interface Combatant {
  id: string;
  name: string;
  side: Side;
  cellId: string;
  stackIndex: number; // -1 for the hero
  species: MonsterSpecies | null;
  appearance: Appearance;
  attributes: Attributes;
  armorValue: number;
  maxHp: number;
  hp: number;
  interval: number;
  dodge: number;
  crit: number;
  damage: number;
  initiative: number;
  nextSwingAt: number;
}

const HERO_CELL = "hero";
const stackCell = (i: number): string => `stack-${i}`;

function appearanceOf(t: UnitTemplate): Appearance {
  return { body: t.body, weapon: WEAPONS[t.weapon].sprite, armor: ARMORS[t.armor].sprite };
}

function makeCombatant(
  template: UnitTemplate,
  id: string,
  cellId: string,
  stackIndex: number,
  rng: Rng,
): Combatant {
  const a = template.attributes;
  const interval = attackInterval(WEAPONS[template.weapon].baseSeconds, a);
  return {
    id,
    name: template.name,
    side: template.side,
    cellId,
    stackIndex,
    species: template.side === "monster" ? (template.id as MonsterSpecies) : null,
    appearance: appearanceOf(template),
    attributes: a,
    armorValue: ARMORS[template.armor].value,
    maxHp: maxHp(a),
    hp: maxHp(a),
    interval,
    dodge: dodgeChance(a),
    crit: critChance(a),
    damage: baseDamage(a),
    initiative: initiative(a),
    nextSwingAt: openingDelay(interval, a, rng),
  };
}

export class CombatEngine {
  private readonly rng: Rng;
  private readonly hero: Combatant;
  private readonly stacks: Combatant[][];
  private readonly stackSpecies: MonsterSpecies[];
  private simTime = 0;
  private over = false;
  private result: FightResult | null = null;
  private targetStack = 0;

  constructor(config: FightConfig, rng: Rng = mulberry32((Math.random() * 2 ** 32) >>> 0)) {
    this.rng = rng;
    this.hero = makeCombatant(HERO_TEMPLATES[config.heroTier], "hero", HERO_CELL, -1, rng);
    this.stacks = [];
    this.stackSpecies = [];
    config.stacks.forEach((spec, i) => {
      const template = MONSTER_TEMPLATES[spec.species];
      this.stackSpecies.push(spec.species);
      const members: Combatant[] = [];
      for (let m = 0; m < spec.size; m++) {
        members.push(makeCombatant(template, `m${i}-${m}`, stackCell(i), i, rng));
      }
      this.stacks.push(members);
    });
  }

  get isOver(): boolean {
    return this.over;
  }

  /** Advance the fight by `dt` seconds; return the events generated. */
  advance(dt: number): CombatEvent[] {
    const events: CombatEvent[] = [];
    if (this.over) return events;
    this.simTime += dt;

    let guard = 0;
    while (guard++ < 4000) {
      const unit = this.nextDueUnit();
      if (!unit) break;
      this.resolveSwing(unit, events);
      if (this.over) break;
    }
    return events;
  }

  /** Run the whole fight deterministically (for tests / future pre-compute). */
  runToCompletion(maxSeconds = 600, dt = 0.05): CombatEvent[] {
    const all: CombatEvent[] = [];
    for (let t = 0; t < maxSeconds && !this.over; t += dt) {
      all.push(...this.advance(dt));
    }
    return all;
  }

  private livingMonsters(): Combatant[] {
    return this.stacks.flat();
  }

  private nextDueUnit(): Combatant | null {
    let best: Combatant | null = null;
    const consider = (u: Combatant) => {
      if (u.hp <= 0 || u.nextSwingAt > this.simTime) return;
      if (!best || u.nextSwingAt < best.nextSwingAt) best = u;
      else if (u.nextSwingAt === best.nextSwingAt && u.initiative > best.initiative) best = u;
    };
    if (this.hero.hp > 0) consider(this.hero);
    for (const m of this.livingMonsters()) consider(m);
    return best;
  }

  private resolveTargetStack(): number {
    if (this.stacks[this.targetStack]?.length) return this.targetStack;
    for (let i = 0; i < this.stacks.length; i++) {
      if (this.stacks[i].length) return (this.targetStack = i);
    }
    return -1;
  }

  private pickTarget(attacker: Combatant): Combatant | null {
    if (attacker.side === "hero") {
      const s = this.resolveTargetStack();
      return s < 0 ? null : (this.stacks[s][0] ?? null);
    }
    return this.hero.hp > 0 ? this.hero : null;
  }

  private resolveSwing(attacker: Combatant, out: CombatEvent[]): void {
    const target = this.pickTarget(attacker);
    const t = attacker.nextSwingAt;
    attacker.nextSwingAt += attacker.interval; // re-arm regardless of outcome
    if (!target) return;

    const common = {
      t,
      sourceId: attacker.id,
      sourceCellId: attacker.cellId,
      targetId: target.id,
      targetCellId: target.cellId,
    };
    out.push({ kind: "swing", ...common });

    // 1. dodge
    if (this.rng.next() < target.dodge) {
      out.push({ kind: "miss", ...common });
      return;
    }
    // 2. damage = Str * variance * (crit?mult:1) * (1 - armorMit)
    const crit = this.rng.next() < attacker.crit;
    const variance = rollVariance(this.rng);
    const mitig = 1 - armorMitigation(target.armorValue);
    const raw = attacker.damage * variance * (crit ? 2 : 1) * mitig;
    const amount = Math.max(1, Math.round(raw));

    // 3. apply
    const hpBefore = target.hp;
    target.hp = Math.max(0, target.hp - amount);
    const lethal = target.hp <= 0;
    out.push({ kind: "hit", ...common, amount, crit, hpBefore, hpAfter: target.hp, lethal });

    // 4. knockout (no spillover — leftover damage is discarded)
    if (lethal) {
      out.push({ kind: "knockout", t, unitId: target.id, cellId: target.cellId, side: target.side });
      this.removeUnit(target);
      this.checkEnd(t, out);
    }
  }

  private removeUnit(unit: Combatant): void {
    if (unit.side === "hero") return; // hero stays in place, just downed
    const stack = this.stacks[unit.stackIndex];
    const idx = stack.indexOf(unit);
    if (idx >= 0) stack.splice(idx, 1);
  }

  private checkEnd(t: number, out: CombatEvent[]): void {
    if (this.over) return;
    if (this.hero.hp <= 0) this.end("defeat", t, out);
    else if (this.livingMonsters().length === 0) this.end("victory", t, out);
  }

  private end(result: FightResult, t: number, out: CombatEvent[]): void {
    this.over = true;
    this.result = result;
    out.push({ kind: "end", t, result });
  }

  getState(): CombatStateView {
    return {
      simTime: this.simTime,
      isOver: this.over,
      result: this.result,
      hero: {
        id: this.hero.id,
        cellId: this.hero.cellId,
        name: this.hero.name,
        appearance: this.hero.appearance,
        hp: this.hero.hp,
        maxHp: this.hero.maxHp,
        alive: this.hero.hp > 0,
      },
      stacks: this.stacks.map((members, i) => {
        const front = members[0];
        return {
          cellId: stackCell(i),
          stackIndex: i,
          species: this.stackSpecies[i],
          name: MONSTER_TEMPLATES[this.stackSpecies[i]].name,
          appearance: appearanceOf(MONSTER_TEMPLATES[this.stackSpecies[i]]),
          alive: members.length,
          frontHp: front ? front.hp : 0,
          frontMaxHp: front ? front.maxHp : this.stackTemplateMaxHp(i),
        };
      }),
    };
  }

  private stackTemplateMaxHp(i: number): number {
    return maxHp(MONSTER_TEMPLATES[this.stackSpecies[i]].attributes);
  }
}
