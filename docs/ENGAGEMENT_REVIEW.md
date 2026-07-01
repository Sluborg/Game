# Engagement Review — will the guild-master game be fun?

Analysis of the game plans, requested 2026-07-01. Produced by the repo loop: Review #1 verdicts
are in the appendix; Review #2 (4-persona, on this document as the diff) cleared before commit —
both logged in `PROGRESS.md`.

## Bottom line

The concept is genuinely strong: **information as the core resource** is a real, underexplored
design space, and the closed loop (battle → corrected CVs → better pricing → income → influence →
better reports → battle) is coherent on paper. The engine you already have is a near-perfect
substrate for it — seeded, deterministic, event-emitting (`web/src/game/battle/events.ts`), which
makes reports, replays, and fidelity tiers cheap.

Three things most threaten the fun, in order:

1. **The loop doesn't close in v1 as scoped.** Knowledge must change decisions to be fun, but on
   one Area with one quest node, no rival, and one-shot hiring, a corrected CV changes almost
   nothing. The information game needs a *recurring* money-valued decision from day one (§R1, §R2).
2. **Low fidelity as written removes the show.** The game's only joy channel is watching; the
   penalty for being poor must never be "you don't get to watch." Fidelity should gate
   *interpretation and detail*, never *visibility* (§R3).
3. **The build order ships systems before fun.** Steps 1–3 produce inert data; the first lever
   arrives at step 4 and the first way to lose at steps 7–8. Re-slice vertically: one thin playable
   loop first, then deepen (§R4) — and it currently hits an engine-API wall that needs one explicit
   decision from Stefan (§D1; recommended answer: D1a, a ~5-line additive widening of
   `FightConfig`, needs only your sign-off).

None of the top risks require abandoning anything in DESIGN.md. They require one re-slicing of the
build order, one seam decision, and a handful of design commitments (a fidelity floor, a pricing
rule, a contracts verb, doom visibility rules) that can be folded into DESIGN.md before build
step 1.

**Sources.** The concept: `docs/DESIGN.md` on branch `claude/game-design-planning-ojk3lt` (not yet
on `dev`; all bare `§n` cites below refer to it). The plan-of-record on `dev`: `docs/ROADMAP.md`,
`project-status.md`, `PROGRESS.md`. What actually runs today on `dev` (`/Game/dev/`): a **Combat
Test** screen (deterministic tick 1v1, LPC sprites, combat log) and a **Map** screen (3 clickable
placeholder nodes). Nothing else of the concept exists in code.

---

## The first playable, minute by minute (as the plans stand)

Judging the build order by what the player of the earliest loop-complete build actually does.
After steps 1–4 as written (heroes as data → battle → fidelity tiers → bounties):

- **Min 0–2:** Map with Guild Hall, Village, Ruins. Tap heroes, read CVs with certainty icons.
  Novel, reads well. Tap Ruins, post a bounty, pick a number. *On what basis?* No prices have
  meaning yet — no rival bids, no upkeep pressure, no history. First decision is a shrug.
- **Min 2–5:** A hero accepts. Party walks off (or just… state changes). Player waits. There is no
  second quest node, no second decision. **Dead air.**
- **Min 5–8:** Report arrives. At whatever fidelity tier is default, the player reads it. If the
  CV was inflated, a stat corrects. *And then?* The hero is already hired; there's one bounty to
  price and any plausible number works. The reveal — the game's centerpiece — changes no upcoming
  decision.
- **Min 8+:** Repeat with the same node, same roster, no clock ticking, no way to lose, until the
  Ruins runs dry.

That's the honest baseline this report ranks against: **the moment-scale is one decision followed
by dead air, the session-scale has no consequence engine until step 6, and nothing can be lost
until steps 7–8.** The concept is not at fault — the slicing is. Everything below is aimed at
making that first playable already contain the real game in miniature.

---

## Engagement at the three time-scales

The design already has the right taxonomy — the three loss clocks (DESIGN.md §8). Each time-scale
of engagement maps to one clock, which tells you exactly what each scale needs.

### Moment-to-moment ↔ the cash clock (minutes)

