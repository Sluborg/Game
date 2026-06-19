# Migration: Kotlin/Compose → Vite + React + TypeScript

This `web/` app is a port of the Android Jetpack Compose game in `app/`. The
original Kotlin code is left **completely untouched** — this lives entirely under
`web/`.

## What changed by design

The port is **not** a 1:1 reproduction. Three deliberate changes were agreed
during planning:

1. **Idle → turn-based "day" loop.** The real-time 1-second tick (`GameEngine.tick`
   driven by a coroutine loop) is replaced by an explicit **"End Day"** button.
   The fractional gold accumulator, offline-progress calculator, and save
   timestamp are gone — they only make sense for a running clock.
2. **Fresh per-day economy.** Building `baseGoldPerSecond` values are reframed as
   `goldPerDay` (the per-second numbers ×10 for clean integers). Monster spawning
   is keyed off the **day counter** instead of `tickCount`. All numbers live in
   `src/game/constants.ts` + `src/game/buildings.ts` and are easy to tune.
3. **Combat is a placeholder.** The real combat system is being designed
   separately. `src/game/combat.ts` ships a trivial stand-in behind a
   `CombatResolver` interface; the day engine only talks to combat through that
   interface, so the future design drops in by replacing one module. See
   `COMBAT_DESIGN_PROMPT.md`.

Everything else — hero stats, leveling, recruit costs, building costs, the seven
milestones — is ported **verbatim** to preserve balance.

## Build / test loop (much lighter than Gradle)

| Action | Command |
| --- | --- |
| Install (once) | `npm install` |
| Dev server (hot reload) | `npm run dev` |
| Run tests | `npm test` |
| Production build | `npm run build` |

No Android SDK, emulator, or Gradle. The "update → test" loop is `npm run dev`
in one terminal and `npm test` in another.

## File-by-file mapping

### Pure game logic (framework-free, unit-tested) — `src/game/`

| Kotlin source | TypeScript counterpart | Notes |
| --- | --- | --- |
| `domain/model/KingdomState.kt` | `game/types.ts` (`GameState`) | `tickCount` → `day`; dropped `goldAccumulator`, `lastSavedAt` |
| `domain/GameConstants.kt` | `game/constants.ts` | kept roster/level constants; tick & offline constants replaced by day-schedule constants |
| `domain/model/Building.kt` | `game/buildings.ts` | `baseGoldPerSecond` → `goldPerDay`; `upgradeCost = baseCost * level * 1.5` preserved verbatim |
| `domain/model/Hero.kt` | `game/heroes.ts` | base HP, recruit costs, XP curve (`level*100`), level-up HP math, and name pools all verbatim |
| `domain/model/MonsterGroup.kt` | `game/monsters.ts` | monster stats verbatim; spawn schedule reframed to days |
| `domain/model/Milestone.kt` | `game/milestones.ts` | all 7 milestones + rewards + checks verbatim |
| `viewmodel/KingdomViewModel` (build/upgrade/recruit) | `game/economy.ts` | pure reducers; the tax-tap action is removed |
| `domain/engine/GameEngine.tick` | `game/dayEngine.ts` (`advanceDay`) | income + hero regen + day-scheduled spawn + combat + milestone awards |
| `domain/engine/HeroAI.kt`, `engine/grid/*`, `GridEngine`, `MonsterSpawner` | `game/combat.ts` (placeholder) | **not** ported — replaced by the upcoming combat design |
| `data/repository/GameRepository`, Room DB, DataStore | `game/persistence.ts` | localStorage snapshot of the whole `GameState` (no offline timer) |

### UI (React DOM, no canvas) — `src/ui/`

| Kotlin Compose | React counterpart | Notes |
| --- | --- | --- |
| `ui/theme/Color.kt` | `ui/theme.ts` | exact hex values reused |
| `ui/screen/KingdomScreen.kt` | `ui/App.tsx` | single scrollable screen |
| `ui/component/GoldBar.kt` + `CastleTapButton.kt` | `ui/components/DayBar.tsx` | merged into Day counter + gold + **End Day** button |
| `ui/component/MilestonePanel.kt` | `ui/components/Milestones.tsx` | chip row |
| `ui/component/MonsterIndicator.kt` | `ui/components/ThreatBanner.tsx` | shown only when a threat is alive |
| `ui/component/BattleLog.kt` | `ui/components/BattleLog.tsx` | keyword color-coding in `theme.ts#logColor` |
| `ui/component/HeroPortrait.kt` | `ui/components/Heroes.tsx` | emoji, level, HP/XP bars, state label |
| `ui/component/BuildingCard.kt` | `ui/components/Buildings.tsx` | owned buildings + a build menu |
| `ui/screen/GridBattleScreen.kt` | _none (yet)_ | boss grid overlay omitted while combat is a stub |
| `KingdomViewModel` (state plumbing) | `ui/useGame.ts` | React state + localStorage load/save |

### Deferred

- **Animations.** Compose's count-ups, floating tax text, pulses, grid movement,
  and HP flashes are intentionally not ported yet — the goal was a working
  version first. Styling is plain CSS in `ui/styles.css`.
- **Grid battle UI.** Returns when the real combat system lands.
