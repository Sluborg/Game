# CLAUDE.md — instructions for Claude (Code and Cowork)

## Read first
At the start of a session, read `project-status.md` for current state, active plan, and open items. It is the canonical snapshot — a new chat should become productive from `project-status.md` + this file + the Coda doc alone.

## Keeping docs in sync (do this AUTOMATICALLY, without being asked)
Stefan should never have to ask for a status update. Treat documentation as part of the work, not a separate chore.

Whenever a decision is made, a plan changes, a feature ships, or any progress happens — update the relevant document in the same session, inline, and again before ending:

- **`project-status.md` (on `main`)** — single source of truth for current state, the Active plan, and Open items. `main` is the default branch every new chat reads first, so keep the snapshot here current even while work happens on `dev`. Update the `_Last updated_` date.
- **Coda doc "Godblood Knowledge"** — design, lore, combat spec, pantheons, the VM runbook, and the FAQ. Put design/balance decisions here.
- **This `CLAUDE.md`** — stable rules and workflow. Update only when the process itself changes (rare).

Goal: close-to-seamless transitions between chats. If you finish a step and the docs no longer match reality, you are not done.

## Branch + deploy workflow (guide the user on this)
GitHub Pages deploys from two branches into one site:
- `main` → **production**, https://sluborg.github.io/Game/
- `dev` → **work in progress**, https://sluborg.github.io/Game/dev/

1. **All new work starts from `dev`.** Create the branch from `dev`, target `dev` in the PR. Never base feature work on `main` unless it is a hotfix.
2. **Never push broken or untested code to `main`.** It must always be the stable URL.
3. **Test loop:** after merging into `dev`, tell the user to test at https://sluborg.github.io/Game/dev/ (live ~1-3 min; hard-refresh for cache).
4. **Promote:** when `dev` is confirmed working, open a `dev` → `main` PR. Merging updates production.
5. **No drift:** if `main` gets a direct hotfix, merge `main` back into `dev` afterward.
6. **Prefer small, testable PRs** over one large merge, so each step is verifiable on the dev URL.

When the user asks for a feature without naming a branch, default to `dev` and say so. After finishing, remind the user of the test URL and the promote step.

## Conventions
- All outward-facing content (docs, UI strings, commit messages, prompts) in English.
- Active development is the web port in `web/` (Vite + React + TS). The Kotlin app in `app/` is legacy and untouched unless explicitly asked.
- Versioned files: two-digit version (v01..v10); multiple same-day releases use a letter suffix (v06a, v06b).

## Deploy mechanics
`.github/workflows/deploy.yml` builds `main` (base `/Game/`) and `dev` (base `/Game/dev/`) on every push to either branch, combines them, and publishes to GitHub Pages. Pages Source = GitHub Actions (already configured).
