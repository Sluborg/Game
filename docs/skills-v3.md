> **Non-normative / superseded.** This is the working brainstorm that seeded the Skills v3
> vocabulary. The settled, authoritative vocabulary lives in [`docs/GLOSSARY.md`](./GLOSSARY.md);
> where this doc disagrees (it still uses pre-settlement words — Stages, Panic, the old 15-skill
> names, Intimidation under Strength), the glossary wins. Kept for its design rationale and the
> 45-row pairing + narration libraries, which are a documented backlog for a later content drop.

# Skills v3 — Skills and Challenge System

Status: Working design document. It collects the current Skill narration library and the Challenge-system ideas agreed or discussed after v2. It is not yet an implementation contract.

## Current design direction

### Challenge scope

- A Challenge contains one or more ordered Stages.
- Simple Challenges may contain one Skill check.
- Most standard Challenges will probably contain two different Skill checks.
- Repeating the same Skill is valid only when the Stages represent meaningfully different situations, participation, or consequences. `Stealth → Stealth` must not exist merely to satisfy a two-check rule.
- Three or more Stages should be reserved for unusual set-piece Challenges.
- The normal Stage order is the order of the `stages` array. A separate `stageOrder` field is unnecessary.

### Reusability and narration

- Challenge names and Stage activities must remain broad and reusable.
- Use minimal narration until the dynamic system is decided.
- Quest-specific people, places, enemies, objects, and stakes belong to the Quest.
- Prefer `Infiltrate and persuade` over `Infiltrate the guarded compound and convince its commander`.
- Skill difficulties and levels are intentionally omitted from this working structure. They can be connected to the Quest later.

### Hero participation

Stage assignments are made before the Challenge starts.

- **Committed:** selected for the overall Challenge.
- **Assigned:** intended to perform a particular Stage.
- **Qualified:** personally allowed to continue after resolving a Stage.
- **Bridged:** brought into a later Stage by the combined results of other heroes.

This allows specialists to perform different parts of the same Challenge. A Stealth specialist can clear a route for a pre-assigned Persuasion specialist instead of forcing the Persuasion specialist to make an implausibly difficult Stealth check.

If the intended hero is not qualified or bridged into the next Stage, an eligible hero may need to improvise. The exact fallback rules are still open.

### Standard result points

Result points are global and must not be redefined by individual Challenges:

```text
-3, -1, 0, +1, +3
```

The final names and exact meaning of all five result levels should follow the resolver's established result vocabulary. Challenge content stores neither custom point values nor per-result scoring tables.

### Cooperation modes

Current proposed mode vocabulary:

- **additive:** More contributors cannot reduce progress. Negative result points are treated as zero for the shared effort. Suitable for moving rubble, hauling, or searching a wide area.
- **resisted:** Positive and negative points both affect the shared result. Suitable when mistakes oppose the group's progress, such as Stealth or delicate coordination.
- **lead:** One pre-assigned hero performs the primary check, with any cooperation handled through a standardized support mechanic.
- **individual:** Every affected hero resolves the check personally, such as resisting a toxin or crossing a personal hazard.

`Resisted` is preferred over `fragile`. It communicates that failed contributions actively work against group progress.

The exact support mechanic for `lead` and the exact pooling rules for `individual` remain unresolved.

### Bridging between Stages

- Heroes who achieve a qualifying result may continue personally.
- A Stage may define a `bridgeCost`.
- Shared points can be spent to bring pre-assigned heroes into the next Stage.
- `bridgeCost` is Challenge-specific; passing one additional hero must not always cost one point.
- Bridging pre-assigned heroes happens before applying overflow benefits.

Example: Three heroes attempt Stealth. Two produce `+1` and one produces `-1`, leaving one shared point. If `bridgeCost` is two, the successful sneakers qualify personally, but they cannot yet bring the waiting Persuasion specialist forward.

### Overflow bonuses

After bridging, surplus points may benefit the next Stage.

The bonus must be standardized by the resolver rather than authored separately for every Challenge. Still unresolved:

- How many surplus points produce one bonus.
- Whether the bonus modifies the roll, adds result points, changes a result tier, or provides another standardized benefit.
- Whether there is a universal cap.

### Panic responses

