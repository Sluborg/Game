# Game Design — the concept

Living design notes for the game. This is the **vision & mechanics** doc; `docs/ROADMAP.md`
tracks the art each feature needs. Written in the planning chat, refined feature-by-feature.

> Status: **concept locked; engagement-reviewed and decisions confirmed 2026-07-02** (see
> [`docs/ENGAGEMENT_REVIEW.md`](./ENGAGEMENT_REVIEW.md)). The map-nodes screen has shipped
> (PR #20); the guild sim itself is still unbuilt. Each section becomes a separate build session
> (see "How we build" at the bottom).

---

## 1. The fantasy

You are a **guild master — a bureaucrat and businessman**, not a hero and not a general. You run a
guild whose business is placing adventuring parties on quests and taking a cut of the reward and loot.

You **never command anyone.** You *fund, incentivize, and read reports.* The heroes are autonomous;
your job is to shape the conditions they choose inside, and to fight fog-of-war to even see what's
happening.

Reference point: **Majesty (2000)** — you can't order heroes, you post bounties and they decide if
the pay is worth the risk.

## 2. The core loop

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
  keeps gold trickling in even with zero hires, which is eventually enough to afford an
  introduction — and relationships also build for free from simple co-location, so paid
  introductions accelerate formation, they're not the only route to it.
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
| **Cash** | Fast (every turn) | Influence upkeep vs. your cut of rewards. Over-extend → debt → charter revoked. |
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

**Economy — gold only (v1).** No multi-resource system; a guild master thinks in gold. Income is
your cut of hero rewards. The full money model — the free quest board, the player-set cut, and
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

### The cut — Slice 1's priced decision

- Base **30%**, adjusted per posting with four buttons **−10 / −5 / +5 / +10** → a **20–40%**
  range. A live posting's cut can be revised **once per end-day** — a mispriced posting costs at
  least a day, never the whole rot window.
- **Acceptance model.** Each party carries a **hidden ask** per quest tier — the smallest share
  it will take — drawn from a band around the anchors below, with small day-to-day noise. While
  a quest sits on the board, acceptance is checked **once per end-day**: the party bites if its
  share clears its ask. The anchors are design-intent *per-day* averages across the roster band,
  pinned at three cut levels so **no single setting dominates blind play**:

  | Quest | accepts @20% | @30% | @40% |
  | --- | --- | --- | --- |
  | Road job | ~95% | ~90% | ~65% |
  | Ruins | ~90% | ~75% | ~45% |

- **The hidden ask is not §3/§5's known asking price.** A hero's *hiring* ask (the posted price
  to join your guild) is public; the per-quest *split tolerance* is a hidden appetite you learn
  (below). Two numbers, one hero — "ask is known" in this doc always means the hiring price.
- **Squeeze payoff (Ruins-specific).** Knowing a party bites at 40% instead of 30% is worth
  **~+60g/day on the Ruins** (only ~+20g on the road job) — knowledge as literal gold; the R2
  kill-test in one line.

### What you know, per slice

The acceptance-likelihood readout is knowledge-gated from day one, but Slice 1 must not depend
on later slices' systems. Its knowledge sources are free-tier native:

- **Observation brackets.** Every accept/decline at a known cut brackets that party's ask
  ("declined at 35% → they want more than a 65% share"). The board shows the learned bracket as
  a qualitative chip: *unknown appetite* → *likely / risky / unlikely*.
- **Report lines.** The end-day summary can volunteer the other side of the bracket — "they'd
  have taken less" / "Bryn grumbled the split was thin" — the free tier's coarse cousin of R2's
  "overpaid by ~40g" feedback.

Slice 2 (fidelity tiers) sharpens the precision of both; slice 5 (presence) gates how far from
home you get them at all.

### Slice 1 resolution model (so the build session invents nothing)

- The 3 pre-made heroes are **one fixed party**; parties-as-a-system is slice 4.
- Quests resolve in **one day**. The board holds both quests; if the party would accept both on
  the same day it takes the **better expected share** (a stub for slice 4's quest-choice
  factors).
- A posting **expires after ~3 days** untaken (the giver withdraws it).
- **Refresh.** A quest that leaves the board (done, failed, or rotted) is replaced by a fresh
  letter the next morning, and a **road-tier job is always on offer**. That guarantee, at the
  **base 30% cut**, is the §6 unstick floor — dropping the road job to 20% runs negative and is
  a choice, not the safety net.
- **End-day tick order:** quest payouts → passive trickle → upkeep → loan interest → insolvency
  check.
- **Every gold movement is visible, from Slice 1.** The end-day report mail carries an itemized
  ledger block (one line per movement) and a runway line ("gold lasts ~N days at this burn"). A
  no-takers day is never silent — it produces its own line with a knowledge-gated cause ("no
  takers" → "no takers — the split looks thin to them"), and expiry arrives as a letter. §8's
  pressure only exists if it is *seen*.

### The number sheet

| Knob | Value | Role |
| --- | --- | --- |
| Starting gold | 1,000g | |
| Daily upkeep | −60g/day | The clock |
| Guild Hall passive | +20g/day | Idle net −40g/day ≈ 25-day runway |
| Road job | reward 200g → cut 40–80g | **Survival** — at 30% ≈ +6g/day net expected |
| Ruins | reward 600g → cut 120–240g | **Growth** — success 50–75% by party quality; a good day is +140g net |
| Rot / fail day | −40g | The sting of greed or a bad read |

Safe ≈ survival, risky ≈ growth: the road job keeps you alive but must never fund influence
tiers; the Ruins is where reading CVs pays. **Margins are deliberately fat** — slice 2 (fidelity
tiers, ~10–20% of daily income) and slice 5 (influence upkeep, ~30–40%) are designed to eat
them. Do not tune Slice 1 razor-thin.

### Debt — the rescue window (§8's one warning stage)

Gold < 0 at end-day → a forced **600g loan**, delivered as a creditor's letter. Interest is a
**flat 5%/day (30g/day) on principal, never compounding**; one loan per run. **Insolvent** =
gold < 0 at end-day *after* interest; **5 consecutive insolvent end-days → charter revoked.**
The loan auto-repays (a single 600g ledger line) at the first end-day you can pay it and still
hold 200g. Worked comeback: post-loan idle burn is −70g/day and road-only is ~−24g/day — both
losing, just slower — while one Ruins success is **+110g/day net of interest**; one breaks the
fall, two clear the debt. The loan is a last gamble a competent read of the roster can win — a
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

The cut % becomes the per-hero **negotiable contract term** at slice 3's renewals. Slice 4's
**bounty is a top-up to the reward pool** — it sweetens the heroes' share to move a stubborn
ask; it never replaces the cut. Board curation is honestly a **no-decision in Slice 1** (posting
is free, both quests always go up); it becomes live when heroes can stumble onto unposted quests
(parked, slice 4+).

---

## Ideas parked for later

Good ideas we've deliberately deferred to keep v1 small — recorded so they're not lost:

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

**Next up — Slice 1, Thin closed loop:** two board quests (road job + Ruins) + 3 pre-made heroes
as one fixed party (CVs with certainty chips) + the **player-set cut** as the priced decision
(§12 — the bounty top-up and full gold/stats pricing wait for slice 4) + one summary-tier report
carrying §12's itemized ledger (§4/§10's minimal envelope) + the §8/§12 cash clock. Playable in
one PR: priced decision → consequence → readable outcome → money pressure. Carries its own
foundations — engine seams decided (§11), a versioned serializable world-state module, a discrete
"end day" tick — as scaffolding inside this same PR, not a standalone prerequisite session.

Then, in order:

2. **Fidelity ladder** — rumor/summary/log tiers as envelope filters + the free home floor (§4) +
   a seed-replay viewer (reusing the Combat Test renderer). Tiers cost gold from day one, drawn
   from slice 1's cash clock — upkeep/decay wait for slice 5.
3. **Hero arcs** — CV correction stamps, trait sockets & reveals (§4/§5), contracts (§3),
   pre-rival roster pressure (§8).
4. **Parties & quest choice** — introductions (§3/§6), the boss's weighted vote, the full
   gold/stats bounty pricing (§3/§5) and quest-choice factor list, composed-duel party combat
   (§10/§11).
5. **Influence as upkeep** — per-Area influence with upkeep/decay + a second Area + the map's two
   zoom tiers (silhouettes first exist here) + a pinned ledger strip.
6. **Rival** — scripted budget bidder (§7), fog-bound invariant, loss explanations.
7. **Doom** — escalation node + coarse broadcast + runway events (§8).

Guild management spends (§3) and the multi-step quest beat model (§10) grow incrementally inside
whichever slice touches them first — they're not a separate step.
