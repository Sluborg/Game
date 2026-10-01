# CONTENT-SPEC — the authoring contract (Skills v3)

> **Paste everything between the rules below into ChatGPT**, then describe the content you want.
> ChatGPT emits **JSON** in these exact shapes; you drop each array into the matching file under
> `web/src/game/guild/content/` and open a PR. A schema test (`content.test.ts`) gates every drop in
> CI and rejects a bad one with a legible `path: message (expected …)`.

This contract governs **content shape**. The vocabulary's single source of truth is
[`docs/GLOSSARY.md`](./GLOSSARY.md); it is reproduced here so the block below is self-contained.

**Authored but not wired.** This content targets the challenge-system v3 vocabulary; it is stored
and validated but not yet rendered in-game. That's expected — this pipeline is the funnel, not the
consumer.

---

## ROLE

You are a content author for a fantasy guild-management game. You emit **only JSON**, in the shapes
below, using **only** the vocabulary below. Never invent an attribute, skill, or field. When unsure
of a value, pick a sensible one inside the stated range and keep going.

## THE VOCABULARY (use verbatim — do not rename, re-case, or invent)

### The five Attributes
`strength` · `dexterity` · `constitution` · `mind` · `charisma`
*(Mind is the single mental attribute — old Intelligence + Wisdom.)* You don't author attribute
numbers; you name Skills, and each Skill's attribute is fixed by the table below.

### The nine Skills (id → attribute → pillar)

| Skill (id) | Attribute | Pillar | Covers |
| --- | --- | --- | --- |
| `force` | strength | Physical | lift, break, overpower |
| `mobility` | dexterity | Physical | stealth, climb, run, dodge |
| `fortitude` | constitution | Physical | endurance; resist poison/disease |
| `reasoning` | mind | Mental | research, investigation, planning, **magic** |
| `nature` | mind | Mental | survival, tracking, **healing** |
| `willpower` | mind | Mental | resist fear, domination, mental powers |
| `influence` | charisma | Social | persuade, deceive, intimidate |
| `inquiry` | charisma | Social | question people, gather rumours |
| `integrity` | charisma | Social | resist manipulation, bribery, temptation |

**`combat` is NOT a skill** — it is a temporary special rule authored later. Never emit it.

### The result ladder (fixed — never author a value or band)

| Result | Value | Working band |
| --- | ---: | ---: |
| Critical Failure | −3 | Below 60% of target |
| Failure | −1 | 60% to below 80% |
| Insufficient | 0 | 80% to below 100% |
| Success | +1 | 100% to below 120% |
| Triumph | +3 | 120% or more |

Where a perk names a band, use the lowercase id: `critical-failure`, `failure`, `insufficient`,
`success`, `triumph`. (Do **not** use the retired v1 ladder Botch/Poor/Success/Great/Triumph.)

## THE CHALLENGE MODEL

A **Challenge** is a broad, reusable activity — *what the heroes are broadly doing* — such as
"Infiltrate and persuade". It holds an **ordered list of Encounters**. An **Encounter is one named
Skill check.** A Challenge has **one or more** Encounters (normally 1–2; 3+ only for rare set
pieces). Array order is the order they play out.

- One-Encounter Challenges are valid.
- A skill may repeat across Encounters **only when the Encounters are meaningfully different** —
  never `mobility → mobility` just to pad a list. The validator rejects identical adjacent
  Encounters.
- **You do not author difficulty.** A generic Challenge carries no difficulty; the Quest sets it.

### Keep the label BROAD — the quest owns the specifics

| ✅ DO (broad activity) | ❌ DON'T (quest-specific detail) |
| --- | --- |
| Researching in a library | Searching the East Reading Room for the Codex of Vharn |
| Interviewing witnesses | Questioning the innkeeper Marta about the fire |
| Infiltrate and persuade | Sneak past Duke Aldric's guards and bribe the chamberlain |

## THE OUTPUT SHAPES

All `id`s are **kebab-case** (`^[a-z0-9-]+$`), lowercase, and **unique across every kind**.

### challenges.json

```json
[
  {
    "id": "infiltration-job",
    "activity": "Infiltration job",
    "summary": "The heroes slip inside, then talk their way deeper.",
    "encounters": [ { "skill": "mobility" }, { "skill": "influence" } ]
  }
]
```

- `id`, `activity`, and `encounters` are required; `activity` must be non-empty and **broad**.
- `summary` is optional, one broad sentence. **Do not** write per-result prose (a line per band) —
  that's the report data-dump the design forbids.
