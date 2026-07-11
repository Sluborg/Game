# PROGRESS

Running log Claude Code appends to at each gate, so a phone-only Claude.ai chat can follow. Newest entries on top.

## 2026-07-11 - Content pipeline (CONTENT-SPEC + validated content scaffold) — codex-fixed
- Gate: codex-fixed (awaiting merge decision)
- **PR #42 into `dev`.** Codex (on `3dcad5a`): ONE finding, **P2 — "Reject non-array trait scopes"**:
  when `appliesTo.skills` (or `.attributes`) is a present-but-non-array (e.g. a bare string) while
  the other scope is a valid non-empty array, the `Array.isArray(...) ? ... : []` fallback coerced
  the malformed scope to `[]` and the later ref-validators skipped it, so a bad drop passed CI. Real
  hole. Fixed: a present-but-non-array scope is now rejected with its own issue (undefined stays
  fine — the scope is simply omitted), and the "applies to nothing" message is suppressed when a
  scope is already flagged malformed (no double-report). +1 negative fixture (40 content tests).
  Re-ran Review #2 on the delta (self, proportionate to a ~15-line validator fix): seed content
  (array scopes) still clean, `{}` still errors, empty-array + valid-other still fine; no new
  blockers. `npm run test` **132 pass + 1 skipped**; `tsc -b && vite build` green.
