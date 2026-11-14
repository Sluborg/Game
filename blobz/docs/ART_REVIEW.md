# Art review

## Resolution inventory (2026-11-14)
Target: one art pixel ~= one blob fine pixel = **1.45 world px** (`BLOB_SCALE`). "Ratio" = world px per art pixel in the
game today / 1.45 (1.0 = matches the blobz, 2.0 = twice as chunky). DOM/HUD art is sized by CSS and not compared.
Verdicts: **script** = Art redraws (simple shapes), **ChatGPT** = order in `docs/ART_ORDERS.md`, **keep**.

| Files | Scale today | Ratio | Verdict |
|---|---|---|---|
| Blob parts (`src/blob.ts`), class hats | 1.45 | 1.0 | keep |
| `gather/tool-*`, `dungeon/weapon-*`, `dungeon/gear-*` (in hand) | 1.45 | 1.0 | keep |
| `props/tree-*`, `rock`, `boulder`, `stump`, `flowers`, `pond` (ChatGPT round 1) | 2-3 | 1.4-2.1 | ChatGPT **A-7** (waits for the style pick) |
| `props/plate*`, `gate*`, `fence`, `sign` | 3-4 | 2.1-2.8 | ChatGPT **A-7** second sheet (added) |
| `gather/bush-berries`, `bush-empty`, `rubble` | 3 | 2.1 | ChatGPT **A-7** |
| `gather/item-stone`, `item-berries`, `icons/log` (world items) | 1-3 | 0.7-2.1 | **script: done** -> `art/fine/` |
| `gather/chips-wood`, `chips-stone` | 3 | 2.1 | **script: done** -> `art/fine/` |
| `fx/dust`, `levelup`, `plate-glow`, `splat` | 2-4 | 1.4-2.8 | **script: done** -> `art/fine/` |
| `fx/coin-sparkle`, `coin-pile-*` | 2-3 | 1.4-2.1 | script, next batch |
| `icons/chest` (world chest), `icons/boot`, `icons/magnet` (field power-ups) | 2-3 | 1.4-2.1 | chest: ChatGPT A-7 sheet 2; boot/magnet: script, next batch |
| `icons/*` in the HUD/menus (coin, clock, gem, dice, check, house, back, team, ...) | CSS | - | keep (back arrow: A-8) |
| `base/cottage-1` (cut from the ChatGPT loading art) | 3 | 2.1 | ChatGPT **A-2** asks for the whole cottage set at the fine grid |
| `base/cottage-2/3`, buildings + sites, `build-spot` (code-drawn) | 2 | 1.4 | ChatGPT **A-2 / A-5**; build-spot: script, next batch |
| `props-winter/*` (Kenney Tiny Ski cuts + code) | 3-4 | 2.1-2.8 | ChatGPT **A-10** (new, after the A-7 pick) |
| `dungeon/chest-*`, `potion`, `stairs-*`, `entrance*` | 2-3 | 1.4-2.1 | entrance: ChatGPT A-4; chest/potion/stairs: script, next batch |
| `dungeon/fx-*`, `ko-stars`, `revive`, `shockwave`, `slam-warning` | 2-4 | 1.4-2.8 | script, next batch |
| `enemies/goo-*` (ChatGPT round 1) | 2-3 | 1.4-2.1 | ChatGPT **A-8** (variants on the board) |
| Kenney ground tiles (Tiny Town grass/dirt, Tiny Dungeon floors) | 2 | 1.4 | script: fine grass/dirt/floor tiles, next batch |
| `totems/*` | unused | - | remove later (Lead) |
| `ui/*`, `title`, `logo`, `lobby`, `victory`, `loading` | CSS | - | keep |
| `dungeon/btn-*`, `skills/*`, `gather/btn-*`, `hud-*`, HUD bars/stars/cards | CSS | - | keep (style via A-8) |

The ChatGPT style block now asks for a fine pixel grid (blob = 36 px wide, tree 40-50 px, house 90-100 px), so new
ChatGPT art lands at the blobz' resolution.


Checked headless at 390x844 and 844x390 (solo host, gliding around the map) plus every asset side by side.

## Fixed (Art)
| What | Fix |
|---|---|
| All ChatGPT-sliced sprites (props, icons, enemies, totems) had generation noise: 100-580 slightly different colors per 16 px sprite, soft/semi-transparent edge pixels and faint specks. Breaks "flat colors, crisp pixels". | `scripts/clean_art.py`: hard alpha (>= 128 opaque, else clear) and near-identical colors merged (tolerance 14), now 4-47 colors per sprite. Real shading steps kept. Before/after: `docs/art-review/clean-before-after.png` (left = before). `*-empty` placeholders and `ui/` untouched. |

## Needs code (Code / Lead), `src/game.ts`
| Order | Issue | Suggestion |
|---|---|---|
| 10 | Mixed pixel density: one art pixel is 5.2 world px on the house, 3 on the chest, 2.8 trees, 2.6 rock, 2.4 boulder/pond, 2 bush/flowers/ground, 1.8 items, 1.2 carried coins, 1.45 blob. The house looks twice as chunky as the trees next to it. | Pick one scale for world props (e.g. 3 for trees/rocks/house-sized things, 2 for small decor and items) and size the house by using a bigger sprite, not a bigger scale. |
| 20 | Non-integer scales (2.8, 2.6, 2.4, 1.8, 1.45) give uneven pixel widths (some art pixels 2 screen px wide, some 3) once the camera zoom is applied. | Prefer integer scales for props; let the camera zoom do the rest. |
| 30 | `rock.png` (11x8) at 2.6 reads as a pebble next to trees and the blob; it blocks movement but looks harmless. | Scale it up to match the boulder's pixel size, or use only the boulder as an obstacle and the rock as decor. |
| 40 | Blobz are drawn at ~1.45 px per fine pixel (36x48 grid), about half the pixel size of the world art. Approved by Stefan for the face detail, but it is the biggest style difference on screen. | Keep; if blobz should match the world better, raise `BLOB_SCALE` slightly rather than changing the parts. |
| 50 | New effects in `public/art/fx/` are not wired yet (dust, goo splat, coin sparkle, totem level-up, coin piles, plate glow). Frame sizes in `public/art/fx/README.md`. | Wire when the matching gameplay lands. |

## Looked fine
Trees (green, orange, pine), bush, flowers, stump, pond, mushroom, log, coin, chest, totems (all 3 levels read as an upgrade path), goo small/medium/boss, HUD icons. Palette and plum outline are consistent across all sets.
