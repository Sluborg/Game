# Challenge System — content contract

> Status: agreed design direction for the next challenge/content work. This document is
> authoritative for challenge vocabulary and check semantics. Items under **Open decisions** are
> deliberately not implementation commitments.

> **Vocabulary source of truth:** [`docs/GLOSSARY.md`](./GLOSSARY.md) is the single source of truth
> for the Skills v3 vocabulary (attributes, skills, pillars, structure terms); definitions there are
> authoritative. This document prefers pointing to the glossary over restating it, to avoid drift.

## Start with narrative

The report is the reward for watching autonomous heroes. Mechanically richer challenges must not
turn those reports into data dumps.

The authoring risk is combinatorial: many skills, multi-Encounter Challenges, five result bands,
traits, locations, and quest branches could require an impractical amount of bespoke prose.
Conversely, generic text templates would erase the authored quality that makes the current reports
feel like stories.

Challenge content therefore starts at a broad, reusable activity level:

- **Researching in a library**
- **Interviewing witnesses**
- **Handling dungeon traps**
- **Gaining political support**

It does **not** encode unnecessary micro-detail such as a named library section, shelf, or tome.
The quest owns the specific objective, people, and places; the challenge says what the heroes are
broadly doing.

A multi-Encounter Challenge is still one coherent narrated beat, not one prose block per Encounter.
The exact scalable composition of authored narration, trait cut-ins, and location flavour remains
open and must be designed before content volume expands.

## Model

A **Challenge** is an ordered array of **Encounters**. An Encounter is **one named Skill check**;
array order is the order in which they play out. A Challenge has **1+ Encounters** — normally 1–2,
3+ rare — and **one-Encounter Challenges are valid**. Each Encounter is tested using its Skill's
governing Attribute, and the Encounter result values are combined to drive consequences within the
quest. Repeating a Skill across Encounters is allowed **only for meaningfully different Encounters**
(this is an authoring judgement, not machine-enforced). See [`docs/GLOSSARY.md`](./GLOSSARY.md) for
the authoritative Quest → Challenge → Encounter structure.

