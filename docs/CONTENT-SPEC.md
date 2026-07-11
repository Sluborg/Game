# CONTENT-SPEC — the authoring contract

> **Paste everything between the rules below into ChatGPT**, then describe the
> content you want. ChatGPT emits **JSON** in these exact shapes; you drop each
> array into the matching file under `web/src/game/guild/content/` and open a PR.
> A schema test (`content.test.ts`) gates every drop in CI and rejects a bad one
> with a legible `path: message (expected …)`.

This contract is authoritative for **content shape**. The game vocabulary it uses
is authoritative in [`docs/CHALLENGE_SYSTEM.md`](./CHALLENGE_SYSTEM.md); where a
term appears here it is copied verbatim from there.

**Authored but not wired.** This content targets the challenge-system **v2**
vocabulary (6 Attributes, 15 Skills, the five-band result ladder). The shipped
game still runs the older 4-attribute model, so content you author now is stored
and validated but not yet rendered in-game. That is expected — this pipeline is
the funnel, not the consumer.

---

## ROLE

You are a content author for a fantasy guild-management game. You emit **only
JSON**, in the shapes defined below, using **only** the vocabulary listed below.
Never invent an attribute, skill, or result name. Never add fields. When unsure of
a number, pick a sensible value inside the stated range and keep going.

## THE VOCABULARY (use verbatim — do not rename, re-case, or invent)

### The six Attributes

`strength` · `dexterity` · `constitution` · `intelligence` · `wisdom` · `charisma`

Attributes cap at 20 (a new hero starts at ≤ 15). You do not author Attribute
numbers directly — you name Skills, and each Skill's governing Attribute is fixed
by the table below.

### The fifteen Skills (id → governing Attribute)

| Attribute | Skills (id) |
| --- | --- |
| strength | `force`, `intimidation` |
| dexterity | `stealth`, `athletics` |
| constitution | `endurance`, `resist` |
| intelligence | `research`, `arcana`, `planning` |
| wisdom | `survival`, `investigation`, `medicine` |
| charisma | `persuasion`, `deception`, `inquiry` |

Skills cap at 20 (a new hero starts at ≤ 5). **`combat` is NOT a skill** — it is a
temporary special rule authored in a later slice. Never emit a `combat` check.

### The result ladder (fixed — never author a value or band)

| Result | Value | Working band | Meaning |
| --- | ---: | ---: | --- |
| Critical Failure | −3 | Below 60% of target | Severe failure, major negative weight |
| Failure | −1 | 60% to below 80% | Failure, negative weight |
| Insufficient | 0 | 80% to below 100% | Did not meet the requirement, no further penalty |
| Success | +1 | 100% to below 120% | Meets the requirement, positive weight |
| Triumph | +3 | 120% or more | Exceptional, major positive weight |

You never write a result value or band. Where a perk names a band, use the
lowercase id: `critical-failure`, `failure`, `insufficient`, `success`, `triumph`.
(Do **not** use the retired v1 ladder Botch/Poor/Success/Great/Triumph — "Success"
means a different tier there.)

## THE CHALLENGE MODEL

A **challenge** is a broad, reusable activity — *what the heroes are broadly
doing* — such as "Researching in a library" or "Interviewing witnesses". It
declares **exactly two Skill checks** on **two different Skills**, because one
broad label usually hides two materially different demands (understanding a magical
text needs both research discipline *and* magical comprehension).

**Each check declares its own difficulty (0–100).** The two demands can differ in
degree, not just kind — the research may be hard while the arcana is brutal:

> "Researching in a library" → `research` 60 + `arcana` 55

The challenge's single **visible difficulty** shown to the player is **derived**
(the maximum of the two check difficulties) — you never write it. Difficulty is
the visible 0–100 scale; its conversion to an internal check target is still being
tuned, so treat the number as the relative demand of that check.

### Keep the label BROAD — the quest owns the specifics

The challenge says only what the heroes are broadly doing. The **quest** owns the
specific people, places, and objectives. Do not encode a named shelf, tome, room,
or NPC in a challenge.

| ✅ DO (broad activity) | ❌ DON'T (quest-specific detail) |
| --- | --- |
| Researching in a library | Searching the East Reading Room for the Codex of Vharn |
| Interviewing witnesses | Questioning the innkeeper Marta about the fire |
| Handling dungeon traps | Disarming the poison-dart trap on the third stair |
| Gaining political support | Bribing Duke Aldric's chamberlain |

## THE OUTPUT SHAPES

Emit each kind as a JSON array. All `id`s are **kebab-case** (`^[a-z0-9-]+$`),
lowercase, and **unique across every kind** (a challenge id must not equal any
quest/trait/perk id).

### challenges.json

```json
[
  {
    "id": "research-library",
    "activity": "Researching in a library",
    "summary": "The heroes comb a scholarly collection for what the quest needs to know.",
    "checks": [
      { "skill": "research", "difficulty": 60 },
      { "skill": "arcana", "difficulty": 55 }
    ]
  }
]
```

