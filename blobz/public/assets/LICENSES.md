# Asset licenses

| Pack | Author | License | Source | Files |
|---|---|---|---|---|
| Tiny Town 1.1 | Kenney (www.kenney.nl) | CC0 1.0 | https://opengameart.org/content/tiny-town | `kenney-tiny-town/tilemap_packed.png`, `kenney-tiny-town/License.txt` |
| Tiny Dungeon 1.0 | Kenney (www.kenney.nl) | CC0 1.0 | https://opengameart.org/content/tiny-dungeon | `kenney-tiny-dungeon/tilemap_packed.png`, `kenney-tiny-dungeon/License.txt` |
| Tiny Farm 1.0 | Kenney (www.kenney.nl) | CC0 1.0 | https://opengameart.org/content/tiny-farm | `kenney-tiny-farm/tilemap_packed.png`, `kenney-tiny-farm/License.txt` |
| Tiny Battle 1.0 | Kenney (www.kenney.nl) | CC0 1.0 | https://opengameart.org/content/tiny-battle | `kenney-tiny-battle/tilemap_packed.png`, `kenney-tiny-battle/License.txt` |
| Tiny Ski 1.0 | Kenney (www.kenney.nl) | CC0 1.0 | https://opengameart.org/content/tiny-ski | `kenney-tiny-ski/tilemap_packed.png`, `kenney-tiny-ski/License.txt` |
| Pixel Platformer | Kenney (www.kenney.nl) | CC0 1.0 | https://opengameart.org/content/pixel-platformer-0 | `kenney-pixel-platformer/tilemap_packed.png` (18px tiles), `kenney-pixel-platformer/License.txt` |
| Game Icons | Kenney (www.kenney.nl) | CC0 1.0 | https://opengameart.org/content/game-icons | not vendored yet: only in `docs/art-review/icons-A.png` (icon family test) |
| Board Game Icons | Kenney (www.kenney.nl) | CC0 1.0 | https://opengameart.org/content/board-game-icons | not vendored yet: only in `docs/art-review/icons-A.png` |
| 1-Bit Pack 1.1 | Kenney (www.kenney.nl) | CC0 1.0 | https://opengameart.org/content/1-bit-pack | not vendored yet: only in `docs/art-review/icons-B.png` |
| Tiny Creatures 1.0 | Kenney (www.kenney.nl) | CC0 1.0 | https://opengameart.org/content/tiny-creatures | not vendored yet: only in `docs/art-review/enemy-options.png` |



UI icons (diamonds, dash arrow, pixel letters) are cut from these packs; no emoji.

## Generated art (not CC0)
| File | Source | Note |
|---|---|---|
| `art/title.png` | Generated with ChatGPT image generation from `docs/ART_PROMPTS.md`, supplied by Stefan | Menu/lobby background |
| `art/logo.png` | Generated with ChatGPT image generation, supplied by Stefan | Menu logo (cropped, resized) |
| `art/victory.png` | Generated with ChatGPT image generation, supplied by Stefan | End screen background |
| `art/ui/*.png` | ChatGPT order 10 (UI kit), sliced with `scripts/slice_sheet.py --native`; source sheet `docs/art-src-ui-kit.png` | Buttons, panels, tabs, input, thumbstick |
| `art/icons/*.png` | ChatGPT order 20 (icons), sliced with `scripts/slice_sheet.py --grid=4x4 --px=13`; source `docs/art-src-icons.png` | HUD, buttons, items, chest, power-ups |
| `art/props/*.png` | ChatGPT order 30 (map props), sliced with `scripts/slice_sheet.py --px=13 --merge=40`; source `docs/art-src-props.png` | Trees, rocks, decor, plates, gate, sign, pond |
| `art/totems/*.png`, `art/enemies/*.png` | ChatGPT orders 40 + 50, sliced with `scripts/slice_sheet.py`; sources `docs/art-src-totems.png`, `docs/art-src-enemies.png` | Base totems, goo enemies (not used in gameplay yet) |
| `art/lobby.png` | ChatGPT order 60 | Lobby background |
| `icon-192.png`, `icon-512.png` | Generated with ChatGPT image generation, supplied by Stefan | App icon (resized) |

Blobz are drawn in code (`src/blob.ts`) as pixel SVG/canvas: color, eyes, mouth and hat are separate parts.

## Own art (CC0)
| File | Source | Note |
|---|---|---|
| `art/fx/*.png` | Drawn in code by `scripts/fx_sheet.py` (Blobz Art) | Effects: dust, goo splat, coin sparkle, totem level-up, coin piles, plate glow |
| `art/props-winter/tree-snow-pine.png`, `tree-snow-small.png`, `tree-bare.png`, `snowman.png`, `rock-snow.png` | Kenney Tiny Ski (CC0), cut from `assets/kenney-tiny-ski/tilemap_packed.png` by `scripts/winter_props.py` (outline thinned to 1 px) | Snow map props |
| `art/props-winter/tree-snow-round.png`, `ice.png`, `igloo.png`, `ice-rock.png`, `bush-*-snow.png`, `pond-frozen-tiles.png` | Own art (CC0) by `scripts/winter_props.py`; snowy round tree is `art/props/tree-green.png` with a snow cap | Snow map props, igloo = base (same 19x17 footprint as `icons/house.png`) |
| `art/gather/*.png` | Own art (CC0) by `scripts/gather_art.py` | Tools, action icons, berry bush, rubble, chips, items, HUD (resources, sun, day bar, stars, quest card) |
| `art/base/*.png` | Own art (CC0) by `scripts/base_art.py` | Base cottage (3 levels), base buildings (site + finished), build spot marker |
| `art/dungeon/*.png` | Own art (CC0) by `scripts/dungeon_art.py` (hit flashes are recoloured `art/enemies/goo-*.png`) | Weapons, picker cards, attack icon, entrance and stairs, hearts, XP bar, level badge, KO/revive, slam warning, shockwave, chest |
| `art/base/cottage-1.png` | Cut from Stefan's ChatGPT loading-screen art (`art/loading.png`) by `scripts/cut_loading_house.py` | Base cottage level 1 |
| `art/fine/**/*.png` | Own art (CC0) by `scripts/fine_art.py` (fine 2x redraws of own sprites, ground tiles in the Kenney Tiny palette) | Fine-resolution world sprites, fx and ground tiles |
| Water shore autotiles (proposal, `docs/art-review/variants-water.png`) | Kenney Tiny Battle 1.0 (CC0, vendored above): frames 18-20, 36-38, 54-56 (shore), 37/92 (water), 90/91 (inner corners), 39 (halves for the south inner corners); variant B = Scale2x pass by `scripts/water_variants.py`, variant C = own art in the same palette | Meadow water corner (pending the board pick) |
| `art/fine/icons/*` hint icons | Own art (CC0) by `scripts/hint_icons.py` | Quest / hint / tutorial icons |
