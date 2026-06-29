# Project Status

_Last updated: 2026-06-28_

## Asset Report pivot (branch `claude/asset-report-guild-layer-l7apuf`, → dev)
A new **additive** layer: a guild-master turn sim where you dispatch heroes to
quests and only ever read fallible field-agent **reports** of the fights, not
the fights themselves. The existing combat result is ground truth; the report
you read is a distorted view (fidelity tiers 0–4, driven by agent quality and
hero trust, with corruption-driven lies). Reachable from the start screen as a
third card (**Asset Report**) → `#/guild`. Self-contained under
`web/src/game/guild/` + `web/src/ui/guild/`; own save key `assetReport.v1`;
nothing in the day engine / economy / combat resolver touched. 52 tests in the
guild suites. Full design + data shapes in `web/ASSET_REPORT.md`. Combat is
consumed through the existing (placeholder) `defaultResolver` via an adapter, so
the real Godblood resolver will drop in with no guild changes.

**World Map (branch `claude/guild-world-map-ppamd6`, → dev).** Added a visual,
clickable world map to the `#/guild` screen (it previously only had a destination
dropdown). Medallion nodes with heraldic game-icons emblems by `kind`, roads
coloured/dashed by a 1–5 danger scale derived from each edge's `encounterChance`,
ETA badges on reachable quest sites, the guild seat marked as origin, and hero
tokens that travel their dispatch routes with a direction arrow. Clicking a glowing
quest node picks it as the destination (synced with the form dropdown). Pure guild
logic (graph/dispatch/selectors) untouched; only additive node `x/y` coords. New
`web/src/ui/guild/{WorldMap,icons,danger}.tsx`; game-icons attribution in
`web/public/CREDITS.md`. This supersedes the parallel Campaign-Mode prototype that
was built off stale `main` (PR #13, closed) — consolidating on the dev line.

## What this repo is
- `app/` — original idle game, Kotlin + Jetpack Compose (Gradle). Legacy, untouched.
- `web/` — active target: turn-based web port "Majesty — Day by Day" → being reframed as the Godblood game. Vite 5 + React 18 + TypeScript.
  - `web/src/game/` — pure, unit-tested game logic (state, economy, day engine, combat placeholder, persistence).
  - `web/src/ui/` — React DOM components.
  - See `web/MIGRATION.md` and `web/COMBAT_DESIGN_PROMPT.md`. Design/lore lives in the Coda doc "Godblood Knowledge".

## How testing / deployment works
GitHub Pages auto-deploys on every push via `.github/workflows/deploy.yml`. One site, two branches:
- **Stable (production):** `main` → https://sluborg.github.io/Game/
- **Dev (work in progress):** `dev` → https://sluborg.github.io/Game/dev/

Workflow: work on `dev` (or a branch merged into `dev`) → test at `/Game/dev/` → merge `dev` into `main` to promote → `/Game/`. Live ~1-3 min after push; hard-refresh for cache. Saves are per-browser localStorage. Never push broken code to `main`.

## Where the game is vs. where it's going (reconciliation, 2026-06-20)
**Now (main):** a working turn-based economy shell with no real game underneath. End Day → building income → maybe spawn threat → auto-resolve → milestones → save. Build/upgrade/recruit and persistence work. Heroes are shallow (`level, hp, maxHp, xp, class, state`); no attributes. Combat is a placeholder (`power = 10 + level*5` vs threat total HP, binary win/lose). No Godblood/Scion identity in code (no attributes, pantheons, divine parent, skillsets).

**Target (Coda):** Godbloods with 7 uncapped attributes (Str/Dex/Sta/Cha/Per/Int/Wp), tick-based auto-battle with saturating curves, design-complete lean 1v1 (hp = Sta·8 + Str·4, dmg = Str, dodge/armor%/attack-speed/first-strike, knockout default + boss-only permadeath), three-slot builds, Rift-style skill trees, pantheons (Aesir/Greek/Egyptian). Phased: 1v1 → 7×4 grid → adventures.

**The gap:** the data model has no attribute block, and the entire locked combat spec depends on it. Nothing combat-related can be built until heroes and monsters carry the 7 attributes.

## Combat Test feature (re-architected 2026-06-21)
A start screen offers **Campaign** (the existing day/economy game, untouched) and **Combat Test**, routed by hash (`#/campaign`, `#/test`). The Combat Test is a real, modular feature — not a port of the prototype. The brief (`CombatTester.jsx` + Coda `20260621_combatBasics`) was used as reference only; mechanics kept, architecture redone.

**Engine — pure, event-emitting, unit-tested (`web/src/game/battle/`).**
- `tuning.ts` (all constants, no magic numbers), `rng.ts` (seedable mulberry32 → deterministic fights), `attributes.ts` (canonical lean-1v1 curves + flagged tester-only variance/crit/opening), `equipment.ts` + `units.ts` (config-driven weapons/armor/heroes/monsters — gear drives BOTH stats and look), `grid.ts` (data-driven board), `events.ts` (typed `swing|hit|miss|knockout|end` stream), `engine.ts` (`CombatEngine.advance(dt) → events`, `getState()`; no React/timers).
- `engine.test.ts` (12 tests): curves reproduce the Coda worked example (Knight 120hp/23%/1.45s, Goblin 44/20%, mail≈30%), 90% cap, no-spillover, deterministic-by-seed, coherent event stream.

**Presentation (`web/src/ui/combat/` + `web/src/ui/theme/tokens.css`).**
- Design-token system (CSS variables) + **CSS Modules** per component (no inline styling, no emoji).
- **Layered inline-SVG sprites** (`sprites/`): body + armor + weapon composed via a data-driven anchor system and a swappable registry — **gear renders on the model**; placeholder art, structured to swap for real art.
- `useCombatClock.ts`: rAF loop steps the engine and renders its events (floaters, per-cell lunge/hurt nonces, log); engine never lives in React state. Animation layer = CSS keyframes/transitions triggered by events (no setTimeout).
- Components: `Arena`, `UnitSprite`, `HealthBar`, `DamageFloaters`, `Controls`, `ConfigPanel` (with live hero stat readout), `CombatLog`, `CombatTestScreen`. Start screen refreshed with the token system + SVG icons. Phone-first, ~460px.
- Controls: hero Weak/Med/Strong, monster Goblin/Orc/Troll, stacks 1–3 × size 1–3, Start, Pause/Resume, Reset, live speed slider.

Next: richer sprite art, gear/loadout selection in-UI, then phase-2 grid targeting.

### LPC sprite system — Phase A (2026-06-21)
Replacing the placeholder SVG figures with a **Liberated Pixel Cup (LPC)** layered sprite system (presentation + assets only; the sim engine is untouched).
- **Assets:** real LPC art (64×64 universal frames) sourced from the Universal LPC Spritesheet Character Generator, committed under `web/public/sprites/lpc/` (body, head, leather/plate torso incl. gilt + violet variants, dagger/arming/longsword weapons with behind+front layers). Full attribution in `web/public/sprites/CREDITS.md` (CC-BY-SA 3.0 / GPL 3.0). Note: the LPC "thick" body base is headless, so the head is its own layer.
- **System (`web/src/ui/combat/lpc/`):** data-driven — `types` (slots, layers, tints, animation layout), `manifest` (item catalogue → z-ordered layers), `presets` (named bundles + theme tints + engine-appearance→item mapping), `loader` (cached image decode), `LpcSprite` (canvas compositor: crops the frame per layer, applies optional tint, draws z-ordered at native 64px, CSS-scaled pixelated → uniform scale for all units).
- **Phase A wired:** the hero is now composited from base body + head + armour + weapon; switching tier (Squire/Knight/Champion) visibly swaps the weapon and torso layers; a "Divine tint" toggle gilds the hero's gear (proves the programmatic recolor hook). Monsters stay on the SVG renderer until Phase B.
- **Theme-ready (no rework):** per-layer tint hook + the preset concept (a named bundle of layer ids + tint) are built now; future Norse/Greek/Egyptian "divine" presets are just data.
- **Phase B (done 2026-06-21):** all units (hero + monsters) render via LPC; the old SVG sprite system was deleted. Monsters reuse the human base with a **per-channel skin tint** (goblin green, orc dark-green, troll grey) and a deliberate size hierarchy (goblin 0.82 < orc 1.02 < hero 1.0 < troll 1.22; a goblin never exceeds a troll). The hero gained hair. Tints are now **group-based** (`skin` vs `gear`) so monster recolor and divine gilding are independent. `LpcSprite` became an rAF animation controller: idle bob, a horizontal **lunge with a real LPC walk-frame step** on a swing, and a recoil + flash on hurt — canvas redraws only on frame change; the per-frame transform is a cheap style write (no setTimeout/setInterval).
- **Horizontal phasing (2026-06-21):** the board is now left party column vs right enemy column (`grid.ts`), with units facing the viewer and lunging toward the enemy. (LPC held-weapon layers are reliable front-facing but missing for side rows, so sprites stay front-facing.)
- **Asset note:** true per-frame swing animation needs LPC "oversize" weapon sheets (variable 128/192px frames that don't share the 64-grid); deferred. Monster-specific bodies/heads (real goblin/orc/troll art) are a future data add — the system already supports them.

## Active plan — B → A (split into testable dev PRs)
Dependency-ordered; B is a prerequisite for A.

- [ ] **PR1 (B + thin C):** add the 7-attribute block to `Hero` and `Monster`; per-class attribute presets that reproduce current HP (e.g. Warrior Sta10/Str10 = 120) so saves don't break; a character/stats page; add `pantheon` + `divineParent` flavor fields and Godblood naming. Pure data + display, no behavior change. Target `dev`, verify identical play + save survival on `/Game/dev/`.
- [ ] **PR2 (A):** lean 1v1 resolver behind the existing `CombatResolver`/`CombatOutcome` interface (drop-in replacement for `defaultResolver`); surface the tick log in Battle Log. This is where the loop becomes a game. Target `dev`, test, then promote.
- [ ] Deferred per roadmap: deep boons/skillsets, 7×4 grid, adventures.

## Local / live-dev (optional)
Vite dev server with hot-reload, optionally exposed from the Google VM via a Cloudflare tunnel in tmux session `game`. Runbook in the Coda doc. Not needed for normal testing now that Pages is live.

## Open items
- [ ] Execute PR1 then PR2 above.
- [ ] Port Godblood design info from Coda into the repo as it gets implemented.
- [ ] Remove committed build artifact `web/tsconfig.tsbuildinfo`; add to `.gitignore`.
- [ ] Rotate the GitHub PAT used on the VM (was exposed during setup).

## Conventions
- Outward-facing content in English.
- Keep this file current automatically (see CLAUDE.md "Keeping docs in sync").