What the player does with their hands: read CVs, price bounties, read reports, watch battles.
- **Strength:** the report-reading fantasy is real — if reports are *authored content* (evocative,
  diegetic, occasionally wrong at low tiers), not truncated data dumps. The event stream supports
  this today: `swing/hit/miss/knockout/end` with `hpBefore/hpAfter`, `crit`, `lethal` is enough for
  "the mage nearly died" summaries and full tick logs. (Caveat §R6: floor/trap/journey flavor
  needs an envelope layer the engine doesn't and shouldn't provide.)
- **Need:** a reason for every gold amount to matter *now* (pricing sensitivity, §R2) and zero
  dead screens (§R3, §R10). While any party is out, the map must always show something live —
  a position pip, a rumor ticker, a returns-in-N chip.

### Session ↔ the roster clock (a play session / day-over-day)

What pulls the player back: hero arcs. Levels, trait reveals, CV corrections, relationships,
party formation.
- **Strength:** heroes-as-slowly-revealed-characters (CK-style traits, revealed under stress) is
  the strongest retention idea in the doc. "Coward — revealed after he fled the crypt" is a story
  the player will retell.
- **Need:** reveals must be *celebrated, first-class moments* (stamped CV corrections, trait icons
  sliding into sockets — §R11), and relationship/party progress must be *visible* (a social feed,
  §R7), or the flagship systems read as random churn. The roster clock needs a pre-rival failure
  mode: neglected heroes quit the region (no rival needed until step 7).

### Campaign ↔ the doom clock (many sessions)

Why the player finishes a map: the race against doom and the rival.
- **Strength:** escalation nodes (tend the Graveyard or it spreads) elegantly convert *ignoring
  the map* into the loss condition — pressure without commanding anyone.
- **Need:** doom must be coarsely visible at zero influence (refugees, darkening silhouettes,
  price spikes) or the campaign loss arrives as an untelegraphed rage-quit (§R9). The rival must
  be provably fog-bound and every loss to it explained in a report, or competition reads as
  scripted theft (§R8). Long-term claims here are projections — nothing campaign-scale is built.

---

## Ranked risks (with fixes and kill-tests)

Tags: **[structural]** = broken by design, needs a design change; **[tuning]** = fine if the
numbers are right. **[concept]** = inherent to the design; **[sequencing]** = an artifact of the
build order, fixed by re-slicing. Each risk has a **kill-test**: what a playtest would observably
show if the risk is real (a few test the *fix* rather than the diagnosis — those double as
regression gates). Every fix is compatible with the pivot constraints — never command heroes,
gold-only v1, 3-node first map, frozen combat core — except the flagged decision D1 and the two
fixes explicitly marked as DESIGN.md text changes.

### R1 — Knowledge has nothing to spend itself on `[structural] [concept + sequencing]`
The keystone mechanic (exaggerated CVs, DESIGN.md §5) produces information; v1 scope gives that
information no recurring decision to change. Hiring is one-shot; there's one bounty market and no
rival. (The market/rival halves resolve at slices 5–6, so they're sequencing; one-shot hiring is
the genuine concept gap.) Information asymmetry is only fun when it converts into decisions.
**Fix:** give the money lever a recurring verb that *consumes* CV knowledge: **contracts** — an
extension of the hiring verb §5 already implies, not a new lever (§3's "only two levers" stands).
Every N days each hero's contract renews — renew / renegotiate the cut / release. Now every report
line feeds an upcoming choice, and overpaying a fraud is a mistake you get to correct, not just
regret. Cheap (data + one dialog), no commanding, gold-only.
**Kill-test:** in a playtest, does the player ever change a gold decision because of something a
report taught them? If reports are read once and never acted on, R1 is live.

### R2 — The two levers collapse into one `[structural] [concept]`
"Money is how you pull; knowledge is the lever" (§3) only holds if *mispricing hurts*. If any
plausible bounty attracts the party, knowledge has no gold value, influence is paying for
cutscenes, and the rational cash-clock play is to buy none.
**Fix:** hero greed thresholds are hidden numbers that pricing must hit. Overshoot → surplus is
donated (report shows "overpaid by ~40g" at sufficient fidelity); undershoot → the quest rots and
feeds the escalation behaviour §9 already defines. Then a corrected CV literally saves gold per
bounty — the §2 loop pumps with no rival and one node. One guard against the R3/R5 free baseline
eroding this: CV-correction speed and precision must scale with fidelity tier, and the free floor
sits *below* the "overpaid by ~40g" feedback threshold — the lie detector is never free.
**Kill-test:** compute the gold delta between a max-knowledge player and a zero-knowledge player
over 10 quests. If it's ~0, influence has no economic value and R2 is live.

### R3 — Low fidelity removes the show `[structural] [concept]`
§4's "None → a vague rumor" makes *not watching* the punishment for being poor — in a game whose
stated joy (§2) is watching. It also compounds: poor → blind → misprice → poorer (see R5).
**Fix:** fidelity gates **interpretation, never visibility**. Every tier sees departures, returns,
and headline outcomes; tiers add the *why*. Tier 0 is a stream, not silence — and diegetically
unreliable (rumors can be wrong; later ground truth calls them out — on-theme and a free mini-game
of source trust). The home Area gets a free, non-decaying baseline tier (the Guild Hall is where
you sit). Each tier gets a distinct visual frame — parchment rumor card / clerk's summary /
full log — plus a locked-teaser row ("+2 influence: see who dealt the killing blow") so the
upgrade is advertised at the moment of curiosity.
**Kill-test:** after a quest resolves at tier 0, ask the player the outcome and casualties. If
they can't answer, R3 is live. (Ambient dead-screen failures belong to R10's test.)