- A sufficiently bad Stage result may replace the planned next Stage with a Panic Encounter.
- The Panic response is predetermined by the Challenge author so it follows logically from the failed activity.
- Panic responses may reference reusable encounters such as Combat, pursuit, collapse, or party-wide Resistance.
- A Panic Encounter is a consequence path, not a forced additional Skill in every Challenge.

Still unresolved:

- The universal Panic threshold.
- Whether exceptional individual failures can trigger Panic despite a tolerable shared score.
- Whether surviving Panic can return the party to the planned path or always replaces it.

### Minimums and maximums

- Do not set a minimum hero count casually; it can lock smaller parties out of content.
- State a maximum only when a genuine hard cap is required, commonly one or two heroes.
- When no hard cap exists, prefer omitting the maximum. Treating `0` as unlimited is an implementation fallback only if the schema requires a numeric value.
- Cooperation modes should imply common limits where possible. For example, `lead` naturally implies one primary actor.

### Minimal provisional JSON

Challenge content should contain only content choices and genuine exceptions. Standard resolver behavior must not be repeated in every object.

```json
{
  "id": "infiltrate-and-persuade",
  "name": "Infiltrate and persuade",
  "stages": [
    {
      "skill": "Stealth",
      "mode": "resisted",
      "bridgeCost": 2,
      "panic": "combat"
    },
    {
      "skill": "Persuasion",
      "mode": "lead"
    }
  ]
}
```

A one-Skill Challenge uses the same structure with a single Stage. Optional fields such as `maxActors`, `bridgeCost`, and `panic` should appear only when they differ from standard behavior.

## Two-Skill Challenge library

Status: Initial broad pairing library. These entries deliberately omit narration, modes, bridging, Panic responses, and difficulties until the dynamic system is further established. Skill order is provisional but represents the likely Stage order.

Each line is an independent JSON object.

