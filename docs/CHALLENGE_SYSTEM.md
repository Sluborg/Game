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

Attributes have a hard maximum of 20. A newly generated hero can start with at most 15 in an
Attribute.

Reasoning: the familiar names reduce onboarding cost, while the lower generation ceiling leaves
visible room for long-term growth.

## Skills

Skills have a hard maximum of 20. A newly generated hero can start with at most 5 in a Skill.

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
Score = ((Attribute + Skill) × (1 + modifierPercent)) + d20
```

Percentage modifiers affect the hero's Attribute + Skill capability. The d20 is added afterward
and is never multiplied.

Modifiers may come from earlier challenge results, cohesion, gear, perks, or other circumstances.
This makes modifiers strengthen or weaken capability without also amplifying random luck.

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

A Challenge's Encounter results are added. For example, Success (+1) plus Failure (-1) across two
Encounters yields 0 overall weight. What each combined total does to future challenges, rewards,
complications, injuries, or other quest state remains open.

## Temporary Combat rule

Combat is intentionally a temporary special case:

```text
Score = ((max(Strength, Dexterity, Mind) + Combat) × (1 + modifierPercent)) + d20
```

The formula mechanic is **unchanged**; only the removed Intelligence Attribute is written as its v3
successor **Mind** (Intelligence + Wisdom merged), since Intelligence no longer exists.

This permits physical and magical fighters to use their strongest relevant approach while sharing
one temporary Combat Skill. **Combat is deliberately absent from the Skills table above** — it is
not a 10th ordinary Skill under an Attribute, and the missing Charisma path (charm-based fighters)
is a known placeholder gap. Combat is redesigned in a later dedicated slice; this rule must not be
treated as the final combat system.

## Difficulty and presentation

Difficulty is set by the **Quest** per Encounter (see §Model), not authored on the Challenge, but it
still uses the visible 0–100 scale. That visible rating must later be converted to a check target
compatible with Attributes and Skills capped at 20 plus a d20.

The conversion is not decided. In particular, the earlier illustrative formula
`10 + difficulty × 0.4` is not adopted.

Result thresholds on the animated meter should remain visually distinct. A minimum absolute gap of
5 or 10 score points was discussed, but the correct value depends on the final target conversion
and meter presentation.

## Skills and Perks

Numeric Skills represent ordinary competence and progression. Perks should represent distinctive
abilities that change rules, create exceptions, or add special effects rather than merely duplicating
a Skill value.

The detailed Perk system is outside this contract.

## Open decisions

- Exact conversion from the visible 0–100 Difficulty (now set by the Quest per Encounter — see
  §Model) to the check target. (Note the ceiling: an unmodified check tops out at Attribute 20 +
  Skill 20 + d20 = 60 — the conversion must keep Triumph's 120%-of-target reachable at high
  difficulty, or state that it deliberately isn't.)
  - Note: the earlier "RESOLVED 2026-07-11" question (whether a Challenge's checks each declare
    their own `{skill, difficulty}`) is no longer framed as a Challenge-authoring decision — the
    **skill** stays authored on the Encounter, and the **difficulty/target** has been **relocated
    to the Quest** (§Model). This conversion bullet governs how that per-Encounter 0–100 difficulty
    becomes an internal target.
- Final percentage bands after probability simulation.
- Minimum visual threshold spacing: 5 or 10 score points.
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
