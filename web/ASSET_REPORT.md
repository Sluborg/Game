# Asset Report — guild layer

A guild-master turn sim layered **additively** on top of the existing combat
engine. You run an adventurer guild, dispatch heroes to quests across a node
map, and **never watch the fights**. Fallible field **agents** send back combat
**reports** whose accuracy varies. The existing combat result is the **ground
truth**; what you read is a distorted view of it — and a corrupt or distrusted
asset may lie to your face.

Reachable from the start screen via **⚖️ Asset Report** → route `#/guild`.

---

## Status: what's done vs. stubbed

**Done (tested):**
- Node-map data model + BFS shortest-path with travel-turn ETA (Phase A).
- Seeded, replayable turn engine: travel, roadside encounters, arrival quests,
  real combat resolution through the existing engine (Phase B).
- Fidelity tiers 0–4 with the hybrid `min(ceiling, gate)` + corruption driver,
  and the distortion filter that renders reports while preserving ground truth
  (Phase C — the core).
- Phone-first `/guild` UI: roster, dispatch, end-turn, turn report, and a
  dev-only "reveal truth" toggle. localStorage namespace `assetReport.v1`
  (Phase D).
- 41 new Vitest cases (graph / turnEngine / fidelity / distort); 50 total green.

**Stubbed / deliberately simple (noted for tuning, not scope creep):**
- **Combat inputs.** Heroes fight via the existing *placeholder* resolver
  (`defaultResolver`) — the real Godblood combat isn't built yet. The adapter
  is written against the `CombatResolver` interface, so when the real resolver
  lands it is a drop-in with no guild changes.
- **One hero per fight.** A dispatch sends a single hero (optionally one agent).
  Party dispatches are a future extension.
- **Encounter rolls are per travel-turn, one fight per roll.** No multi-wave
  road battles.
- **No economy coupling.** The guild treasury (`gold`) is its own number; it is
  not wired into the kingdom economy (the scope fence forbids touching it).
- **Agents/heroes don't regenerate or get hired yet.** Fixed starting roster;
  trust/quality are static except agent death from corruption. Healing between
  dispatches and recruitment are future work.
- **No audit view yet.** Ground truth is stored on every event and surfaced via
  the dev "reveal truth" toggle; a player-facing post-hoc audit screen is TODO.

---

## The turn loop

1. **Dispatch** a hero from the guild seat (`stonegate`) to a quest node, with
   an optional field agent. The route is the BFS shortest path; ETA is the sum
   of edge `travelTurns`.
2. **End Turn** → `advanceTurn(state, { reporter })`. For each active dispatch:
   - traverse one travel-turn along the current edge;
   - roll a **seeded** encounter against that edge's `encounterChance`; on a
     hit, resolve a real fight via the combat adapter and store the
     **ground-truth `CombatOutcome`**;
   - when the edge is fully traversed, step to the next node;
   - on **arrival**, resolve the destination quest fight (if any).
3. Each resolved fight is turned into a **`PresentedReport`** by the reporter
   (fidelity + distortion). Both the truth and the presented report are kept.
4. **Read the Turn Report.** Reports look like filed paperwork; you decide what
   to believe. The dev toggle reveals the truth behind each one.

Everything stochastic flows from `state.seed` combined with the turn number and
dispatch id, so **any turn replays identically** from its seed. The combat
engine itself is deterministic, so it needs no seed.

---

## The hybrid fidelity model (the core)

For each report:

```
ceiling = f(agent.quality)     // better agent  -> higher max fidelity (cap 3)
gate    = f(hero.trust)        // lower trust    -> lower fidelity you actually get
tier    = min(ceiling, gate)

if hero.trust < CORRUPTION_THRESHOLD:
    with a seeded chance rising as trust -> 0:
        the asset is FOOLED   -> tier 4 (fabricated, convincing, FALSE), or
        BLINDED / KILLED      -> tier 0 (no word; agent dies or hero is lost)
```

**Tiers**
| tier | name | what the player sees |
|---|---|---|
| 0 | no-witness | silence — "no word returned" / hero did not return |
| 1 | hearsay | a short summary; **may be wrong** (seeded flag flip) |
| 2 | eyewitness | the turn log, reworded / colored, but outcome correct |
| 3 | embedded | the faithful full log = **ground truth exactly** |
| 4 | compromised | a fabricated report: internally consistent but **provably ≠ truth** (the outcome flag is flipped, then made self-consistent) |

