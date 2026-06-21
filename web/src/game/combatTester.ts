// Combat Test sim — pure, deterministic-with-injected-RNG engine for the
// standalone Combat Test screen. This is intentionally decoupled from the day
// engine / economy / persistence: it implements the lean 1v1 math from the
// Coda "Combat System" page, plus three tester-only feel flags (opening
// desync, damage variance, crits) that the canonical resolver deliberately
// omits. Nothing here touches GameState.
//
// Authored so the arena can grow later: the grid is described by a layout
// table (see arenaLayout) rather than hardcoded 6 cells, and a fight is "1
// hero vs N monster stacks" with no assumptions about how many cells exist.

export type Rng = () => number; // returns [0, 1)

/** The combat-relevant attribute block. Cha/Int/Wp are unused by the lean fight. */
export interface Attributes {
  Str: number;
  Dex: number;
  Sta: number;
  Per: number;
  armor: number;
  /** Weapon base seconds per swing, before the Dex speed-up. */
  weaponBase: number;
}

// --- Canonical lean-1v1 curves (Combat System page) -----------------------------
// Every chance saturates; 100% is impossible; hard cap = 90%.
export const CAP = 0.9;

export function maxHpOf(a: Attributes): number {
  return a.Sta * 8 + a.Str * 4; // Sta:Str = 2:1
}

export function dodgeOf(a: Attributes): number {
  const x = 2 * a.Dex + a.Per; // Dex:Per = 2:1, K = 50
  return Math.min(CAP, (CAP * x) / (x + 50));
}

export function armorMitOf(a: Attributes): number {
  return Math.min(CAP, (CAP * a.armor) / (a.armor + 20)); // K = 20, no pen yet
}

export function attackTimeOf(a: Attributes): number {
  return a.weaponBase * (1 - (CAP * a.Dex) / (a.Dex + 50)); // floors at 10% of base
}

// --- Tester-only feel knobs (kept flagged so the canonical resolver stays
// deterministic — see Combat System "deferred: crits / per-hit variance"). ------
export function critChanceOf(a: Attributes): number {
  return Math.min(0.25, a.Dex / 100 + 0.05);
}

/** First swing time: scaled down by (Dex+Per) plus a random roll, so units in a
 * stack do not swing in lockstep. Higher (Dex+Per) => earlier opening (first-strike). */
export function openingTimeOf(cd: number, a: Attributes, rng: Rng): number {
  const roll = a.Dex + a.Per + rng() * 8;
  return cd * (1 - (0.35 * roll) / (roll + 15));
}

// --- Presets --------------------------------------------------------------------
export type HeroPresetId = "Weak" | "Medium" | "Strong";

export interface HeroPreset {
  id: HeroPresetId;
  label: string;
  emoji: string;
  weaponName: string;
  attrs: Attributes;
}

// Anchored to the Combat System worked example (Medium ≈ the fresh Warrior).
export const HERO_PRESETS: Record<HeroPresetId, HeroPreset> = {
  Weak: {
    id: "Weak",
    label: "Weak",
    emoji: "🧑‍🌾",
    weaponName: "Dagger",
    attrs: { Str: 6, Dex: 5, Sta: 6, Per: 4, armor: 5, weaponBase: 1.0 },
  },
  Medium: {
    id: "Medium",
    label: "Medium",
    emoji: "🦸",
    weaponName: "Sword",
    attrs: { Str: 10, Dex: 6, Sta: 10, Per: 5, armor: 10, weaponBase: 1.6 },
  },
  Strong: {
    id: "Strong",
    label: "Strong",
    emoji: "🦾",
    weaponName: "Greataxe",
    attrs: { Str: 16, Dex: 9, Sta: 14, Per: 8, armor: 16, weaponBase: 2.6 },
  },
};

export type MonsterKindId = "Goblin" | "Orc" | "Troll";

export interface MonsterDef {
  id: MonsterKindId;
  label: string;
  emoji: string;
  attrs: Attributes;
}

