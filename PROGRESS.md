# PROGRESS

Running log Claude Code appends to at each gate, so a phone-only Claude.ai chat can follow. Newest entries on top.

Format per entry:
## YYYY-MM-DD HH:MM - <short scope>
- Gate: plan | build | PR | codex-fixed | merged
- Branch:
- Files touched:
- Review verdict: blockers found / fixed
- Open questions:

## 2026-07-06 - §50 merged-gate backfill rule
- Gate: PR opened — **PR #31 into `dev`**, `@codex review` posted; awaiting Codex
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
