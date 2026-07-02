# PROGRESS

Running log Claude Code appends to at each gate, so a phone-only Claude.ai chat can follow. Newest entries on top.

Format per entry:
## YYYY-MM-DD HH:MM - <short scope>
- Gate: plan | build | PR | codex-fixed | merged
- Branch:
- Files touched:
- Review verdict: blockers found / fixed
- Open questions:

## 2026-07-02 - DESIGN.md fold: Codex fix (build-order slicing)
- Gate: codex-fixed
- Branch: `claude/design-doc-fold-t3k9m2` → PR #22 into `dev`
- Codex finding (P2, the only one): "How we build" had split "Foundations" out as its own
  standalone next-up slice, contradicting the engagement report it claims to adopt (foundations
  are scaffolding "carried by the first gameplay PR, not its own session" per
  `docs/ENGAGEMENT_REVIEW.md`) and the "every slice ends playable" promise stated two paragraphs
  above. Fixed: folded Foundations into slice 1 (the thin closed loop) as in-PR scaffolding,
  renumbered slices 2-7, and updated internal cross-references (pre-rival roster dependency now
  "pre-slice 6", upkeep/decay now "slice 5").
- Review verdict: self-reviewed the delta (small, mechanical renumbering + one structural fold) —
  no new blockers; verified no other stale slice-number references remained via full-file grep.
- Open questions: none. Next: awaiting merge decision (no self-merge).