// Goblin matches the Combat System worked example; Orc/Troll scale up per the
// Setting page bestiary (goblin Str~3, orc Str~7, larger mythic creatures bigger).
export const MONSTER_DEFS: Record<MonsterKindId, MonsterDef> = {
  Goblin: {
    id: "Goblin",
    label: "Goblin",
    emoji: "👺",
    attrs: { Str: 3, Dex: 5, Sta: 4, Per: 4, armor: 2, weaponBase: 1.4 },
  },
  Orc: {
    id: "Orc",
    label: "Orc",
    emoji: "👹",
    attrs: { Str: 7, Dex: 5, Sta: 7, Per: 4, armor: 5, weaponBase: 1.7 },
  },
  Troll: {
    id: "Troll",
    label: "Troll",
    emoji: "🧌",
    attrs: { Str: 12, Dex: 3, Sta: 12, Per: 3, armor: 8, weaponBase: 2.4 },
  },
};

// --- Arena layout (data-driven so cell count can expand later) ------------------
export const GRID_ROWS = 2;
export const GRID_COLS = 3;

export interface CellSlot {
  id: string;
  row: number;
  col: number;
  /** "monster" cells take a stack; "hero" the hero; "empty" are reserved. */
  role: "monster" | "hero" | "empty";
  /** For monster cells: which stack index (0..) lands here. */
  stackIndex?: number;
}

/**
 * Returns the cell slots for a fight with `stackCount` monster stacks. Today the
 * board is a fixed 2×3, but the mapping (stack index -> cell, hero -> centre) is
 * computed, not hardcoded, so a bigger grid only needs different bounds here.
 */
export function arenaLayout(stackCount: number): CellSlot[] {
  const cells: CellSlot[] = [];
  const heroCol = Math.floor(GRID_COLS / 2); // centre of the bottom row
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const id = `r${row}c${col}`;
      if (row === 0) {
        // Top row: monster cells, filled left-to-right up to stackCount.
        if (col < stackCount) {
          cells.push({ id, row, col, role: "monster", stackIndex: col });
        } else {
          cells.push({ id, row, col, role: "empty" });
        }
      } else {
        cells.push({ id, row, col, role: col === heroCol ? "hero" : "empty" });
      }
    }
  }
  return cells;
}

// --- Live combatants ------------------------------------------------------------
export interface Combatant {
  id: string;
  name: string;
  emoji: string;
  side: "hero" | "monster";
  attrs: Attributes;
  maxHp: number;
  hp: number;
  attackTime: number;
  dodge: number;
  crit: number;
  /** Next swing time, in sim-seconds. */
  nextAt: number;
  /** Real-clock ms of the last swing / last hit taken — drives animations. */
  lungeMs: number;
  hitMs: number;
  /** Monsters only: owning stack index. */
  stackIndex: number;
}

export interface Floater {
  id: number;
  cellId: string;
  /** Scatter offset (% of cell), fixed at spawn so the number never jitters. */
  dx: number;
  dy: number;
  text: string;
  kind: "hit" | "crit" | "miss";
  bornMs: number;
}

export type SimPhase = "idle" | "running" | "paused" | "done";
export type SimResult = "VICTORY" | "DEFEAT" | null;

export interface StackConfig {
  kind: MonsterKindId;
  size: number; // 1..3 members
}

export interface SimConfig {
  heroPreset: HeroPresetId;
  stacks: StackConfig[];
}

// Animation / lifetime windows (real ms).
export const LUNGE_MS = 180;
export const HIT_FLASH_MS = 200;
export const FLOATER_MS = 1000;
const MAX_LOG = 60;

// --- Snapshot (immutable view handed to React each frame) -----------------------
export interface StackView {
  cellId: string;
  stackIndex: number;
  kind: MonsterKindId;
  emoji: string;
  alive: number;
  frontHpPct: number;
  lunging: boolean;
  hit: boolean;
}

export interface HeroView {
  cellId: string;
  emoji: string;
  hp: number;
  maxHp: number;
  hpPct: number;
  lunging: boolean;
  hit: boolean;
}

export interface SimSnapshot {
  phase: SimPhase;
  result: SimResult;
  hero: HeroView;
  stacks: StackView[];
  log: string[];
  floaters: Floater[];
  stackCount: number;
}

