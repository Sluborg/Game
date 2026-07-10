# Challenge System — content contract

> Status: agreed design direction for the next challenge/content work. This document is
> authoritative for challenge vocabulary and check semantics. Items under **Open decisions** are
> deliberately not implementation commitments.

## Start with narrative

The report is the reward for watching autonomous heroes. Mechanically richer challenges must not
turn those reports into data dumps.

The authoring risk is combinatorial: many skills, two-skill combinations, five result bands,
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

A two-skill challenge is still one coherent narrated beat, not one prose block per check. The exact
scalable composition of authored narration, trait cut-ins, and location flavour remains open and
must be designed before content volume expands.

## Model

A challenge normally declares two Skills. Both are tested separately, using each Skill's governing
Attribute. Their result values are then combined to drive consequences within the quest.

This keeps the challenge readable while allowing combinations such as:

- Research + Arcana
- Stealth + Deception
- Persuasion + Endurance
- Survival + Medicine
- Force + Athletics

Why two checks: one broad label often hides two materially different demands. Understanding a
magical text requires both research discipline and magical comprehension; entering under false
pretences requires both physical concealment and a believable lie. Testing both preserves those
differences without authoring a narrow Skill for every situation.

## Attributes

Use the familiar six-Attribute vocabulary:

- Strength
- Dexterity
- Constitution
- Intelligence
- Wisdom
- Charisma

Attributes have a hard maximum of 20. A newly generated hero can start with at most 15 in an
Attribute.

Reasoning: the familiar names reduce onboarding cost, while the lower generation ceiling leaves
visible room for long-term growth.

## Skills

Skills have a hard maximum of 20. A newly generated hero can start with at most 5 in a Skill.

| Attribute | Skills |
| --- | --- |
| Strength | Force, Intimidation |
| Dexterity | Stealth, Athletics |
| Constitution | Endurance, Resist |
| Intelligence | Research, Arcana, Planning |
| Wisdom | Survival, Investigation, Medicine |
| Charisma | Persuasion, Deception, Inquiry |

### Vocabulary reasoning

- **Force**, not Might: Might overlaps with the Strength Attribute. Force describes the activity —
  lifting, breaking, pushing, clearing rubble, and heavy labour.
- **Survival** covers tracking, navigation, travel, shelter, foraging, and wilderness hazards. It
  is clearer and more familiar than Fieldcraft.
- **Arcana** covers understanding or handling magical phenomena, wards, and rituals. Studying a
  magical subject can therefore test Research + Arcana.
- **Medicine** sits under Wisdom: practical diagnosis and care rather than purely book knowledge.
- **Persuasion**, not Influence: Influence is reserved for the guild master's control/presence in
  areas.
- **Inquiry**, Persuasion, and Deception divide social information gathering, convincing, and
  misleading.
- **Intimidation** sits under Strength for this vocabulary.

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

The two Skill results are added. For example, Success (+1) plus Failure (-1) yields 0 overall
weight. What each combined total does to future challenges, rewards, complications, injuries, or
other quest state remains open.

## Temporary Combat rule

Combat is intentionally a temporary special case:

```text
Score = ((max(Strength, Dexterity, Intelligence) + Combat) × (1 + modifierPercent)) + d20
```

This permits physical and magical fighters to use their strongest relevant approach while sharing
one temporary Combat Skill. **Combat is deliberately absent from the Skills table above** — it is
not a 16th ordinary Skill under an Attribute, and the missing Wisdom/Charisma path (faith- or
charm-based fighters) is a known placeholder gap. Combat is redesigned in a later dedicated slice;
this rule must not be treated as the final combat system.

## Difficulty and presentation

Challenges retain a visible difficulty scale of 0–100. That visible rating must later be converted
to a check target compatible with Attributes and Skills capped at 20 plus a d20.

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

- Exact conversion from visible Difficulty 0–100 to the check target. (Note the ceiling: an
  unmodified check tops out at Attribute 20 + Skill 20 + d20 = 60 — the conversion must keep
  Triumph's 120%-of-target reachable at high difficulty, or state that it deliberately isn't.)
- **Whether a challenge's two checks share one difficulty/target or each declares its own** (the
  retired mockup implied per-skill values like "Research 60 + Arcana 55"). Content cannot be
  authored until this is decided.
- Final percentage bands after probability simulation.
- Minimum visual threshold spacing: 5 or 10 score points.
- Exact combined-result consequence table.
  - Including whether consequences key on the result **pair** or only the summed value —
    Success + Failure and Insufficient + Insufficient both sum to 0 but should narrate
    differently.
- Scalable narration composition: authored quest facts, reusable phrasing, trait cut-ins, and
  location flavour.
- Final Combat model.
- Detailed Perk design.
