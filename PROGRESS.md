# PROGRESS

Running log Claude Code appends to at each gate, so a phone-only Claude.ai chat can follow. Newest entries on top.

Format per entry:
## YYYY-MM-DD HH:MM - <short scope>
- Gate: plan | build | PR | codex-fixed | merged
- Branch:
- Files touched:
- Review verdict: blockers found / fixed
- Open questions:

## 2026-07-01 - Map screen: PR opened
- Gate: PR
- Branch: `claude/map-nodes-selection-p5y5g1` → **PR #20 into `dev`**
- Note: no PR-level CI on this repo (deploy.yml + android-apk.yml trigger on push to `main`/`dev`
  only, so Pages builds `dev` → `/Game/dev/` after merge). No review comments yet. Awaiting Codex.

## 2026-07-01 - Map screen: first three clickable, selectable nodes
- Gate: build (PR next)
- Branch: `claude/map-nodes-selection-p5y5g1` → PR into `dev`
- Scope: replace the 3 placeholder boxes on the `/node` screen with the first three real map
  nodes — Guild Hall (`NodeType.HomeKeep`), Village (`NodeType.Settlement`), and a NEW Ruins quest
  node — each click-to-select with a visible single-selection state. Rename heading "Node Test" → "Map".
- Files touched: `web/src/art/enums.ts` (add `NodeType.Ruins`, `Category.QUEST_SITE`, `NODE_CATEGORY`
  entry, both with TODO(art-bible) notes); `web/src/art/placeholder.ts` (optional `label` hint so a
  placeholder shows the human name, XML-escaped, not the raw slug); `scripts/reconcile-art.mjs` (mirror
  gains `ruins`); `art-needs.json` (`ruins` node under new `quest-sites` feature); `docs/ROADMAP.md`
  (new `quest-sites` milestone); `web/src/ui/node/NodeTestScreen.tsx` + `.module.css` (nodes are
  keyboard-focusable `<button>`s with `aria-pressed`, single-selection React state, ring/glow/scale +
  `:focus-visible`, header readout, empty-catalog fallback so nodes always render); `docs/screenshots/`
  (two branch screenshots for phone visibility). Combat core untouched; additive only.
- Review #1 (4-persona, on the PLAN): 3 blockers → all fixed in build: (1) art-needs entry needed a
  non-empty `description`; (2) nodes were gated on `catalog &&`, so a fresh-clone/offline manifest
  fetch rendered ZERO nodes — decoupled via an empty fallback catalog; (3) default selection must be
  "nothing selected". Non-blocking folded in: human `aria-label`/caption, ≥44px tap targets + resting
  chrome, Ruins stays a peer placeholder, TODO notes for enum-ahead-of-manifest.
- Review #2 (4-persona, on the DIFF): 1 blocker → fixed: placeholder box painted the raw slug
  ("home-keep") over the "Guild Hall" caption — two names at once, on BOTH online & offline paths
  (no node art exists yet). Fix: placeholder now renders the display label. Non-blocking folded in:
  dropped the "Loading art…" banner that overlaid already-live nodes; live-region readout now carries
  a state word ("Selected: X" / "No node selected"); readout given a visible pill. Parity/mirror
  assertions verified total (Record<NodeType,Category> stays exhaustive; `QUEST_SITE` has no
  exhaustive consumer). Deferred (noted): category-driven affordance for quest sites, friendlier
  error copy — both out of scope for a no-mechanics slice.
- Verified: `tsc -b && vite build` green; 36 vitest tests pass (parity intact); headless Chromium on a
  390px viewport (ArtLibrary CDN blocked = fresh-clone path) confirms heading "Map", 3 labelled
  placeholder nodes, default nothing-selected, single-selection with `aria-pressed` toggle, keyboard
  focus on a `<button>`. Screenshots in `docs/screenshots/`.
- Open questions: none blocking. Node art (`node-ruins.png` etc.) produced separately by Lubot; nodes
  degrade gracefully until then.

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