- Gate before this: build + PR (Review #2 cleared).
- Branch: `claude/content-pipeline-spec-dh39y1`. Scope as planned: `docs/CONTENT-SPEC.md`,
  `docs/CHALLENGE_SYSTEM.md` fold, `web/src/game/guild/content/` (attributes/skills/ladder/types
  as typed `const` vocab + 4 JSON drops + `schema.ts` validator + `content.ts` loader + README +
  `content.test.ts`), `.github/workflows/test.yml`. Additive; combat core untouched (empty diff vs
  `origin/dev`); no sim/v1 file modified; nothing wired into the sim.
- Built: a v2 content namespace, isolated from the shipped v1 sim (4-attr str/dex/sta/per). ChatGPT
  authors JSON against CONTENT-SPEC; the schema vitest gates every drop. Per Stefan's decision each
  challenge check declares its own 0–100 difficulty; visible difficulty = derived max
  (`deriveVisibleDifficulty`, stored nowhere). Combat scoped out (absent from the 15-skill table —
  validator rejects it with a dedicated message). Seed content: 6 challenges / 2 quests / 3 traits /
  4 perks, all on-model.
- Review #2 (4 personas on the DIFF — Designer, Engineer, Adversary/QA, Player-experience):
  **1 blocker, fixed** — the test claimed "a bad fixture per rule" but several validator branches
  had no negative test (unknown-attribute, skill-modifier percent bound, duration integer/<1,
  non-integer reward, invalid `fromResult`, empty strings, 3-check, object guards) — a §70 truth
  gap → 9 fixtures added (39 content tests). Non-blocking folded: dead `void ATTR_MAX/SKILL_MAX` +
  false comment removed; isolation guard now flags ANY `../` specifier (side-effect + dynamic
  imports, not just `from`), scanning shipped modules only (tests are build-excluded); **unknown-key
  rejection** added per shape so the spec's "Never add fields" has teeth (a smuggled five-band prose
  matrix on a challenge — the report data-dump the design forbids — now fails); `tsc -b` step added
  to the test workflow so vocab TS regressions gate at PR time; CONTENT-SPEC folds — ladder Meaning
  column now verbatim, required non-empty fields named, reject-list completed (non-integer
  reward/duration, upgrade-triumph, empty/unknown fields), fog-transform clause on the derived
  difficulty (guardrail #2), perk-vs-trait guidance for the numeric `skill-modifier`, dead
  "read the seed" phone pointer reframed for maintainers; `oneOf` hints now list the full 15-skill
  vocabulary. Accepted (non-blocking, logged): a challenge may repeat in a quest's run list; a 0%
  trait/perk is allowed; per-kind perk param strictness (a stray `percent` on a param-less perk) is
  union-keyed, not per-kind — detailed perk design is out of the CHALLENGE_SYSTEM contract.
- Verified: `npm run test` **131 pass + 1 skipped** (39 content: real content clean, a negative
  fixture per rule, vocabulary integrity — 6 attrs / 15 skills exact map / Combat absent / ladder
  5×[−3/−1/0/+1/+3], v1/v2 isolation); `tsc -b && vite build` green; combat core diff empty vs
  `origin/dev`; a corrupted real JSON drop turns the suite red with legible
  `path: message (expected …)` then restores clean.
- Open questions: none blocking. Downstream, still open per CHALLENGE_SYSTEM (unchanged by this
  slice): 0–100→check-target conversion, final bands, combined-result consequence table, narration
  composition, final Combat.

## 2026-07-11 - Content pipeline (CONTENT-SPEC + validated content scaffold) — plan done
- Gate: plan
- Branch: `claude/content-pipeline-spec-dh39y1` (off `origin/dev` incl. PR #41; first commit = §50
  backfill of PR #41's merged gate). Scope: new `docs/CONTENT-SPEC.md`; new
  `web/src/game/guild/content/` (typed v2 vocab tables + JSON content drops + schema validator +
  vitest); new `.github/workflows/test.yml` (so the schema test actually gates CI); a resolution
  fold into `docs/CHALLENGE_SYSTEM.md`; this log. Additive only; combat core untouched; NOTHING
  wired into the sim (funnel, not consumer — the sim stays v1 str/dex/sta/per, this content is the
  v2 6-attr/15-skill vocabulary in its own namespace).
- Design question resolved with Stefan BEFORE Review #1 (per CHALLENGE_SYSTEM Open decisions,
  blocks all challenge content): **each of a challenge's two checks declares its OWN 0–100
  difficulty** (`{skill, difficulty}`); the challenge's single visible difficulty is DERIVED
  (max of the two). Recommended + chosen because it matches the doc's own "one label hides two
  materially different demands" rationale and the retired mockup (Research 60 + Arcana 55), and a
  shared target is just the equal-numbers special case (strictly more expressive, always
  collapsible; the reverse needs a content migration). Folded into CONTENT-SPEC.md and
  CHALLENGE_SYSTEM.md (moved from Open decisions → Model).
- Review #1 (4 personas — Designer, Engineer, Adversary/QA, Player-experience — on the PLAN):
  **11 blockers, all folded** — (1) no CI job runs vitest (deploy.yml is build-only, excludes
  tests, runs post-merge not on PRs) → add a test workflow; (2) validator passes vacuously without
  negative fixtures → ship a bad fixture per rule; (3) per-band narration matrix = the data dump
  the doc forbids → NO prose this pass, broad activity label only, narration stays open;
  (4) combat has no authoring path (absent from the 15-skill table) → combat scoped out with a
  stated reason, validator rejects Combat checks; (5) TS-vs-JSON output undecided → ChatGPT emits
  JSON; (6) no golden samples → 4 filled validator-passing samples end the spec + seed content;
  (7) derived-difficulty rule + worked example missing → visible = max, display-only; (8) cryptic
  errors → legible `{path,message,expected}`; (9) perks resist a schema → enum of exception-kinds;
  (10) validator gaps (2-check count, distinct skills, empty lists, cross-kind id collision,
  NaN/float, trait/perk→skill refs, case/unicode ids) → each an explicit rule; (11) ref-graph
  shape unstated → declared a 2-level DAG. Non-blocking folded: derive attr from skill; min+max
  duration fuzz; derived difficulty = authoring ground truth (player number is a later fog
  transform); `as const` skill/attr unions; vocabulary-integrity test (15 skills, Combat absent,
  ladder 5×[−3/−1/0/+1/+3]); no-v1-import guard test; trait = bounded modifierPercent; broad-label
  DO/DON'T table; reward cites DESIGN magnitudes; authored-but-not-wired note; verbatim ladder
  table (emit NAME only); orphan library content allowed; giver/location free-text this pass.
- Open questions: none blocking. (Downstream, still open per CHALLENGE_SYSTEM: 0–100→check-target
  conversion, final bands, combined-result consequence table, narration composition, final Combat.)

## 2026-07-11 - Challenge system content contract — build done, PR opened
- Gate: **merged 2026-07-11 01:23 +0200** (merge commit `6bf8771`; backfilled 2026-07-11). **PR #41 into `dev`.**
- Branch: `claude/slice-living-canvas-843hho` — the six doc commits were authored on
  `agent/challenge-system-design` (Stefan's other agent) and cherry-picked here on Stefan's
  explicit choice; authorship preserved. Review #1 below is that agent's own log, taken at its
  word; Claude ran Review #2 on the cherry-picked diff.
- Review #2 (Claude; two dual-persona agents — Designer+PX, Engineer+Adversary — declared):
  **2 blockers, both fixed** — (1) result-ladder collision: the doc never said the new
  Critical Failure/Failure/Insufficient/Success/Triumph language REPLACES the shipped
  Botch/Poor/Success/Great/Triumph meter ladder ("Success" names a different tier in each) →
  supersession note added; (2) structural gap: shared vs per-check difficulty was not even listed
  as open (the retired mockup implied per-skill values; content can't be authored without it) →
  explicit Open-decision bullet. Also folded: result name/value/band merged to ONE table
  (paste-safety); Combat explicitly not a 16th table Skill + Wis/Cha gap named as placeholder;
  DESIGN.md's absolute "two Skill checks" re-hedged to "normally two"; ceiling landmine noted
  (unmodified max = 60) under the conversion bullet; pair-vs-sum consequence question added
  (Success+Failure ≡ Insufficient+Insufficient by sum, but must narrate differently). Verified:
  docs-only diff, combat core untouched, #40 backfill sha/date exact.
- Scope: new `docs/CHALLENGE_SYSTEM.md`; minimal reconciliation/link in the live
  `docs/DESIGN.md` challenge-v2 section; this progress log. Combat core and runtime untouched.
- Narrative starts the contract: reports must stay authored rather than collapse into data dumps;
  challenge labels stay broad ("Researching in a library", not a named tome/shelf). The document
  then records Stefan's agreed Attribute/Skill vocabulary, two-check model, percentage-modifier
  semantics, temporary Combat rule, result names/values, rationales, and explicitly open tuning.
- Review #1 (Designer, Engineer, Adversary/QA, Player-experience): Engineer found one blocker —
  DESIGN.md's older challenge-type list would compete with the new contract. Folded by making the
  new document authoritative and reconciling the stale summary. All lenses required unresolved
  difficulty conversion, visual spacing, combined consequences, narration machinery, and final
  Combat to remain visibly open. No remaining blockers.
- Open questions: Difficulty 0–100 target conversion; 5 vs 10 minimum visual threshold spacing;
  combined-result consequences; scalable narration composition; final Combat model.

## 2026-07-10 - Feedback round 3 (state toggle · meter marks · skip · narration · feed cap) — build done, PR opened
- Gate: **merged 2026-07-11 00:43 +0200** (merge commit `689b058`; backfilled 2026-07-11).
- Codex (PR #40): ZERO findings — "Didn't find any major issues." on `fd57b5d`; no inline threads.
- Branch: `claude/slice-living-canvas-843hho` (restarted off `origin/dev` after PR #39 merged;
  first commit = §50 backfill of #39). Scope: `web/src/ui/hall/*`, `web/src/ui/report/*`,
  `web/src/ui/kit/` (new TimeControls + Icon additions), COPY-ONLY strings in
  `web/src/game/guild/clock.ts`, docs. Combat core untouched.
- Stefan's asks, delivered: toggle shows STATE (▶ Playing lit gold / ⏸ Paused dim / first-ever
  ▶ Play via persisted pref / Needs you ember) — he confirmed state-labels via question; buttons
  lowered to 38px visual with ≥44px invisible hit extenders; speed chip → shared kit
  (play-glyph 1×, fast-forward 2×/3×, fixed width), consumed by BOTH the Hall and the StoryStage
  ("reuse symbolism, sizes") with separate prefs + distinct aria wording; meter grade marks
  (broken hearts bad / award rosettes good — skulls stay difficulty-only, his icon list) with
  dashed limit lines derived from GRADE_ZONES; live grade word under the rising bar (reads the
  RENDERED width per frame — can't desync or spoil); "Skip to result »" corner-placed, lands on
  the full outcome card; type chip larger + CAPS; trait names as bordered pills; first-day coach
  REMOVED (player-directed; Designer's cold-start objection logged as accepted); building +
  steward copy de-design-speak'd; runway narrated with the per-night number behind a tap popover
  that masks while reports are sealed; feed renders only the last 3 day groups (slices the
  GROUPED list — pinned Needs-you strip still filters the full feed) with an honest
  "(older days have folded away)" cut line.
- Review #1 (plan; 4 personas + a 4-persona addendum pass for Stefan's mid-review adds): folded —
  ticker reads rendered width not elapsed time; crit-inclusive-at-90 zone lookup; mark sprites
  scale by count to fit the ~34px crit zone at 375px; 44px hit-area floor; growth-side runway
  keeps a magnitude word; kit takes labels per surface (report = playback vocabulary, never
  "Paused"/"Needs you"); skip = deliberate corner control; day-cap counts day GROUPS.
- Review #2 (diff; 4 personas): **2 blockers, both fixed** — (1) first-press flag was a ref,
  regressed "Paused"→"Play" on remount (nav away/back) → persisted UI pref (a sim-side
  derivation lies: several events share tick 0); (2) runway popover froze a click-time snapshot
  while the sim ran on → detail recomputed every render and patched into the open popover live.
  Also folded: honest cap-line wording for the trimmed case; dead `setLanded(false)` dropped;
  `gradeAt` moved to storyText.ts + 3 pin tests (boundaries, monotonicity, clamps); kenney.md
  sprite list refreshed; trait-pill comment no longer overclaims char-page parity. Punch list
  (non-blocking, logged): 1×-chip/Play visual near-twin; "Skip the rise" vs "Skip to result"
  wording; app-wide trait visual language; InspectPopover's any-scroll dismiss on a sticky
  anchor (pre-existing kit behavior).
- Verified: `tsc -b` + `vite build` green; **92 vitest pass** (3 new gradeAt pins); headless
  @430×932 full loop CLEAN — fresh "Play" → "Playing" → post-tick "Paused" → SURVIVES nav
  away/back (the B1 repro) → runway tap popover → story with 5 mark cells, live "Botch…",
  uppercase type chip, trait pill, skip → outcome card → day 5 with exactly 3 day groups +
  cut line; zero console errors, no h-overflow. Screenshots `docs/screenshots/canvas5-*`
  (re-captured after the copy fix — R#2 Designer's §60 catch).
- Content pipeline (Stefan's question, answered in chat): a CONTENT-SPEC contract doc he pastes
  into ChatGPT + typed data files under `web/src/game/guild/content/` + a schema-validating
  vitest — its own small PR on his go.

## 2026-07-10 - Header driver (one toggle + speed chip) — build done, PR opened
- Gate: **merged 2026-07-10 22:46 +0200** (merge commit `d6927a7`; backfilled 2026-07-10).
- Codex (PR #39): ONE finding, P2 — the slimmed bottom padding dropped the nav's
  `env(safe-area-inset-bottom)` share (the old 104px cushion silently absorbed it; ~22px of the
  last feed row under the nav on notched phones). Fixed to
  `calc(var(--nav-h) + env(safe-area-inset-bottom, 0px) + var(--sp-3))` — matches the
  HeroesScreen/NavBar pattern. Delta re-reviewed (Engineer+Adversary): clean; build + headless
  walkthrough re-run green. This also closes Review #2's "pre-existing safe-area gap" follow-up.
- Branch: `claude/slice-living-canvas-843hho` (restarted off `origin/dev` after PR #38 merged;
  first commit = §50 backfill of #38). Scope: `web/src/ui/hall/HallScreen.tsx` +
  `HallScreen.module.css` only.
- Stefan's ask, delivered: ONE Play⇄Pause toggle with icon (inline SVG glyphs — U+23F8 renders
  as tofu in the display font), speed chip showing ▶/▶▶/▶▶▶ ("one, two or three plays"), both
  folded into the sticky top header at half width with Day·Phase + gold in the other half,
  runway on a thin full-width line below, bottom fixed bar deleted (~104px returned to the feed).
- Review #1 (plan; 4 personas — Adversary + PX re-run after a session-limit failure, declared):
  pinned toggle branch order (blocked → scroll, stay latched; playing → pause; else play);
  blocked tap STAYS latched — both unlatch variants provably misfire (short feeds / manual
  scroll), and the interval's first fire already gives a one-beat pause window after unblocking;
  fixed-width speed chip so cycling never reflows the toggle under the thumb; "Needs you" gains
  an ember pulse; day/phase gets its own ellipsis clamp; walkthrough must drive blocked +
  pause-mid-play taps, not just the happy path.
- Review #2 (diff; 4 personas): **5 blockers, all fixed** — (1) ⏸ tofu box → SVG play/pause
  glyphs; (2) header split wasn't half/half (`.status` had no flex-grow) → `flex: 1 1 50%`;
  (3) `.gold` had no overflow clamp (5-digit treasuries could spill into the driver) → clamped;
  (4) `.playBtn` could bleed its label onto the chip when squeezed → overflow hidden;
  (5) `needsPulse` lacked the codebase's `prefers-reduced-motion` guard → added. Also folded:
  `aria-pressed` no longer announces "pressed" while the label reads "Needs you". Non-blocking
  accepted: header placement trades thumb reach for Stefan's explicit consolidation; safe-area
  inset gap is pre-existing (follow-up); landscape unverified.
- Verified: `tsc -b` + `vite build` green; **89 vitest pass**; headless @430×932 twice (before
  and after R#2 fixes): toggle 127×48 true half-split, chip cycle ▶▶→▶▶▶→▶→▶▶ width-stable,
  Play → "Pause" (aria-pressed true) → tap → "Play" (false) → run → "Needs you" → blocked tap
  stays latched + scrolls → report resolves → story → auto-resume "Pause"; bottom clearance
  194px; zero console errors, no h-overflow. Screenshots `docs/screenshots/canvas4-*` (incl.
  the lone-▶ slow-chip extreme).
- Open questions: none — Stefan's "Paused⏸️" label was rendered as "⏸ Pause" (action-label
  convention; the pressed-in style shows state), flagged here for his veto.

## 2026-07-10 - Board & report legibility v2 — PR opened (awaiting Codex)
- Gate: **merged 2026-07-10 19:34 +0200** (merge commit `8e2f3ce`; backfilled 2026-07-10).
  **PR #38 into `dev`**. Plan + both reviews + Codex (no findings) cleared. Process note, declared: Review #2 ran as TWO
  dual-persona agents (Designer+PX, Engineer+Adversary) covering all four §20 lenses — a
  session-length economy, not a skipped lens.
- Review #2 (on the DIFF): **5 blockers, all fixed** — (1) per-card popover state let TWO
  parchment notes stack (the kit's one-note contract assumes shared state) → one `info` state +
  one `InspectPopover` lifted to HallScreen; (2+3) two un-annotated Advance/Auto echoes remained
  in DESIGN.md and life.ts still said "dailyRate desc" (a claimed sweep that hadn't landed —
  §70) → all fixed; (4) Stefan's verbatim "green cat" quest-card mockup was missing from the
  challenge-v2 fold → restored word-for-word; (5) the working tree carried the fixes uncommitted
  (HEAD alone shipped the dual-popover bug) → committed. Also folded: the standalone backdrop
  swallow now arms ONLY when a dialog is actually open (it was eating the first tap after
  dismissing a Hall note — e.g. a Play press); scroll-to-Needs-you on the latching Play tap;
  brighter skulls; dead popover CSS pruned from HeroCard.module.css; the as-built paragraph's
  own stale comparator phrase.
- Engineer+Adversary verified: golden fixture beats byte-identical vs origin/dev (all 20 keys,
  mechanical diff) with hand-edited rewards confirmed by execution AND by hand; zero dailyRate
  refs in code; driver state machine matches the pinned spec (latch/auto-resume/tab-hide/always-
  live Pause, StrictMode-safe); playhead legible through the strongest tint (~0.64 vs 0.22 lum);
  20-day flat-economy probe −6.9..−12.5 g/day unbought (inside the band); forbidden dirs
  untouched. Designer+PX scorecard: all 11 of Stefan's round-2 asks verified in code +
  screenshots.
- Build-time catch (logged for honesty): the popovers initially white-screened —
  `e.currentTarget` read inside a deferred setState updater (the PR #27 lesson re-learned);
  caught by the headless walkthrough.
- Verified after fixes: tsc + build green; 89 vitest pass; headless full loop green (popover
  single-instance, Play→Needs you→story→layered meter "Triumph"→ledger-pointer outcome→latched
  auto-resume). Screenshots `docs/screenshots/canvas3-*`.

## 2026-07-10 - Board & report legibility v2 — build done (see PR entry)
- Gate: build (plan + Review #1 cleared; Review #2 verdicts in the PR entry above)
- Built as planned (sim commit `1a62d51` carries both sim+UI; assets in `21de1c0`): flat rewards
  (fixture reward/guildCut hand-edited, beat tuples byte-untouched — verified by an in-script
  machine-diff before write), skulls/daysLabel helpers + pinned tests, Play/Pause/Speed driver
  with the pinned state machine, kit-extracted Inspect popover (heroes/inspect.tsx is now a
  shim), layered check meter with playhead, grade ladder Botch/Poor/Success/Great/Triumph,
  result-first outcome, DESIGN.md amendments + Stefan's challenge-v2 spec folded.
- Build-time catch: the card-title popovers crashed white-screen on tap — `e.currentTarget`
  read inside the deferred setState updater (null by then; the exact PR #27 review lesson) →
  hoisted before the updater. Caught by the headless walkthrough, not review — noted for
  Review #2's attention.
- Verified: `tsc -b` + `vite build` green; **89 vitest pass**; headless @430px full loop: flat
  rewards + "1+ days" + skull rows, per-type detail, ⓘ popover open/dismiss, Play → auto-pause
  ("Needs you" label) → tavern decision → sealed story (layered meter, zones visible through
  the fill, playhead, "Great" tag, hero-named trait line) → brokerage-free outcome with the
  ledger pointer → LATCHED auto-resume after resolve → Pause. Zero console errors, no
  h-overflow. Screenshots `docs/screenshots/canvas3-*`.

## 2026-07-10 - Board & report legibility v2 (Stefan's 2nd play session) — plan done
- Gate: plan
- Branch: `claude/slice-living-canvas-843hho` (restarted off `origin/dev` after PR #37 merged;
  first commit = §50 backfill of #37).
- Stefan's forks answered directly: FLAT quest rewards (road 350g / ruins 700g / standing 25g;
  duration costs time only); driver becomes **Play/Pause/Speed** (no single-event Advance);
  the multi-hero/challenge-type redesign defers to its own slice via a DESIGN.md fold.
- Scope: sim (flat rewards + comparator re-pin, typeSkulls/questSkulls/daysLabel helpers, feed
  cleanup incl. tavern-perspective + hero-named trait cut-ins + de-articled challenge titles,
  SAVE_VERSION 4 semantic bump); UI (quest rows "350g · 1+ days · 💀💀" + per-type icon+skull
  detail, ⓘ→kit-extracted parchment popover, Play/Pause/Speed driver, story bar with zones
  visible through the fill + re-ranked colors + playhead tick + grade labels
  Botch/Poor/Success/Great/Triumph, two-row beat header, result-first outcome card without the
  brokerage line); DESIGN.md fold of the challenge-v2 / per-hero-bars / navigation / outcome-v2
  / economy-report sketches + the Time-paragraph amendment. Combat core untouched.
- Review #1 (4-persona, on the PLAN): 7 merged blockers, all folded — (1) bestPosting re-pinned
  as total-`reward` DESC, id ASC (heroes chase the number the board shows; the 7-day-purse
  pathology is ACCEPTED in writing and revisits with challenge-v2); (2) the Play state machine
  pinned: armed-through-decision-pauses with AUTO-RESUME on resolve (today's Auto semantics),
  hard-disarm on tab-hide, blocked state shows main label "Needs you" (label ≠ subtitle) and
  tapping scrolls to the Needs-you box, Pause dims via aria-disabled/data-attr; (3) golden
  fixture: NO recapture — hand-edit only the 20 reward/guildCut values (beats byte-untouched by
  construction; a recapture could launder rng drift); (4) helpers pinned: typeSkulls includes
  the bonus beat (dots-never-lie precedent), absent types omitted; questSkulls = max (standing
  1💀, road 2💀, ruins **4💀** — the killer guardian beat is what fails runs); daysLabel with
  the "1 day" singular (road AND ruins both read "1+ days"); (5) travel challenge icon =
  arrow_cross (flag_triangle already means "out on quest" in the same card); (6) the fill gets
  a 2px playhead tick + a crit-zone contrast check (a Triumph landing must not wash out in the
  gold tint); (7) DESIGN.md "Time" paragraph amended to play-primary + its three downstream
  echoes annotated + a §12 number-sheet pointer.
- Non-blocking folded: popover extracted from heroes/inspect.tsx into ui/kit (re-fighting its
  dismiss bugs forbidden; text-only, no X); `advance` dropped from GuildApi (sim keeps
  advanceUntilStop for tests); kit-side icon names for board glyphs (persisted IconName union
  untouched); shared localStorage-pref kit helper for both speed chips; day-1 feed keeps one
  informative seeded line ("two letters await takers" — not dawn bloat); outcome card gains the
  faint pointer "settled in tonight's ledger"; grade UNION untouched (labels only — persisted +
  fixture-pinned); stale-comment sweep (tuning +8g/day, life.ts comparator doc, ADVANCE_CAP
  event count ~9/day, quests/types reward docs).
- Adversary probes (10 seeds × 30 days, closed loop): flat economy needs NO retune — net/day
  −15.4 [−24..−10.8] unbought (was −19.1), no board rot (withdrawals 0.6/30d), wallet inflation
  +17% absorbed; pacing measured ~9 events/day → a watched day ≈ 8/4/2s at the three speeds;
  next slice's 7-day quests re-open the top-speed question (noted).
- Open questions: none blocking. SAVE_VERSION 4 wipes live saves (semantic pricing break, not
  shape — flagged for the PR body).

## 2026-07-09 - Hall & Story UX polish — PR opened (awaiting Codex)
- Gate: **merged 2026-07-10 13:20 +0200** (merge commit `08001b0`; backfilled 2026-07-10).
  **PR #37 into `dev`**. Plan + both reviews + Codex cleared. Codex (on `42f2cd7`, one P3,
  fixed in `9e807f2`):
  on the final beat mid-rise the button read "See outcome ›" while the handler correctly
  snapped — a label/behavior mismatch needing a confusing second tap → the label now follows
  the handler ("Skip the rise" mid-rise on every beat, including the last). Review #2 on the
  delta (self, one-ternary label fix): behavior unchanged and already reviewed; no new
  blockers. 88 tests + build green.
- Review #2 (4-persona, on the DIFF): **3 blockers, all fixed** — (1, Adversary+Engineer) a
  score-0 beat (REAL: ~4.4% of quests across a 100k-beat sweep — fail-cascade carry) animated
  width 0→0, `transitionend` never fired, the card soft-locked and Auto stalled forever → a
  fallback landing timer in BeatCard fires when the transition WOULD have ended (idempotent
  with transitionend; also covers mobile's unreliable transition events); (2, Designer) the
  gold "Next ›" button bypassed the landed gate and skipped the whole reveal mid-rise → it now
  snaps first ("Skip the rise") and only a landed press advances, same rule as the stage tap;
  (3, Designer) "leaves tomorrow" lied — a daysLeft-1 posting is withdrawn TONIGHT → "last day"
  / "withdrawn tonight if nobody takes it".
- Non-blocking folded: night refill no longer reposts a tier while a party is out on that very
  quest (the Quests card showed the same title twice ~30–50% of steps — now "the giver waits
  for word", + a regression test); ACTIVE tap-details give the exact rolled estimate (duration
  is public via the departure line); bonus-poor note made value-neutral (poor bonus adds
  nothing); Auto Fast hold 650→800ms so the prose gets read; meter aria announces "rolling…"
  until landed (don't spoil the rise for screen readers). Engineer independently re-proved the
  golden fixture by checking out the pre-change resolver and diffing 30,000 resolutions
  head-to-head: byte-identical except `score`. Adversary: withdrawal still fires 1–3×/30 days
  (rare texture as intended); speed-pref corruption never throws; Advance spam with a pending
  decision = 0 re-renders. PX scorecard: **all 10 of Stefan's items answered**; meter verdict
  "delivers" (Slow rise ≈1–3.5s reads as anticipation; zones legible at 430px).
- Noted for later: progress dots leak run structure up front (reveal-as-landed is a future
  polish); the beat card's empty lower half could hold portraits later; SAVE_VERSION 3 wipes
  live saves incl. Stefan's tavern run (policy discard-reinit — flagged in the PR body).
- Built (sim commit `fcc56b0`, isolated): `Beat.score` in the resolver — proven purely additive
  by the committed golden fixture (20 cases/62 beats from the PRE-change resolver; id/grade/
  roll/branch/outcome/reward/guildCut byte-identical); `questDifficulty` (1–5, critical-weighted);
  EXPIRY_DAYS 7 (+ night-7 withdrawal test); SAVE_VERSION 3.
- Built (UI): StoryStage **check meter** — 5 tinted grade zones (tint+tick, no labels; landed tag
  carries the word; role="meter" aria), constant-RATE fill (duration ∝ score) starting 500ms
  after mount, staged reveal (tag pop → narration/trait fade), tap-mid-rise snaps / landed tap
  advances, Auto hold counts from fill-END, one cycling Slow/Normal/Fast chip persisted as
  `guild.ui.storySpeed` (lazy + try/catch); context-aware effect notes in a pure `storyText.ts`
  (+5 unit tests: no "next check" claims on final/bonus/recovery beats). Hall: lone-meeple
  (`hero` glyph) for solos; Quests card (OPEN + ACTIVE rows with stable-id tap-details reading
  only quest defs + public assignment fields, ★1–5 on the summary, expiry only as "leaves
  tomorrow", ⓘ explainer behind the 44px title row); Buildings card (Guild Hall + Tavern, new
  flavor copy + visible earn hint + runway consequence, READY chip gated on shownGold);
  Advance/Auto verbs contrast ("skips ahead…" vs "watch it play"), Advance no longer flips DOM
  `disabled` under the finger (aria-disabled + dimmed data-attr; sim no-op already pinned) and
  every Hall/Story control gets `touch-action: manipulation` — the haptics mitigations (root
  cause unconfirmed; Stefan retests).
- Verified: `tsc -b` + `vite build` green; **87 vitest pass** (12 new). Headless @430px: stars,
  quest tap-detail with brokerage math, ⓘ toggles, active-row gold border, READY chip, meter
  zones + rising fill + snap + landed tag/note/narration + single-tap advance + speed cycling,
  no h-overflow, no console errors. Screenshots `docs/screenshots/canvas2-*`.

## 2026-07-09 - Hall & Story UX polish (Stefan's play feedback) — plan done
- Gate: plan
- Branch: `claude/slice-living-canvas-843hho` (restarted off `origin/dev` after PR #36 merged;
  first commit = §50 backfill of #36's merged gate; remote branch had been auto-deleted →
  recreated on push).
- Scope declared: the 10 play-feedback items — lone-hero meeple (new Kenney `pawn` glyph, own
  asset commit), Advance/Auto copy contrast, quest difficulty ★1–5 replacing "Type-heavy",
  board card → "Quests" with OPEN + ACTIVE (UI-derived from assignments, quest-led rows),
  explainers behind tap-the-title (44px row + chevron), EXPIRY_DAYS 3→7, tavern flavor copy
  (+ 5-word earn hint stays visible), Investments → Buildings card with a "Ready" chip gated on
  shownGold, haptics mitigation (no DOM `disabled` flip under the finger — aria-disabled +
  dimmed data-attr; sim no-op already pinned), tap-a-quest detail (types+dots, reward math,
  giver, expiry — sealed log never read), and the **story check-bar**: additive `Beat.score`
  (0–100) computed in the resolver from the existing ratio, grade-owned zones (fail [0,20)
  poor [20,40) ok [40,65) good [65,90) crit [90,100], bands lo→hi with fail lo=0 and crit
  synthetic hi=2.0, zone-safe rounding), animated zone meter in StoryStage, speed as ONE
  cycling chip (Slow/Normal/Fast, `guild.ui.storySpeed` localStorage, lazy+try/catch).
  SAVE_VERSION 3 (v2 saves — including Stefan's live one — discard-reinit per policy; flagged).
- Review #1 (4-persona, on the PLAN): 9 merged blockers, all folded — (1) constant fill RATE
  (duration = score/100 × base), not constant duration, so the bar's stop stays unknown;
  (2) stage the card: type/location → bar → grade tag → narration+trait fade (reduced-motion:
  snap); (3+) effect notes context-aware — no "next check" claims on final/bonus beats,
  recovery gets true copy (a good recovery still carries −1), fail note generic enough to
  survive a non-critical last-beat fail before a success card; (4) score formula pinned exactly
  (incl. negative-ratio clamp + rounding that can't escape the zone); (5) golden fixture from
  the PRE-CHANGE resolver committed as a regression test (20 cases/62 beats incl. recovery +
  bonus; asserts id/grade/roll/branch/outcome/reward/guildCut byte-identical — catches any
  extra rng draw or boundary flip); (6) zone labels don't fit 430px → tint+tick only, landed
  grade tag carries the word, role="meter" aria; (7) tap-during-fill = snap-to-result, only a
  landed tap advances; auto-delay counts from fill-end (Auto+Slow can't skip the show);
  (8) Advance/Auto copy contrasts on the verb ("skips ahead…" vs "watch it play, hands-free");
  (9) one cycling speed chip, not a segmented control.
- Non-blocking folded: fill starts ~500ms after mount; expiry moves into tap-detail (summary
  only when "leaves tomorrow"); OPEN above ACTIVE, one-line active rows; whole title row is the
  info tap target; "Ready" chip not a bare "!"; stable-id expansion state; sim change isolated
  in its own commit; stale "(~3)" comment fixed; EXPIRY test (park parties, withdrawal fires
  night 7); crit-zone anchor 2.0 pinned in the monotonicity test; duplicate-title active/open
  distinction carried by the gold border + party line.
- Open questions: none blocking. Haptics root cause unconfirmed from here (device tap-feedback
  suspected) — mitigations ship, Stefan retests on the preview.

Format per entry:
## YYYY-MM-DD HH:MM - <short scope>
- Gate: plan | build | PR | codex-fixed | merged
- Branch:
- Files touched:
- Review verdict: blockers found / fixed
- Open questions:

## 2026-07-09 - Slice: the living canvas — PR opened (awaiting Codex)
- Gate: **merged 2026-07-09 21:42 +0200** (merge commit `7c4c135`; backfilled 2026-07-09).
  **PR #36 into `dev`** (branch `claude/slice-living-canvas-843hho`). Plan + both reviews +
  Codex (two P2s fixed) cleared.
- Codex (on `2d4c2ac`, two P2s, both fixed): (1) **unread nightly ledgers were exempt from
  MAIL_CAP** — a Hall-only player who never expands ledger rows accrued one untrimmable mail per
  night (300 @300 days) → the cap now trims read mail first, then unread LEDGERS oldest-first;
  an unread sealed outcome is never dropped (+ regression test). (2) **Advance rolled past
  already-pending decisions** — it only stopped on NEW ones, so nightfalls could pile up behind
  an unresolved "Needs you" → `advanceUntilStop` returns immediately (same state reference, so
  React bails and nothing autosaves) when any undone decision exists, and the Hall disables the
  button with "answer what needs you first" (+ regression test: pressing Advance while pending
  is a strict no-op). Re-ran Review #2 on the delta (self, proportionate): trim order preserves
  the newest ledger (Hall runway) and every sealed story; the early-return preserves purity;
  Auto's effect guard already held — no new blockers. 77 vitest pass; build green; headless
  walkthrough re-run end-to-end (the guarded Advance doesn't wedge the loop).
- Review #2 (4-persona, on the DIFF): **5 blockers, all fixed** — (1, Designer+Adversary) the
  sealed payout was back-solvable through LATER nights' ledgers (day-4 endGold + visible day-5/6
  lines − day-6 endGold = the hidden cut) → every ledger from the earliest sealed day on withholds
  its tally, and the Tavern-takings amount masks while pending (the decompress spend sizes the
  reward); (2, Engineer) the tavern proposal gated on RAW gold, so "it's affordable now" could
  announce a sealed success → gates on `displayedGold` + a regression test; (3, Designer) the §12
  dormancy amendment claimed in the build entry had silently not applied (replace-miss) → applied
  for real (§70 lesson: grep the doc, don't trust the script's exit); (4, PX) the runway note
  counted one-off construction as daily burn ("gold lasts ~2 days" the night of the big buy) →
  runway projects recurring movements only (`oneOff` ledger flag); (5, PX) a stale screenshot
  showed the pre-fix decision double-nag → retaken from the fixed build.
- Non-blocking folded: done decisions become feed-trimmable (Adversary's 300-day probe showed
  decision stubs alone exceeding the cap ~day 350); conservation test now covers construction;
  empty-queue reseed also revives idle parties (corrupt-save "alive-looking softlock");
  `Posting.questId` (tier==id was a coincidence); locale-proof comparators; persist guards for
  seq/rngSeed/gold counters (NaN-id class); honest missed-posting wording; Report badge counts
  unwatched stories only (was +1/day ledger creep); Auto shows "Paused" while something needs
  you; 44px tap targets; Advance sub-label "until something needs you"; behavioral outcome-tell
  (a broke failed party marches straight back out) owned in DESIGN.md as diegetic texture.
- Adversary long-run probes (4 seeds, 60/200/300 days): unbought ≈ −17g/day (~50-day runway, the
  tavern is the visible lever); post-tavern ≈ +100g/day and unbounded (accepted — slice 2's
  building/gear menu is the counter-sink); world alive at day 60 (queue bounded at 4, road job
  taken on every seed, wallets oscillate 893–2,225 total); save blob ≤ ~173KB (quota-safe).
  Accepted/noted: unread mail is never trimmed (never-open player grows the archive slowly);
  deep-negative shownGold messaging for a never-open player.
- Verified after fixes: `tsc -b` + `vite build` green; **75 vitest pass**; headless walkthrough
  re-run on the fixed build (screenshots refreshed).
- Open questions: none blocking. Next: Codex gate → merge gate.

## 2026-07-09 - Slice: the living canvas — build done (Review #2 done, see PR entry)
- Gate: build (plan + Review #1 cleared; Review #2 on the diff ran after — verdicts in the PR
  entry above)
- Branch: `claude/slice-living-canvas-843hho`
- Built: `web/src/game/guild/` restructured — new `clock.ts` (event queue on integer sim-ticks,
  4/day, pinned order night-last, pure handlers decide/finish/return/night, `advanceUntilStop`),
  `life.ts` (wallet-motivated rest/train/quest + forced decompress), `tuning.ts` (all knobs);
  `endDay.ts` deleted (economics moved into `night`); SAVE_VERSION 2. New `web/src/ui/hall/`
  (clock header + masked treasury, party strip, read-only board card, invest card, 3-register
  feed with pinned "Needs you", Advance + Auto 1×/3×, StoryStage overlay); `ui/board/` deleted;
  kit `Icon` (Kenney Board Game Icons, CC0, mask-tinted — committed in their own commit);
  GuildContext rewritten; Report/StoryStage lightly adapted (archive role, brokerage wording);
  PartyCard mock location/plan lines neutralized. All 16 Review #1 blockers landed as specced
  (displayedGold masking, standing-quiet, spend clamp, handler guards, pinned comparator,
  night-flushed takings, staggered wallets 90/45/20, gated proposal, feed streaming, one-tap
  story from the Hall).
- Verified: `tsc -b` + `vite build` green; **74 vitest pass** (31 guild tests incl. purity,
  determinism, night-last ordering, conservation identity, sealed-display masking,
  standing-quiet, proposal gating, stale-event guards, caps, full-day-under-cap, persistence
  reinit). Headless Chromium @430px: fresh hall → Advance → return decision auto-pause → sealed
  story → outcome → tavern proposal → build → capture lines → refresh resumes → Report archive;
  no h-overflow; only the known art-CDN 404. Screenshots `docs/screenshots/canvas-*`.
- DESIGN.md reconciled: §12 appetite-dormancy amendment, slice-1 as-built block, the slice-2
  R2-successor kill-test (≥ +40g/day informed-vs-blind) written into guardrail #2, Kenney
  adoption note; docs/kenney.md + CREDITS.md updated.

## 2026-07-09 - Slice: the living canvas (clock · daily-life · Hall Feed · tavern) — plan done
- Gate: plan
- Branch: `claude/slice-living-canvas-843hho` (first commit: §50 backfill of PR #35's merged gate).
- Scope declared: restructure `web/src/game/guild/` — new `clock.ts` (event-queue on integer
  sim-ticks, pure handlers) + `life.ts` (autonomous rest/train/quest daily-life + hero wallets);
  `endDay.ts` deleted (its economics move into the `night` handler); SAVE_VERSION 2. New
  `web/src/ui/hall/` living-canvas screen replaces `ui/board/` at `#/guild` (BoardScreen + the
  player-set cut retire per the pivot). Kit `Icon` + Kenney icon assets (CC0), GuildContext
  rewrite, ReportScreen minor, HeroesScreen mock activity/intent lines neutralized, DESIGN.md /
  kenney.md / CREDITS.md. Combat core untouched (D1a stays dormant); resolver/seed/persist/
  StoryStage/Assignment seal-reveal reused.
- Review #1 (4-persona, on the PLAN): 16 merged blockers, ALL folded into the plan before build —
  (1) live treasury/wallets would leak the sealed outcome at the return tick → sim credits at
  return but a pure `displayedGold()` masks every always-on gold surface until the envelope opens,
  and ambient lines never print amounts; (2) standing-job returns are ambient+ledger only (no
  sealed mail / auto-pause — Mira must not spam decisions); (3) spend clamp
  `min(wallet, max(min, pct·wallet))`; (4) per-handler precondition guards (stale events no-op,
  queue never starves); (5) quest comparator pinned (dailyRate desc, id asc) + fame roll picks any
  eligible posting (road never rots); (6) `advanceUntilStop()` is a pure sim export (one
  commit/autosave per Advance; the 50-event cap is sim-testable); (7) within-tick order pinned
  (tick, type-rank with night LAST, ord); (8) MAIL_CAP trimming read mail only; (9) GuildContext
  added to declared scope; (10) DESIGN §12 amended — appetite machinery dormant this slice,
  returns with slice-4 variable terms; (11) staggered starting wallets (90/45/20) so minute one
  shows the full behavioral vocabulary + tavern proposal gated on day≥2 and visible village-sink
  lines; (12) read-only postings card in the Hall; (13, folded into 11); (14) Hall firstDay coach
  line; (15) current day's feed expanded + streaming, past days collapse; (16) the return decision
  item opens StoryStage directly over the Hall (Report stays the archive).
- Non-blocking folded: finish-only narration, "Auto" naming (not a second "Play"), tavern
  "Not yet" dismiss + consequence line ("leaves Xg ≈ N days' upkeep"), party-strip change pulse,
  registers as row treatment + icon budget on activities/tavern/gold, outcome-agnostic return
  wording, persisted dayTakings, visibilitychange pause, full-day-under-cap test, faded-expander
  note, guardrail #5 explicitly deferred + post-tavern overcorrection noted as slice 2's hook.
- Open questions: none blocking. Straw numbers (ratios are the design): TICKS_PER_DAY 4,
  BROKERAGE 10%, NEED_GOLD 60, rest 15%/min 5g, train 20%/min 8g, TAVERN 400g, FEED_CAP 150,
  MAIL_CAP 120. Design Q1 (wallet/spend model) and Q2 (R2-successor kill-test written now, live at
  slice 2; this slice's tavern is knowledge-free by design) resolved in the plan.

## 2026-07-09 - Redesign: pivot the core to the living-guild vision (DESIGN.md)
- Gate: **merged 2026-07-09 20:26 +0200** (merge commit `7b2def2`; backfilled 2026-07-09).
  **PR #35 into `dev`** (branch `claude/slice-1-planning-2qni0b`, restarted off `origin/dev`
  after PR #34 merged). Docs-only. Plan + both reviews + Codex (P3 fixed) cleared.
- Why: on playing merged Slice 1, Stefan found the per-quest **cut** decision "felt odd" and
  clarified a bigger pivot. New core (DESIGN.md "The living guild" section, now leading the doc):
  player = a **businessman** (fame/influence/wealth) running a **living world** of autonomous
  heroes who live their lives and quest; he never commands, he **invests in Majesty-style building
  & gear upgrades at fixed prices** (no cut-%, no price-fiddling); income = **hero spending** (main)
  + flat ~10% brokerage + building passive; a **skip-primary living clock** (event-queue that reuses
  the seal/reveal + seeded-RNG + persistence backbone, restructures the daily loop); a collapsible
  **Hall Feed**; **Kenney icons** for clarity; loss layered after the canvas; **five kill-test
  guardrails**. Board/resolver/report survive as scaffolding; combat core untouched.
- Files: `docs/DESIGN.md` (new vision section + pivot notes on §1/§2/§3/§8/§9/§12 + re-sliced
  "How we build": canvas → businessman's hand → tension), `PROGRESS.md`. First commit this branch
  was the §50 backfill of **PR #34's** merged gate.
- Design pass = a **four-perspective** divergent analysis (Designer, Phone-UX, Engineer, Adversary)
  on the pivot; its synthesis (reframe-don't-delete the priced decision; entangle life+economy;
  skip-primary clock; Hall Feed not animated map; keep governors) is the plan, approved by Stefan.
- Review #2 (2-lens on the DIFF — consistency + accuracy-vs-code; proportionate to a docs diff the
  4-perspective pass already deeply shaped): **7 blockers, all fixed** — (1) hero-spending main
  income was undefined + contradicted §12 "wallets not tracked" → defined + superseded; (2) §2/§8/§9
  still asserted the cut as income core → pivot notes added, §8 Cash row rewritten to the
  upgrade-vs-spending clock + the over-invest→bankruptcy path; (3) Slice 1 was decision-less
  ("economy stubbed") → now ships one fixed-price investment so the canvas responds to the player
  (guardrails #1/#3); (4) the upgrade "read-driven bet" had no read system → Slice 2 activates the
  dormant CV certainty chips so it's knowledge-priced (guardrail #2); (5) "Kenney icons already
  ship" overstated (only the border frame shipped) → corrected; (6) "resolver reuse" vs a reactive
  mid-quest clock contradicted → resolution note: near-term = sealed-at-dispatch (resolver reused),
  reactive in-flight steering is a later flagged resolver change; (7) "generalizes not rewrites"
  flattered a real restructure → softened. Non-blocking folded: a **5th guardrail** (allocation
  stays a tradeoff), the equip target defined + tied to retention/poaching, and the R2-payoff caveat
  (cut-based, retires — the upgrade bet's knowledge→gold is a to-prove). Accuracy lens **confirmed**
  the Assignment/seed/persist reuse claims against the code.
- Open questions: none blocking. Next: `@codex review` → codex gate → merge gate. Then build
  sessions start at the **living canvas** slice.

## 2026-07-08 - Slice 1: the thin closed loop (board · cut · quests · report)
- Gate: **merged 2026-07-09 09:55 +0200** (merge commit `0d5c831`; backfilled 2026-07-09).
  **PR #34 into `dev`** (feature branch `claude/slice-1-planning-2qni0b`). Plan + both reviews +
  Codex (two P2s fixed) cleared.
- Scope: the first playable guild loop (§12 reshaped in this planning interview). New pure sim
  `web/src/game/guild/` (types, seed, roster, quests, resolver, board, state, endDay, persist) +
  new UI `web/src/ui/{guild,board,report}/` + nav/roster edits. Combat core (`web/src/game/battle/`)
  and art pipeline untouched (consumed read-only; D1a seam left unused).
- What it does: 3 fixed parties bid on a board of 2 scarce postings (road + Ruins) plus always-up
  standing jobs. The **cut dials WHICH party** takes a scarce quest via anti-correlated ask⟂quality,
  awarded to the best-fit bidder — 30% → Free Blades take the Ruins (medium, ~67% success); drop to
  ≤~24% → the strong Iron Vigil (verified 300/300 @20, 0/300 @30 — a crisp, always-available read).
  Rich multi-beat quests resolve as graded skill-vs-diff rolls (inter-beat modifiers, forced-branch
  recovery, trait cut-ins, optional bonus beat; no engine call). End Day runs the §12 tick behind a
  night beat → Report of **sealed** outcome envelopes that withhold the result until opened as an
  animated story stage. Cash clock visible (treasury, itemized ledger, runway); debt/charter defined
  but unwired. localStorage persist with corrupt/version → reinit. New hero Wren Ashdown; 6 heroes /
  3 parties.
- First commit: §50 backfill of PR #31/#32 merged gates (separate `chore(progress)` commit).
- Review #1 (4-persona, on the PLAN): 7 blockers folded pre-build — economy re-derivation
  (anti-correlated asks, reward×duration, standing pay < idle burn), endDay assignment order,
  module-boundary inversion, deterministic seed derivation, persistence guard, story-stage vs
  horizontal scroll, teaser-envelope + card hierarchy. Non-blocking adopted (locked-CV framing,
  §2/§4 sequencing-only, unknown-appetite + noise-thresholded eager, first-run coach + out-party
  progress chip, declared nav scope, 4-attr beat map).
- Review #2 (4-persona, on the DIFF): 7 blockers, all fixed — (1) ledger spoiled the sealed story
  → returning-quest cut masked until the envelope is opened; (2) refilled postings were locked at
  30% (`makePosting` lastRevisedDay) → revisable on arrival day; (3) "eager" chip could lie →
  threshold tightened to maxAcceptedCut − 2·NOISE; (4) Iron Vigil anchor too near the cut floor on
  low-offset runs → RUN_ASK_BAND ±5→±2 so the strong party is always lurable at cut 20 and never
  bites at 30; (5) story beat floated in dead space → top-aligned + tap hint; (6) DESIGN §6/§12
  still named the road job as the floor + stale idle-net → reconciled to standing jobs; (7)
  no-blocker from Engineer (combat core untouched, sim pure/deterministic — verified). Non-blocking
  folded: unmount-safe night timer, save-out-of-updater, road-bonus dead code, persist
  knowledge/askRunOffset guard, no-takers-when-busy mislabel, dots primary-type label, board
  bottom padding, strengthened tests.
- Verified: `tsc -b` + `vite build` green; **68 vitest pass** (26 new incl. endDay purity/determinism,
  assignment order, anti-correlated award, appetite-never-lies, persistence corrupt/version → reinit,
  UI↔sim attribute parity). Headless Chromium @430px walks board → cut → End Day → sealed Report →
  masked ledger → animated story → outcome payoff; refresh resumes; no horizontal scroll; only the
  known art-CDN 404. Screenshots `docs/screenshots/slice1-*`.
- DESIGN.md: §12 "Slice 1 as built", §9 standing jobs, §10 Slice-1 beat vocabulary, §2/§4 sequencing
  note, new "Scramble" parked pillar (+ the lich's-tomb race, exclusivity research), other parked
  ideas (investigate lever, hero downtime/nudge, recruitment).
- Open questions: all tuning numbers are straw defaults (ratios are the design). Next: `@codex review`
  → codex gate → merge gate.

## 2026-07-06 - Kenney frame + Asset Report palette/button foundation
- Gate: **merged 2026-07-06 22:40 +0200** (merge commit `fc488b2`; backfilled 2026-07-08). **PR #32 into `dev`**.
- Codex (on head `b85cdf3`): "Didn't find any major issues." No fixes needed.
  No PR-level CI on this repo (deploy triggers on push to main/dev only); UI-only.
- Branch: `claude/kenney-ui-foundation` → PR into `dev`.
- Scope: visual foundation aligning the guild UI to the "Asset Report" key art.
  Additive/UI-only; combat core, LPC pipeline, and art pipeline untouched.
- Files touched: new `web/src/ui/kit/Panel.{tsx,module.css}` (Kenney 9-slice frame)
  + `kit/index.ts`; `web/src/assets/kenney/fantasy-ui-borders/` (CC0 sprite+license)
  and `web/src/assets/brand/asset-report-key-art.jpg`; `theme/tokens.css` (warm
  surfaces/strokes/bars, soft-gold button tokens, teal `--cv-*` certainty accent);
  `StartScreen.{tsx,module.css}` (key-art bg + kit-Button menu); `kit/Button.module.css`
  (soft-gold default); `combat/Controls.module.css` (.primary retint only);
  `heroes/{PartyCard,HeroCard,HeroesScreen}.*` (frame, de-purple, Sway→Button);
  `node/NodeTestScreen.module.css` (map contrast); `styles.css` (body bg);
  `public/CREDITS.md`; `docs/kenney.md`; `docs/screenshots/*`.
- Review #1 (4-persona, on the plan): blockers fixed pre-build — scope excludes the
  certainty sheet from the skin, assets committed (no build-time fetch), Panel
  graceful fallback, one framed level per view, dark-only tokens, assembled panel
  PNG pinned for border-image.
- Review #2 (4-persona, on the diff): **no blockers.** Keystone survives the teal;
  build/tsc/42 tests green; forbidden dirs untouched; offline build + colorblind-safe.
  Non-blocking polish applied: Start button hierarchy, map node contrast, certainty
  label a11y + single-hue hatch, dropped an unused token, compressed screenshots.
- Open questions: none blocking. Combat Test's selected-chip purple (`--c-royal`)
  left intentionally (sprites + verified chip); optional full de-purple is a follow-up.

## 2026-07-06 - §50 merged-gate backfill rule
- Gate: **merged 2026-07-06 02:09 +0200** (merge commit `2eb2be3`; backfilled 2026-07-08). **PR #31 into `dev`** (Codex on `28884e4`: no
  findings — nothing to fix)
- Branch: `claude/economy-quest-fees-jto58v` (designated session branch, restarted from
  `origin/dev` at `d70b6ee` after PR #30 merged) → PR #31 into `dev` (docs-only; no PR-level CI
  on this repo)
- Scope: **§50 now defines the merged gate as a backfill** — GitHub PR state is authoritative;
  every new branch starts with `git fetch origin`, then idempotently backfills all missing merged
  gates (PR #29 and later; older history grandfathered) as a separate `chore(progress)` first
  commit, updating the existing entry's Gate line in place with merge data read from the fetched
  history; read-only sessions defer their entries the same way. Why: §50 demanded a merged entry
  at merge time while §80 forbids commits to `dev` without a PR — and the session was in plan
  mode when PR #30 merged; the standard demanded a commit it also forbids. Exercised immediately:
  PR #29 and #30 both backfilled in this PR.
- Files touched: `CLAUDE.md` (§50 + four sub-bullets), `PROGRESS.md` (PR #30 backfill + this entry).
- Review #1 (4-persona, on the plan): 5 blockers, all fixed in the rule text — (1) idempotent
  backfill-all-missing procedure (kills duplicate races and the who-logs-the-logger regress);
  (2) update Gate line in place, not a new dated entry (preserves phone chronology); (3) backfill
  data verified on GitHub/`origin/dev`, never memory, with an explicit "(backfilled)" marker;
  (4) §60 exemption by name + separate conventional commit + promotion-PR exclusion; (5) stale
  local `origin/dev` caught — fetch + verify merge commit added as verification step zero.
  Non-blocking folded: authoritative-record sentence, eventual-consistency wording, this PR's own
  merged gate deliberately left as the demonstrating one-entry lag.
- Review #2 (4-persona, on the DIFF): 3 blockers, fixed — (1) rule text now mandates `git fetch
  origin` before verifying (the PROGRESS entry claimed it; the doc didn't say it); (2) the rule's
  own first run violated the rule: PR #29 is merged but its Gate line still said "awaiting merge
  decision" — now backfilled alongside #30; (3) "all missing merged gates" gained a cutoff (PR
  #29+; older multi-entry history grandfathered) so the next branch's first commit can't balloon
  into a 28-PR archaeology dig. Non-blocking folded: first bullet says "merged is backfilled — see
  below", plural commit-message form, always-in-scope covers §10's declared scope too, backfill's
  place relative to The Loop stated, §50 rationale trimmed to imperatives, "becomes" instead of
  nested arrows, time+offset on midnight-straddling merges, this entry re-led bottom-line-first.
- Open questions: none.

## 2026-07-05 - Economy: the board, the cut, the clock — plan + build
- Gate: **merged 2026-07-06 00:41 +0200** (merge commit `d70b6ee`; backfilled 2026-07-06).
  **PR #30 into `dev`**.
- Codex (P1 on `2001a87`, the only finding): quest-cycle downtime broke the road floor — with
  acceptance at end-day N, payout at N+1, and replacement letters only after *completion*, a
  cycle took 2 days, halving throughput (+6g/day floor was really ~−16g/day). Fixed as Codex
  suggested: a quest's replacement letter now triggers when the quest is **taken** (leaves the
  board), so a replacement is postable while the party is out and — payouts preceding acceptance
  rolls in the tick order — the returning party re-takes the same night. Back-to-back workdays;
  the stated EVs hold. Re-ran Review #2 on the one-bullet delta (self, proportionate): tick
  order, take-beat timing, failure identity all consistent; letter buildup bounded by the
  two-failure withdrawal; no new blockers.
- Note: no PR-level CI on this repo (deploy.yml + android-apk.yml trigger on push to `main`/`dev`
  only); docs-only diff, nothing to build.
- Branch: `claude/economy-quest-fees-jto58v` → PR into `dev` (docs-only)
- Scope: fold the Slice 1 economy decided in the design chat into `docs/DESIGN.md`. Decisions
  (Stefan, 2026-07-05): **posting fee is dead** — quests come to the guild as letters, the board
  is free, and the **player-set cut** (base 30%, −10/−5/+5/+10 → 20–40%) is the priced decision;
  gold scale 1,000g start; two quests (road job 200g = survival, Ruins 600g = growth); failure
  consequences phased (Slice 1: story-based quest reaction; slice 3: fame/relation; slice 5:
  influence; boss-tier: permadeath — locked note); givers-come-to-guild framing.
- Files touched: `docs/DESIGN.md` (new §12 economy section; reconciling edits to §3 lever 1, §5
  asking-price line, §8 cash-in-detail, §9 economy para, Ideas parked ×2, Next-up Slice 1),
  `PROGRESS.md`.
- Review #1 (4-persona, on the PLAN): 7 merged blockers, all fixed in the spec before building —
  (1) acceptance model pinned (hidden per-party ask + daily noise, one roll per end-day, anchors
  at 20/30/40% so no cut dominates blind); (2) §3/§5 "ask is known" reconciled (hiring ask public,
  quest-split appetite hidden); (3) Slice 1 knowledge source named (observation brackets + free
  report lines — no dependency on slice 2/5); (4) quest refresh cadence defined (next-morning
  letter, road-tier always on offer = unstick floor at base cut); (5) resolution model specced
  (one fixed party of 3, 1-day quests, better-share stub); (6) loan de-ratcheted (flat 5%/day on
  principal, one per run, worked comeback math); (7) visibility mandated (itemized end-day ledger
  + runway line; rot/no-takers days always produce mail). Non-blocking folded: tick order,
  Ruins-specific squeeze label, failure pay-bump bounds, cut revisable once/end-day, curation
  honestly labeled a Slice 1 no-decision.
- Review #2 (4-persona, on the DIFF): 6 blockers, all fixed — (1) road job success ~85% now in
  the number sheet (3 personas caught the omission); (2) end-day tick order completed (cut
  revisions → payouts → acceptance rolls → trickle → upkeep → interest → force-repay → loan →
  insolvency check) and take/resolve/payout timing pinned (accept night N, out day N+1, payout
  night N+1 — a take is its own mail beat); (3) appetite chip reworded eager/might-pass/won't-bite
  (QA-UX: "risky" collided with quest danger; no third "?" marker); (4) "no setting dominates
  blind" claim was false on our own anchors — reworded to "blind play is base-optimal by design;
  deviation pays only with knowledge" (that IS the R2 shape); (5) failed-quest identity pinned
  (same letter returns, failure count + pay bump persist, expiry resets); (6) ask band ±5
  cut-points per run + ±2 daily noise straw numbers added. Non-blocking folded: squeeze labeled
  per-completed-Ruins-day gross, "roughly two" successes clear debt, §6 unstick → §12 pointer,
  contract cut = hero default/floor with posting buttons surviving, free report lines capped
  occasional, slice-2 residual ~4-point band to sell, strict <0 boundary + force-repay wording,
  Slice 1 treasury chip (gold + runway) pinned on header, rot day = idle net not a fee, positive
  runway wording.
- Open questions: none blocking; all numbers are straw defaults (ratios are the design).

## 2026-07-03 - Part B: Parties-primary Heroes view
- Gate: **merged 2026-07-04** (merge commit `382e09b`; backfilled 2026-07-06). PR #29 into `dev`.
- Codex (P2 on `7b64daf`, the only finding): Brok & Pell render inside "The Free Blades" but had no
  `scope:"party"` bond, so `BondsTab` (which builds the "Their Party" card from party-scope bonds)
  showed no party card when you tapped them — inconsistent with Iron Vigil. Fixed by adding matching
  party bonds in `mockHeroes.ts` (Brok +42 boss, Pell +26), mirroring Ysolt/Doran — NOT by coupling
  the untouched HeroCard to PARTIES. Re-reviewed the 2-line delta (self, proportionate): valid Bond
  shape, in-range valence-positive scores, no double party membership; no new blockers. Verified
  headless @430px: Brok's Bonds tab now shows the "Their Party" card. Build + 42 tests green.
- Branch: `claude/parties-primary-heroes-view-glyo4q` (restarted off `dev` after Part A / #28 merged)
- Scope (additive): NEW `web/src/ui/heroes/mockParties.ts`, `PartyCard.tsx`, `PartyCard.module.css`,
  `mockParties.test.ts`; MODIFIED `HeroesScreen.tsx`, `HeroesScreen.module.css`, `mockHeroes.ts`
  (status reconcile only), `docs/DESIGN.md` (§6 note). Combat core + art pipeline + HeroCard/inspect
  untouched (the existing hero Sheet is reused as-is).
- What it does: the roster now leads with PARTIES (§6) — 2 mock parties, each a bordered card that
  WRAPS its members: name, an observed "In {location} · {activity}" line, a 2×2 value grid
  (Fame/Cohesion/Morale 0–100 meters + a Rating), a "Guild estimate" caption, a "Plans to {…}"
  intent line, members inside (boss-first + crown, ★rating, per-member mood dot), and a DISABLED
  "Sway the boss" (soon) lever. Then a "Without a party" section (Mira, solo). Tapping any hero
  opens the existing tabbed Sheet. Mock: Iron Vigil = Ysolt(boss)+Doran; Free Blades = Brok+Pell;
  solo Mira. (5 heroes → 2×2-person parties + 1 solo; "a couple of solo" approximated to one to
  reuse all five bond-consistently — tunable.)
- DESIGN mapping: Fame→§5/§7 track record, Cohesion→§6, Morale→§8 (also per-member so an at-risk
  hero like Pell isn't hidden by the average), Rating→§5 certainty-WEIGHTED CV aggregate.
- Review #1 (4-persona, PLAN): many blockers, all folded before build — certainty laundering of the
  rating (exclude rumor + estimate framing), per-hero retention hidden by a party mean (per-member
  mood dot), omniscient "plan"/location (reframed as the party's own intent + observed report),
  wrong "Influence" lever (→ "Sway the boss", §6), SOLO must subtract boss∪members + NaN/id guards,
  4-value legibility + label confusion + boss★ collision (2×2 + icons + crown, renamed
  Cohesion/Morale). Reconciled mock hero statuses so members agree with the party line.
- Review #2 (4-persona, DIFF): 1 blocker fixed — (Designer) the rating excluded rumor but folded
  CLAIMED stats at full weight and called them "trusted", contradicting §5 → made it a certainty-
  WEIGHTED mean (verified ×1, claimed ×0.5, rumor excluded), clamped 0–5, relabelled
  "certainty-weighted CVs", and corrected the §6 note + §5/§7 citations. Engineer/Adversary/
  Player-exp: no blockers. Folded non-blockers: meter value clamp, amber mood-dot ring/gap vs the
  star, cohesion-comment scope. Documented (non-blocking): mood colour cue is also in the accessible
  name (colourblind text-cue = future polish), boss∈members enforced by test not runtime.
- Verified: `tsc -b && vite build` green (93 modules); 42 vitest pass (6 new mockParties guards incl.
  the §5-weighting test); headless Chromium @430px — 2 party cards, header "2 parties · 5 heroes",
  boss crown, weighted ratings (Ysolt 3.8 / Doran 2.8 / Brok 3.6 / Pell 2.4), Pell amber "unsettled"
  dot, disabled "Sway the boss", Mira in "Without a party", NO h-overflow, member+solo taps open the
  correct Sheet, no page errors. Screenshots `docs/screenshots/partB-*`.
- Open questions: solo count (1 vs "a couple") is the 5-hero-reuse constraint; party values are
  tunable mock defaults. Next: PR into `dev` → @codex → merge gate.

## 2026-07-03 - Part A: hero-sheet interaction fixes
- Gate: merged — PR #28 into `dev` (Codex reviewed `ffedb3c`, no issues).
- Branch: `claude/parties-primary-heroes-view-glyo4q` (off `dev`)
- Scope (additive): `web/src/ui/heroes/inspect.tsx`, `HeroCard.tsx`, `HeroCard.module.css`,
  `docs/DESIGN.md` (one UI-principle note). No combat core / art pipeline touched.
- What changed:
  1. Inspect dismiss reworked. Root cause: the transparent scrim ate the tap on pointerdown, then
     the same gesture's click reopened the chip → same-chip re-tap never hid. Dropped the scrim;
     chips carry `data-inspect-chip` so the new next-frame document pointerdown(capture) listener
     ignores chip taps (chip owns same-id toggle / in-place re-anchor) and closes only on true
     outside taps. A backdrop tap arms a target-scoped, self-disarming capture click-swallow so it
     closes the popover WITHOUT closing the Sheet (a 2nd backdrop tap closes the Sheet).
  2. Dropped the persistent gold "open" ring on chips (popover + caret is the feedback now);
     kept `aria-expanded`. Established the selection-state principle in DESIGN.md §5.
  3. Bonds relation-row button "Go ›" → "View ›" (aria-label "View {name}'s sheet").
- Review #1 (4-persona on the PLAN): 2 blockers, both fixed before build — (Designer) ring removal
  needs an anchor cue → the popover's existing caret is that cue; (Player-exp) chip→chip move must
  be a single re-anchor, not destroy/recreate → `data-inspect-chip` keeps one box mounted.
  Engineer + Adversary each raised the swallow-lifecycle blocker (rAF-removal races the click /
  once:true leaks on a no-click drag) → redesigned to a self-disarming, target-scoped swallow that
  lives outside the effect cleanup + a next-pointerdown disarm.
- Review #2 (4-persona on the DIFF): 1 blocker fixed — (Designer) DESIGN.md carve-out was
  self-undercutting → reworded to "control's own surface (expander) vs a separate transient
  element". Engineer + Adversary: no blockers (all 8 / all failure-mode checks pass). Non-blocking
  fixed: stale "Go to" comments, `[role=dialog]` coupling guard comment.
- Verified: `tsc -b && vite build` green; 36 vitest pass; headless Chromium @430px confirmed
  tap=peek, re-tap=hide, different-chip=1 popover moved, backdrop=popover-closes+sheet-stays,
  2nd backdrop=sheet-closes, Bonds shows "View ›". Screenshots in `docs/screenshots/partA-*`.
- Open questions: two reviewers (non-blocking) note "View" can read as "view this bond" vs the
  chip's own peek; kept "View ›" per the task's explicit rename — flag for Codex/merge if a
  clearer verb (Go/Open/Sheet) is preferred. Move-in-place doesn't replay popIn for adjacent chips
  (deferred polish; keeping the box mounted was the round-1 requirement).

## 2026-07-03 - Hero sheet refinement: Codex fix (in-modal inspect a11y)
- Gate: codex-fixed
- Branch: `claude/ui-foundations-guild-master-x9v3l4` → PR #27 into `dev`
- Codex finding (P2, the only one): the inspect popover is portalled to `document.body`, OUTSIDE
  the `aria-modal` Sheet subtree, so a screen reader inside the modal can't reach the effect text —
  the `aria-live` I'd added to the portalled box doesn't help across the modal boundary. Fixed:
  keep the visual popover portalled (for layout) but mark it `aria-hidden`, and mirror its
  title+effect in an IN-modal visually-hidden `aria-live="polite"` region (`.srOnly`) rendered
  inside HeroCard, so activating a chip announces the effect within the modal without a double read.
- Note: Codex DID run this time on a bot-triggered `@codex review` (after an initial "create an
  environment" reply) — so the CLAUDE.md §30 self-trigger rule works; Stefan can still set up a
  Codex environment if he wants it more reliable.
- Review #2 on the delta (self, a11y markup + one CSS class): no new blockers.
- Verified: build green; headless confirms the in-modal live region holds "Strength. Raises hit
  damage and max HP." inside the dialog while the portalled popover is aria-hidden.
- Open questions: none. Next: awaiting merge decision (no self-merge).

## 2026-07-03 - Hero sheet refinement (popover / bonds / go-to): PR opened
- Gate: PR
- Branch: `claude/ui-foundations-guild-master-x9v3l4` (restarted off `dev` after #26 merged) → new PR into `dev`
- Scope: additive UI-only refinement of the hero sheet, from Stefan's screenshot feedback.
  `web/src/ui/heroes/` + tokens.css + docs. Combat core + art pipeline untouched. Also adds a
  CLAUDE.md §30 rule (trigger Codex yourself — API-opened PRs don't auto-review).
- Changes: (1) inspect detail is now a **floating parchment popover ABOVE** the tapped chip
  (portalled, position:fixed, scrim catches the dismiss tap, flip-below + viewport clamp,
  capture scroll/resize dismiss) replacing the inline-below card. (2) Attribute chips **wider** —
  2-col grid. (3) Portrait **vertically centred** (sprite nudged up; LPC frames carry extra
  headroom). (4) Bonds → **distinct Guild card** + Party card + **Other-Heroes rows** (one two-line
  row each: full name + score + **Go ›** jump to that hero; archetype · variant; valence accent).
  (5) **Relation variants** (Old grudge / Drinking buddy …) layered on the band, valence-respecting,
  folded into DESIGN.md §5. Bond model gains optional `targetId` + `type`; `onGoto` guarded.
- Review #1 (4-persona, PLAN): blockers folded — space-based popover flip + two-line relation row
  (Player-exp); thread guarded `onGoto`, capture-scroll dismiss, `targetId` guard, `useLayoutEffect`
  positioning (Engineer/Adversary); keep the party scope + write variants into DESIGN.md §5 +
  parchment popover (Designer). The Adversary's popover "blockers" dissolved: popover is text-only
  (Go-to is an inline in-panel button), so the focus trap/Escape objections don't apply.
- Review #2 (4-persona, DIFF): **zero blockers**. Engineer (combat untouched, stacking/flip/clamp
  sound), Adversary (7 edge vectors — party/guild card guards, remount-on-hop, self-ref no-op all
  hold), Designer (§5 fidelity, valence-consistent mock, parchment on-brand), Player-exp (phone
  read). Folded: hoist `currentTarget` before the deferred updater; popover `aria-live`; ink-on-
  parchment tokens + `--c-royal-deep` for the pop title; legend↔Traits spacing; §5 pool marked
  illustrative. Noted (later): valence guard when the bond sim lands; alpha-of-brand rgba.
- Verified: build green (90 modules), 36 tests pass; headless 430px — wide attr cells, popover
  appears ABOVE the chip (portalled, parchment, aria-live), scrim closes popover only, Guild+Party+
  Other-Heroes cards, Go-to navigates + resets to Character, no dialog h-overflow, no console
  errors. Screenshots `docs/screenshots/hero-{popover,bonds}.png`.
- Open questions: relation-variant pool + band names/cutoffs still tunable. Next: Parties-primary
  mock view (PR-B). Awaiting Codex review, then merge gate.

## 2026-07-03 - Hero sheet tabs: Codex fix (tabpanel focus ring)
- Gate: codex-fixed
- Branch: `claude/ui-foundations-guild-master-x9v3l4` → PR #26 into `dev`
- Codex finding (P3, the only one): `.panel:focus-visible { outline: none }` stripped the focus
  indicator from the tabpanel, which is a tab stop (`tabIndex=0`), so keyboard focus visually
  vanished when landing on it — worst on the Career/Skills stubs where the panel is the only
  focusable content before Close. Fixed: keep the panel a tab stop (so empty stub tabs stay
  reachable, per WAI-ARIA) but give it a visible inset gold focus ring instead of removing it.
- Review #2 on the delta (self, one-line a11y CSS): no new blockers.
- Verified: build green; headless keyboard-Tab to the tabpanel confirms it now matches
  `:focus-visible` with a visible ring (programmatic .focus() doesn't trigger :focus-visible, so
  the check drives real keyboard focus).
- Open questions: none. Next: awaiting merge decision (no self-merge).

## 2026-07-03 - Hero sheet → tabs (Character/Gear/Bonds/Career/Skills): PR opened
- Gate: PR
- Branch: `claude/ui-foundations-guild-master-x9v3l4` (restarted off `dev` after #25 merged) → new PR into `dev`
- Scope: additive UI-only — reorganise the hero detail sheet into tabs, from Stefan's feedback +
  the agreed IA. Mock data only. Combat core (`web/src/game/battle/`) + art pipeline untouched
  (verified name-only diff); `battle/attributes.ts` read for its real attribute names only (prose,
  no import). Also a small DESIGN.md fold of the locked decisions.
- Files: `web/src/ui/heroes/HeroCard.tsx` (5 tabs + WAI-ARIA keyboard + inline inspect),
  `heroes/inspect.tsx` (new — inline accordion "tap a chip for its effect"; no portal/Escape),
  `heroes/relationships.ts` (new — −100..100 → named feeling band, exact cutoffs),
  `heroes/mockHeroes.ts` (new model: 4 real attributes str/dex/sta/per + effects, 6 gear slots,
  traits w/ effects, scored bonds), `heroes/HeroCard.module.css`, `heroes/HeroesScreen.tsx`
  (`key={hero.id}`), `docs/DESIGN.md` (§5 tabbed-sheet + relationship-band note), screenshots.
- Tabs: **Character** (the 4 real sim attributes as certainty chips + 3 trait slots, each
  tap-to-inspect for its real combat effect) · **Gear** (6 slots head/armor/mainhand/offhand/
  trinket×2) · **Bonds** (relationships as named-feeling chips over a −100..100 score, valence by
  colour, grouped To Guild / Party / Heroes) · **Career** & **Skills** (honest "coming" stubs +
  soon badge). Compact header (88px static portrait + archetype/status; name stays the Sheet title).
- Review #1 (4-persona, PLAN): blockers folded — inline-accordion inspect (Engineer: a popover
  would clip/detach in the scroll container + fight the focus trap); no Escape in inspect (Sheet
  owns Escape); short one-word tabs, no h-scroll; portrait collapsed to a compact header; honest
  stub empty states + soon badge; inspect discoverability hint; **dropped the `~` bond-uncertainty**
  (Designer: invents an unlocked relationship-fidelity mechanic) → plain named-band chips; Character
  capped at the 4 real attributes; exact band cutoffs; Tabs kept local (YAGNI); `key={hero.id}`.
- Review #2 (4-persona, DIFF): **zero blockers** from all four. Engineer confirmed combat core
  untouched + typecheck green + no id collisions; Adversary broke all 7 vectors (empty/sparse
  heroes, inspect lifecycle, focus-trap vs roving tabindex, band boundaries, keyboard, no layout
  shift) — all sound; Designer confirmed §5 fidelity (certainty fill-only, 4-attr lean, chips-not-
  a-web, pill-vs-hexagon "?"); Player-exp confirmed the phone read. Folded two cosmetics
  (focus-ring vs open-ring order; a comment). Noted for later: per-group vs per-cell detail
  placement on wrap rows; empty-state fixtures; valence rgba→token; fixed-3-trait frame (Slice 3).
- Verified: build green (90 modules), 36 tests pass; headless 430px walks all 5 tabs — real
  attributes with certainty fills + "?", inspect opens/toggles, 6 gear slots + Empty, bonds with
  named feelings/valence/score grouped by target, career stub, tab arrow-key nav, no dialog
  h-overflow, no console errors. Screenshots `docs/screenshots/hero-{character,gear,bonds,career}.png`.
- Open questions: relationship band names/cutoffs are a tunable default (say the word). Next: the
  Parties-primary mock view (PR-B). Awaiting Codex review, then merge gate.

## 2026-07-03 - UI polish (map selection / bars / portrait): PR opened
- Gate: PR
- Branch: `claude/ui-foundations-guild-master-x9v3l4` (restarted off `dev` after #23 merged) → new PR into `dev`
- Scope: visual polish only, additive, `web/src/ui/` — from Stefan's feedback. Combat core
  (`web/src/game/battle/`) and art pipeline untouched (verified name-only diff). `LpcSprite` is the
  UI compositor, not the frozen core.
- Changes: (1) **Map selection** — killed the blue mobile tap-highlight (global `button,a`
  `-webkit-tap-highlight-color: transparent`) + `:active` press cues on every live tappable; the
  selected node now *lights up* (soft gold bloom + brightness + scale 1.14) instead of a hard
  rectangular ring (matches the DESIGN.md "soft glow" polish backlog). (2) **Bars** — new
  `--bar-1/--bar-2` tokens (wine/aubergine, less "blue" but still royal-purple brand) drive ALL
  chrome bars (nav + all 3 top bars); content surfaces keep `--c-royal-deep`. (3) **Hero portrait**
  — display 256→192 (art target stays 256), and made static via an additive `animate?: boolean`
  (default true) on `LpcSprite` so combat is byte-identical; `HeroSprite` passes `animate={false}`.
- Review #1 (4-persona, on the PLAN): 4 blockers folded before build — static-draw would blank
  the canvas (resolved by suppressing the bob, NOT stopping the rAF loop); freeze both roster +
  portrait (consistent); global tap-highlight needs paired `:active` cues; bar must stay
  purple-leaning (wine/aubergine, not brown). Plus: repoint ALL chrome bars; keep glow gold; bump
  selected scale; keep 256 as the documented asset target.
- Review #2 (4-persona, on the DIFF): 1 blocker — StartScreen's two landing cards lost their tap
  flash with no `:active` (phone-only user) → added `.card:active` (and `.close:active` on the
  sheet ×). Engineer confirmed combat core untouched + combat byte-identical; Designer confirmed
  wine hue + gold glow + single-source bars; all fixes verified landed.
- Verified: build green (88 modules), 36 tests pass; headless 430px confirms portrait 192×192 with
  a frame-stable transform (no float), the selected node renders a soft gold glow (no 3px ring),
  and every chrome bar uses the new gradient; no console errors. Screenshots refreshed in
  `docs/screenshots/`.
- Deferred (out of this scope, pre-existing — flagged for a follow-up): map node *labels* clip
  their placeholder tiles ("Guild Hall" cut off); node caption pills sit low / low-contrast; the
  selected node's dashed-box vs rounded-glow double-outline; static sprites keep a no-op rAF loop
  (a micro-opt). None introduced by this diff.
- Open questions: bar shade + node-selection intensity are subjective — easy one-token retune if
  Stefan wants a different direction. Next: awaiting Codex review, then merge gate.

## 2026-07-03 - UI foundations (guild kit + Heroes): Codex fix (trait-row overflow)
- Gate: codex-fixed
- Branch: `claude/ui-foundations-guild-master-x9v3l4` → PR #23 into `dev`
- Codex finding (P2, the only one): the hero-sheet trait row set each of its 3 slots to
  `width: 33%` while the flex parent also added two `var(--sp-4)` gaps (32px), so `99% + 32px`
  overflowed the sheet body on narrow phones — the third trait name/socket could spill or force
  sideways scrolling. Fixed: slots are now `flex: 1; min-width: 0` (share the row *after* the
  gaps), and the trait name/socket labels got `max-width:100%` + `overflow-wrap:anywhere` so a
  long name wraps instead of pushing the row wide.
- Review #2 on the delta (self, CSS-only mechanical fix): no §5 impact (still exactly 3 slots,
  token-vs-socket unchanged); correct flexbox idiom; no new blockers.
- Verified: `tsc -b && vite build` green; 36 tests pass; headless Chromium at **390px** confirms
  the trait row's scrollWidth == clientWidth (no overflow) for all three cases — 3 filled (Ysolt),
  3 empty sockets (Mira), mixed (Brok) — and zero document horizontal overflow. Screenshot
  `docs/screenshots/hero-detail-traits.png`.
- Open questions: none. Next: awaiting merge decision (no self-merge).

## 2026-07-03 - UI foundations (guild kit + Heroes): PR opened
- Gate: PR
- Branch: `claude/ui-foundations-guild-master-x9v3l4` (new branch off `dev` tip PR #22) → PR into `dev`
- Scope: additive UI-only scaffolding ahead of Slice 1 — a reusable UI kit + the first
  hero-facing screens. No mechanics, no persistence, mock hero data. Combat core
  (`web/src/game/battle/`) and the art pipeline (`art/enums.ts`, catalog, `art-needs.json`,
  `docs/ROADMAP.md`) untouched — verified by name-only diff.
- Files touched: `web/src/ui/kit/` (new: Button, Sheet, NavBar + index + CSS),
  `web/src/ui/heroes/` (new: HeroesScreen, HeroCard, HeroSprite, mockHeroes + CSS),
  `web/src/ui/Root.tsx` (add `#/heroes` + persistent bottom-nav shell over the 3 feature
  routes), `web/src/ui/node/NodeTestScreen.tsx`+css & `web/src/ui/combat/CombatTestScreen.tsx`+css
  (drop the "← Menu" back button; reserve nav height), `web/src/ui/StartScreen.tsx` (rename
  "Node Test" card → "World Map"), `web/src/ui/theme/tokens.css` (+`--nav-h`),
  `docs/screenshots/` (4 phone-viewport PNGs).
- Built to DESIGN.md §5 for the hero stat page: 3–4 headline stats + equipment; certainty
  encoded IN the stat-chip fill (solid=verified / hatched=claimed / plain-"?"=rumor), no second
  glyph; exactly 3 trait slots (filled hexagon token vs **dashed-hexagon** "?" socket — a
  deliberately different shape from the rounded-pill rumor "?"); relationships as a line of chips.
  Roster adds a colour-coded status dot (guild/quest/idle) so whereabouts read at a glance.
  Placeholder art reuses the LPC compositor at 64×64 (roster) / 256×256 (portrait) with an
  accessible initials fallback; trait socket is a 32×32 inline SVG; nav icons are 24×24 inline SVG.
- Review #1 (4-persona, on the PLAN): 4 blockers, all folded into the build — (B1) LPC canvas
  goes blank + aria-hidden on a fresh/blocked clone → added `HeroSprite` with `role="img"` +
  initials fallback; (B2) certainty/socket were fill/shape-only → added a visible micro-label +
  `aria-label` per chip/socket; (B3) the rumor "?" and empty-trait "?" would collide → pinned to
  pill-vs-dashed-hexagon; (B4) roster status was text-only → added a colour-coded status dot.
  Non-blocking folded: equipment section (§5), stable precomputed sprite layers, nav-height
  reservation for the map's %-placed nodes, sheet drag-handle + scroll padding + z-order.
- Review #2 (4-persona, on the DIFF): **zero blockers** from all four. Scope confirmed clean
  (combat core + art pipeline untouched); all 4 Review-#1 fixes verified landed; Sheet focus-trap/
  scroll-lock/restore-focus correct across ×/backdrop/Escape and StrictMode; no trait off-by-one
  (heroes carry 0/1/2/3 traits, always 3 slots render); sheet z-100 always above nav z-40.
  Non-blocking items folded post-review: the Combat Test nav icon read as a plain "×" → redrawn
  with pommels/crossguards; the `Button` primitive was unused → wired as a full-width bottom
  "Close" in the sheet (better one-handed reach). Recorded, not fixed (out of scope): `loadImage`
  caches rejected promises (shared combat-core loader); traits beyond 3 truncate silently (note
  for Slice 3 when reveals become real); a map-node caption clips its box (pre-existing, `#/node`).
- Decision (StartScreen): kept as the `#/` title screen; renamed its map card to "World Map" and
  did **not** add a Heroes card (would duplicate the nav tab). Entering any card lands you in the
  nav-equipped app, so Heroes is always one tap away — no dead-end.
- Verified: `tsc -b && vite build` green (88 modules); 36 vitest tests pass (parity intact);
  headless Chromium at 430px confirms the 5-hero roster with status dots, the sheet opening with a
  focus trap, all three certainty fills + the "?" rumor value, exactly-3 trait slots with the
  distinct socket, the 256×256 portrait, the kit Button "Close", nav routing across all 3 tabs,
  and no console errors. Screenshots in `docs/screenshots/`.
- Open questions: none blocking. Next: **awaiting Codex review**, then the merge gate (no self-merge).

## 2026-07-03 - UI foundations (guild kit + Heroes): build done
- Gate: build (plan + both reviews cleared)
- Branch: `claude/ui-foundations-guild-master-x9v3l4` → PR into `dev`
- Built the UI kit (Button/Sheet/NavBar) and the Heroes roster + §5 stat page; wired the
  `#/heroes` route and the persistent bottom nav; dropped the per-screen "← Menu" back buttons.
  All Review #1 blockers were fixed in this build (see the PR entry above for the itemised list).
- Verified before claiming: build green, 36 tests pass, headless 430px walkthrough of every
  Review-#1 fix. Then ran Review #2 on the diff (zero blockers).

## 2026-07-03 - UI foundations (guild kit + Heroes): plan done
- Gate: plan
- Branch: `claude/ui-foundations-guild-master-x9v3l4` (declared first, off `dev`)
- Scope declared: `web/src/ui/kit/` (Button, Sheet, NavBar), `web/src/ui/heroes/` (roster + §5
  stat page + mock data), `Root.tsx` route/nav shell; additive, combat core + art pipeline
  off-limits. Plan ran through Review #1 (4-persona); 4 blockers adopted before any code (B1–B4
  above). No human checkpoint at this gate per the loop; proceeded to build autonomously.

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