```jsonl
{"id":"infiltration-job","name":"Infiltration job","stages":[{"skill":"Stealth"},{"skill":"Persuasion"}]}
{"id":"forced-entry","name":"Forced entry","stages":[{"skill":"Force"},{"skill":"Intimidation"}]}
{"id":"wilderness-expedition","name":"Wilderness expedition","stages":[{"skill":"Survival"},{"skill":"Endurance"}]}
{"id":"magical-investigation","name":"Magical investigation","stages":[{"skill":"Investigation"},{"skill":"Arcana"}]}
{"id":"rescue-operation","name":"Rescue operation","stages":[{"skill":"Athletics"},{"skill":"Medicine"}]}
{"id":"covert-extraction","name":"Covert extraction","stages":[{"skill":"Stealth"},{"skill":"Force"}]}
{"id":"hostile-negotiation","name":"Hostile negotiation","stages":[{"skill":"Intimidation"},{"skill":"Persuasion"}]}
{"id":"ancient-research","name":"Ancient research","stages":[{"skill":"Research"},{"skill":"Arcana"}]}
{"id":"public-deception","name":"Public deception","stages":[{"skill":"Deception"},{"skill":"Persuasion"}]}
{"id":"disease-outbreak","name":"Disease outbreak","stages":[{"skill":"Inquiry"},{"skill":"Medicine"}]}
{"id":"defensive-preparation","name":"Defensive preparation","stages":[{"skill":"Planning"},{"skill":"Force"}]}
{"id":"dangerous-crossing","name":"Dangerous crossing","stages":[{"skill":"Survival"},{"skill":"Athletics"}]}
{"id":"poisoned-expedition","name":"Poisoned expedition","stages":[{"skill":"Resistance"},{"skill":"Medicine"}]}
{"id":"witness-investigation","name":"Witness investigation","stages":[{"skill":"Inquiry"},{"skill":"Investigation"}]}
{"id":"smuggling-operation","name":"Smuggling operation","stages":[{"skill":"Deception"},{"skill":"Stealth"}]}
{"id":"siege-endurance","name":"Siege endurance","stages":[{"skill":"Endurance"},{"skill":"Force"}]}
{"id":"magical-containment","name":"Magical containment","stages":[{"skill":"Arcana"},{"skill":"Resistance"}]}
{"id":"corrupted-passage","name":"Corrupted passage","stages":[{"skill":"Resistance"},{"skill":"Survival"}]}
{"id":"search-operation","name":"Search operation","stages":[{"skill":"Planning"},{"skill":"Investigation"}]}
{"id":"diplomatic-mission","name":"Diplomatic mission","stages":[{"skill":"Research"},{"skill":"Persuasion"}]}
{"id":"monster-hunt","name":"Monster hunt","stages":[{"skill":"Survival"},{"skill":"Force"}]}
{"id":"prison-escape","name":"Prison escape","stages":[{"skill":"Force"},{"skill":"Stealth"}]}
{"id":"coercive-interrogation","name":"Coercive interrogation","stages":[{"skill":"Intimidation"},{"skill":"Inquiry"}]}
{"id":"disaster-response","name":"Disaster response","stages":[{"skill":"Planning"},{"skill":"Medicine"}]}
{"id":"hazardous-pursuit","name":"Hazardous pursuit","stages":[{"skill":"Athletics"},{"skill":"Endurance"}]}
{"id":"forbidden-ritual","name":"Forbidden ritual","stages":[{"skill":"Research"},{"skill":"Resistance"}]}
{"id":"ambush-operation","name":"Ambush operation","stages":[{"skill":"Planning"},{"skill":"Stealth"}]}
{"id":"field-surgery","name":"Field surgery","stages":[{"skill":"Endurance"},{"skill":"Medicine"}]}
{"id":"counter-espionage","name":"Counter-espionage","stages":[{"skill":"Investigation"},{"skill":"Deception"}]}
{"id":"arcane-diplomacy","name":"Arcane diplomacy","stages":[{"skill":"Arcana"},{"skill":"Persuasion"}]}
{"id":"hostile-reconnaissance","name":"Hostile reconnaissance","stages":[{"skill":"Stealth"},{"skill":"Survival"}]}
{"id":"expedition-planning","name":"Expedition planning","stages":[{"skill":"Research"},{"skill":"Planning"}]}
{"id":"crowd-control","name":"Crowd control","stages":[{"skill":"Intimidation"},{"skill":"Endurance"}]}
{"id":"trap-clearance","name":"Trap clearance","stages":[{"skill":"Investigation"},{"skill":"Athletics"}]}
{"id":"enemy-impersonation","name":"Enemy impersonation","stages":[{"skill":"Inquiry"},{"skill":"Deception"}]}
{"id":"relic-recovery","name":"Relic recovery","stages":[{"skill":"Force"},{"skill":"Arcana"}]}
{"id":"plague-investigation","name":"Plague investigation","stages":[{"skill":"Research"},{"skill":"Medicine"}]}
{"id":"forced-march","name":"Forced march","stages":[{"skill":"Planning"},{"skill":"Endurance"}]}
{"id":"wilderness-rescue","name":"Wilderness rescue","stages":[{"skill":"Survival"},{"skill":"Medicine"}]}
{"id":"public-challenge","name":"Public challenge","stages":[{"skill":"Athletics"},{"skill":"Intimidation"}]}
{"id":"magical-infiltration","name":"Magical infiltration","stages":[{"skill":"Stealth"},{"skill":"Arcana"}]}
{"id":"political-inquiry","name":"Political inquiry","stages":[{"skill":"Inquiry"},{"skill":"Persuasion"}]}
{"id":"sabotage-mission","name":"Sabotage mission","stages":[{"skill":"Planning"},{"skill":"Deception"}]}
{"id":"ruin-exploration","name":"Ruin exploration","stages":[{"skill":"Athletics"},{"skill":"Investigation"}]}
{"id":"dangerous-treatment","name":"Dangerous treatment","stages":[{"skill":"Resistance"},{"skill":"Medicine"}]}
{"id":"escape-under-pursuit","name":"Escape under pursuit","stages":[{"skill":"Endurance"},{"skill":"Stealth"}]}
```

### Initial Skill coverage

| Skill | Appearances |
| --- | ---: |
| Force | 7 |
| Intimidation | 5 |
| Athletics | 6 |
| Stealth | 8 |
| Endurance | 7 |
| Resistance | 5 |
| Inquiry | 5 |
| Persuasion | 6 |
| Deception | 5 |
| Research | 5 |
| Arcana | 6 |
| Planning | 7 |
| Investigation | 6 |
| Survival | 6 |
| Medicine | 8 |

## Heroic narration library

Format in play: `Hero X is: "narration"`

