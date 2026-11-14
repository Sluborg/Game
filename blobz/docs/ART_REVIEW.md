# Art review: in-game consistency at phone size (2026-11-14)

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