- `encounters` — one or more, each `{ "skill": <one of the 9> }` and **nothing else**.

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

- `reward` — a **flat** integer ≥ 0 (road ≈ 350, ruins ≈ 700, standing ≈ 25). Extra days cost time,
  never gold.
- `minDuration` / `maxDuration` — integer days, `maxDuration ≥ minDuration ≥ 1`.
- `challenges` — an **ordered, non-empty** list of challenge ids, each defined in `challenges.json`.
- `id`, `title`, `giver`, `location` are required non-empty strings.

### traits.json

A trait applies a **percentage modifier** to the check formula's `(Attribute + Skill)` capability,
scoped to named Skills and/or Attributes.

```json
[
  {
    "id": "bookish",
    "name": "Bookish",
    "description": "Study and lore come easily.",
    "effect": { "modifierPercent": 0.15, "appliesTo": { "skills": ["reasoning"] } }
  }
]
```

- `modifierPercent` — within **±0.5** (`0.15` = +15%).
- `appliesTo` — at least one `skills` id and/or one `attributes` id.
- `id`, `name`, `description` required non-empty.

### perks.json

A perk **changes a rule / creates an exception** — it doesn't just add a number a Skill covers.
Choose a `kind` from this closed set:

| kind | meaning | extra params |
| --- | --- | --- |
| `reroll-lowest-check` | re-roll the weakest Encounter once | — |
| `soften-critical-failure` | a Critical Failure is read as a Failure | — |
| `upgrade-result` | one named band → the next-higher band | `fromResult` (any band except `triumph`) |
| `skill-modifier` | a standing +/−% on one named Skill | `skill` (id), `percent` (±0.5) |

```json
[
  { "id": "dogged", "name": "Dogged", "description": "Refuses to fall just short — an Insufficient result is read as a Success.",
    "exception": { "kind": "upgrade-result", "fromResult": "insufficient" } },
  { "id": "silver-tongue", "name": "Silver Tongue", "description": "A standing edge whenever influence is what the moment needs.",
    "exception": { "kind": "skill-modifier", "skill": "influence", "percent": 0.2 } }
]
```

`id`, `name`, `description` required non-empty.

## DO NOT EMIT (documented, not yet authorable)

These are part of the designed model but the game can't consume them yet, so the validator
**rejects them as unknown fields**. Do not put them in a drop:

- on an Encounter: `mode`, `crisis`, `bridgeCost`, `minActors`/`maxActors`, `difficulty`;
- on a Quest: `requirements` (Physical/Mental/Social), `tags`.

They arrive in a later engine PR. Until then, emit only the fields shown above.

## WHAT THE VALIDATOR REJECTS (so emit clean)

- an id that isn't lowercase kebab-case, isn't NFC-normalized, or repeats another id anywhere;
- a challenge with **no encounters**, an encounter that isn't `{skill}`, a `skill` not in the
  9-skill table (including `combat`) or wrong-cased (`Reasoning` ≠ `reasoning`), or two
  **identical adjacent** encounters;
- a quest with **no** challenges, an unresolved challenge id, a `reward` that isn't an integer ≥ 0,
  a `minDuration`/`maxDuration` that isn't an integer ≥ 1, or `maxDuration < minDuration`;
- a trait whose `modifierPercent` is outside ±0.5, that applies to nothing, or names an unknown
  skill/attribute;
- a perk with a `kind` outside the set, missing its per-kind params, or upgrading `triumph`;
- any **empty required string** or any **unknown/extra field** on any shape.

---

## THREE FILLED SAMPLES (this small set validates on its own)

`challenges.json` — a ONE-encounter challenge and a TWO-encounter challenge:

```json
[
  { "id": "research-library", "activity": "Researching in a library",
    "summary": "The heroes comb a scholarly collection for what the quest needs to know.",
    "encounters": [ { "skill": "reasoning" } ] },
  { "id": "wilderness-passage", "activity": "Crossing wild country",
    "summary": "The heroes travel hard ground to reach the site.",
    "encounters": [ { "skill": "nature" }, { "skill": "fortitude" } ] }
]
```

`quests.json` — its challenge ids resolve against the challenges above:

```json
[
  { "id": "the-drowned-archive", "title": "The Drowned Archive",
    "giver": "a hooded antiquarian", "location": "The Sunken Library",
    "reward": 700, "minDuration": 1, "maxDuration": 3,
    "challenges": ["wilderness-passage", "research-library"] }
]
```

*(For maintainers: the live seed in `web/src/game/guild/content/*.json` is a longer worked example
and always passes the validator.)*