The entries are intentionally broad enough to reuse across quests, but dramatic enough to describe meaningful party action. Near-duplicates from the first brainstorm have been collapsed into the clearest wording and replaced with wider situations.

## Strength

### Force

1. Hero X is: "lifting an immense weight"
2. Hero X is: "smashing through an obstacle"
3. Hero X is: "forcing open a sealed entrance"
4. Hero X is: "holding up a collapsing structure"
5. Hero X is: "tearing apart heavy restraints"
6. Hero X is: "bending something thought unbreakable"
7. Hero X is: "dragging a massive burden"
8. Hero X is: "pushing back an overwhelming force"
9. Hero X is: "overpowering a formidable opponent"
10. Hero X is: "bracing against a devastating impact"

### Intimidation

1. Hero X is: "threatening a dangerous foe"
2. Hero X is: "driving enemies away without a fight"
3. Hero X is: "forcing an unwilling captive to cooperate"
4. Hero X is: "facing down a powerful rival"
5. Hero X is: "commanding an enemy to surrender"
6. Hero X is: "silencing a hostile gathering"
7. Hero X is: "asserting dominance over a savage creature"
8. Hero X is: "delivering a terrifying ultimatum"
9. Hero X is: "breaking an enemy's courage"
10. Hero X is: "claiming authority before a hostile force"

## Dexterity

### Athletics

1. Hero X is: "scaling a sheer surface"
2. Hero X is: "leaping across a deadly gap"
3. Hero X is: "balancing above a dangerous fall"
4. Hero X is: "swimming through violent waters"
5. Hero X is: "outrunning an approaching danger"
6. Hero X is: "dodging a deadly trap"
7. Hero X is: "weaving through spreading flames"
8. Hero X is: "crossing collapsing ground"
9. Hero X is: "swinging across an open chasm"
10. Hero X is: "escaping pursuit across difficult terrain"

### Stealth

1. Hero X is: "sneaking past watchful guards"
2. Hero X is: "hiding from a relentless search"
3. Hero X is: "moving silently across treacherous ground"
4. Hero X is: "shadowing a suspicious target"
5. Hero X is: "slipping away unnoticed"
6. Hero X is: "concealing the party's passage"
7. Hero X is: "blending into unfamiliar surroundings"
8. Hero X is: "infiltrating a guarded stronghold"
9. Hero X is: "crossing an exposed area unseen"
10. Hero X is: "preparing a hidden ambush"

## Constitution

### Endurance

1. Hero X is: "crossing hostile country without rest"
2. Hero X is: "fighting through a prolonged battle"
3. Hero X is: "climbing for hours without stopping"
4. Hero X is: "carrying a wounded ally to safety"
5. Hero X is: "remaining alert through a sleepless vigil"
6. Hero X is: "rowing against an overpowering current"
7. Hero X is: "holding breath beneath the water"
8. Hero X is: "working through the night against disaster"
9. Hero X is: "maintaining pace during a relentless pursuit"
10. Hero X is: "pushing onward beyond exhaustion"

### Resistance

1. Hero X is: "resisting a deadly poison"
2. Hero X is: "fighting off a virulent disease"
3. Hero X is: "withstanding unbearable pain"
4. Hero X is: "enduring supernatural heat"
5. Hero X is: "surviving unnatural cold"
6. Hero X is: "breathing in a poisonous atmosphere"
7. Hero X is: "remaining conscious after a grave wound"
8. Hero X is: "resisting a corrupting influence"
9. Hero X is: "withstanding a life-draining effect"
10. Hero X is: "fighting an unwanted transformation"

## Charisma

### Inquiry

1. Hero X is: "interviewing a frightened witness"
2. Hero X is: "questioning a guarded prisoner"
3. Hero X is: "gathering rumors in unfamiliar territory"
4. Hero X is: "consulting a reluctant expert"
5. Hero X is: "exposing contradictions in a story"
6. Hero X is: "drawing out a carefully hidden secret"
7. Hero X is: "locating someone through careful questioning"
8. Hero X is: "uncovering what a community fears"
9. Hero X is: "earning the confidence of a shaken survivor"
10. Hero X is: "questioning an otherworldly being"

### Persuasion

