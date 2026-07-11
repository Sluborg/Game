# Guild content pipeline (v2 vocabulary)

Authored game content — **challenges, quests, traits, perks** — plus the typed
vocabulary they are written against and the schema validator that gates them.

**Authored but NOT wired.** This is the funnel, not the consumer. The shipped sim
(`../*.ts`) still runs on the v1 model (4 attributes `str/dex/sta/per`, the
`crit/good/ok/poor/fail` grade ladder). The content here uses the **v2** challenge
vocabulary from [`docs/CHALLENGE_SYSTEM.md`](../../../../../docs/CHALLENGE_SYSTEM.md):
6 Attributes, the 15-skill table, two-skill challenges, and the
`Critical Failure / Failure / Insufficient / Success / Triumph` (−3/−1/0/+1/+3)
ladder. Nothing in the sim imports this directory yet — a test enforces the
isolation. When the challenge system is implemented, the sim migrates onto this
vocabulary and the v1 ladder is superseded.

## How to author

1. Paste [`docs/CONTENT-SPEC.md`](../../../../../docs/CONTENT-SPEC.md) into ChatGPT.
2. Describe the quest / challenges / traits / perks you want.
3. ChatGPT emits **JSON** in the shapes below.
4. Drop each array into the matching file here and open a PR.
5. `content.test.ts` runs in CI; a bad drop turns it red with a legible
   `path: message (expected …)` for every problem.

## Files

| File | Kind | Edited by |
| --- | --- | --- |
| `attributes.ts` | the 6 Attributes | maintainer (fixed vocabulary) |
| `skills.ts` | the 15-skill → Attribute table | maintainer (fixed vocabulary) |
| `ladder.ts` | the 5-band result ladder | maintainer (fixed vocabulary) |
| `types.ts` | v2 content interfaces | maintainer |
| `challenges.json` | challenge activities | **authored (ChatGPT drop)** |
| `quests.json` | quests | **authored (ChatGPT drop)** |
| `traits.json` | traits | **authored (ChatGPT drop)** |
| `perks.json` | perks (rule-exceptions) | **authored (ChatGPT drop)** |
| `schema.ts` | the validator (the only logic here) | maintainer |
| `content.ts` | typed loader binding the JSON | maintainer |
| `content.test.ts` | the CI gate | maintainer |

## What the validator guarantees

- ids are kebab-case (`^[a-z0-9-]+$`), NFC-normalized, and **globally unique
  across all kinds**;
- every challenge declares **exactly two checks on two different skills**, each
  skill in the 15-skill table, each difficulty an integer 0–100 (`combat` is
  rejected — it is a temporary special rule authored in the later combat slice);
- every quest reward/duration is an in-range integer (`maxDuration ≥ minDuration`)
  and lists **≥ 1 challenge** that resolves to a defined challenge;
- traits apply a bounded `modifierPercent` (±0.5) to real skills/attributes;
- perks declare a rule-exception from a **closed enum**, with valid per-kind
  params.

The reference graph is a strict 2-level DAG (quest → challenge → skill); there are
no back-edges, so cycles are impossible. The challenge's single **visible
difficulty is derived** (`deriveVisibleDifficulty` = max of the two checks) and is
stored nowhere.