**Difficulty lives on the Quest, not the Challenge.** A generic Challenge/Encounter carries **no
difficulty of its own**; the **Quest sets each Encounter's target when it instantiates the
Challenge**. This **relocates** the per-check difficulty that this document previously marked
"RESOLVED 2026-07-11" (each check declaring its own `{skill, difficulty}`, with a derived visible
maximum): the *skill* stays authored on the Encounter, but the *difficulty/target* moves to the
quest-instantiation layer. This is a relocation, not a deletion — the reasoning that different
demands differ in degree still holds, but degree is now expressed by the Quest per Encounter rather
than baked into the Challenge. The player-facing difficulty remains a downstream fog transform
(guardrail #2), never wired straight from an authored value.

This keeps the Challenge readable while allowing ordered Encounter sequences such as:

- Reasoning → (a research-and-arcana beat: understanding a magical text)
- Mobility → Influence (slip in unseen, then talk your way past)
- Influence → Fortitude (win support, then endure the aftermath)
- Nature → Reasoning (survive the wilds, then investigate what you find)
- Force → Mobility (break through, then move fast)

Why an Encounter can name any of the 9 Skills: one broad activity often hides materially different
demands, and the ordered-Encounter model expresses those as distinct named checks without authoring
a narrow Skill for every situation. Skills that used to be paired (e.g. old "Research + Arcana",
"Stealth + Deception") now fold into single v3 Skills (Reasoning covers research + arcana; Mobility
covers stealth + athletics) or into separate ordered Encounters where the demands are genuinely
different beats.

### Cooperation Modes (documented, mechanics open)

How multiple participating heroes combine on one Encounter: **additive** / **resisted** / **lead** /
**individual**. (`resisted` replaces the earlier word "fragile".) Documented here as vocabulary;
the resolving mechanics are open. See [`docs/GLOSSARY.md`](./GLOSSARY.md).

### Crisis (documented, mechanics open)

A **Crisis** is a hard-fail consequence path (this replaces the earlier "Panic" wording).
Documented as vocabulary; the trigger threshold and mechanics are open.

### Participation (documented, mechanics open)

Engine **runtime** states for how a hero participates in an Encounter — **Committed / Assigned /
Qualified / Bridged**. These are computed at runtime, **not authored**. Documented as vocabulary;
mechanics open.

### Bridging and overflow (documented, mechanics open)

**bridgeCost** and **overflow bonuses** accompany the Bridged participation state. Documented as
vocabulary; the bridging semantics and overflow math are open.

### Quest requirements — Physical / Mental / Social + tags (documented, DEFERRED)

Quests carry **Physical / Mental / Social point budgets** — the new "skulls", replacing the v1
Travel/Combat glyphs — plus **tags** that drive narration AND which Challenges a future generator
draws. This is **documented** vocabulary only: the concrete budget values and the generator are
**DEFERRED to a later "engine" PR and are NOT authorable yet**. See
[`docs/GLOSSARY.md`](./GLOSSARY.md).

## Attributes

Five Attributes (see [`docs/GLOSSARY.md`](./GLOSSARY.md) for the authoritative list):

- Strength
- Dexterity
- Constitution
- **Mind** (Intelligence + Wisdom merged)
- Charisma

**Mind** replaces the old Intelligence and Wisdom Attributes as a single mental Attribute, so the
old six-Attribute spread collapses to five.

**Bounded, standardized, use-grown.** Attributes have a hard maximum of **10**. Every hero is
generated with the **same standardized spread — total 14 points across the five Attributes, each
2–4** — so no hero is born dominant and there is nothing to reroll-fish for; the *spread* is the
archetype (a scholar's 4 is in Mind, a brute's in Strength). Attributes then **grow from use**,
slowly: an Attribute is a pillar-wide *floor*, so it rises a fraction each time one of its Skills is
used (see §Progression).

Reasoning: standardized birth kills the reroll lottery and makes *training*, not luck-at-creation,
what distinguishes heroes — which is the whole "invest in your heroes" pitch. The 2–4 birth band
plus a modest ceiling of 10 leaves the visible growth in the Skills.

## Skills

**The earned axis.** Skills have a hard maximum of **20** — double the Attribute ceiling, so a
trained Skill can eventually reach twice a hero's aptitude, and *training beats birth*. A new hero
enters with a small **starting kit** rather than zeros — e.g. **one Skill at 2 and three at 1**,
the rest untrained (0) — a fingerprint of their archetype. Skills then **grow from use**, faster
than Attributes (they are the specific competence, not the pillar floor — see §Progression).

**9 Skills, 3 per pillar** (see [`docs/GLOSSARY.md`](./GLOSSARY.md) for the authoritative
definitions). Pillars are **Physical / Mental / Social**, derived from Attributes (Str/Dex/Con →
Physical, Mind → Mental, Charisma → Social):

| Pillar | Governing Attribute | Skill | Covers |
| --- | --- | --- | --- |
| Physical | Strength | **Force** | lifting, breaking, pushing, clearing rubble, heavy labour |
| Physical | Dexterity | **Mobility** | merges old Stealth + Athletics (movement, concealment, agility) |
| Physical | Constitution | **Fortitude** | endurance + resisting poison/disease (**body resistance**) |
| Mental | Mind | **Reasoning** | research, investigation, planning, **magic/arcana** |
| Mental | Mind | **Nature** | survival, tracking, navigation, **healing/medicine** |
| Mental | Mind | **Willpower** | resisting fear/domination/mental powers (**mind resistance**) |
| Social | Charisma | **Influence** | persuade + deceive + intimidate |
| Social | Charisma | **Inquiry** | questioning people, gathering rumours |
| Social | Charisma | **Integrity** | resisting social manipulation, bribery, temptation (**character resistance**) |

**Resistance triad, one per pillar:** Fortitude (body) / Willpower (mind) / Integrity (character).

### Vocabulary reasoning

- **Force**, not Might: Might overlaps with the Strength Attribute. Force describes the activity —
  lifting, breaking, pushing, clearing rubble, and heavy labour.
- **Mobility** merges the old Stealth and Athletics Skills: concealment, athletic movement, and
  agility are one Dexterity Skill now.
- **Reasoning** absorbs the old Research, Investigation, Planning **and Arcana** — magic/arcana is
  no longer a separate Skill; studying or handling magical phenomena tests Reasoning.
- **Nature** absorbs Survival **and healing/medicine** — practical diagnosis and care live here
  alongside tracking, navigation, foraging, and wilderness hazards.
- **Influence** the *Skill* folds together the old Persuasion, Deception, **and Intimidation** —
  intimidation is no longer a Strength Skill. This name is now free for the social Skill because the
  guild master's per-area control stat is renamed **Presence** (see `docs/DESIGN.md`); "Influence"
  is unambiguously the Skill here.
- **Inquiry** stays the "question people / gather rumours" Skill, distinct from Influence's
  persuade/deceive/intimidate.
- **The resistance triad** gives each pillar one defensive Skill: **Fortitude** resists bodily
  harm (poison/disease/exhaustion), **Willpower** resists mental assault (fear/domination), and
  **Integrity** resists social assault (manipulation/bribery/temptation).

## Check formula

Each ordinary Skill check uses:

```text
Score = ((Attribute + Skill) × (1 + modifierPercent)) + 2d6
```

**The die is 2d6, not d20.** A d20 on the bounded stats above (Attribute ≤ 10 + Skill ≤ 20) would
swing outcomes on luck more than on the hero; **2d6** is a tight bell curve (2–12, clustered at 7)
so *who the hero is* and *what modifiers fired* decide the check, and luck is a small wobble at the
margin. This is deliberate for a **feats-focused** game: the memorable swings come from a feat or
trait firing (a reroll, a band upgrade), not from the dice gods.

Percentage modifiers affect the hero's Attribute + Skill *capability*. The 2d6 is added afterward
and is **never multiplied**, so a rising hero's capability scales while luck stays constant.
Modifiers may come from **traits, feats, gear, cohesion**, earlier Encounter results, or other
circumstances. On this bounded scale a percentage modifier is proportionally strong — a +50% on a
capable hero can exceed the whole 2d6 range — which fits the design (a defining trait/feat should
outweigh a dice wobble); exact modifier magnitudes are **tuning-open** and must be recalibrated for
the small scale (the old ±0.5 trait cap was set for 40-point stats).

**Engine (2026-09-30, `web/src/game/guild/resolve/`):** the *summed* modifier is clamped to
**±30%** of capability (`MOD_CAP`); individual sources (a trait, cohesion, gear) are nominally
±10% each, tuning-open. Capability is rounded to an integer before the dice are added, so a
Score is always an integer and the band test is exact integer math (no float edge cases).

## Result language and values

The five player-facing results, their internal contribution values, and the working bands
(one table, so a copy-paste into an authoring prompt can never misalign name ↔ value ↔ band):

| Result | Value | Working band | Meaning |
| --- | ---: | ---: | --- |
| Critical Failure | -3 | Below 60% of target | Severe failure with major negative weight |
| Failure | -1 | 60% to below 80% | Failure with negative weight |
| Insufficient | 0 | 80% to below 100% | Did not meet the requirement, but adds no further penalty |
| Success | +1 | 100% to below 120% | Meets the requirement and adds positive weight |
| Triumph | +3 | 120% or more | Exceptional result with major positive weight |

Why **Insufficient**: it clearly says the attempt did not succeed, without falsely calling it a
Partial Success. It also fits the game's bureaucratic voice.

The band percentages are a tuning hypothesis, not locked balance. The result names and values are
the decision; exact band tuning still needs simulation and visual validation.

**Supersession note:** this result language **replaces** the shipped v1 meter ladder
(Botch / Poor / Success / Great / Triumph) when the challenge system is implemented — the two
vocabularies never coexist. Beware that "Success" names a different tier in each: the v1 middle
tier vs. this ladder's second-best. Until the implementation slice lands, the shipped meter keeps
its v1 labels.

**Wired (2026-09-30, dev builds):** the v3 results now run in the live quest resolver behind an engine
switch (`web/src/game/guild/wire/`, `engine.ts`): dev builds (`/Game/dev/`) and `?engine=v3` show the v3
result names and a "Needed X, got Y" line; production and `?engine=v1` keep the v1 ladder until a later
promotion flips the default. Each v3 result fills the matching v1 grade slot so momentum, recovery and
bonus logic are unchanged (a stand-in until the combined-result consequence table is decided). Proof of
feel parity: [`docs/resolution-wire.md`](./resolution-wire.md) (generated, tested).

A Challenge's Encounter results are added. For example, Success (+1) plus Failure (-1) across two
Encounters yields 0 overall weight. What each combined total does to future challenges, rewards,
complications, injuries, or other quest state remains open.

## Temporary Combat rule

Combat is intentionally a temporary special case:

```text
Score = ((max(Strength, Dexterity, Mind) + Combat) × (1 + modifierPercent)) + 2d6
```

The formula *shape* is unchanged; it tracks the ordinary-check formula — the die is **2d6** (not
d20) and the removed Intelligence Attribute is written as its v3 successor **Mind** (Intelligence +
Wisdom merged).

This permits physical and magical fighters to use their strongest relevant approach while sharing
one temporary Combat Skill. **Combat is deliberately absent from the Skills table above** — it is
not a 10th ordinary Skill under an Attribute, and the missing Charisma path (charm-based fighters)
is a known placeholder gap. Combat is redesigned in a later dedicated slice; this rule must not be
treated as the final combat system.

## Difficulty and presentation

Difficulty is set by the **Quest** per Encounter (see §Model), not authored on the Challenge, but it
still uses the visible 0–100 scale. That visible rating must later be converted to a check target
compatible with Attribute ≤ 10 + Skill ≤ 20 + 2d6.

**Adopted (2026-09-30): `Target = 6 + 0.30 × Difficulty`**, rounded to an integer (Difficulty 0 →
6, 50 → 21, 100 → 36). The earlier illustrative `10 + difficulty × 0.4` is not adopted. Because
growth is **bounded**, difficulty is near-absolute (set once, not re-tuned per tier), and — with a
tight 2d6 — a check is largely decided by whether capability clears the target, with feats/traits
and the ±wobble at the margin. **Deliberate consequence:** the unmodified ceiling (Attr 10 + Skill
20 + 12 = 42) means an unmodified max hero can Triumph only up to Difficulty 98 (and at ≥5% odds
only up to 94); Triumph at the top of the scale **requires modifiers**. Exact odds per archetype
and difficulty: [`docs/resolution-sim.md`](./resolution-sim.md) (generated, tested against the
engine).

Result thresholds on the animated meter must stay visually distinct. The engine defines the
mapping for the wire slice (`meterFor` in `resolve/check.ts`): the needle is placed
piecewise-linearly inside each result's own 0–100 zone — Critical Failure 0–20, Failure 20–40,
Insufficient 40–60, Success 60–85, Triumph 85–100 (saturating at 160% of target) — so the zone
gaps are 20/20/25/15 points, above the 5–10 discussed. Not yet on screen; the shipped v1 meter
keeps its labels until the wire slice.

## Progression and Feats

Two growth vectors, on purpose:

- **Numbers grow from use** (the smooth, broad axis). Doing an Encounter raises the **Skill** it
  tested, and a *fraction* of that also raises its governing **Attribute** (the pillar floor). So
  Attributes lag Skills and lift a whole pillar at once, while Skills spike where the hero actually
  works. This is the deliberate anti-D&D move: a hero is shaped by **what you send them to do**, not
  by dumping every level into one stat — send a hero on varied quests and they broaden; focus them
  and they specialize. It also plugs straight into the P/M/S quest profiles (see `docs/GLOSSARY.md`).
- **Feats grow from level-ups** (the chosen, build-defining axis). Leveling grants a pick from a
  **feat tree**. Feats are where distinctiveness lives — they **modify rolls, Skills, difficulties,
  and add rule-exceptions** (reroll the weakest Encounter, treat a band as the next one up, a
  standing modifier, a cooperation-mode trick, a Crisis avoidance). Because the dice are tight (2d6),
  **feats are the main source of dramatic swing**, not luck.

**Rates (engine, 2026-09-30, `resolve/growth.ts`):** the tested Skill gains **1 XP per use, 2 on a
Success or Triumph**; Skill level *n* → *n+1* costs **5 × n** XP (0 → 1 also costs 5; 1 → 20 is 950 XP). The governing
Attribute gains **1 XP per Success/Triumph** only; level *n* → *n+1* costs **20 × n** XP (2 → 10 is
880 XP). Caps are independent (a capped Skill still feeds its Attribute); XP at a cap is discarded.
Simulated feel (`docs/resolution-sim.md` §D/§E): at "fair" difficulty (target = capability + 7) a
fresh hero reaches Skill 10 in ~140 uses, Skill 20 in ~600, Attr 7 in ~530 and Attr 10 in ~1340;
spreading 600 uses over three pillars yields three Skills at ~11 instead of one at 20.

**Wired (2026-10-01, dev builds, `web/src/game/guild/wire/progress.ts`):** a returning party earns experience from its
sealed log. The hero who **led** an encounter gets the rates above; every other member gets **+1 skill XP on a Success
or Triumph and no Attribute XP** (so the best member does not pull away alone and nobody stalls). Combat beats train
nothing (the temporary Combat rule). Hero progress persists in the save without a version bump. Pace and how fast quests
become solved: [`docs/resolution-growth.md`](./resolution-growth.md) (generated, tested).

The detailed feat tree is **deferred** (its own design pass): tree structure, gating, pick cadence,
and keeping feats *tradeoffs* rather than a flat power ladder. Feats are the grown-up form of the
content pipeline's **perk exception-kinds** (`reroll-lowest-check`, `soften-critical-failure`,
`upgrade-result`, `skill-modifier` — see `docs/CONTENT-SPEC.md`), which are the seed of the tree.