### R4 — The build order ships systems before fun `[structural] [sequencing]`
Steps 1–3 (heroes as data → battle → fidelity) deliver nothing playable; the first lever is
step 4; the first loss pressure steps 7–8. Three+ sessions of inert data, then a game that can't
be lost — which *un-teaches* the core trade-off (max influence is strictly correct until upkeep
exists). Step 2 as written ("build the battle system") also reads as touching the frozen core.
**Fix:** re-slice vertically (see "Recommended build order" below). First loop-complete build:
Ruins + 3 pre-made heroes + bounty slider + one report tier + **a minimal cash clock** (flat
upkeep + guild overhead vs quest cuts, bankruptcy-as-debt-event) in the same slice. Step 2 must be
re-worded to "a quest resolver that *consumes* `CombatEngine`/`runToCompletion`".
**Kill-test:** after the first gameplay PR merges, hand `/Game/dev/` to someone for 10 minutes.
If they can't lose anything and face no second decision, R4 is live.

### R5 — Early death spiral, no comeback `[structural] [concept]`
Money buys knowledge and knowledge earns money, so one bad early hire can remove both levers at
once: cash bites → upkeep lapses → blind → misprice → poorer. Bankruptcy is "the spine" (§8) but
has no floor, no recovery path.
**Fix:** the R3 fidelity floor plus a small guaranteed Guild Hall passive cut (zero-cash =
poor-and-squinting, never blind-and-starving); bankruptcy is a **debt event** (loan with interest)
rather than instant loss, with a named terminal state so the game stays losable — e.g. N
consecutive insolvent turns after the loan → charter revoked; cap CV inflation on the first N
recruits (tutorial-scoped only — see R12) so the early downside is bounded.
**Kill-test:** fresh save, deliberately overpay for an inflated-CV hire #1. If positive cash flow
is unreachable by turn ~N, R5 is live.

### R6 — Reports promise content the sim doesn't produce `[structural] [concept]`
§4's summary-tier example ("nearly died *to a trap on floor 2*" — tier 1 in the 0/1/2 numbering
used below) needs traps, floors, journeys — concepts the combat engine has no notion of and must
not grow (frozen core).
**Fix:** an **adventure envelope** at the quest-resolver layer:
`AdventureLog = { preludeEvents, combatEvents: CombatEvent[], epilogueEvents }` — travel, traps,
loot are generated flavor outside the core. Specify each fidelity tier as an exact
filter/aggregation over the envelope *before* writing a generator (tier 0: outcome + casualties;
tier 1: envelope beats + combat aggregates; tier 2: raw events). Exploit determinism: store
`{seed, config}` per quest, not event arrays — reconstruct the engine with the stored seed and
re-drive it on demand. Two implementation notes: the engine's default RNG is *random* — the quest
resolver must generate and persist the seed itself; and the envelope events must derive from the
same stored seed, or the tier-2 replay won't match the report the player already read. That makes
the tier-2 "watch the replay" show (reusing the existing Combat Test renderer, which consumes a
live engine) essentially free, and keeps saves small.
**Kill-test:** write 5 tier-1 summaries from a real event stream. If they're all "X won, Y took
damage" with no color, the envelope is missing and R6 is live.

