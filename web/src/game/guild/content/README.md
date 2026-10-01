# Guild content pipeline (Skills v3)

Authored game content — **challenges, quests, traits, perks** — plus the typed vocabulary they are
written against and the schema validator that gates them.

**Authored but NOT wired.** This is the funnel, not the consumer. The shipped sim (`../*.ts`) still
runs the v1 model; nothing here is imported by the sim (a test enforces the isolation). The content
here uses the **Skills v3** vocabulary — **5 attributes, 9 skills, 3/3/3 pillars** — whose single
source of truth is [`docs/GLOSSARY.md`](../../../../../docs/GLOSSARY.md).

## How to author

1. Paste [`docs/CONTENT-SPEC.md`](../../../../../docs/CONTENT-SPEC.md) into ChatGPT.
2. Describe the challenge / quest / trait / perk you want.
3. ChatGPT emits **JSON** in the shapes the spec defines.
4. Drop each array into the matching file here and open a PR.
5. `content.test.ts` runs in CI (`tsc -b` + vitest); a bad drop turns it red with a legible
   `path: message (expected …)`.

## Files

| File | Kind | Edited by |
| --- | --- | --- |
| `attributes.ts` · `skills.ts` · `pillars.ts` · `ladder.ts` | the fixed vocabulary | maintainer |
| `types.ts` | v3 content interfaces | maintainer |
| `challenges.json` | challenge activities (ordered Encounters) | **authored** |
| `quests.json` | quests | **authored** |
| `traits.json` | traits | **authored** |
| `perks.json` | perks (rule-exceptions) | **authored** |
| `schema.ts` | the validator (the only logic here) | maintainer |
| `content.ts` | typed loader binding the JSON | maintainer |
| `content.test.ts` | the CI gate | maintainer |

## The Challenge shape (this slice)

```json
{ "id": "infiltration-job", "activity": "Infiltration job",
  "encounters": [ { "skill": "mobility" }, { "skill": "influence" } ] }
```

A Challenge is an **ordered list of Encounters** (1+); an Encounter is **one named Skill check**
(`skill` only this slice). No per-check difficulty — difficulty lives on the Quest. An Encounter's
`mode` / `crisis` / `bridgeCost`, and a Quest's Physical/Mental/Social `requirements` + `tags`, are
**documented in the glossary but not authorable yet** (they arrive with the engine PR); the
validator rejects them as unknown fields for now.

## What the validator guarantees

- ids kebab-case (`^[a-z0-9-]+$`), NFC, **globally unique across all kinds**;
- every Challenge has **≥ 1 Encounter**, each naming a skill in the 9-skill table (`combat`
  rejected); no **byte-identical adjacent** Encounters;
- Quest reward/duration are in-range integers (`maxDuration ≥ minDuration`) with **≥ 1** resolving
  Challenge reference;
- traits apply a bounded `modifierPercent` (±0.5) to real skills/attributes;
- perks declare a rule-exception from a **closed enum** with valid per-kind params;
- **no unknown/extra fields** on any shape.
