# Game Design — the concept

Living design notes for the game. This is the **vision & mechanics** doc; `docs/ROADMAP.md`
tracks the art each feature needs. Written in the planning chat, refined feature-by-feature.

> Status: **concept locked, unbuilt.** Nothing here is implemented yet. Each section becomes a
> separate build session (see "How we build" at the bottom).

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

## 3. The player's levers (only two)

1. **Bounties** — post/raise a reward on a quest to attract a party. Priced using what you know about
   heroes' traits (a greedy hero chases pay; a proud one refuses quests "beneath" him). Money is how
   you pull; **knowledge is the lever.**
2. **Influence** — a per-Area stat you pour money into, with **ongoing upkeep**. Raising it buys
   report fidelity and contests rival guilds; let it lapse and it decays. **No pieces to move on the
   map** — a bureaucrat funds things, he doesn't sneak through forests.

Soft third lever: **recommend** — nudge a party to take on a new member, or nudge a hero to apply.
Never a command.

(Deferred, not v1: a *tiny* number of named "specialist" agents for special actions, if the game
ever feels facelessly mechanical.)

## 4. Report fidelity = presence

How much of a hero's journey you see scales with how much presence you hold there:

| Presence | What you get |
| --- | --- |
| None | A vague rumor. *"The party limped home. Two didn't."* |
| Some influence | A summary. *"Cleared the crypt; the mage nearly died to a trap on floor 2."* |
| Embedded / high | The full turn-by-turn battle log. |

This makes information asymmetry the **reward** for spending on influence, and gives the player a
reason to *want* a better seat.

## 5. Heroes — autonomous, trait-driven

- **Autonomous.** They decide, prepare, and go. You influence, never order.
- **Traits as icons (CK-style),** revealed one at a time — more surface the longer a hero's around
  and the more presence you have. New ones appear under stress: *"Coward — revealed after he fled the
  crypt."*
- **Exaggerated CVs (keystone mechanic).** A recruit's advertised stats can be **inflated**. Each
  stat carries a **certainty icon** = how much you trust it. Hiring is a gamble: pay big for the
  flashy CV or less for the proven-but-modest one; overpay for a fraud and the cash clock bites.
  The **battle report is the lie detector** — real performance corrects the CV over time.
- **Relationships.** Heroes meet and interact (silently) whenever they share a space; each meeting
  shifts their relation. The map becomes spatially social — *where* heroes loiter matters.

## 6. Parties — formed organically, not assigned

- Heroes **form their own parties** out of the relationships they've built. Lone wolves exist —
  a solo hero grinds rat-tier quests in the sewers for a living.
- **Why anyone teams up: difficulty gating.** Good pay is locked behind party-only quests, so a
  hero's greed/ambition is the engine that pushes them to seek allies. That's the pull that makes
  party formation happen.
- **Cohesion modifier.** A party that gets along gets a bonus to performance; two members who hate
  each other drag the party's relation score (and its odds) down.
- **The boss.** Each party has a leader whose preferences carry **stronger weight** in decisions.
  To sway a party, sway its boss — a bounty tuned to the boss's greed moves the whole team.
- **Quest choice factors:** type, personal preference, pay (bounty), difficulty, and the boss's
  weighted vote.

## 7. The rival guild(s) — a mirror of you

Start with **one rival, visible early a few nodes away**; more come with later maps/levels. The rival
runs the *same* playbook you do — bids on quests, holds influence, recruits — which creates friction
for free:

- **Bidding wars** — you both post bounties on the same quest; the better offer (higher, or better
  targeted to the hero's greed) wins.
- **Poaching** — a neglected hero of yours can defect to them; conversely *you* can grab a secretly
  great hero the rival undervalued because you read the CV better. **Info asymmetry becomes a hiring
  edge.**
- **Contested Areas** — influence is a tug-of-war, not just a purchase.

## 8. How you lose — three clocks at three speeds

| Clock | Speed | Threat |
| --- | --- | --- |
| **Cash** | Fast (every turn) | Influence upkeep vs. your cut of rewards. Over-extend → bankruptcy. |
| **Roster** | Medium | Angry/neglected heroes defect to a rival, cutting your income. Self-inflicted. |
| **Doom** | Slow (campaign) | A big-bad event spreads across Areas. The macro stakes — *why guilds exist* — and the finish line the rival also races toward. |

Bankruptcy is the spine; the other two funnel into it.

## 9. The map — Areas revealed by influence

Two zoom tiers, so the map is never bloated:

- **Zoomed out:** the world is a handful of **Areas**, each with a fog/influence level; mostly
  silhouettes.
- **Zoomed in (only where you have influence):** an Area reveals its **few** meaningful nodes.
  Detail is *earned* by influence — which is the core loop again.

**Node types** (a node earns its place only if it offers a decision or info you can't get elsewhere):

- **Quest site** — heroes fight here. Your verbs: raise a bounty, buy influence to see it better.
  **Temporary — quest nodes pop up anywhere on the map and expire.** They also *reactivate as
  faucets, not cups* (see below), with a state arc rather than a respawn timer.
- **Fixed nodes** — the home Area's permanent buildings (guild hall, village).
- **Foreign / uncontrolled** — invest influence to peel back its fog and unlock its quests.

**Quest-node behaviours (locked: depth + escalation; prestige parked):**
- **Depth** (e.g. the Ruins) — clear the entrance, deeper/harder/better-paying quests unlock;
  eventually "fully excavated" and goes quiet. The progression ladder heroes level up on.
- **Escalation** (e.g. the Graveyard) — ignore it and the threat grows on its own, spills into
  neighbouring Areas, feeds the **doom clock**. Tend it or it worsens.

**Economy — gold only (v1).** No multi-resource system; a guild master thinks in gold. Income is
your cut of hero rewards. Multi-resource gathering is parked (see "Ideas parked").

**The first playable map** = the home Area with three nodes: **Guild Hall** (`home-keep`, your seat),
**Village** (`settlement`, civic hub), and a **Ruins** quest node (new). Not a sprawling many-node
city — density is earned later, not front-loaded.

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

### Polish backlog
- **Node selection effect.** The current highlight is functional but plain — replace with a prettier
  selection treatment (soft glow / animated ring / gentle pulse) that matches the painterly map.

## How we build

Planning stays in the design chat. Each feature ships as its **own Claude Code session**, kicked off
with a prompt drafted in that chat, following the repo loop (plan → review → build → review → PR into
`dev` → codex → merge). This doc is the shared source of truth those sessions read from.

**Next up (small step):** put **Guild Hall, Village, Ruins** on the map as real, *clickable* nodes
with a visible selection state — replacing the three placeholder boxes on the Node Test screen.
Two independent prompts: one game session (add the `ruins` node + click-to-select) and one Lubot
brief (produce the three node visuals).

Likely build order after that (to be refined):

1. Heroes as data — stats, trait icons, certainty, the exaggerated-CV model.
2. The battle system (the core + truth oracle).
3. Report fidelity tiers tied to a presence stat.
4. Bounties + autonomous quest selection.
5. Parties — relationships, cohesion, the boss, organic formation.
6. Influence as per-Area upkeep + the map's two zoom tiers.
7. The rival guild AI (mirror).
8. The three loss clocks.
