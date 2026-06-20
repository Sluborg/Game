# CLAUDE.md — instructions for Claude (Code and Cowork)

## Read first
At the start of a session, read `project-status.md` for current state and open items. Update it at the end of any session where progress was made.

## Branch + deploy workflow (IMPORTANT — guide the user on this)
This repo deploys to GitHub Pages from two branches, into one site:

- `main` → **production**, live at https://sluborg.github.io/Game/
- `dev` → **work in progress**, live at https://sluborg.github.io/Game/dev/

Rules to follow and to remind the user about:

1. **All new work starts from `dev`.** When asked to add a feature or fix, create the branch from `dev` and target `dev` in the PR. Never base feature work on `main` unless it is a hotfix.
2. **Never push broken or untested code to `main`.** `main` must always be the stable, working URL.
3. **Test loop:** after a PR is merged into `dev`, tell the user to test at https://sluborg.github.io/Game/dev/ (live ~1-3 min after merge; hard-refresh to beat cache).
4. **Promote to production:** when `dev` is confirmed working, open a `dev` → `main` PR. Merging it updates https://sluborg.github.io/Game/.
5. **Keep branches from drifting:** if `main` ever gets a direct hotfix, merge `main` back into `dev` afterward.

When the user asks for a feature without naming a branch, default to `dev` and say so. After finishing, remind the user of the test URL and the promote step.

## Conventions
- All outward-facing content (docs, UI strings, commit messages, prompts) in English.
- Active development is the web port in `web/` (Vite + React + TS). The Kotlin app in `app/` is legacy and untouched unless explicitly asked.
- Versioned files: two-digit version (v01..v10); multiple same-day releases use a letter suffix (v06a, v06b).

## Deploy mechanics
`.github/workflows/deploy.yml` builds `main` (base `/Game/`) and `dev` (base `/Game/dev/`) on every push to either branch, combines them, and publishes to GitHub Pages. Pages Source = GitHub Actions (already configured).
