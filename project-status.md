# Project Status

_Last updated: 2026-06-20_

## What this repo is
- `app/` — original idle game, Kotlin + Jetpack Compose (Gradle).
- `web/` — active target: turn-based web port "Majesty — Day by Day". Vite 5 + React 18 + TypeScript.
  - `web/src/game/` — pure, unit-tested game logic (state, economy, day engine, combat placeholder, persistence).
  - `web/src/ui/` — React DOM components.
  - See `web/MIGRATION.md` (Kotlin → TS mapping) and `web/COMBAT_DESIGN_PROMPT.md` (combat to be designed).

## How testing / deployment works (primary)
GitHub Pages auto-deploys on every push, via `.github/workflows/deploy.yml`. One Pages site hosts both branches:

- **Stable (production):** `main` → https://sluborg.github.io/Game/
- **Dev (work in progress):** `dev` → https://sluborg.github.io/Game/dev/

The workflow builds `main` with base `/Game/` and `dev` with base `/Game/dev/`, combines them into one artifact, and publishes. Triggered by a push to either branch (and `workflow_dispatch`). Live ~1-3 min after a push; hard-refresh to beat browser cache. Saves are per-browser localStorage.

### Workflow
1. Work on the `dev` branch (or a feature branch merged into `dev`). Push → preview at `/Game/dev/`.
2. When `dev` is good, merge `dev` into `main`. Push → production updates at `/Game/`.
3. Never push broken code straight to `main`; `main` is always the stable URL.

## Local / live-dev (optional)
For hot-reload while editing (faster than waiting for a Pages build), run the Vite dev server. On the Google VM it can be exposed via a Cloudflare quick tunnel kept alive in a `tmux` session named `game`. Runbook in the Coda doc: **Godblood Knowledge → Web Port — VM Test Setup (Runbook)**. This is no longer required for plain testing now that Pages is live.

## Open items / next
- [ ] Design and implement the combat system (`web/COMBAT_DESIGN_PROMPT.md` + Godblood Knowledge doc) into `web/src/game/`.
- [ ] Port Godblood design info from the Coda doc into the repo (currently doc-only).
- [ ] Remove committed build artifact `web/tsconfig.tsbuildinfo` and add it to `.gitignore`.
- [ ] Rotate the GitHub PAT used on the VM (was exposed during setup).
- [ ] Optional: SPA 404 fallback for deep links on Pages, if client-side routing is added.

## Conventions
- Outward-facing content in English.
- Update this file at the end of any session where progress is made.