Perks/feats change rules and create exceptions rather than merely duplicating a Skill value.

## Open decisions

- ~~Exact conversion from the visible 0–100 Difficulty to the check target~~ — **settled
  2026-09-30:** `Target = 6 + 0.30 × Difficulty` (§Difficulty). Triumph at the top of the scale
  deliberately needs modifiers.
- ~~Attribute/Skill grow-from-use rates~~ — **settled 2026-09-30** (§Progression). Still open: the
  feat-tree design, and the per-source modifier magnitudes (the ±30% *sum* cap is set).
  - Note: the earlier "RESOLVED 2026-07-11" question (whether a Challenge's checks each declare
    their own `{skill, difficulty}`) is no longer framed as a Challenge-authoring decision — the
    **skill** stays authored on the Encounter, and the **difficulty/target** has been **relocated
    to the Quest** (§Model). This conversion bullet governs how that per-Encounter 0–100 difficulty
    becomes an internal target.
- Final percentage bands after probability simulation (the simulation now exists:
  `docs/resolution-sim.md`; the bands are unchanged until play says otherwise).
- ~~Minimum visual threshold spacing~~ — the engine's meter zones give 15–25 points (§Difficulty);
  presentation is validated in the wire slice.
- Exact combined-result consequence table.
  - Including whether consequences key on the result **pair** or only the summed value —
    Success + Failure and Insufficient + Insufficient both sum to 0 but should narrate
    differently.
- **Crisis trigger threshold and mechanics** (the hard-fail consequence path — vocabulary set, see
  §Model).
- **Cooperation Mode mechanics** — how additive / resisted / lead / individual actually resolve.
- **Bridging semantics and overflow math** (bridgeCost, overflow bonuses).
- **Participation-state rules** — how Committed / Assigned / Qualified / Bridged are computed at
  runtime.
- **Quest requirement values + tag vocabulary + the Challenge generator** — the Physical/Mental/
  Social point budgets and tags are documented but DEFERRED to a later "engine" PR (not authorable
  yet).
- Scalable narration composition: authored quest facts, reusable phrasing, trait cut-ins, and
  location flavour.
- Final Combat model.
- Detailed Perk design.
