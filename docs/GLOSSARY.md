# Glossary — the content vocabulary (Skills v3)

**Single source of truth.** When another doc (`CHALLENGE_SYSTEM.md`, `CONTENT-SPEC.md`, the
content `README.md`) needs a definition, it points here. Definitions here are authoritative.

Two labels appear throughout:
- **Authorable now** — the shape the content pipeline validates today (this slice).
- **Documented / deferred** — the agreed model, but the *mechanics* are still open and the *fields*
  are **not authorable yet**; they arrive with the later **engine PR**. Emitting a deferred field
  today is rejected as an unknown field, on purpose.

---

## Attributes (5) — *authorable vocabulary*

| Attribute | Pillar |
| --- | --- |
| Strength | Physical |
| Dexterity | Physical |
| Constitution | Physical |
| **Mind** *(Intelligence + Wisdom merged)* | Mental |
| Charisma | Social |

Hard max **10**. Birth is **standardized** — every hero gets **total 14 points, each Attribute 2–4**
(the spread is the archetype; no reroll-fishing) — and Attributes then **grow slowly from use** (a
pillar-wide floor). The three physical attributes stay distinct (they make the different combat
builds); Mind and Charisma each govern three skills.

## Skills (9) — *authorable vocabulary*

Three per pillar, one **resistance** skill in each (Fortitude / Willpower / Integrity).

| Pillar | Attribute | Skill | Encompasses |
| --- | --- | --- | --- |
| Physical | Strength | **Force** | lift, break, overpower, haul |
| Physical | Dexterity | **Mobility** | stealth, climb, run, dodge, balance |
| Physical | Constitution | **Fortitude** | endurance; resist poison, disease, exhaustion (*body*) |
| Mental | Mind | **Reasoning** | research, investigation, planning, **magic / arcana** |
| Mental | Mind | **Nature** | survival, tracking, navigation, **healing / medicine** |
| Mental | Mind | **Willpower** | resolve; resist fear, domination, mental powers (*mind*) |
| Social | Charisma | **Influence** | persuade, deceive, intimidate |
| Social | Charisma | **Inquiry** | question people, gather rumours |
| Social | Charisma | **Integrity** | composure; resist manipulation, bribery, temptation (*character*) |

Hard max **20** (double the Attribute ceiling — training beats birth). A new hero enters with a
small **starting kit** (e.g. one Skill at 2, three at 1, the rest 0) and Skills **grow from use**,
faster than Attributes.

`combat` is **not** a skill — it is a temporary special rule (`CHALLENGE_SYSTEM.md`), authored in a
later slice. The validator rejects a `combat` skill with a dedicated message.

## Pillars (3) — *authorable vocabulary*

**Physical / Mental / Social.** Derived from attributes (Str/Dex/Con → Physical, Mind → Mental,
Charisma → Social), so every skill maps to exactly one pillar, three per pillar (3/3/3). Pillars are
the axis a Quest's requirements are expressed in and the axis a future generator draws along.

---

## Structure

- **Quest** — the top content unit: a giver, a place, a flat reward, a duration, and an ordered list
  of Challenge ids. *(Authorable: id, title, giver, location, reward, min/maxDuration, challenges.)*
- **Challenge** — a broad, reusable **activity** ("Infiltrate and persuade"). Holds an ordered list
  of **Encounters**. The quest owns the specific people/places/stakes; the challenge says only what
  the heroes are broadly doing. *(Authorable: id, `activity`, `summary?`, `encounters`.)*
  - Field is named **`activity`**, not `title` — it signals a broad reusable label and avoids
    clashing with a Quest's `title`.
- **Encounter** — **one named Skill check**, the atomic step of a Challenge. A Challenge has **1+**
  Encounters (normally 1–2, 3+ rare); one-Encounter Challenges are valid. Array order = run order.
  *(Authorable: `skill` only. `mode` / `crisis` / `bridgeCost` / actor counts are deferred.)*
  - A skill may repeat across Encounters **only for meaningfully different Encounters** — a human
    judgement, **not** machine-enforced. The validator rejects only *byte-identical adjacent*
    Encounters (lazy same-skill padding).
- **Difficulty** — a generic Challenge/Encounter carries **none**. The **Quest** sets each
  Encounter's target when it instantiates the Challenge. *(The engine layer; not authored on the
  reusable Challenge.)*
- **Beat** — reserved for the **narration** layer only (one narrated beat may span several
  Encounters). It is *not* a structural unit; do not confuse it with Encounter.

## Resolution — *design direction (numbers tuning-open)*

An Encounter check is **Score = (Attribute + Skill) × (1 + modifierPercent) + 2d6**, vs. the Quest's
Difficulty; the margin drives the ladder below. **2d6** (not d20) keeps luck a tight wobble so the
hero and their modifiers decide the check. Growth is **bounded** (Attr ≤ 10, Skill ≤ 20) and
**use-driven**; **feats** (from a level-up tree) are the build layer and the main source of dramatic
swing. Full rationale + tuning-open notes in `CHALLENGE_SYSTEM.md` §Check formula / §Progression.

## Result ladder — *authorable vocabulary (fixed)*

Global, never redefined by content: **Critical Failure −3 · Failure −1 · Insufficient 0 · Success
+1 · Triumph +3**. Content emits at most a result *name* (never a value or band). See
`CHALLENGE_SYSTEM.md`.

---

## Documented / deferred (the engine PR, not authorable yet)

- **Cooperation Mode** — how participating heroes combine on an Encounter: `additive` / `resisted`
  / `lead` / `individual` (`resisted` replaces the old "fragile"). *Mechanics open.*
- **Crisis** — a hard-fail consequence path (replaces the earlier "Panic"): a bad Encounter result
  can launch a predetermined consequence (combat, pursuit, collapse, …). *Trigger + mechanics open.*
- **Participation states** — engine runtime states, **never authored**:
  - **Committed** — selected for the overall Challenge.
  - **Assigned** — intended to perform a particular Encounter.
  - **Qualified** — personally allowed to continue after resolving an Encounter.
  - **Bridged** — brought into a later Encounter by the combined results of others.
- **bridgeCost / overflow** — spend shared points to bridge pre-assigned heroes forward; surplus
  points may grant a standardized next-Encounter bonus. *Values + math open.*
- **Quest requirements** — Physical/Mental/Social point **budgets** (the new "skulls", replacing the
  v1 Travel/Combat glyphs) + **tags** (steer narration *and* which Challenges the generator draws).
  *Budget values + the generator are deferred.*
- **Feats** — the level-up build layer: picks from a **feat tree** that modify rolls, Skills,
  difficulties, and add rule-exceptions (the grown-up form of the perk exception-kinds in
  `CONTENT-SPEC.md`). *Tree design deferred; philosophy in `CHALLENGE_SYSTEM.md` §Progression.*
- **Presence** — the guild-master's per-area control/standing stat (formerly called "Influence",
  renamed so the *skill* Influence is unambiguous). Lives in `DESIGN.md`, not the content pipeline.

## Non-normative

`docs/skills-v3.md` is the working brainstorm that seeded this vocabulary. It is **non-normative** and
still uses pre-settlement words (Stages, Panic, old skill names, a 45-row pairing library keyed to
the old skills). This glossary supersedes it; that library is a documented backlog for a later
content drop, not a spec.