function mkCombatant(
  id: string,
  name: string,
  emoji: string,
  side: "hero" | "monster",
  attrs: Attributes,
  stackIndex: number,
  rng: Rng,
): Combatant {
  const attackTime = attackTimeOf(attrs);
  return {
    id,
    name,
    emoji,
    side,
    attrs,
    maxHp: maxHpOf(attrs),
    hp: maxHpOf(attrs),
    attackTime,
    dodge: dodgeOf(attrs),
    crit: critChanceOf(attrs),
    nextAt: openingTimeOf(attackTime, attrs, rng),
    lungeMs: -1e9,
    hitMs: -1e9,
    stackIndex,
  };
}

/**
 * The fight. 1 hero vs N monster stacks on a shared clock; each unit swings on
 * its own cooldown. Drive it with update(realDtMs, speed) once per animation
 * frame, then read snapshot(realMs) for rendering.
 */
export class CombatSim {
  phase: SimPhase = "idle";
  result: SimResult = null;
  hero: Combatant;
  /** stacks[i] = the (front-first) living members of stack i. */
  stacks: Combatant[][] = [];
  stackKinds: MonsterKindId[] = [];
  simTime = 0;
  realMs = 0;
  log: string[] = [];
  floaters: Floater[] = [];
  private targetStack = 0;
  private nextFloaterId = 1;
  private rng: Rng;

  constructor(config: SimConfig, rng: Rng = Math.random) {
    this.rng = rng;
    const hp = HERO_PRESETS[config.heroPreset];
    this.hero = mkCombatant("hero", "Hero", hp.emoji, "hero", hp.attrs, -1, rng);

    config.stacks.forEach((sc, si) => {
      const def = MONSTER_DEFS[sc.kind];
      this.stackKinds.push(sc.kind);
      const members: Combatant[] = [];
      for (let m = 0; m < sc.size; m++) {
        members.push(
          mkCombatant(`m${si}-${m}`, def.label, def.emoji, "monster", def.attrs, si, rng),
        );
      }
      this.stacks.push(members);
    });
  }

  start(): void {
    if (this.phase === "idle") this.phase = "running";
  }
  pause(): void {
    if (this.phase === "running") this.phase = "paused";
  }
  resume(): void {
    if (this.phase === "paused") this.phase = "running";
  }

  /** Advance the fight by `realDtMs` of wall time, scaled by `speed`. */
  update(realDtMs: number, speed: number): void {
    this.realMs += realDtMs;
    if (this.phase !== "running") {
      this.ageFloaters();
      return;
    }
    this.simTime += (realDtMs / 1000) * speed;

    let guard = 0;
    while (guard++ < 2000) {
      const u = this.nextDueUnit();
      if (!u) break;
      this.resolveAttack(u);
      // resolveAttack may end the fight (knockout); stop feeding it units.
      if (this.phase !== "running") break;
    }
    this.ageFloaters();
    this.checkEnd();
  }

  private ageFloaters(): void {
    this.floaters = this.floaters.filter((f) => this.realMs - f.bornMs < FLOATER_MS);
  }

  private aliveMonsters(): Combatant[] {
    return this.stacks.flat();
  }

  private nextDueUnit(): Combatant | null {
    let best: Combatant | null = null;
    const consider = (u: Combatant) => {
      if (u.hp <= 0) return;
      if (u.nextAt > this.simTime) return;
      if (!best || u.nextAt < best.nextAt) best = u;
    };
    if (this.hero.hp > 0) consider(this.hero);
    for (const m of this.aliveMonsters()) consider(m);
    return best;
  }

  private currentTargetStack(): number {
    // First stack (left-to-right) that still has living members.
    if (this.stacks[this.targetStack]?.length) return this.targetStack;
    for (let i = 0; i < this.stacks.length; i++) {
      if (this.stacks[i].length) {
        this.targetStack = i;
        return i;
      }
    }
    return -1;
  }

  private pickTarget(attacker: Combatant): Combatant | null {
    if (attacker.side === "hero") {
      const s = this.currentTargetStack();
      if (s < 0) return null;
      return this.stacks[s][0] ?? null; // chip the front member
    }
    return this.hero.hp > 0 ? this.hero : null;
  }

