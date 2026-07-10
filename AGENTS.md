# AGENTS.md — for every non-Claude agent working in this repo

This repository's operating standard lives in [`CLAUDE.md`](./CLAUDE.md). It is written for
Claude Code but it is **the repo's rules, not Claude's** — any agent that commits here (ChatGPT /
Codex work branches included) follows it. Read it in full before changing anything. The short
version, with the parts that most often trip up a second agent:

## The non-negotiables (CLAUDE.md §80 hard stops)
- **No commits to `main` or `dev` without a PR.** Every PR targets `dev`, never `main`.
- **Never modify the combat core** (`web/src/game/battle/`). Consume it; don't touch it.
- No silent overwrites or deletes; state structural changes before making them.
- Don't claim "done" — gates (review, Codex, merge) are decided by Stefan, not by an agent.

## The Loop (§ The Loop)
plan → review the plan → build → review the diff → PR into `dev` → Codex review → Stefan merges.
Never fold planning into building; never self-merge; fix review blockers before proceeding.

## Working alongside the Claude Code session
- **Branching:** work on your own clearly-named branch (`agent/<topic>` worked well). Either open
  a PR into `dev` yourself and stop at the review gates, or leave the branch for the Claude
  session to review, fold, and gate — both are fine; say which in the final commit or PR body.
- **PROGRESS.md** (§50) is append-only, newest-first, one dated entry per gate. Two agents editing
  it on parallel branches WILL collide — keep your entry small, factual, and honest about what
  actually ran (don't claim reviews or verifications that didn't happen). Merged gates are
  **backfilled later** from git history, never written at merge time.
- **Verification (§70):** never state that tests/builds passed without running them. If you can't
  run them, say so explicitly in the commit/PR body.
- **Scope (§10/§60):** one scope per PR; declare the branch and file scope up front; additive
  only.

## Style
- Small commits, conventional messages (`docs: …`, `feat(hall): …`, `chore(progress): …`).
- Phone-first: Stefan reviews everything on a phone. Bottom-line-first summaries, tight bullets,
  reference files by path.
