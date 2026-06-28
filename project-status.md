# Project Status

_Last updated: 2026-06-28_

## Pivot in progress — Campaign Mode (Asset Report)
Per the 2026-06-27 design decision (Coda "Session Log"), the game is pivoting from the
kingdom/economy shell to a **Majesty-style guild-master sim**. First slice landed on branch
`claude/campaign-mode-start-ppamd6`:
- New **Campaign Mode** is now the app's only screen (`web/src/ui/App.tsx`). You are the
  Village Guild Master; you select agents (click) and send them along map paths (click a
  path) or have them act at a node.
- Map: Village (home) · Forest · Mines · Ruins, with safe (1-turn) and unsafe (2-turn)
  paths on a 1–5 danger scale (color + dash + label).
- Agents are 16px portrait tokens with flavor-only skills; node actions (Look for Quests,
  Gather Rumors, Build Relations, Investigate Business, Recruit, + home-only Guild Hall /
  Train) set the agent's activity and produce lines in the **Asset Report** (grouped by
  action type, toggle to area/agent). Actions have no mechanical effect yet.
- **Art:** no emoji — heraldic SVG emblems from game-icons.net (CC BY, recolored) for
  nodes/actions + DiceBear pixel-art portraits (CC0) for agents. See `web/public/CREDITS.md`.
- Pure logic in `web/src/game/campaign/` (Vitest-covered); the old kingdom files remain in
  the tree but are no longer rendered (follow-up PR to delete them).
- Next: wire actions to real effects, recruitment, agent skills mattering, and (later)
  connect to the Combat Test / grid combat as the "ground truth" behind agent reports.

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