  private resolveAttack(attacker: Combatant): void {
    const target = this.pickTarget(attacker);
    attacker.nextAt += attacker.attackTime; // re-arm regardless of outcome
    attacker.lungeMs = this.realMs;
    if (!target) return;

    // 1. dodge
    if (this.rng() < target.dodge) {
      this.pushLog(`${attacker.name} ⚔ ${target.name} (MISS)`);
      this.addFloater(target, "MISS", "miss");
      return;
    }
    // 2-3. raw damage, variance, crit, armor mitigation
    const crit = this.rng() < attacker.crit;
    const variance = 0.8 + this.rng() * 0.4; // 80–120%
    const raw = attacker.attrs.Str * variance * (crit ? 2 : 1) * (1 - armorMitOf(target.attrs));
    const dmg = Math.max(1, Math.round(raw));

    // 4. apply
    const before = target.hp;
    target.hp = Math.max(0, target.hp - dmg);
    target.hitMs = this.realMs;
    const dead = target.hp <= 0;
    const tail = dead ? (target.side === "hero" ? "DEATH" : "KILL") : `${target.hp}hp`;
    this.pushLog(`${attacker.name} ${crit ? "CRIT " : ""}⚔ ${target.name}, ${dmg} dmg (${before}>${tail})`);
    this.addFloater(target, crit ? `${dmg}!` : `${dmg}`, crit ? "crit" : "hit");

    // 5. knockout
    if (dead) this.removeDead(target);
  }

  private removeDead(target: Combatant): void {
    if (target.side === "hero") {
      this.endFight("DEFEAT");
      return;
    }
    const stack = this.stacks[target.stackIndex];
    const idx = stack.indexOf(target);
    if (idx >= 0) stack.splice(idx, 1); // no damage spillover to the next member
  }

  private checkEnd(): void {
    if (this.phase === "done") return;
    if (this.hero.hp <= 0) {
      this.endFight("DEFEAT");
      return;
    }
    if (this.aliveMonsters().length === 0) this.endFight("VICTORY");
  }

  private endFight(result: SimResult): void {
    if (this.phase === "done") return;
    this.phase = "done";
    this.result = result;
    this.pushLog(result === "VICTORY" ? "🏆 VICTORY" : "⚠️ DEFEAT");
  }

  private pushLog(line: string): void {
    this.log.unshift(line); // newest on top
    if (this.log.length > MAX_LOG) this.log.length = MAX_LOG;
  }

  private cellIdFor(c: Combatant): string {
    if (c.side === "hero") return "hero";
    return `m${c.stackIndex}`;
  }

  private addFloater(target: Combatant, text: string, kind: Floater["kind"]): void {
    this.floaters.push({
      id: this.nextFloaterId++,
      cellId: this.cellIdFor(target),
      dx: (this.rng() - 0.5) * 46, // scatter so floaters don't stack
      dy: (this.rng() - 0.5) * 28,
      text,
      kind,
      bornMs: this.realMs,
    });
  }

  snapshot(): SimSnapshot {
    const isRecent = (ms: number, win: number) => this.realMs - ms < win;
    const heroView: HeroView = {
      cellId: "hero",
      emoji: this.hero.emoji,
      hp: this.hero.hp,
      maxHp: this.hero.maxHp,
      hpPct: Math.max(0, this.hero.hp / this.hero.maxHp),
      lunging: isRecent(this.hero.lungeMs, LUNGE_MS),
      hit: isRecent(this.hero.hitMs, HIT_FLASH_MS),
    };

    const stacks: StackView[] = this.stacks.map((members, si) => {
      const front = members[0];
      return {
        cellId: `m${si}`,
        stackIndex: si,
        kind: this.stackKinds[si],
        emoji: MONSTER_DEFS[this.stackKinds[si]].emoji,
        alive: members.length,
        frontHpPct: front ? Math.max(0, front.hp / front.maxHp) : 0,
        lunging: members.some((m) => isRecent(m.lungeMs, LUNGE_MS)),
        hit: front ? isRecent(front.hitMs, HIT_FLASH_MS) : false,
      };
    });

    return {
      phase: this.phase,
      result: this.result,
      hero: heroView,
      stacks,
      log: this.log,
      floaters: this.floaters,
      stackCount: this.stacks.length,
    };
  }
}
