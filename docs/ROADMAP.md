# Roadmap — features & the art they need

This repo is the **planning hub** for the game. Each milestone below lists the art **slugs** it
requires. Those slugs are the game's declared demand and live, machine-readable, in
[`/art-needs.json`](../art-needs.json) (the `feature` field on each need points back to a milestone
here). Whether a slug's art actually exists yet is answered by ArtLibrary's live manifest — run
`npm run reconcile` (see [`docs/ART.md`](./ART.md)).

- **NEEDED** = declared here + in `art-needs.json`.
- **DONE** = present in `Sluborg/ArtLibrary` `asset-index.json` under collection `AssetReport`, with a
  downloadable `raw_url`.
- The node/resource taxonomy comes from `web/src/art/enums.ts` (`NodeType` / `ResourceType`), which
  mirrors ArtLibrary's `Games/AssetReport/GameArtBible.md`.

Status snapshot **as of 2026-07-01** (the `✅`/`⛔` markers below are a hand snapshot): **4 done · 25
needed-not-yet-produced**. The only produced visuals today are the four AssetReport reference pieces
(overworld map ×2, node design sheet, title screen). **Run `npm run reconcile` for live status** — the
script computes it from the manifest, so treat it, not this table, as authoritative.

---

## Milestone: `overworld-map-nodes` — Overworld map & core nodes

The overworld map plus the first hand-placed building nodes: the player's seat, a landmark, a
settlement, and the guild office. Establishes the node visual language (see the produced design sheet).

| Slug | Kind | Status |
| --- | --- | --- |
| `map-overworld` | ui | ✅ done |
| `map-overworld-v2` | ui | ✅ done |
| `node-design-sheet` | ui (reference) | ✅ done |
| `home-keep` | node | ⛔ needed |
| `grand-citadel` | node | ⛔ needed |
| `settlement` | node | ⛔ needed |
| `guild-office` | ui¹ | ⛔ needed |

¹ `guild-office` is a planned map node that is **not yet in the `NodeType` roster/enum**, so it's
declared as `kind: ui` for now (promote it to a `node` once ArtLibrary's GameArtBible adds it).

## Milestone: `quest-sites` — Quest sites

Dispatchable quest locations on the overworld — the seats of the core loop (send a party, read
back a report). The first is the **Ruins**, introduced on the `/node` "Map" screen as a labelled,
selectable placeholder node (no mechanics yet). This is the first `NodeType` declared ahead of
ArtLibrary's GameArtBible (see the `TODO(art-bible)` notes in `web/src/art/enums.ts`).

| Slug | Kind | Status |
| --- | --- | --- |
| `ruins` | node | ⛔ needed |

## Milestone: `resource-economy` — Resource nodes & economy

Gatherable resource nodes and the market, plus the resource icons the HUD needs.

| Slug | Kind | Status |
| --- | --- | --- |
| `lumber-camp` | node | ⛔ needed |
| `quarry` | node | ⛔ needed |
| `farmland` | node | ⛔ needed |
| `iron-mine` | node | ⛔ needed |
| `gold-mine` | node | ⛔ needed |
| `market` | node | ⛔ needed |
| `wood` `stone` `food` `iron` `gold` `approval` | resource icons | ⛔ needed |

## Milestone: `military-defense` — Military & defense

| Slug | Kind | Status |
| --- | --- | --- |
| `barracks` | node | ⛔ needed |
| `archer-tower` | node | ⛔ needed |
| `wall` | node | ⛔ needed |

## Milestone: `research-crafting-divine` — Research, crafting & divine

| Slug | Kind | Status |
| --- | --- | --- |
| `academy` | node | ⛔ needed |
| `forge` | node | ⛔ needed |
| `temple` | node | ⛔ needed |
| `knowledge` `faith` | resource icons | ⛔ needed |

## Milestone: `ui-branding` — UI & branding

| Slug | Kind | Status |
| --- | --- | --- |
| `title-screen` | ui | ✅ done |
| `ui-nameplate` | ui | ⛔ needed |

## Known gap (not yet declared): hero parties & report fidelity

The pivot's core fun — **autonomous hero parties** you dispatch but never directly control, read
back through **fallible field reports** (information asymmetry) — has **no art declared yet**. The
guild/report layer that embodied it was removed in the 2026-06-30 start-screen reset, so there is no
`NodeType`/`ResourceType` or ArtLibrary roster to seed from without inventing vocabulary. When that
feature returns, add a `hero-parties-reports` milestone here and the matching slugs (e.g. party
marker, report-card frame, fog/unknown-state icon) to `art-needs.json` — until then this is a
deliberate, tracked gap rather than an oversight.

---

## How to evolve this roadmap

1. Add a feature/milestone here and list the art slugs it needs.
2. Add each slug to [`/art-needs.json`](../art-needs.json) with its `kind` and this milestone's id in
   `feature`. (Node/resource slugs must also exist in `web/src/art/enums.ts` — the parity test
   `web/src/art/art-needs.test.ts` enforces this.)
3. Run `npm run reconcile` to see the new slugs as `missing-art` until ArtLibrary produces them.
4. When ArtLibrary uploads the visual (filename convention `node-<slug>.png` / `icon-resource-<slug>.png`),
   the slug flips to `done` / `ok` on the next reconcile — no game code change required.
