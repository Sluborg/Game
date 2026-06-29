# Asset Report, Claude Code Operating Standard

Auto-loaded as CLAUDE.md at repo root. Task-agnostic: this applies to EVERY task in this repo, whatever Stefan asks for. Stefan works phone-only.

## The Loop (always, never collapsed)
plan -> review -> build -> review -> PR -> codex -> merge
1. PLAN the approach. No code yet.
2. REVIEW #1: multi-persona on the PLAN, fix blockers, then proceed autonomously (no human checkpoint here).
3. BUILD the change.
4. REVIEW #2: multi-persona on the DIFF, before any PR, fix blockers.
5. Open the PR against `dev`.
6. STOP for Codex. Print "awaiting Codex review" and wait for Stefan to paste it.
7. STOP for merge. Print "awaiting merge decision" and wait for Stefan's explicit go.
Never skip a step. Never fold plan into build. Never claim done mid-loop.

## 10. Branch and scope
- Target `dev`. Every PR targets `dev`, never `main`. If a PR opens on `main`, stop and recreate it against `dev`.
- **Exception — production promotion:** the `dev` -> `main` promotion PR is the ONE PR that may target `main`. It exists to ship a tested `dev` build to production (Pages builds `main` -> `/Game/`, `dev` -> `/Game/dev/`). Open it only after `dev` is confirmed working and on Stefan's explicit go; never close or recreate it against `dev`. This is the sole exception to the "never `main`" rule and the "no commits to `main`" hard stop.
- Additive only. Guild work lives in guild-specific dirs behind the `/guild` route. Never modify the combat core; consume it.
- Declare first: the first reply states branch name and file/dir scope, before any code.

## 20. Multi-persona review (both rounds, impartial, scoped)
Spawn 4 real reviewer subagents, each reviewing ONLY the current scope (the plan in Review #1, the diff in Review #2). No self-congratulation.
- Designer: serves the core fun (autonomous hero parties, information asymmetry) and respects the pivot constraints?
- Engineer: architecture and code quality; did it touch anything forbidden (the combat core)?
- Adversary / QA: edge cases, failure modes; does it run on a fresh clone?
- Player-experience: is the on-screen loop legible and fun; does the report-fidelity UI read clearly at each tier?
Output: per-persona top issues, merged into a blocking / non-blocking list. Fix every blocker before continuing.

## 30. Codex gate
- After opening the PR, STOP. Print "awaiting Codex review". Do not say done.
- Stefan pastes the Codex findings. Address each. Re-run Review #2 on the delta only, then go to the merge gate.

## 40. Merge gate
- After Codex fixes clear, STOP. Print "awaiting merge decision". Stefan decides. Never self-merge.

## 50. Logging (so Claude.ai can follow on phone)
- Append a dated entry to /PROGRESS.md at each gate (plan done, build done, PR opened, codex-fixed, merged). Each entry: scope, branch, files touched, review verdicts, open questions.

## 60. Phone visibility
- Make output viewable without a desktop: push screenshots to the branch, or use the Pages preview (/Game/dev/). Never rely on local-only PNGs.
- One scope per PR. Small commits, conventional messages, pushed so GitHub mobile renders the diff.
- Summaries: bottom-line first, tight bullets, reference files by path, do not paste full code unless Stefan says "full file".

## 70. Verify before claiming
- No done until plan, both reviews, build, and Codex have all cleared.
- Confirm every change via git status / an actual run / a build before reporting it. Never claim an unverified change.
- Only use APIs and functions that genuinely exist. If unsure, say so.

## 80. Hard stops
- No commits to `main` or `dev` without a PR.
- No modifying the combat core.
- No silent overwrite or delete; state structural changes before executing.
- No done before the full loop clears.