All curves/thresholds live in `web/src/game/guild/constants.ts` (starting
values — expect to tune). Ground truth is **never discarded**: every
`DispatchEvent` stores `truth` (the real `CombatOutcome`) alongside the
optional `presented` report, ready for a future audit view.

---

## Data shapes

`web/src/game/guild/types.ts`:
- **`MapNode`** `{ id, name, kind?, questMonster?, questCount? }`
- **`Edge`** `{ from, to, travelTurns, encounterChance, encounterMonster?, encounterCount? }` (undirected)
- **`WorldGraph`** `{ nodes, edges }`
- **`Hero`** `{ id, name, stats:{level,heroClass,maxHp,hp,experience}, trust:0..100 }`
- **`Agent`** `{ id, name, quality:0..100, alive }`
- **`Dispatch`** `{ id, heroId, agentId|null, destNodeId, path:NodeId[], stepIndex, legTurnsLeft, status, startedTurn, log:DispatchEvent[] }`
- **`DispatchEvent`** `{ turn, kind:'road'|'quest', nodeId, truth:CombatOutcome, tier?, presented? }`
- **`PresentedReport`** `{ tier, headline, lines[], claimedDefeated, claimedGold, claimedKills, fabricated, silent }`
- **`CombatOutcome`** — re-exported from the existing `combat.ts`, unchanged.

`GuildState` (`state.ts`): `{ turn, seed, gold, graph, heroes, agents, dispatches, nextDispatchId, originNodeId }`.

---

## Module map

```
web/src/game/guild/         (pure logic, unit-tested)
  types.ts          domain types (+ re-exports of CombatOutcome/HeroClass)
  rng.ts            seeded mulberry32 PRNG + deriveSeed/hashStr
  graph.ts          undirected adjacency, BFS shortest-path, travel-turn sum
  mapData.ts        hand-authored ~8-node test world (data-driven)
  combatAdapter.ts  the ONLY bridge to the combat engine (read-only)
  state.ts          GuildState, constructors, dispatchHero
  turnEngine.ts     advanceTurn(seed) — travel, encounters, combat, arrival
  constants.ts      fidelity/corruption tuning knobs
  fidelity.ts       decideTier() — ceiling/gate/min + seeded corruption
  distort.ts        distort(truth,tier,hero,seed) -> PresentedReport
  reporter.ts       standardReporter glue for the turn engine
  selectors.ts      pure read helpers for the UI
  *.test.ts         graph / turnEngine / fidelity / distort suites

web/src/ui/guild/           (UI)
  GuildApp.tsx      route container
  Roster.tsx        heroes (trust/HP) + agents (quality)
  DispatchForm.tsx  pick hero / quest / agent
  TurnReport.tsx    reports by tier + dev reveal-truth toggle
  useGuild.ts       state hook + persistence
  guild.css         ledger / parchment theme
```

---

## How combat is consumed (Step 0 finding)

The brief assumed a `combatTester.ts`, a `CombatTest.tsx` route, and a start
screen with Campaign/Combat Test entries. **None of those exist in the repo.**
The actual combat entry point is:

```ts
// web/src/game/combat.ts
defaultResolver.resolve(state: GameState, threat: MonsterGroup): CombatOutcome
```

It is a deterministic placeholder. `combatAdapter.ts` builds a throwaway
`GameState` (the single dispatched hero, no buildings) and a `MonsterGroup`
(via the existing `monsterDef` baseHp × count), calls `resolve`, and normalizes
the result, writing HP/XP/level back to the guild hero. **No combat/engine file
is modified.** Because there was no start screen, the single required entry was
added as one button in `App.tsx` plus a tiny hash router in `main.tsx`
(both additive).

---

## Scope fence — confirmation

New code lives under `web/src/game/guild/` and `web/src/ui/guild/`. The only
edits to pre-existing files are the two additive integration points:
- `web/src/main.tsx` — hash route to `GuildApp` (no router existed).
- `web/src/ui/App.tsx` — one "Asset Report" button (the single start-screen entry).

The day engine, economy, persistence (`majesty-day:v1`), the combat resolver,
and its math are untouched. The guild uses its own `assetReport.v1` save key.
