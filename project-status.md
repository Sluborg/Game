# Project Status

_Last updated: 2026-06-19_

## What this repo is
- `app/` — original idle game, Kotlin + Jetpack Compose (Gradle).
- `web/` — active target: turn-based web port "Majesty — Day by Day". Vite 5 + React 18 + TypeScript.
  - `web/src/game/` — pure, unit-tested game logic (state, economy, day engine, combat placeholder, persistence).
  - `web/src/ui/` — React DOM components.
  - See `web/MIGRATION.md` (Kotlin → TS mapping) and `web/COMBAT_DESIGN_PROMPT.md` (combat to be designed).

## Current state
- Web port merged to `main` (PR #6, 2026-06-19): builds, dev server runs, Vitest on game logic.
- Combat is a **stub** — not yet designed or implemented.
- `web/vite.config.ts` allows `.trycloudflare.com` hosts for remote testing through a Cloudflare tunnel.

## Testing on the Google VM
Web port runs on the Google Cloud VM (`~/Game`) behind a Cloudflare quick tunnel, kept alive in a `tmux` session named `game`. Full runbook (resume / setup / update commands, gotchas) is in the Coda doc: **Godblood Knowledge → Web Port — VM Test Setup (Runbook)**.

Quick resume: SSH in → `tmux attach -t game` → `Ctrl-b 1` to read the public URL.

## Open items / next
- [ ] Design and implement the combat system (`web/COMBAT_DESIGN_PROMPT.md` + Godblood Knowledge doc) into `web/src/game/`.
- [ ] Port Godblood design info from the Coda doc into the repo (currently doc-only).
- [ ] Remove committed build artifact `web/tsconfig.tsbuildinfo` and add it to `.gitignore`.
- [ ] Optional infra: named Cloudflare tunnel (stable URL) + auto-start on VM boot.
- [ ] Rotate the GitHub PAT used on the VM (was exposed during setup).

## Conventions
- Outward-facing content in English.
- Update this file at the end of any session where progress is made.