### R7 — Party formation is invisible and can stall `[structural] [concept]`
Relationships shift "silently" (§5) and parties gate the good pay (§6). Unseen: the flagship
system reads as random churn. Unlucky: meeting RNG never forms a party, Ruins floor 2 stays
locked, income caps, soft-lock on the 3-node map.
**Fix:** the Village is the social stage — a presence-gated gossip ticker ("Bryn and Aldric drank
together — again") and relation chips on the hero sheet (one line, not a web). Guarantee progress:
scheduled Village meetings per day, a pity escalator on failed formation windows, one starting
hero with a high-charisma "natural boss" archetype. Tune so solo quests sustain minimum upkeep —
parties are how you *win*, never the only way to not-lose. Script the first formation beat: Ruins
floor 2 is party-only early, so the player *watches* difficulty gating pull two loners together in
session one.
**Kill-test:** 20 simulated fresh starts; if any reaches turn ~30 with no party formed and
negative net income, R7 is live.

### R8 — The rival reads as a cheating black box `[structural] [concept]`
"Runs the same playbook" (§7) is only credible if the player can *verify* it. An AI that loses
bidding wars it couldn't have seen coming feels scripted; one that wins them feels omniscient.
**Fix:** a stated, unit-testable invariant — **rival decisions consume only its own
influence-filtered view**. Influence becomes counterintelligence: where you hold it, you see rival
bounties before heroes decide. Every loss generates an explanation in a report ("Torvald took
their contract — 20% more gold, and he's Greedy") so losses teach instead of gaslight. Rival v1 is
a **scripted budget bidder** with 2–3 legible rules, not a mirror sim — indistinguishable for the
first ten hours and *more* fun to counter-play.
**Kill-test:** after losing a hero to the rival, can the player state in one sentence why? If not,
R8 is live.

### R9 — Doom is invisible until unwinnable `[structural] [concept]`
Escalation nodes live behind fog in Areas the player has no influence in; the slow clock's first
legible signal must not be "you already lost."
**Fix:** fog hides *detail and counterplay*, never the campaign threat's existence. Doom
broadcasts coarsely regardless of influence: refugees at the Village, darkening Area silhouettes,
pay spikes on neighboring quests; thresholds fire unmissable scripted events with a stated runway
("the Graveyard will spill into the valley within ~12 days").
**Kill-test:** if the first doom signal ever arrives with less than X days of stated runway, or
with counterplay costing more than a plausible max treasury at that turn, R9 is live.

### R10 — Dead air while parties are out; upkeep drains silently `[tuning] [concept]`
Post bounty → wait is the default rhythm; on a phone, 90 seconds of nothing is a closed app. And a
per-turn drain (§8's fast clock) is exactly what a check-in player fails to mentally integrate.
**Fix:** pacing rule — while any party is out, the map always shows a live affordance (position
pip whose *precision* scales with influence, returns-in-~N chip, the R3 rumor stream); compress
time when nothing is live. Pin a one-line ledger to the map: `income − upkeep = net ±X · gold
lasts ~N turns`, amber pulse under ~8 turns runway, and a diegetic treasurer event under ~4 that
names *which Area's upkeep is the leak* with a one-tap "let it lapse" action.
**Kill-test:** screen-record a session; any 60-second window with zero state change visible on
screen means R10 is live.

### R11 — Phone legibility: icon soup, buried payoffs `[structural] [concept]`
7 attributes × (stat + certainty icon) + trait icons + relationship webs cannot fit 460px; CK-style
tooltips assume hover. And the game's real rewards — corrections, trait reveals, level-ups —
currently live as lines inside text logs, in a game with no direct-action dopamine channel.
**Fix:** CV card shows 3–4 headline stats; certainty is encoded *in* the chip (solid =
battle-verified, hatched = claimed, "?" = rumor) — one treatment, not a second icon. Exactly 3
trait slots per hero row; undiscovered traits render as dim "?" sockets (discovery becomes visible
loot). Relationships are chips, never a web. Every icon answers a tap with a sentence. Promote
reveals to first-class beats: end-of-quest mail opened envelope-by-envelope; CV corrections stamp
the chip (red "INFLATED" strike-through / green "UNDERSOLD" — celebrate the win case too); trait
icons slide into their socket with the trigger sentence; level-ups flash the hero's existing LPC
sprite (`web/src/ui/combat/lpc/` — reuse, not new tech).
**Kill-test:** show a hero card to someone for 5 seconds at 460px; if they can't say which stats
are trusted, R11 is live.

### R12 — "Just hire proven heroes" makes the keystone optional `[structural] [concept]`
If proven-but-modest heroes are purchasable and adequate, a variance-minimizing player never
gambles on a flashy CV, and the keystone system is decoration.
**Fix:** proven heroes aren't a market category — they're what *corrected CVs produce over time*.
The recruit pool is unknowns by construction; a public track record means the rival can read it
too (bidding war on every proven vet); the doom curve outpaces modest rosters mid-game, forcing
bets on high-ceiling unknowns. CV-reading becomes the poaching edge §7 already promises. **Note:
this revises §5's "pay big for the flashy CV or less for the proven-but-modest one" wording — a
DESIGN.md text change, not a tuning fix; it's on the quick-win #1 fold list.**
**Kill-test:** if a "never hire above 70% certainty" policy wins comfortably in simulation
(excluding the tutorial-scoped capped first-N recruits from R5), R12 is live.

---

## D1 — One decision needed before build step 1 (engine seam)

`FightConfig` (`web/src/game/battle/engine.ts`) accepts only
`heroTier: "weak" | "medium" | "strong"`; heroes are three hardcoded templates in
`web/src/game/battle/units.ts`. **Per-hero attributes — the substrate of the entire CV mechanic —
have no injection point.** Under "consume, never modify," build steps 1, 4 and 5 are unbuildable
as designed. Parties are likewise out of reach (the engine is structurally one hero vs stacks).

Two clean options, both keep the core's tests and determinism intact:

- **D1a (recommended): one additive widening.** `FightConfig` accepts an optional
  `hero: UnitTemplate` (type already exists and is exported) alongside `heroTier`. ~5 lines,
  backward-compatible, test-preserving (injected templates must keep `side: "hero"`) — but it *is*
  a change to the frozen dir, so it needs Stefan's explicit sign-off, recorded in DESIGN.md.
- **D1b: resolver-layer fakery.** Map each hero's true hidden attributes to the nearest tier
  outside the core; drive CV correction from outcome statistics. Zero core changes, coarse
  granularity (three effective hero archetypes in v1).

For **parties**, no core change either way in v1: resolve party quests as **composed 1v1 duels** —
the resolver splits the quest's stacks across members, runs N seeded engine instances, interleaves
the event streams into one adventure log; cohesion acts at the resolver layer (stack allocation,
retreat thresholds), not inside a fight. State this in DESIGN.md §6 so expectations match.

---

## Recommended build order (revised)

Replaces DESIGN.md's steps 1–8 — same content re-sliced (one deliberate deferral, noted in
slice 5) so every step ends playable and the loop closes in the first gameplay PR. All later
steps deepen a loop the player already feels.

- **0. Foundations** — decide D1; add a versioned, serializable world-state module + a discrete
  "end day" tick. Carried by the first gameplay PR, not its own session.
- **1. Thin closed loop** *(replaces old 1, 2, 4)* — Ruins + 3 pre-made heroes (CVs with certainty
  chips) + bounty slider + pricing sensitivity (R2) + one summary-tier report (envelope, R6) +
  minimal cash clock (R4/R5). Fun shipped: priced decision → consequence → readable outcome →
  money pressure, in one PR. A "phantom bidder" stub (one fake competing bounty, one rule) can
  ship here to make pricing contested before the real rival exists.
- **2. Fidelity ladder** *(replaces old 3)* — rumor/summary/log tiers as envelope filters + free
  home floor (R3) + seed-replay viewer reusing the Combat Test renderer. Tiers must cost gold from
  day one: a flat per-quest price per tier drawn from the slice-1 cash clock (upkeep/decay wait for
  slice 5) — otherwise max-tier is strictly correct and the core trade-off un-teaches itself, the
  exact failure R4 attacks. Fun shipped: buying a better seat becomes a real spending decision.
- **3. Hero arcs** *(replaces the rest of old 1)* — CV correction stamps, trait sockets & reveals,
  contracts verb (R1), quit-the-region roster pressure. Fun shipped: session-scale stories;
  knowledge gets a recurring spend.
- **4. Parties & quest choice** *(replaces old 5 + the rest of old 4)* — relationship chips +
  Village gossip feed + formation guarantees (R7) + composed-duel resolution (D1) + the full §6
  quest-selection weights (type, personal preference, difficulty, boss's vote) replacing slice 1's
  bare pay-threshold accept. Fun shipped: the social sim becomes watchable.
- **5. Influence as upkeep** *(replaces old 6)* — per-Area influence with upkeep/decay + second
  Area + the map's two zoom tiers (silhouettes first exist here) + ledger strip & treasurer event
  (R10). Fun shipped: the two-lever economy under real tension.
- **6. Rival** *(replaces old 7)* — scripted budget bidder, fog-bound invariant, loss explanations
  (R8). Fun shipped: competition that teaches.
- **7. Doom** *(replaces old 8)* — escalation node + coarse broadcast + runway events (R9). Fun
  shipped: the campaign race.

---

## Quick wins (candidate follow-up sessions, not started here)

Ordered by impact ÷ effort. Doc/design-level first, per repo scope rules; code items name their
existing seam.

1. **Fold this report's design commitments into DESIGN.md** (fidelity floor, pricing sensitivity,
   contracts verb, doom visibility, rival invariant, composed-duel parties, recruit-pool-is-unknowns
   — this one revises §5's flashy-vs-proven wording — and the revised build order) — pure doc edit
   on the planning branch; every later session inherits it. *(docs/DESIGN.md)*
2. **Record the D1 decision** — one yes/no question to Stefan, then a dated note in DESIGN.md;
   unblocks everything.
3. **Write the fidelity-tier spec as envelope filters** with 3 worked examples per tier from a real
   seeded fight — content design, no code. *(docs/, consumes `web/src/game/battle/events.ts`)*
4. **Report-card UI slice:** render one hard-coded AdventureLog as the three tier cards (parchment
   rumor / clerk summary / log) at 460px — proves the R3/R11 presentation before any sim exists.
   *(new `web/src/ui/report/`, additive; ArtCatalog placeholder path already degrades gracefully)*
5. **Hero-card UI slice:** stat chips with certainty treatments + trait sockets, static data.
   *(new `web/src/ui/hero/`, additive; ROADMAP already tracks the missing `hero-parties-reports`
   art as a known gap — add the milestone there when this starts)*
6. **Seed-replay proof:** reconstruct an engine from a stored `{seed, config}`
   (`new CombatEngine(config, mulberry32(seed))`) and let the existing Combat Test renderer drive
   it live — proves the tier-2 replay show with zero new sim.
   *(`web/src/game/battle/` consumed read-only)*

---

## Appendix — per-persona verdicts (Review #1, on the analysis plan)

- **Designer:** main concern — the plan would have judged the concept, not the build; addressed by
  the minute-by-minute walkthrough and the sequencing tags. Design findings feed R1, R2, R3, R4, R7.
- **Engineer:** main concern — recommendations had to be grounded in the real engine API, not the
  design doc's assumptions; addressed by D1, the revised order, and named seams on every quick
  win. Findings feed D1, R4, R6, slice 0, and R10's tick/time-compression.
- **Adversary/QA:** main concern — without structural-vs-tuning tags and falsifiable kill-tests
  the report is opinion with headings; both adopted on every risk. Findings feed R5, R7, R8, R9, R12.
- **Player-experience:** main concern — the baseline had to match what actually runs on `dev`, and
  every fix had to declare pivot-constraint compatibility; both adopted. Findings feed R3, R10, R11.

Review #2 (4-persona, on this document as the diff) ran after the draft was written; its blockers
are fixed in this same commit and its verdicts are logged in PROGRESS.md alongside this file.