## 2026-07-02 - DESIGN.md: interview decisions folded, PR opened
- Gate: PR
- Branch: `claude/design-doc-fold-t3k9m2` (new branch off `dev`, since #19/#21 already merged) →
  PR into `dev`
- Scope: fold Stefan's 15 answers from the post-engagement-review design interview into
  `docs/DESIGN.md`. Docs only; no game code touched.
- Files touched: `docs/DESIGN.md` (§3 contracts/introductions/guild-management,
  §4 fidelity-as-interpretation + mail/stamp/socket reveals, §5 sim-full/UI-lean attributes +
  gold/stats pricing + proven-made-not-bought, §6 introductions + unstick path, §7 fog-bound rival
  + scripted v1 bidder, §8 debt→charter-revoked cash clock + coarse doom broadcast, §9 one-node's-
  arc cross-ref, new §10 multi-step quest beats, new §11 the D1a engine-seam sign-off, "How we
  build" re-sliced 8-step order), this file.
- Review #1 (4-persona, on the PLAN): Designer + Adversary both caught the same core gap — §3's
  old "recommend" line left uncontradicted by §6's new "introductions," and §5's certainty-icon
  sentence needing replacement not addition. Adversary also flagged: R2 pricing could collapse to
  a dominant strategy with no real downside; paid+refusable introductions could stack into a
  formation-bottleneck softlock; beat-type dispatch left "planning" and escalation transitions
  ambiguous; the CV-inflation tutorial cap could manufacture cheap quasi-proven heroes,
  undermining "proven = made not bought"; multi-location quests weren't reconciled with §9's
  single-node arc model. Engineer flagged party combat has no home in the frozen single-hero
  engine (needed an explicit composed-sequential-duels mapping) and that D1a's file scope +
  precedence rule (`hero` vs `heroTier`) was unstated. All adopted before writing.
- Review #2 (4-persona, on the DIFF): Adversary caught 2 blockers that survived the first pass —
  the new "Intel" guild-management spend was unbounded and could itself collapse the CV-pricing
  tension it was meant to protect (fixed: caps at one certainty step, rumor→claimed only, priced
  to scale with the hire, can't reach verified); the CV-inflation cap was worded per-hero
  ("a hero's first handful") instead of per-player-run, so it would have recurred forever instead
  of being a one-time tutorial window (fixed: rescoped to the player's first few recruits overall).
  Player-experience caught 3 blockers: the §8 Cash/Doom table cells and §10's Combat row had
  bloated into multi-sentence paragraphs — phone-hostile; all three trimmed to one clause with
  detail moved to bullets below their tables. Designer and Engineer found no blockers (verified:
  zero leftover "recommend" mentions; every technical claim in §11 checked against the real
  `engine.ts`/`useCombatClock.ts`/`ConfigPanel.tsx` code). Non-blocking items folded in too: §10's
  "report" wording scoped to the log tier so it doesn't read as contradicting §4's honest-rumor
  framing; "frozen" qualified against §11's one exception; §11 marked approved-but-unimplemented;
  the seed-reuse mechanism pinned to the engine's `rng` constructor param, not a new `FightConfig`
  field; §7's mirror/scripted-bidder tension softened with a forward reference; §6 given an
  explicit unstick-path sentence; §3's header parenthetical; §9 trimmed to a pointer; the old
  greedy/proud bounty-pricing flavor line restored.
- Open questions: none blocking. Next build session can start at Slice 1 (Foundations) per the
  revised "How we build" order.

## 2026-07-02 - Engagement review: Codex fix (replay sim-version)
- Gate: codex-fixed
- Branch: `claude/game-engagement-analysis-uu5lx8` → PR #21 into `dev`
- Codex finding (P2, the only one): seed-only replays (`{seed, config}`) silently diverge from the
  report the player already read if combat tuning or `HERO_TEMPLATES`/`MONSTER_TEMPLATES` change,
  since `config` stores identifiers whose stats live in code. Fixed in R6's implementation notes:
  persist a sim version (stamp/hash of tuning + templates) with the seed; replays valid only
  within the same version; on mismatch the persisted report text/outcome stays authoritative and
  the replay degrades gracefully (diegetic disable, or snapshot events at completion). Earlier the
  same day: two Copilot wording nits fixed (`FightConfig` phrasing, "seedable" vs "seeded") and the
  DESIGN.md citation made merge-order-proof (via PR #19).
- Review verdict: Review #2 re-run on the delta (self, small scope — doc lines verified against
  `tuning.ts`/`units.ts`/`engine.ts` behavior): no new blockers.
- Open questions: none. Next: awaiting merge decision (no self-merge). Recommended order: merge
  PR #19 (DESIGN.md) first, then this.

## 2026-07-01 - Engagement review of the game plans: build done (PR next)
- Gate: build (plan + both reviews cleared)
- Branch: `claude/game-engagement-analysis-uu5lx8` → PR into `dev`
- Scope: analysis only — a report on how to make the planned guild-master game fun and engaging,
  covering `docs/DESIGN.md` (planning branch `claude/game-design-planning-ojk3lt`) and the `dev`
  plan-of-record vs what actually runs. No game code touched; combat core consumed read-only for
  fact-checking.
- Files touched: `docs/ENGAGEMENT_REVIEW.md` (new), this file.
- Review #1 (4-persona, on the analysis PLAN): 4 blockers, all adopted — two-baseline analysis
  (concept vs build-order reality, incl. a first-playable walkthrough); recommendations grounded
  in the real engine API (`FightConfig`/`HERO_TEMPLATES`); structural-vs-tuning tags + falsifiable
  kill-tests per risk; pivot-constraint compatibility declared per fix.
- Review #2 (4-persona, on the DIFF): Engineer verified every technical claim against `origin/dev`
  (no blockers). 8 distinct blockers from the other three, all fixed in the same commit: bottom
  line moved first + sources compressed; build-order table → mobile-friendly list; slice 2 now
  prices fidelity tiers from the slice-1 cash clock (the report had reproduced the very sequencing
  hole it condemns); two-zoom map restored to slice 5; R6 tier-numbering miscite; R12 flagged as a
  DESIGN.md §5 text change and added to the fold list; R9 kill-test made falsifiable; appendix
  attribution + review-status wording corrected ("AskStefan" jargon removed). Non-blocking folded
  in: seed ownership note (engine default RNG is random), `swing` in the event list, contracts
  framed inside the money lever, named terminal loss state after the debt event, envelope events
  seed-derived, R2-vs-R3/R5 tension guard, retags (R5/R7/R12 structural, R6 concept), quest-selection
  weights placed in slice 4.
- Key output: 12 ranked risks with fixes + kill-tests; one decision needed from Stefan (D1: engine
  seam for per-hero attributes — recommended D1a, a ~5-line additive `FightConfig` widening,
  requires explicit sign-off since it touches the frozen core); a re-sliced 8-step build order that
  closes the loop in the first gameplay PR; 6 quick-win candidate sessions.
- Open questions: D1 (awaits Stefan). Whether to fold the report's design commitments into
  DESIGN.md on the planning branch (quick win #1) — separate session.

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
