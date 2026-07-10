# Game Design — the concept

Living design notes for the game. This is the **vision & mechanics** doc; `docs/ROADMAP.md`
tracks the art each feature needs. Written in the planning chat, refined feature-by-feature.

> Status: **core pivoted 2026-07-09 — see "The living guild" below.** Slice 1 (the per-quest
> **cut** loop) shipped and merged (PR #33/#34); on playing it the core was redesigned. The section
> immediately below is the **live vision**; the older numbered sections predate the pivot and are
> the **mechanics library** it reuses (reconciled as each slice lands). Engagement review:
> [`docs/ENGAGEMENT_REVIEW.md`](./ENGAGEMENT_REVIEW.md).

---

## The living guild — current vision (2026-07-09, supersedes the cut-loop core)

> **This section is the live top-of-doc vision and wins wherever an older numbered section still
> describes the per-quest cut as the primary lever.** The merged Slice 1 built a cut loop; on
> playing it, Stefan pivoted. The board, the seeded multi-beat resolver, and the animated report
> all **survive** as the scaffolding the new core reuses. Pressure-tested from four perspectives
> (Designer, Phone-UX, Engineer, Adversary) on 2026-07-09.

**The fantasy (sharpened).** You are the **businessman / bureaucrat** running a guild — the
"spreadsheet guy" who wants **fame, influence, and wealth**. You never command; you **invest and
shape conditions**. Reference: **Football Manager** (run the club, don't play; advance time, watch
the key moments) × **Majesty** (heroes are autonomous; you never order them) × a cozy business-sim
(Kairosoft) texture.

**The world is alive (the canvas — built first).** Heroes are **autonomous free agents who live
their lives** — rest, carouse, shop, train, heal — and go questing when they want fame or coin. A
party **gathers → reads the board → researches a quest to learn more → preps (shops, reads) →
applies → departs → quests over several days (branching; a failure can spawn more investigation) →
returns → decompresses**, then does it again. You watch, and you invest.

> *Resolution note (reuse vs. reactive):* near-term, a quest still resolves as a **sealed, seeded
> envelope** computed when the party departs (**reusing the shipped `resolveQuest`**) and revealed
> as the animated story on return — the "branching / spawns more investigation" is the party's own
> autonomous extension *inside that envelope*, narrated, not a mid-quest prompt. The clock's
> **auto-pause events are party-lifecycle and player-investment moments** (a party returns / wants
> backing; an upgrade you might buy) — **not** mid-quest player intervention. A genuinely *reactive*
> in-flight choice (you steering a party while it's out) is a **later, explicitly-flagged
> evolution** that would restructure the resolver into lazy per-beat events — deferred, not claimed
> as reuse.

**The player's hand — Majesty-style upgrades at fixed prices.** The recurring money decision is
**what to build/upgrade and who to equip** — buildings and gear, at **fixed prices (no
price-fiddling)**. It's a *read-driven bet*: gear the hero you've judged undervalued and
high-ceiling; raise the facility your roster actually needs. (This replaces Slice 1's per-quest
cut %, which "felt odd" — the odd part was the tuning knob, not the idea of a money-valued read.)
*(Who you can equip: gear is funded for **guild-affiliated** heroes, not any stranger; it's a
retention bet — a neglected geared hero can still **drift to a rival and take the investment with
them** (§8 roster clock / guardrail #4), so equipping doubles as loyalty-building. Whether the
older §3 hire/contract/release model survives is a slice-3 reconciliation.)*

**The economy — the flywheel.** Heroes keep their quest gold and **spend it at your fixed-price
facilities** (shop, tavern, training, healing, library) — that's your **main income** — plus a
small flat **~10% brokerage cut** on completed quests and **building passive**. Upkeep is the burn.
*(This means hero earn/spend is now **tracked** — superseding §12's "hero wallets are not tracked in
v1"; a hero holds coin, spends a slice of it at whichever of your facilities exists and serves the
need, and that spend lands in the treasury. The exact wallet/spend model is a build-slice detail.)*
The loop: **wealth → upgrades (buildings + gear) & influence → better heroes & outcomes → more
prosperity & spending → more wealth.** Prices are fixed; you grow income by growing the ecosystem,
not by tuning rates.

**Time — a play-primary living clock.** *(Amended on Stefan's 2nd play session — supersedes the
original "skip-primary" framing below.)* The spine is **Play** — a running clock with a speed
setting that **auto-pauses on decisions** — plus an explicit Pause. The single-event
"Advance / ▷" control retired from the UI (it survives in the sim as `advance`/`advanceUntilStop`
for tests). Original framing, kept for the record: an "Advance / ▷ to next event" control is the
spine; the running clock is an optional lean-in overlay. Simulated time is **fully decoupled from real time** — you control the clock, it
never controls you; backgrounding the app is safe, and reopening does a **lazy catch-up** to a
single digest. Engineering: an **event-queue on integer sim-ticks**. Its *seed* already exists — the
precompute-at-dispatch / reveal-at-return `Assignment`, the seeded RNG, and the pure-reducer +
persistence discipline (verified against `endDay.ts`/`seed.ts`/`persist.ts`). The **daily-batch
loop itself is restructured** into per-event handlers — a real refactor, not a free generalization,
but the determinism/persistence backbone carries over unchanged.

**The living-world surface — a Hall Feed, not an animated map.** The world's life shows as a
**collapsible feed** in three registers — **ambient** (flavour: "Wren and Doran drank again";
collapsed by default), **notable** (a reveal / relationship shift; tappable), **decision** (an
event that auto-pauses and asks for you). Reveals still arrive as **mail**; quest outcomes still
replay through the animated **story stage** (§4/§10). The map stays a *state* view
(fog / influence / nodes), never a life-animation.

**UI — clarity via Kenney icons.** Legibility uses a **Kenney icon set**, not ambiguous abstract
marks. *(PR #32 shipped Kenney's border **frame**; the living-canvas slice adopted **Board Game
Icons** (11 glyphs, CC0, mask-tinted via the kit `Icon`) for activities / buildings / gold /
letters; feed registers read as row treatment (dim / normal / gold-boxed), not icons — see
`docs/kenney.md`.)* Concretely: challenge types
(investigation / travel / social / combat), buildings & gear, resource/stat glyphs, and the feed's
three registers each get a **recognisable icon + short label**, replacing Slice 1's hard-to-read
coloured-dot rows. Icons carry meaning; text confirms it; a tap expands the detail.

**How you lose (layered after the canvas).** The canvas is a *foundation*, not a void — it already
responds to your upgrade investments. Tension is added next: **neglect → your heroes drift to a
rival** (pre-rival: they quit the region, §8) and **over-investing → bankruptcy** (the cash clock /
charter that Slice 1 built but left unwired). "Canvas first, then arm the loss" is the deliberate
order.

**Report & challenges v2 — Stefan's spec (2026-07-10, the next slice).** Recorded from his
second play session; builds on the shipped check-meter:

- **Challenge types v2:** Investigation/Research · Travel · Mystic/Occult · Social/Politics ·
  Craft/Labor (clear rubble, build, rescue work) · Combat · Infiltration. A challenge can
  combine **two or more types at different levels** ("research the evil archmage" =
  Investigation 60 + Occult 55) on a **~0–100 difficulty scale** (superseding today's 6–18).
  Quest skulls stay ≈ the max across its challenges (possibly trimming outliers). His quest-card
  mockup, verbatim:

  > Find the green cat 💀💀
  > ⌛ 2++ days
  > From: Jalk Chozop, antiquarian
  > 🔎 Investigation 💀💀
  > 🏞 Travel 💀💀
  > 🔪 Combat 💀
  >
  > (with the Kenney icons)
- **Per-hero resolution:** every participating hero rolls the challenge — **one bar per hero,
  filling simultaneously**. Challenges declare participation ("all must sneak" / "two may sneak
  — then only those two fight the next challenge"). A **crit can assist the next check or cover
  a teammate's failure**. Traits/gear/skills shift a hero's zone thresholds (~±5% per relevant
  trait) — visible in the bar's benchmark positions.
- **Quest pages + clickable everything:** every quest/party/hero mention (feed, quests card,
  strip) navigates to its page; popups get an X, pages get a back arrow. The quest page shows
  the challenge list and, below, the assigned party — with **the guild's ESTIMATE of which
  challenges look easy/hard for them** (never ground truth — this is the guardrail-#2 read).
- **Outcome v2:** Result (main) → total reward (secondary) → extra loot (tertiary) → headers
  for **injuries**, **new traits**, **relationship changes** ("Party cohesion −12, major
  setback" · "Rudolf → Xerxes +4, combat heroics" · "All → Brynolf −8, fled during combat").
  The guild cut stays out of this screen (economy report instead).
- **Economy report:** total income view, tap-to-drill by source (sales / tavern / quests / …).

**Design guardrails (the four kill-tests every later slice must pass):**
1. **Not a spectator** — each session has a legible moment where *your* read/investment changed an
   outcome (the report says *why* your call mattered).
2. **No decision vacuum** — a money-valued, knowledge-priced decision is always live (the upgrade
   bets); reading heroes always has something to buy. *(The R2-successor kill-test, to run when
   slice 2's CV-priced upgrades land: simulate 20 days, an informed investor (ground-truth hero
   reads) vs a blind investor at equal spend — informed must lead by **≥ +40g/day equivalent**
   (the cut's old Ruins squeeze was ~+60g/day gross), and the report must say WHY the call paid.
   If the delta is ~0, slice 2 must not ship. The living-canvas tavern is deliberately
   knowledge-FREE — its test is guardrails #1/#3, not this one.)*
3. **Not a screensaver** — the world visibly responds to the player, and a run is eventually
   *losable*.
4. **No snowball / stall** — the flywheel has governors (your best heroes are the rival's poaching
   targets; escalation / doom raises the floor faster than passive income).
5. **Allocation stays a tradeoff** — there is always more worth buying (upgrades, gear, backing)
   than the treasury can afford *this cycle*, so the one live lever never degrades from a tense
   choice into a shopping checklist once income compounds.

Build the **canvas first**, then the **businessman's hand**, then **tension** — see the re-sliced
"How we build" order at the bottom. Everything below this section predates the pivot; treat it as
the mechanics library the new core draws from, reconciled as each slice lands.

---

## 1. The fantasy

> *Pivot note (2026-07-09): "taking a cut" below is superseded — the guild's business is now
> running the ecosystem heroes base out of (facilities + brokerage + a flat ~10% cut), not skimming
> each reward. See "The living guild" above.*

You are a **guild master — a bureaucrat and businessman**, not a hero and not a general. You run a
guild whose business is placing adventuring parties on quests and taking a cut of the reward and loot.

You **never command anyone.** You *fund, incentivize, and read reports.* The heroes are autonomous;
your job is to shape the conditions they choose inside, and to fight fog-of-war to even see what's
happening.

Reference point: **Majesty (2000)** — you can't order heroes, you post bounties and they decide if
the pay is worth the risk.

## 2. The core loop

> *Pivot note (2026-07-09): the loop diagram below is the original battle-centric framing. Under
> "The living guild," the economy leg is now **hero spending + your upgrade investments**, not
> "price bounties & hires"; and battle stays the truth oracle but isn't watchable until the
> fidelity/replay slice.*

The **battle system is the core** — it's both the show the player watches *and* the truth oracle
everything else depends on. One closed loop:

```
battle (ground truth)
  → corrects a hero's faked CV & reveals real traits   (information)
  → lets you price bounties & hires correctly           (economy)
  → funds the influence you hold                         (presence)
  → buys higher-fidelity battle reports                  (back to battle)
```

The player's joy is watching heroes level up and follow their journeys — at whatever fidelity their
presence has earned.

## 3. The player's levers (only two, plus soft spends below)

> *Pivot note (2026-07-09): the primary lever is now **Majesty-style building & gear upgrades at
> fixed prices** (see "The living guild"). The bounty/cut described here retires to a flat ~10%
> brokerage constant; introductions, guild-management spends, and intel remain the soft nudges.*

1. **Bounties** — post/raise a reward on a quest to attract a party. A hero's **desired pay is
   known** (their posted ask); what's uncertain is whether they're *worth* it — see §5's
   gold/stats-ratio pricing. Money is how you pull; **knowledge is the lever** that tells you
   whether the price is right (a greedy hero chases pay; a proud one refuses quests "beneath" him
   — see §6's quest-choice factors). That known ask is the *hiring* price; how thin a quest
   *split* a party will tolerate is a separate, **hidden** appetite — see §12. **Sequencing:**
   the quest board + player-set cut (§12) ships first, in Slice 1; the bounty top-up joins at
   slice 4 and *composes with* the cut (it sweetens the heroes' share of the pool), never
   replaces it.
   - **Contracts.** Hiring isn't one-shot. A hired hero's contract comes up for renewal on a
     cycle: renew at current terms, renegotiate your cut, or release. Every report you read
     between renewals informs the next one — this is what makes ongoing CV knowledge keep paying
     off, not just the first hire. (An extension of the bounty/hiring lever, not a third lever.)
2. **Influence** — a per-Area stat you pour money into, with **ongoing upkeep**. Raising it buys
   report fidelity (§4) and contests rival guilds; let it lapse and it decays. **No pieces to move
   on the map** — a bureaucrat funds things, he doesn't sneak through forests.

Everything below is a soft nudge or a spend, not a third lever:

- **Introductions.** Pay to host a meeting between two heroes (or a hero and a party), nudging
  their relationship forward. Never a command — a hero can **refuse** for trait reasons you may
  not have discovered yet ("he won't work with a Coward" — before you knew he was one). A refused
  introduction costs less than an accepted one (a flat "asking around" fee, not the full hosting
  cost), so a bad guess isn't fully punishing. See §6.
- **Guild management** — gold-denominated spends, no new tracked resource, that give the player
  something to *do* while parties are out on quests:
  - **Gear programs** — fund a hero's equipment upgrade; raises their real stats.
  - **Training** — invest in a hero's growth; shapes which stats improve over time.
  - **Guild events** — morale gatherings; raise cooperation across the roster, blunting the
    roster clock (§8).
  - **Employee perks** — standing benefits that raise retention: heroes are likelier to renew,
    less likely to defect — also blunting the roster clock.
  - **Intel** — buy a one-off certainty boost on a specific hero's CV: nudges it one step
    (rumor → claimed), never straight to battle-verified, and priced to scale with the hire's
    ask so it can't be spammed across the whole roster. It narrows a guess; it can't manufacture
    the earned, battle-verified CV that only real performance produces (§5).

(Deferred, not v1: a *tiny* number of named "specialist" agents for special actions, if the game
ever feels facelessly mechanical.)

## 4. Report fidelity = presence

**Ground truth is always calculated for real** — every quest, combat or not, resolves as a real
simulation against the party's attributes (see §10). Fidelity is not a visibility gate on whether
something happened; it's the **interpretation layer** — how much of what really happened you get
to see, and in what form.

| Presence | What you get |
| --- | --- |
| None | A rumor stream — evocative, occasionally *wrong* (an unreliable in-world source; corrected later by ground truth). Never silence. |
| Some influence | A summary — casualties, close calls, headline beats. *"Cleared the crypt; the mage nearly died to a trap."* |
| Embedded / high | The full beat-by-beat sequence; combat beats replay through the existing Combat Test renderer (no new animation tech required), non-combat beats render as simplified iconography. |

The home Area carries a free, non-decaying baseline (at least the summary tier) so zero-influence
never means a blank screen — the punishment for being poor is being less informed, never being
unable to watch.

**Reveals are delivered as mail**, opened one envelope at a time, regardless of fidelity tier —
fidelity controls how *much detail* a reveal carries; mail is *how* it's packaged and delivered. A
CV correction stamps the stat chip (red **INFLATED** strike-through / green **UNDERSOLD** —
celebrate the bargain case too); a trait icon slides into its empty **"?" socket** (§5 — visually
distinct from a CV's rumor "?") with the sentence that triggered it; a level-up flashes the hero's
existing sprite. These are the game's reward beats in a game where the player never acts
directly — they need to read as events, not text.

This makes information asymmetry the **reward** for spending on influence, and gives the player a
reason to *want* a better seat.

> **Sequencing note (Slice 1, PR #33).** §2's thesis stands — the battle system is the core and
> the truth oracle. But Slice 1 ships with **no watchable/engine combat**; its reveals are carried
> entirely by the **report as an animated story** (the summary-tier envelope opened one beat at a
> time), so the report — not a live fight — is Slice 1's drama channel. The live show (seed-replay
> through the Combat Test renderer) is slice 2. This is a *sequencing* choice, not a demotion of
> the battle core.

## 5. Heroes — autonomous, trait-driven

- **Autonomous.** They decide, prepare, and go. You influence, never order.
- **Attribute depth: sim-full, UI-lean.** The full attribute spread drives the simulation — combat
  and the non-combat beats of §10 alike. CVs and hero sheets surface only 3–4 headline stats plus
  equipment; the rest exists in the sim but never clutters the card. The hero sheet is **tabbed**
  (Character — the lean headline attributes + trait sockets; Gear; Bonds; and later Career and
  Skills), so the front stays lean while detail lives behind tabs; any chip is **tap-to-inspect**
  for its effect. The Character tab surfaces only the attributes the sim actually uses today
  (str/dex/sta/per), never a full attribute table.
- **Traits as icons (CK-style),** revealed one at a time — more surface the longer a hero's around
  and the more presence you have. New ones appear under stress: *"Coward — revealed after he fled the
  crypt."* Undiscovered traits render as dim **"?" sockets** (visually distinct from a CV's rumor
  "?" below) — discovery is visible loot, delivered as mail (§4).
- **Exaggerated CVs (keystone mechanic).** A recruit's advertised stats can be **inflated**.
  Certainty is encoded *in* the stat chip itself — solid fill = battle-verified, hatched = claimed,
  a plain **"?"** = pure rumor — one visual treatment, not a second icon. A hero's **asking price
  is known** (their *hiring* price — the per-quest split appetite of §12 is separate and hidden);
  what's uncertain is whether they're worth it. That's the real decision: a
  **gold/stats ratio** — their ask against your certainty-*weighted* estimate of their stats, not
  their raw claimed number, so a hatched or rumor stat is worth less in the ratio than a solid
  one until battle (or Intel, within its limits — §3) firms it up. Certainty isn't cosmetic: hire
  on a low-certainty estimate and if the truth comes in worse, you paid full price for a hero who
  under-delivers — weaker quest outcomes, not just a delayed correction. The **battle report is
  the lie detector** — real performance corrects the CV over time (speed and precision of
  correction scale with fidelity tier, so the lie detector is never free).
  **Proven heroes aren't a market category — they're made, not bought.** The recruit pool is
  unknowns by construction; there's no "proven-but-modest" hero for sale. A proven veteran is what
  *your own* corrected CVs produce over time, and a public track record invites the rival to bid
  for them too (§7). The player's **very first few recruits overall** — a one-time early-game
  training wheel, not a recurring perk for any newly met hero — carry a small, decaying cap on how
  far their CVs can be inflated, so an early fraud can't end a run before the player has learned
  the systems; it stops applying once that early window has passed. A capped CV still reads as
  *estimated*, never *verified*: it bounds the damage of a bad first hire without ever becoming a
  cheap substitute for an earned veteran.
- **Relationships.** Heroes meet and interact whenever they share a space; each meeting shifts
  their relation, visible on the hero sheet as relation chips (not a web — unrenderable on
  phone). Each tie is a **−100…+100 score surfaced as a named feeling band** (Adoration ·
  Fondness · Friendly · Cordial · Indifferent · Cool · Wary · Resentment · Loathing), coloured by
  valence and grouped by target — **to the guild** (retention, §8, shown as its own distinct
  card), **to their party** (cohesion, §6), and **to other heroes** (one row each, with a jump to
  that hero's sheet). On top of the band a tie may carry a **variant flavour** — a named
  relationship *kind* from a per-tier pool (e.g. positive: comrade · drinking buddy · mentor ·
  gossip partner; negative: rival · feud · grudge — an illustrative, expandable set). The **score/band is the intensity; the variant is
  flavour** and always respects valence (a "rival" only sits in a negative band); a tie with no
  variant falls back to its band feeling. The map becomes spatially social — *where* heroes loiter
  matters. Formation is also actively brokered — see §3's **introductions** and §6.

> **UI principle — selection state earns its keep.** Only show a persistent selected/open state on
> a control when an *action* needs that selection held, or when the control's **own surface** holds
> the revealed detail inline (an expander/accordion). When a *separate, transient* element carries
> the detail — as the inspect popover does, anchored by its caret to the tapped chip — the response
> itself is the feedback; the chip keeps no sticky ring. A highlight that outlives the moment it
> explains is noise.

## 6. Parties — formed organically, not assigned

- Heroes **form their own parties** out of the relationships they've built. Lone wolves exist —
  a solo hero grinds rat-tier quests in the sewers for a living, and solo quests alone must
  sustain minimum upkeep so party formation is how you *win*, never the only way to not *lose*.
- **Why anyone teams up: difficulty gating.** Good pay is locked behind party-only quests, so a
  hero's greed/ambition is the engine that pushes them to seek allies. That's the pull that makes
  party formation happen.
- **Introductions (§3) drive it.** Relationships built purely by incidental co-location are
  invisible and can stall, so the player has a direct tool: pay to host a meeting. Refusal (for
  trait reasons not yet discovered) is a CV correction in disguise, not a dead end.
- **The unstick path.** A broke early guild is never stuck: the solo-quest upkeep floor above
  (in Slice 1 as built, concretely the always-available **standing jobs** — guard the hall / help
  the city watch, §9/§12 — that any idle party takes) keeps gold trickling in even with zero
  hires, which is eventually enough to afford an introduction — and relationships also build for
  free from simple co-location, so paid introductions accelerate formation, they're not the only
  route to it.
- **Cohesion modifier.** A party that gets along gets a bonus to performance; two members who hate
  each other drag the party's relation score (and its odds) down.
- **The boss.** Each party has a leader whose preferences carry **stronger weight** in decisions.
  To sway a party, sway its boss — a bounty tuned to the boss's greed moves the whole team. In
  party combat (§10/§11), the boss's preference also orders which member the resolver sends in
  first.
- **Quest choice factors:** type, personal preference, pay (bounty), difficulty, and the boss's
  weighted vote.

> **UI note — the Parties-primary Heroes view (scaffolding).** The roster leads with parties (each
> a bordered card wrapping its members, boss marked), then heroes not yet in one. Card values are
> the guild-master's **estimate**, not ground truth (§4/§5), and map thus: **Fame** → a hero's
> battle-verified public track record (§5) that the rival bids against (§7); **Cohesion** → the §6
> gets-along modifier; **Morale** → §8 retention, also surfaced *per member* (a mood cue from the
> to-guild bond) so one at-risk hero isn't hidden by the party average; **Rating** → a §5
> **certainty-weighted** aggregate of members' CVs (verified counts fully, claimed is discounted,
> rumor is excluded), shown as an estimate. The location/activity line is an observed report and the plan is
> the party's own **intent** (you observe, you don't command). The disabled **"Sway the boss"**
> affordance stands in for the Slice 4–5 party lever (influence a party *through its boss*) without
> a live mechanic. Values, party membership, and the 0–5 rating cap are tunable mock defaults.

## 7. The rival guild(s) — a mirror of you

Start with **one rival, visible early a few nodes away**; more come with later maps/levels. The
rival runs the *same* playbook you do — bids on quests, holds influence, recruits — which creates
friction for free (see the v1 implementation note below for how a scripted bidder still delivers
this). **Hard invariant: the rival is fog-bound exactly like the player** — its
decisions consume only its own influence-filtered view of the world, never the true simulation
state. This must be a testable property, not a promise, or the rival reads as a cheating black box.

- **Bidding wars** — you both post bounties on the same quest; the better offer (higher, or better
  targeted to the hero's greed) wins.
- **Poaching** — a neglected hero of yours can defect to them; conversely *you* can grab a secretly
  great hero the rival undervalued because you read the CV better. **Info asymmetry becomes a
  hiring edge.** A hero with a *public* track record (§5) is exactly the kind the rival will bid
  for too.
- **Contested Areas** — influence is a tug-of-war, not just a purchase. Where you hold influence,
  you see the rival's bounties before heroes decide — **influence doubles as
  counterintelligence**.
- **Losses are explained.** Every quest or hero lost to the rival generates a line in your reports
  ("Torvald took their contract — 20% more gold, and he's Greedy") so losses teach instead of
  gaslight.
- **v1 rival is a scripted budget bidder** with 2–3 legible rules (e.g. outbid by X% above value
  Y; poach heroes idle more than N days) — not a literal mirror simulation. It reads its own
  fog-limited CV estimate for a hero, same as the player, so it can misjudge a hero too — the
  poaching flavor above holds even against a scripted v1. Indistinguishable from a "real" rival
  for the first many hours, and far cheaper to build correctly.

## 8. How you lose — three clocks at three speeds

| Clock | Speed | Threat |
| --- | --- | --- |
| **Cash** | Fast (every turn) | Upkeep + your **upgrade/gear investments** vs. hero spending + the flat brokerage cut + passive. **Over-invest → debt → charter revoked** (the primary bankruptcy path under the pivot). |
| **Roster** | Medium | Angry/neglected heroes defect to a rival (or quit the region, pre-rival). Self-inflicted. |
| **Doom** | Slow (campaign) | A big-bad event spreads across Areas, broadcast coarsely regardless of influence. The finish line the rival also races toward. |

Bankruptcy is the spine; the other two funnel into it.

- **Cash in detail.** Over-extending triggers **debt** — a forced loan, with interest, that
  accelerates the clock. **5 consecutive insolvent end-days after the loan → charter revoked**
  (game over). That's the whole of "bankruptcy" here: one warning stage, not an instant wipe.
  Concrete v1 numbers — starting gold, upkeep, the passive trickle, loan terms, and the worked
  comeback math — live in **§12**. The home Area's free fidelity floor (§4) and the small
  guaranteed Guild Hall passive cut mean zero-cash is always "poor and squinting," never "blind
  and starving."
- **Roster in detail.** Before the rival exists in the build (pre-slice 6), neglected heroes
  simply quit the region — same pressure, no rival dependency.
- **Doom in detail.** Refugees arriving at the Village, an Area's silhouette visibly darkening,
  quest pay spiking nearby, scripted threshold events with a stated runway ("spills into the
  valley within ~12 days"). Fog hides *detail and counterplay options*, never the threat's
  existence — a doom you first learn about when it's already unwinnable is a bug, not drama. The
  macro stakes are *why guilds exist*.

## 9. The map — Areas revealed by influence

Two zoom tiers, so the map is never bloated:

- **Zoomed out:** the world is a handful of **Areas**, each with a fog/influence level; mostly
  silhouettes.
- **Zoomed in (only where you have influence):** an Area reveals its **few** meaningful nodes.
  Detail is *earned* by influence — which is the core loop again.

**Node types** (a node earns its place only if it offers a decision or info you can't get elsewhere):

- **Quest site** — heroes fight here. Your verbs: raise a bounty, buy influence to see it better.
  **Temporary — quest nodes pop up anywhere on the map and expire.** They also *reactivate as
  faucets, not cups* (see below), with a state arc rather than a respawn timer. A quest's beats
  may span other locations — its arc still advances here (§10).
- **Fixed nodes** — the home Area's permanent buildings (guild hall, village).
- **Foreign / uncontrolled** — invest influence to peel back its fog and unlock its quests.

**Quest-node behaviours (locked: depth + escalation; prestige parked):**
- **Depth** (e.g. the Ruins) — clear the entrance, deeper/harder/better-paying quests unlock;
  eventually "fully excavated" and goes quiet. The progression ladder heroes level up on.
- **Escalation** (e.g. the Graveyard) — ignore it and the threat grows on its own, spills into
  neighbouring Areas, feeds the **doom clock**. Tend it or it worsens.
- **Standing jobs** (Slice 1, PR #33) — always-available, **non-exclusive** civic work tied to
  the home fixed nodes: *guard the Guild Hall*, *help the city watch*. Low, near-guaranteed pay;
  any idle party (including a lone hero) can take one each day. This is the concrete **survival
  floor** (§12) — it replaces the abstract "a road-tier job is always on offer" guarantee and
  kills idle dead-time. Because it isn't scarce, "multiple parties do the same job" carries no
  conflict.

**Economy — gold only (v1).** No multi-resource system; a guild master thinks in gold. ~~Income is
your cut of hero rewards.~~ *(Pivot 2026-07-09: income is now **hero spending at your facilities**
(main) + a flat ~10% brokerage + building passive — see "The living guild".)* The full money model —
the free quest board, the player-set cut, and
the Slice 1 number sheet — is **§12**. Multi-resource gathering is parked (see "Ideas parked").

**The first playable map** = the home Area with three nodes: **Guild Hall** (`home-keep`, your seat),
**Village** (`settlement`, civic hub), and a **Ruins** quest node (new). Not a sprawling many-node
city — density is earned later, not front-loaded.

## 10. Quests — multi-step by design

A quest reads to the player as a **story with stakes**, not a single dice roll: the party
investigates, tracks, sneaks, negotiates, and sometimes fights, and a quest can span **multiple
locations**, not just the node where it was posted. This is what gives the full attribute spread
(§5) work to do outside combat — Per, Int, Cha and the rest all matter somewhere.

- **Every beat is a real, seeded resolution** against the party's attributes — never flavor text
  wrapped around a single "real" check. The beat-by-beat log (§4's high-fidelity tier) never
  describes something that didn't happen — low-fidelity rumor narration can still be wrong (§4);
  what's real is the simulation underneath, not every tier's retelling of it.
- **Beat-type dispatch (v1 minimal vocabulary — grows later):**

  | Beat | Resolves via | Notes |
  | --- | --- | --- |
  | Combat | The combat engine (frozen except the sanctioned §11 seam), through the resolver | Composed sequential duels — one engine instance per party member (§6, §11). |
  | Investigation / tracking / negotiation | The quest-resolver layer, outside the core | Seeded check against the relevant attribute(s). |
  | Sneaking / planning | The quest-resolver layer, outside the core | Same as above; can escalate to a combat beat. |

  Any beat type not yet in this table defaults to resolver-layer (never silently routed to the
  combat engine) until it's explicitly added here.

  - **Slice 1 as built (PR #33):** *every* beat — combat included — resolves at the resolver
    layer as a **graded skill-vs-difficulty roll** (crit/good/ok/poor/fail against one of the
    four real attributes str/dex/sta/per), with **inter-beat modifiers** (a strong result eases
    the next beat), **forced branches** (a critical fail triggers a harder recovery beat; failing
    *that* fails the quest), **trait cut-ins** (Pell's Coward balks at combat, Wren's Wayfarer
    eases travel), and **one optional bonus beat** unlocked by a strong mid-quest result. **No
    `CombatEngine` instance is created in Slice 1** — the D1a seam (§11) stays approved-but-unused.
    The uniform graded-roll model is what lets every beat emit a comparable outcome the next beat
    can read. **The combat beat gains real engine fidelity at slice 2** (the seed-replay viewer),
    where it deep-resolves through `CombatEngine` while still emitting a graded outcome for
    composition — a deliberate slice-2 upgrade, not a contradiction of the Slice 1 story.
  - **Combat beats:** the resolver runs one engine instance per party member, stack allocation
    and send-in order set by cohesion + the boss's preference (§6), interleaving results into one
    adventure log — never extends the engine's single-hero model (§11).
  - **Investigation/tracking/negotiation:** check the relevant attribute(s) — Per/Int for
    tracking, Cha/Int for negotiation, etc.
  - **Sneaking can escalate:** a failed sneak becomes a combat beat, same location, continuing
    the sequence rather than restarting it (shared seed via the engine's constructor `rng`
    parameter — see §11, not a `FightConfig` field). This can produce a near-certain loss for a
    party with no combat-capable member; that's an intentional tuning question for a later slice,
    not an oversight.
- **The adventure envelope is the quest's real structure, not dressing** —
  `AdventureLog = { beats: Beat[] }`, each beat carrying its own location, type, and outcome;
  combat beats additionally carry the engine's event stream. Report fidelity tiers (§4) are exact
  filters/aggregations over this envelope.
- **One node's arc, regardless of beat locations.** A quest's depth/escalation progress (§9)
  advances at the node where it was **posted**, even when its beats are narrated across other
  locations — "other locations" is beat-level flavor within one quest's arc, not a claim that
  multiple nodes progress at once.
- **Scope note:** this is the single biggest expansion of v1 scope surfaced by the design
  interview. The beat-type table above *is* the v1 minimal vocabulary — the full beat roster
  (more investigation sub-types, more escalation paths) grows session by session, the same way
  node types and hero traits do.

## 11. Engine seam decisions (hard-stop exceptions)

CLAUDE.md's hard stop is "no modifying the combat core." One sanctioned exception is recorded
here — **approved, not yet implemented** — per that stop's own requirement to declare structural
changes before executing:

- **2026-07-02 — D1a approved (Stefan).** `FightConfig` (`web/src/game/battle/engine.ts`) gains
  an optional `hero: UnitTemplate` field alongside the existing `heroTier`. Scope: the engine
  constructor's hero lookup (currently `HERO_TEMPLATES[config.heroTier]`) and the hero-name
  lookup in `web/src/ui/combat/useCombatClock.ts` (currently
  `HERO_TEMPLATES[config.heroTier].name`) both read `config.hero` first and fall back to
  `HERO_TEMPLATES[config.heroTier]` only if it's absent — **`hero` wins when both are present.**
  Debug UI (`ConfigPanel`, `CombatTestScreen`) is unaffected; it never sets `hero`, so it keeps
  using tiers exactly as today. Additive, backward-compatible, test-preserving; the one change
  needed to make the CV mechanic (§5) and hero-specific battles possible at all. Injected hero
  templates must keep `side: "hero"`. A shared seed for replays (§10) reuses `CombatEngine`'s
  existing constructor `rng` parameter (`new CombatEngine(config, mulberry32(seed))`) — no new
  `FightConfig` field needed for that.
- **Parties do not get a second exception.** The engine remains single-hero
  (`this.hero: Combatant`, one `HERO_CELL`); party combat resolves as composed sequential duels
  at the resolver layer (§10), never as a multi-combatant engine. Any future need for true
  simultaneous multi-hero combat requires its own dated sign-off entry here — it is **not**
  pre-authorized by D1a.

No other combat-core changes are authorized by this doc.

## 12. The economy — gold, the board, and your cut (v1 numbers)

> *Pivot note (2026-07-09): the player-set cut and its number sheet below are **superseded** as the
> core model. New economy (see "The living guild"): income = **hero spending at your fixed-price
> facilities** (main) + a flat **~10% brokerage cut** + **building passive**; upkeep is the burn;
> the player grows income by **investing in upgrades**, never by tuning rates. The
> cut-as-priced-decision does not survive. *(2nd amendment: quest pay is now FLAT — road 350g,
> ruins 700g, standing 25g; duration costs time, never adds gold — superseding this section's
> per-day number sheet, "reward × duration", and the 200g/600g figures below.)* *(Amended in the living-canvas build: the acceptance /
> appetite / observation-bracket machinery is **dormant** this slice, not live — with a flat 10%
> brokerage every share is 90%, so ask-vs-share acceptance is degenerate; quest choice is
> motivation-driven (wallet need + a seeded fame urge, `life.ts`). The ask data survives in
> roster.ts, where its null entries still gate structural eligibility, and the appetite/
> observation machinery returns when postings carry variable terms again — slice-4 bounty
> top-ups.)*

The concrete money model and Slice 1 number sheet, decided 2026-07-05. §3's lever sequencing,
§8's cash clock, and §9's gold-only rule read from here. All absolutes are straw defaults tuned
for feel; the **ratios are the design** — retuning a number is free, breaking a ratio is a
design change.

### Where gold flows

Quests come **to** the guild — givers arrive as letters/petitioners at the Guild Hall (the §4
mail motif) — and you choose what goes up on your board. **Posting is free; there is no posting
fee.** The priced decision is your **cut**.

```
QUEST GIVERS (the world)
   └─ reward pool per quest  (negotiating it with the giver is a parked later lever)
        ├─ heroes' share = reward × (1 − cut)
        └─ YOUR CUT      = reward × cut      ← set when you post to the board
TREASURY
   ├─ OUT: daily upkeep            (the §8 cash clock)
   └─ IN:  Guild Hall passive cut  (the §8 floor)
```

Hero wallets are not tracked in v1 — the report says "Bryn pocketed 140g" as flavor only.
*(Superseded by the pivot: hero wallets/spending **are** now tracked, since hero spending is the
main income — see "The living guild.")* The "Where gold flows" diagram above shows only the old
`YOUR CUT` + passive inflows; under the pivot the main treasury inflow is **hero spending**, and the
diagram is superseded.

### The cut — Slice 1's priced decision

- Base **30%**, adjusted per posting with four buttons **−10 / −5 / +5 / +10** → a **20–40%**
  range. A live posting's cut can be revised **once per day**; a revision made during a day
  applies to that night's acceptance roll — a mispriced posting costs at least a day, never the
  whole rot window.
- **Acceptance model.** Each party carries a **hidden ask** per quest tier — the smallest share
  it will take — fixed per run within **±5 cut-points** of its tier anchor, plus **±2 cut-points**
  of day-to-day mood noise. While a quest sits on the board, acceptance is checked **once per
  end-day**: the party bites if its share clears its ask. The anchors are design-intent *per-day*
  averages across the roster band:

  | Quest | accepts @20% | @30% | @40% |
  | --- | --- | --- | --- |
  | Road job | ~95% | ~90% | ~65% |
  | Ruins | ~90% | ~75% | ~45% |

  **Blind play is base-optimal by design** — on these anchors, 30% has the best expected value
  on both quests when you know nothing. Deviating only pays once knowledge brackets a party's
  ask; that asymmetry *is* the R2 payoff (`ENGAGEMENT_REVIEW.md`).
- **The hidden ask is not §3/§5's known asking price.** A hero's *hiring* ask (the posted price
  to join your guild) is public; the per-quest *split tolerance* is a hidden appetite you learn
  (below). Two numbers, one hero — "ask is known" in this doc always means the hiring price.
- **Squeeze payoff (Ruins-specific).** Knowing a party bites at 40% instead of 30% is worth
  **~+60g per completed Ruins day** (a gross cut delta — only ~+20g on the road job) — knowledge
  as literal gold; the R2 kill-test in one line. *(Pivot caveat: this R2 payoff is **cut-based** and
  retires with the cut. `ENGAGEMENT_REVIEW.md` predates the pivot; guardrail #2 asserts the
  **upgrade bet** carries the same knowledge→gold payoff, but that hasn't been re-validated with a
  kill-test yet — it's an explicit to-prove for the "businessman's hand" slice.)*

### What you know, per slice

The acceptance-likelihood readout is knowledge-gated from day one, but Slice 1 must not depend
on later slices' systems. Its knowledge sources are free-tier native:

- **Observation brackets.** Every accept/decline at a known cut brackets that party's ask
  ("declined at 35% → they want more than a 65% share"). The board shows the learned bracket as
  a qualitative **appetite chip**: *unknown appetite* → *eager / might pass / won't bite*. Always
  worded around *taking the job* — never "risky", which would read as quest danger next to the
  Ruins — and never a bare "?" (§4/§5 already police two other unknown-markers).
- **Report lines.** The end-day summary *occasionally* volunteers the other side of the bracket —
  "they'd have taken less" / "Bryn grumbled the split was thin" — the free tier's coarse cousin
  of R2's "overpaid by ~40g" feedback. Occasional, not every day: free knowledge stays coarse
  and slow.

Slice 2 (fidelity tiers) sharpens the precision and speed of both; slice 5 (presence) gates how
far from home you get them at all. The ±2-point daily noise means free brackets never converge
past a ~4-point band — that residual band, and how fast it tightens, is what the paid tiers
sell.

### Slice 1 resolution model (so the build session invents nothing)

> **Reshaped in the Slice 1 build (PR #33).** The interview replaced the
> single-fixed-party model below with a **3-party board** (see "Slice 1 as built"
> at the end of §12). The tick order, refresh cadence, and visibility rules here
> all still hold; what changed is that *three* fixed parties bid and the cut dials
> *which* one takes a scarce quest. Read the two together.

- The 3 pre-made heroes are **one fixed party**; parties-as-a-system is slice 4.
  *(Superseded — Slice 1 ships 3 fixed parties; party* dynamics *— formation,
  cohesion, boss vote — remain slice 4.)*
- **A take is its own beat.** Acceptance at end-day N is a line in that night's mail; the party
  is out during day N+1; the outcome and payout land in end-day N+1's ledger. If the party would
  accept both quests on the same night it takes the **better expected share** — the expectation
  is the party's own, computed on its hidden ask and odds, never shown on the board (in practice
  it prefers the Ruins whenever it accepts both; a stub for slice 4's quest-choice factors).
- A posting **expires after ~3 days** untaken (the giver withdraws it).
- **Refresh.** A quest leaves the board the moment it is **taken** (or when it **rots**), and a
  fresh letter of the same tier arrives the next morning — so a replacement is postable while
  the party is still out, and because payouts precede acceptance rolls in the tick order below,
  a returning party can take the new job that same night: back-to-back workdays, no forced idle
  day (the road-only floor's +6g/day depends on this). A **failed** quest's letter also returns
  the next morning as the *same* quest — its failure count and any pay bump persist; only the
  ~3-day expiry clock resets. A road-tier job is always postable. *(Slice 1 as built: the road
  job is a **scarce, decline-able** posting, so the concrete §6 unstick floor is the always-
  available **standing jobs**, not the road job — see "Slice 1 as built" below and §9.)*
- **End-day tick order:** cut revisions apply → outcomes & payouts for the party that was out →
  acceptance rolls for board postings → passive trickle → upkeep → loan interest → forced
  auto-repay → loan disbursement (a fresh loan clears that day's insolvency) → insolvency check.
- **Every gold movement is visible, from Slice 1.** A minimal **treasury chip** (gold + runway)
  sits pinned on the map/board header — the slice 5 ledger strip's little sibling. The end-day
  report mail carries an itemized ledger block (one line per movement) and a runway line ("gold
  lasts ~N days at this burn"; when net is positive, "treasury growing +Xg/day"). A no-takers
  day is never silent — it produces its own line with a knowledge-gated cause ("no takers" →
  "no takers — the split looks thin to them"), and expiry arrives as a letter. §8's pressure
  only exists if it is *seen*.

### The number sheet

| Knob | Value | Role |
| --- | --- | --- |
| Starting gold | 1,000g | |
| Daily upkeep | −60g/day | The clock |
| Guild Hall passive | +20g/day | Idle net −40g/day ≈ 25-day runway |
| Road job | reward 200g → cut 40–80g | **Survival** — success ~85%; at 30% ≈ +6g/day net expected |
| Ruins | reward 600g → cut 120–240g | **Growth** — success 50–75% by party quality; a good day is +140g net |
| Rot / fail day | −40g | = the idle net, not a separate ledger line; the sting of greed or a bad read |

Safe ≈ survival, risky ≈ growth: the road job keeps you alive but must never fund influence
tiers; the Ruins is where reading CVs pays. **Margins are deliberately fat** — slice 2 (fidelity
tiers, ~10–20% of daily income) and slice 5 (influence upkeep, ~30–40%) are designed to eat
them. Do not tune Slice 1 razor-thin.

### Debt — the rescue window (§8's one warning stage)

Gold strictly below 0 at end-day (ending at exactly 0g is survivable and loan-free) → a forced
**600g loan**, delivered as a creditor's letter. Interest is a **flat 5%/day (30g/day) on
principal, never compounding**; one loan per run. **Insolvent** = gold < 0 at end-day *after*
interest; **5 consecutive insolvent end-days → charter revoked.** The loan **force-repays** (a
single 600g ledger line — you cannot hold a larger buffer instead) at the first end-day you can
pay it and still keep 200g. Worked comeback: post-loan idle burn is −70g/day and road-only is
~−24g/day — both losing, just slower — while one Ruins success is **+110g/day net of interest**;
one breaks the fall, roughly two clear the debt (best case: a small trigger deficit and
back-to-back successes). The loan is a last gamble a competent read of the roster can win — a
rescue *window*, not a comfort.

### When a quest fails — phased consequences

The full-game vision, phased so each piece lands with the slice that can represent it:

- **Slice 1:** no cut, and the quest reacts *story-based* — a one-line consequence, and the pay
  or difficulty shifts, or the giver withdraws. Bounded so failure never ratchets rewards: at
  most **one** pay bump per quest, difficulty rises with pay, and the giver withdraws after a
  second failure.
- **Slice 3 (hero arcs):** the hero loses fame; the guild–hero relation takes damage.
- **Slice 5 (influence):** the guild loses influence in the Area — your name was on the board.
- **Boss-tier (later):** heroes can **permadie against bosses** — locked design note. Boss
  quests are where the roster clock and the cash clock collide in a single decision.

### Continuity (nothing here gets ripped out later)

The cut % becomes the per-hero **negotiable contract term** at slice 3's renewals — the
contract sets that hero's *default and floor*, and the per-posting buttons survive, adjusting
around it. Slice 4's **bounty is a top-up to the reward pool** — it sweetens the heroes' share
to move a stubborn ask; it never replaces the cut. Board curation is honestly a **no-decision in Slice 1** (posting
is free, both quests always go up); it becomes live when heroes can stumble onto unposted quests
(parked, slice 4+).

### Slice 1 as built (PR #33) — the multi-party board

The single-fixed-party model above was the biggest thing the Slice 1 interview
changed, because with one party a cut is a shrug (the engagement review's R1/R2).
What shipped:

- **Three fixed parties bid** — a 3-hero (**The Iron Vigil**: Ysolt, Doran, Wren),
  a 2-hero (**The Free Blades**: Brok, Pell), and a lone hero (**Mira**). Fixed
  rosters; party *dynamics* stay slice 4.
- **Ask ⟂ quality (the tuning invariant).** A party's hidden ask is a *max tolerated
  cut*, anti-correlated with its quality: the strong, proud Iron Vigil bites the
  Ruins only at a low cut (≤ ~24%); the greedy Free Blades bite across the whole
  20–40% range but resolve weaker; lone Mira takes standing jobs only. So **the cut
  dials *which* party takes the Ruins** — a low cut lures the strong party for a
  thinner share, a high cut keeps more but sends the weaker one (higher fail risk).
  Reading appetite is now a gold decision (R2). Blind 30% is a fine default; learning
  a party's bracket is the payoff.
- **Scarce quests are awarded to one best-fit bidder** (highest quality that cleared
  its ask). Multiple parties *racing* the same scarce quest — and **exclusivity as a
  guild research upgrade** — is banked as a later pillar (see "the Scramble", Ideas
  parked).
- **Standing jobs** (guard the hall / help the city watch) — always-up, non-exclusive,
  low-pay survival work any idle party takes; this replaces the abstract "road job
  always on offer" floor (see §9). Guild take ≈ +8g/day each, so a roster grinding
  only standing work nets ≈ −16g/day (upkeep −60 + passive +20 + 3×8 standing) — the
  number sheet's "idle net −40g" is the *no-work-taken* case; in practice standing
  jobs raise the effective floor to ≈ −16g/day. It **slows** the cash clock, never
  reverses it (a floor, not a faucet) — the Ruins is still where you climb.
- **Rich multi-beat quests** resolve as graded skill-vs-difficulty rolls (§10), with
  inter-beat modifiers, forced branches on failure, trait cut-ins, and an optional
  bonus beat — no combat engine is called this slice.
- **Quest duration 1–3 days** (reward = daily_rate × duration, so per-day EV is
  stable); the party is out that long and the outcome lands atomically on return.
- **Loss is visible but unwired.** The cash clock, itemized ledger, and runway line
  all show (the §8 pressure is *seen*), but the debt event and charter revocation are
  defined and **not triggered** in Slice 1 — no game-over yet (it returns in a later
  slice). Number sheet as §12 (1,000g start, −60 upkeep, +20 passive); a good Ruins
  day still nets ~+140g.
- **The report is the drama channel** (§2/§4): a returning quest is a *sealed*
  mail envelope whose result is withheld until opened as an **animated story** (one
  beat per tap, tinted rolls, forced-branch + trait cut-ins). Live/engine combat and
  the seed-replay viewer arrive at slice 2.

---

## Ideas parked for later

Good ideas we've deliberately deferred to keep v1 small — recorded so they're not lost:

- **The Scramble + exclusivity research (slice 4/5).** Let **multiple parties (and the rival)
  race the same scarce quest** — first/best to the prize wins, the losers split or come away
  empty — instead of Slice 1's award-to-one-bidder. The signature case is three groups racing to
  the **lich's tomb**. You'd then **research *exclusivity*** as a guild upgrade to lock a chosen
  quest to your chosen party. The parallel-race + partial-reward machinery is real work, so Slice 1
  ships award-to-one and this lands alongside the rival.
- **Investigate-the-quest lever (slice 2–3).** Spend to learn a posted quest's beats/difficulty
  before it's taken, so heroes (and you) decide better — a second priced lever, so it waits (§12:
  one priced decision per slice). *(Distinct from the pivot's "a party **researches** a quest": that
  is the hero's **autonomous** prep behaviour surfaced in the Hall Feed as free information; this
  parked item is a **player** spend to buy that information directly.)*
- **Hero downtime (slice 3–4).** Between quests heroes rest, heal, train, carouse, and shop; a
  visible **plan of 2–3 candidate missions** they're weighing that you can **nudge** (the
  "recommend a quest" verb). Needs quest-choice factors (§6) and hero condition, both later.
- **Recruitment as party-driven + influenced (slice 3–4).** Parties recruit on their own; you can
  affect it; an external hire becomes a **contract negotiation** (§3 contracts).
- **Influence → a cut of gear upgrades.** Holding influence somewhere earns you a slice when heroes
  upgrade their gear there. Mechanism TBD.
- **Prestige / boss quest node** (the Lava Dungeon) — a marquee, repeatable high-tier threat.
- **Multi-resource economy** (wood/stone/food/iron, gather nodes) — the `resource-economy` ROADMAP
  milestone. Parked, not deleted.
- **Named specialist agents** — a tiny roster of dispatchable fixers, only if the faceless-influence
  model ever feels mechanical.
- **Heroes stumble onto unposted quests** (slice 4+, needs real quest-choice logic) — a quest you
  keep off the board can get done behind your back for **zero cut**, making board curation urgent
  instead of a formality (§12's continuity note).
- **Negotiate the reward with the quest giver** — a second priced lever on the other side of the
  pool. Deferred: one priced decision per slice; Slice 1's is the cut (§12).

### Polish backlog
- **Node selection effect.** The current highlight is functional but plain — replace with a prettier
  selection treatment (soft glow / animated ring / gentle pulse) that matches the painterly map.

## How we build

Planning stays in the design chat. Each feature ships as its **own Claude Code session**, kicked off
with a prompt drafted in that chat, following the repo loop (plan → review → build → review → PR into
`dev` → codex → merge). This doc is the shared source of truth those sessions read from.

> Design decisions above were reviewed for engagement in
> [`docs/ENGAGEMENT_REVIEW.md`](./ENGAGEMENT_REVIEW.md) (12 ranked risks, fixes, kill-tests) and
> locked via a design interview on 2026-07-02. The build order below is that report's re-slice,
> replacing the original dependency-order list — every slice ends playable.

**Shipped:** Guild Hall, Village, Ruins on the map as real, clickable, selectable nodes (PR #20,
2026-07-01) — the placeholder boxes are gone.

**Shipped — Slice 1, Thin closed loop (PR #33):** the board (road job + Ruins as scarce postings +
always-up standing jobs) + **3 fixed parties** who bid (CVs with certainty chips, dormant this
slice) + the **player-set cut** as the priced decision that dials *which* party takes a scarce quest
(§12 "Slice 1 as built" — bounty top-up and full gold/stats pricing wait for slice 4) + rich
multi-beat quests resolved as graded skill-vs-difficulty rolls (§10) + the report as an **animated
story** with §12's itemized ledger (§4/§10 envelope) + the §8/§12 cash clock (visible; charter
revocation defined but unwired) + localStorage persistence. Playable in one PR: priced decision →
consequence → readable outcome → money pressure. Carries its own foundations — engine seams decided
(§11, left unused), a versioned serializable world-state module (`web/src/game/guild/`), a discrete
"end day" tick — as scaffolding inside this same PR.

**Re-sliced 2026-07-09 for the living-guild pivot** (supersedes the fidelity-first order below).
Every slice still ends playable; the canvas comes first, then the player's hand, then tension:

1. **Living canvas** — the **event-queue clock** + skip-primary driver (Advance / play / speed /
   skip-to-next-event / auto-pause) *(driver later pivoted play-primary — see the amended Time
   paragraph)* + **autonomous party daily-life** (rest / train / take-quest,
   minimal) + the **Hall Feed** + reuse of the board / resolver / animated story. Economy mostly
   stubbed **but not decision-less: ships at least one fixed-price investment** (e.g. a single
   building or a gear buy) that visibly shapes the canvas — so the first slice already responds to
   the player's hand and clears guardrails #1/#3 (not a spectator, not a screensaver). Fun shipped:
   parties visibly live, quest over days, and return on a living clock *that you already nudge*.

   **As built (the living-canvas PR).** An event queue on integer sim-ticks (4/day:
   dawn/midday/dusk/night), pinned within-tick order `(tick, type-rank night-last, ord)`; pure
   handlers `decide / finish / return / night` in `web/src/game/guild/clock.ts` restructure the
   old endDay economics; `advanceUntilStop()` (to the next **decision** or nightfall) is the
   skip-primary spine, with an optional Auto 1×/3× overlay that is pure presentation. *(Driver
   later pivoted play-primary — see the amended Time paragraph.)* **Hero
   wallets** (the design question resolved): per-hero gold; earn = reward − the flat 10%
   brokerage, split evenly, remainder to the boss; spend on rest ~15%/min 5g and train ~20%/min
   8g of wallet (always clamped to the wallet), routed to your facility if built, else lost to
   the village (a tracked sink the feed advertises); motivation = avg wallet < 60g → best-paying
   eligible posting (pinned comparator: total reward desc, id asc — flat-pay amendment) or a standing shift, else
   lifestyle with a ~15% seeded fame-quest urge across ALL eligible postings; every return
   forces one decompress rest. The **Hall Feed** ships its three registers (ambient dim /
   notable / decision gold-boxed, undone decisions pinned under "Needs you"); standing-job
   returns are ambient-only (no sealed mail, no auto-pause). The **sealed reveal** holds on the
   always-on treasury via `displayedGold()` (gold minus unopened sealed credits), amount-free
   activity lines, and tavern takings that accrue to a day counter and only hit the treasury at
   night. The one investment is the **Tavern, 400g fixed** — proposal auto-pauses once grounded
   (day ≥ 2 + watched village sinks + affordable at *displayed* gold, so a sealed payout can
   never announce itself through the proposal); once built, rest-spend lands in the till
   nightly. *(The Advance/Auto driver described here pivoted to Play/Pause/Speed on Stefan's
   2nd play session — see the amended Time paragraph.)* *A stated behavioral tell:* after the one forced decompress rest, a failed party is
   broke and marches straight back out while a successful one lazes — the strip telegraphing
   "they came home empty" before the envelope opens is diegetic texture we keep, not a leak
   (amounts stay hidden; the story still owns the reveal).
   *Known/dormant by design:* train is flavour+spend (no growth yet); loss stays unwired;
   posting `failCount` texture dropped (returns with hero arcs); **guardrail #5 is deferred** —
   one sink means allocation isn't a tradeoff yet, and post-tavern income overcorrects to
   roughly +70g/day with nothing left to buy: that surplus is deliberately the appetite slice 2's
   building/gear menu walks into.

   **UX pass (Stefan's play feedback, same slice).** Beats resolve on screen as a **check
   meter**: `Beat.score` (0–100, resolver-derived from the same ratio that graded the beat —
   zones fail [0,20) / poor [20,40) / ok [40,65) / good [65,90) / crit [90,100], crit's ratio
   anchor 2.0) rises at a **constant rate** (duration ∝ score, so the stop point stays unknown),
   then the grade tag pops and the narration fades in; a tap mid-rise snaps, a landed tap
   advances; speed Slow/Normal/Fast is one cycling chip (UI-only pref). Effect notes are
   context-aware (no "next check" claims on final/bonus beats; a passed recovery reads rattled,
   not eased — the resolver still carries −1). Quests card shows **difficulty ★1–5**
   (critical-weighted mean of main-beat difficulties; type breakdown + brokerage math live in
   the tap-detail) with OPEN and ACTIVE (party-assigned) rows; posting expiry is **7 days**
   (withdrawal is rare texture now — the near-permanently-full 2-posting board is accepted
   pacing until more quest defs land). Investments renamed **Buildings** (Guild Hall + Tavern,
   "Ready" chip gated on displayed gold). The one-buyable "Ready" chip is a spend-your-400g nag
   today — it must become a real choice signal, not a checklist, when slice 2's menu lands
   (guardrail #5). Explainers sit behind tap-the-title ⓘ. *(The Advance/Auto pair described here was superseded
   the next day by Play/Pause/Speed — see the amended Time paragraph.)*
2. **The businessman's hand** — the full **Majesty building + gear upgrades at fixed prices** +
   the hero-spending economy + the flat 10% cut + building passive + upkeep. **The read the bet is
   priced against: the dormant CV certainty chips (already built in Slice 1) go LIVE here** — so
   "gear the undervalued hero" is a real knowledge→gold decision, not a coin flip (guardrail #2).
   Fun shipped: you invest, the flywheel turns, and reading heroes prices the upgrade bets.
3. **Tension** — arm the loss (**neglect → drift**, **over-invest → bankruptcy**) + a rival stub +
   one escalation thread, so hour 2 differs from minute 5 and the run is losable (guardrails #3/#4).

Then the earlier slices, **re-homed on the new core** (they still hold as mechanics, just not as
the primary lever): **Hero arcs** (CV correction, trait reveals, contracts — §4/§5); **Fidelity
ladder + seed-replay** so combat finally becomes *watchable* (§4, reusing the Combat Test renderer);
**Influence / areas** with upkeep + the map's two zoom tiers (§9); **Rival** proper (§7); **Doom**
(§8). This supersedes the previous fidelity-first numbering (fidelity → hero arcs → parties →
influence → rival → doom), which the re-slice above replaces.

Guild-management spends (§3) and the multi-step quest beat model (§10) grow incrementally inside
whichever slice touches them first — they're not a separate step.