1. Hero X is: "rallying allies to a dangerous cause"
2. Hero X is: "negotiating peace between bitter enemies"
3. Hero X is: "gaining an audience with someone powerful"
4. Hero X is: "changing a ruler's decision"
5. Hero X is: "securing aid for the party"
6. Hero X is: "calming a hostile crowd"
7. Hero X is: "mediating a dangerous dispute"
8. Hero X is: "bargaining for safe passage"
9. Hero X is: "restoring courage to wavering allies"
10. Hero X is: "pleading for an enemy's mercy"

### Deception

1. Hero X is: "assuming a false identity"
2. Hero X is: "lying past suspicious guards"
3. Hero X is: "concealing the party's true objective"
4. Hero X is: "creating a convincing distraction"
5. Hero X is: "bluffing with strength the party does not possess"
6. Hero X is: "redirecting suspicion toward a false culprit"
7. Hero X is: "impersonating someone with authority"
8. Hero X is: "feigning weakness or surrender"
9. Hero X is: "planting false information"
10. Hero X is: "maintaining a cover story under questioning"

## Intelligence

### Research

1. Hero X is: "searching an ancient library"
2. Hero X is: "studying a forbidden text"
3. Hero X is: "consulting a sealed archive"
4. Hero X is: "comparing conflicting accounts"
5. Hero X is: "verifying a dangerous claim"
6. Hero X is: "tracing a forgotten history"
7. Hero X is: "reviewing maps of lost territory"
8. Hero X is: "finding a precedent in ancient law"
9. Hero X is: "reconstructing an event from written records"
10. Hero X is: "locating a rare source of knowledge"

### Arcana

1. Hero X is: "identifying an unknown spell"
2. Hero X is: "deciphering magical runes"
3. Hero X is: "recognizing a hidden enchantment"
4. Hero X is: "analyzing a powerful curse"
5. Hero X is: "handling a volatile magical artifact"
6. Hero X is: "disrupting a dangerous ritual"
7. Hero X is: "following a fading magical trace"
8. Hero X is: "recalling the weakness of an arcane entity"
9. Hero X is: "predicting an unstable magical event"
10. Hero X is: "containing a surge of uncontrolled magic"

### Planning

1. Hero X is: "preparing an infiltration"
2. Hero X is: "coordinating a decisive assault"
3. Hero X is: "anticipating an enemy's response"
4. Hero X is: "allocating supplies for a dangerous expedition"
5. Hero X is: "choosing a route through hostile territory"
6. Hero X is: "preparing for a likely disaster"
7. Hero X is: "organizing the defence of a vulnerable position"
8. Hero X is: "timing a complex operation"
9. Hero X is: "arranging an evacuation under threat"
10. Hero X is: "adapting a plan after a sudden reversal"

## Wisdom

### Investigation

1. Hero X is: "searching the scene of a mysterious event"
2. Hero X is: "following a trail of physical clues"
3. Hero X is: "uncovering a concealed passage"
4. Hero X is: "reconstructing a violent struggle"
5. Hero X is: "exposing a convincing forgery"
6. Hero X is: "identifying the cause of sabotage"
7. Hero X is: "connecting scattered evidence"
8. Hero X is: "testing a dangerous theory"
9. Hero X is: "discovering how a hidden mechanism works"
10. Hero X is: "revealing evidence disguised as something ordinary"

### Survival

1. Hero X is: "finding shelter in a deadly environment"
2. Hero X is: "foraging where nothing should survive"
3. Hero X is: "locating water in barren country"
4. Hero X is: "navigating without paths or landmarks"
5. Hero X is: "tracking a dangerous creature"
6. Hero X is: "predicting a violent change in weather"
7. Hero X is: "making fire in impossible conditions"
8. Hero X is: "guiding the party around a natural hazard"
9. Hero X is: "evading predators in their own territory"
10. Hero X is: "leading the party through the wilderness"

### Medicine

1. Hero X is: "treating wounds after a brutal battle"
2. Hero X is: "diagnosing a mysterious illness"
3. Hero X is: "stopping fatal bleeding"
4. Hero X is: "setting badly broken bones"
5. Hero X is: "stabilizing someone on the brink of death"
6. Hero X is: "treating an unfamiliar poison"
7. Hero X is: "preventing an outbreak from spreading"
8. Hero X is: "performing desperate surgery"
9. Hero X is: "reviving an unconscious ally"
10. Hero X is: "determining what caused a strange injury"
