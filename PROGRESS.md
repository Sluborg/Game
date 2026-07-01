# PROGRESS

Running log Claude Code appends to at each gate, so a phone-only Claude.ai chat can follow. Newest entries on top.

Format per entry:
## YYYY-MM-DD HH:MM - <short scope>
- Gate: plan | build | PR | codex-fixed | merged
- Branch:
- Files touched:
- Review verdict: blockers found / fixed
- Open questions:

## 2026-07-01 - Planning hub — Codex fix (art ref)
- Gate: codex-fixed
- Branch: `claude/game-art-reconciliation-d0y6kn` → PR #18 into `dev`
- Codex finding (P2): reconcile hardcoded `ART_REF="main"`, so a release build that pins config.ts
  to a SHA would have the gate validate the wrong manifest. Fixed: `scripts/reconcile-art.mjs` now
  reads `ART_REPO`/`ART_REF`/`ART_COLLECTION` from `web/src/art/config.ts` (with an `ART_REF` env
  override and safe fallbacks), so it always checks the ref the game consumes. Verified: default reads
  `main` (identical output, exit 1); `ART_REF=<sha>` retargets the fetch. Doc note added to
  `docs/ART.md`. Re-ran Review #2 on the delta (self, small scope): no new blockers. Build + 36 tests
  green.
- Next: awaiting merge decision (no self-merge).

## 2026-07-01 - Planning hub + art needs↔done reconcile
- Gate: build
- Branch: `claude/game-art-reconciliation-d0y6kn` (re-based onto `dev`) → PR into `dev`
- Files touched (added at repo root unless noted): `art-needs.json`, `scripts/reconcile-art.mjs`,
  `package.json` (new, `npm run reconcile`), `docs/ROADMAP.md`, `docs/ART.md`,
  `web/src/art/art-needs.test.ts` (parity guard); modified `project-status.md`, `web/docs/ART.md`.
  No ArtLibrary files touched (read-only fetch). Built on existing `web/src/art/` ArtCatalog + enums.
- Review verdict (4-persona on the diff): 1 unanimous blocker fixed — `guild-office` was `kind:node`
  but not a `NodeType`, and the reconcile mirror derived known-slugs from art-needs.json instead of
  the enums, so a produced `node-guild-office.png` would report `ok` in reconcile yet be unresolvable
  in the game. Fix: reconcile now hardcodes the enum slug lists (guarded by tests that assert
  mirror==enums and reconcile.deriveSlug==game.deriveSlug); `guild-office` reclassified to `kind:ui`;
  added reverse parity (node⊆NodeType, resource⊆ResourceType). Doc-path blockers (web/ vs root) fixed.
  Non-blocking: exit-2 on malformed manifest, skip empty filenames, warn on dup DONE / 0-row roster,
  ROADMAP live-status caveat, documented SLUG/KIND columns. Designer's hero-party/report-art gap
  recorded as a tracked future milestone (no invented slugs). `tsc -b` excludes tests so the Pages
  build stays green with the Node-only test imports. Build + 36 tests green; reconcile exits 1 (25
  missing-art) as designed.
- Open questions: file placement — planning artifacts are at repo ROOT (task's literal paths; the
  `web/package.json` edit was declined). Easy to relocate under `web/` if preferred.