- `activity` — the broad label (required).
- `summary` — one optional broad sentence. **Do not** write per-result prose (a
  win/lose line for each of the five bands): the scalable narration model is still
  open, and a five-band prose matrix per check is exactly the report data-dump the
  design forbids.
- `checks` — exactly two, on two different Skills, each `difficulty` an integer
  0–100.

### quests.json

```json
[
  {
    "id": "the-sunken-archive",
    "title": "The Sunken Archive",
    "giver": "a hooded antiquarian",
    "location": "The Drowned Library",
    "reward": 700,
    "minDuration": 1,
    "maxDuration": 3,
    "challenges": ["wilderness-passage", "research-library", "dungeon-traps"]
  }
]
```

- `reward` — a **flat** total in gold (integer ≥ 0). Extra days cost time, never
  extra gold. Reference magnitudes from the shipped board: a road job ≈ 350, a
  ruins delve ≈ 700, a standing job ≈ 25.
- `minDuration` / `maxDuration` — integer days, `maxDuration ≥ minDuration ≥ 1`
  (the min is the known floor; the gap above it is uncertainty the player sees as
  fuzz).
- `challenges` — an **ordered, non-empty** list of challenge ids, each defined in
  `challenges.json`. This is the run order.

### traits.json

A trait applies a **percentage modifier** to the check formula's
`(Attribute + Skill)` capability, scoped to named Skills and/or Attributes.
(Numeric competence itself lives in Skills; a trait tilts it.)

```json
[
  {
    "id": "bookish",
    "name": "Bookish",
    "description": "Years among stacks and scroll-cases. Reading and magical study come easily.",
    "effect": {
      "modifierPercent": 0.15,
      "appliesTo": { "skills": ["research", "arcana"] }
    }
  }
]
```

- `modifierPercent` — a number within **±0.5** (`0.15` = +15%, `-0.15` = −15%).
- `appliesTo` — at least one `skills` id and/or one `attributes` id.

### perks.json

A perk **changes a rule / creates an exception** — it does not just add a number a
Skill already covers. Choose a `kind` from this closed set:

| kind | meaning | extra params |
| --- | --- | --- |
| `reroll-lowest-check` | re-roll the lower of the challenge's two checks once | — |
| `soften-critical-failure` | a Critical Failure is read as an ordinary Failure | — |
| `upgrade-result` | one named band is read as the next-higher band | `fromResult` (any band except `triumph`) |
| `skill-modifier` | a standing +/−% on one named Skill | `skill` (id), `percent` (±0.5) |

```json
[
  {
    "id": "dogged",
    "name": "Dogged",
    "description": "Refuses to fall just short — an Insufficient result is read as a Success.",
    "exception": { "kind": "upgrade-result", "fromResult": "insufficient" }
  },
  {
    "id": "silver-tongue",
    "name": "Silver Tongue",
    "description": "A standing edge whenever persuasion is what the moment needs.",
    "exception": { "kind": "skill-modifier", "skill": "persuasion", "percent": 0.2 }
  }
]
```

## WHAT THE VALIDATOR REJECTS (so emit clean)

- an id that isn't lowercase kebab-case, or that repeats another id anywhere;
- a challenge without **exactly two** checks, or whose two checks name the **same**
  Skill;
- a `skill` not in the 15-skill table (including `combat`), or a wrong-cased skill
  (`Research` ≠ `research`);
- a `difficulty` that isn't an integer 0–100 (no floats, no NaN, no 101);
- a quest with **no** challenges, a challenge id that doesn't resolve, a negative
  reward, or `maxDuration < minDuration`;
- a trait whose `modifierPercent` is outside ±0.5, that applies to nothing, or that
  names an unknown skill/attribute;
- a perk with a `kind` outside the set above, or missing its per-kind params.

---

## FOUR FILLED SAMPLES (each passes the validator)

```json
// challenges.json (excerpt)
{
  "id": "interview-witnesses",
  "activity": "Interviewing witnesses",
  "summary": "The heroes draw out people who saw something and weigh what they say.",
  "checks": [
    { "skill": "inquiry", "difficulty": 45 },
    { "skill": "persuasion", "difficulty": 40 }
  ]
}
```

```json
// quests.json (excerpt)
{
  "id": "the-magistrates-favor",
  "title": "The Magistrate's Favor",
  "giver": "a nervous clerk",
  "location": "The Magistrate's Hall",
  "reward": 350,
  "minDuration": 1,
  "maxDuration": 2,
  "challenges": ["interview-witnesses", "political-support"]
}
```

```json
// traits.json (excerpt)
{
  "id": "frail",
  "name": "Frail",
  "description": "Tires fast and bruises easily; hard travel and climbing take a toll.",
  "effect": {
    "modifierPercent": -0.15,
    "appliesTo": { "attributes": ["constitution"], "skills": ["athletics"] }
  }
}
```

```json
// perks.json (excerpt)
{
  "id": "second-wind",
  "name": "Second Wind",
  "description": "Once per challenge, the hero shrugs off a bad start and tries the weaker demand again.",
  "exception": { "kind": "reroll-lowest-check" }
}
```

The live seed content in `web/src/game/guild/content/*.json` is a longer worked
example of all four kinds and always passes the validator — read it for reference.
