# Combat design — interview prompt

Paste everything in the block below into a **fresh Claude chat**. It will
interview you about how you want combat to work, then produce a spec that drops
straight into this web port (replacing the placeholder in
`web/src/game/combat.ts`).

You don't need to share the codebase for the interview — the prompt already
contains the contract the design has to satisfy. Bring your own ideas; the
assistant's job is to draw them out and pin down the details.

---

```
You are helping me design the combat system for a turn-based fantasy kingdom
game. I already have the rest of the game built (a web port of an idle game,
now turn-based: each "day" the player collects gold, builds, recruits heroes,
and any monster threats are resolved by combat). Combat is currently a dumb
placeholder and I want to design the real thing. I have my own ideas — your job
is to INTERVIEW me to draw them out, challenge gaps, and then write a clear,
implementation-ready spec. Do NOT write code yet.

## How to run the interview
Ask me ONE focused question at a time (occasionally a tight cluster of related
ones). Build on my answers, surface trade-offs, and point out anything
underspecified or contradictory. Cover at least:

1. Model & scale — grid-based tactics (like the original 7x4 grid) vs. a simpler
   abstract resolution? How many heroes vs. monsters per fight? How long should a
   fight feel?
2. When/where combat happens within a day — does it resolve instantly when I end
   the day, or do I watch/control it? Can a threat survive to a later day?
3. Unit stats — what attributes do heroes and monsters have, and how do hero
   class, level, and buildings (Guard Tower, Temple, Barracks) feed in?
4. The core resolution math — attack vs. defense rolls, damage formula, crits,
   morale/fleeing, positioning/flanking, randomness vs. determinism.
5. Win/lose outcomes — what do heroes earn (gold, XP), what damage do they take,
   what happens on a loss, can heroes die permanently?
6. Bosses — how do they differ from regular threats?
7. Player agency — purely automatic, or do I make choices (target, formation,
   abilities)?
8. Pacing & balance — roughly how hard should fights be relative to my economy?

## Required output (after the interview)
Produce a spec containing:
- A plain-language summary of the combat model and turn structure.
- All unit stats and the exact damage/resolution formulas (with numbers).
- Reward and penalty rules (gold, XP, HP loss, death).
- How heroes, classes, levels, and the three combat buildings map into combat.

It MUST conform to this integration contract (already in my code) so it can be
dropped in by replacing one module:

  // The day engine calls combat ONLY through this interface, once per active
  // threat, passing current game state and that threat.
  interface CombatResolver {
    resolve(state: GameState, threat: MonsterGroup): CombatOutcome;
  }

  interface CombatOutcome {
    heroesAfter: Hero[];      // heroes with updated hp/xp/level
    goldEarned: number;
    monstersKilled: number;
    bossesKilled: number;
    events: string[];         // human-readable battle-log lines
    threatDefeated: boolean;  // false => threat persists to the next day
  }

  // Relevant shapes the resolver can read:
  // Hero    { id, name, heroClass, level, experience, gold, hp, maxHp, state }
  // HeroClass = WARRIOR | RANGER | WIZARD | PALADIN | ROGUE
  // MonsterGroup { id, type, count, hp, maxHp }   // hp is the group's total HP
  // Buildings present can include GUARD_TOWER, TEMPLE, BARRACKS, etc.

If a richer combat model needs more per-unit data than this (e.g. positions,
per-monster HP), call it out and propose how to extend these shapes.

Start by asking me your first question.
```
