# Old art checklist: every non-Ninja image still used, and its Ninja replacement

Made by Art for "replace old art" (Stefan). Source: grep of `src/`, `index.html`, `style.css`, `dungeon.css` on the
deploy branch `claude/mobile-game-5-players-8qthjq` (cd8ceb3) plus the heads of `claude/blobz-code` (7fdedd0) and
`claude/blobz-dungeon` (05d0118, re-checked at d0f50b9: the dungeon is Ninja now); none adds a new old-art reference. Regenerate with
`python3 scripts/old_art_checklist.py` after editing the rows there.

- **Ninja** paths are relative to `public/assets/ninja-adventure/`; rects are `x,y,w,h` (see `docs/ART_MAP.md`).
- **GAP** = Ninja has nothing usable: needs a ChatGPT order (or an Art piece only with Stefan's OK).
- **STAND-IN** = no exact Ninja match, but a Ninja piece that reads right (Lead's call: good enough).
- **PENDING** = an Art piece made before the "no own art" rule; it waits for Stefan's rating.
- Owner = who swaps the reference: Code (meadow, UI, `game.ts`/`main.ts`/`style.css`/`index.html`), Code 2 (`dungeon*`).
- Tick the box when the game no longer loads the old file.

**Counts: 209 total / 82 mapped to Ninja / 20 Ninja stand-ins / 1 pending Art rating / 0 gaps / 93 done / 13 archived (snow).**


## Screens

| Done | Old file (public/) | Used in | Owner | Ninja replacement |
|---|---|---|---|---|
| [x] | `art/title.png` | start screen bg landscape (style.css #start, i18n) | Code | DONE by ChatGPT N-2 landscape (556f547); not Ninja, approved route |
| [x] | `art/start-portrait.png` | start screen portrait bg (style.css) | Code | DONE: approved ChatGPT art (N-2 portrait), keep |
| [ ] | `art/lobby.png` | lobby bg (style.css #lobby; the lobby screen still shows) | Code | STAND-IN: reuse the N-2 start art (art/title.png landscape, art/start-portrait.png portrait) under the lobby card |
| [x] | `art/loading.png` | loading screen (index.html, main.ts, style.css) | Code | DONE: approved ChatGPT art, keep |
| [x] | `art/loading-portrait.png` | loading screen portrait (style.css) | Code | DONE: approved ChatGPT art (N-3), keep |
| [x] | `art/loading-landscape.png` | loading screen landscape (style.css) | Code | DONE: approved ChatGPT art (N-3), keep |
| [x] | `art/logo.png` | logo on loading/start (index.html, main.ts) | Code | DONE: approved ChatGPT art, keep |
| [x] | `art/victory.png` | end screen bg (style.css #end) | Code | DONE: ChatGPT N-6 (6f5fb3e, no coins) |

## UI kit

| Done | Old file (public/) | Used in | Owner | Ninja replacement |
|---|---|---|---|---|
| [ ] | `art/ui/panel.png` | all panels / cards (style.css border-image 4) | Code | Ui/Theme/Theme Wood/nine_path_panel.png, border-image slice 6 6 5 5 fill (white text fill: nine_path_panel_3) |
| [ ] | `art/ui/btn-orange.png` | big buttons, #dash, #attack (style.css, dungeon.css) | Code + Code 2 | Ui/Theme/Theme Wood/button_normal.png 16x8, slice 2 fill |
| [ ] | `art/ui/btn-orange-down.png` | big button :active | Code + Code 2 | Ui/Theme/Theme Wood/button_pressed.png 16x8, slice T3 R2 B1 L2 (label 1 px down) |
| [ ] | `art/ui/btn-blue.png` | button.big.alt, .edit | Code | Ui/Theme/Theme Wood/button_normal.png recoloured blue (recolour allowed) or nine_path_panel_2 |
| [ ] | `art/ui/btn-blue-down.png` | button.big.alt:active | Code | Ui/Theme/Theme Wood/button_pressed.png recoloured blue |
| [ ] | `art/ui/btn-yellow.png` | .chip, .opt.on, .mapcard.on, #hud-double | Code | Ui/Theme/Theme Wood/button_hover.png 16x8 (lighter wood), slice 2 |
| [ ] | `art/ui/btn-yellow-down.png` | .chip:active | Code | Ui/Theme/Theme Wood/button_pressed.png |
| [ ] | `art/ui/input.png` | inputs, code boxes, map cards (style.css, main.ts) | Code | Ui/Theme/Theme Wood/nine_path_bg.png 16x16, slice 1 fill (or nine_path_panel_interior) |
| [ ] | `art/ui/tab-off.png` | .tab (skin picker) | Code | Ui/Theme/Theme Wood/tab_unselected.png 16x12, slice L4 T4 R6 B0 |
| [ ] | `art/ui/tab-on.png` | .tab.on | Code | Ui/Theme/Theme Wood/tab_selected.png 16x12, same slice |
| [ ] | `art/ui/stick-base.png` | joystick base #stick | Code | Ui/Receptacle/Receptacle Sphere/BackgroundWood.png 32x32 (substitute, no real stick) |
| [ ] | `art/ui/stick-knob.png` | joystick knob #knob | Code | Ui/Receptacle/Receptacle Sphere/ProgressYellow.png 22x22 |
| [ ] | `art/icons/back.png` | back buttons (data-icon, dungeonUi) | Code + Code 2 | Ui/Theme/Theme Wood/arrow_left.png 16x16 |
| [x] | `art/icons/check.png` | done button, checked option (data-icon, style.css), Bärregn intro | Code | DONE: ChatGPT N-10 (19x16, scripts/slice_n_orders.py) |
| [ ] | `art/icons/dice.png` | random skin button (data-icon) | Code | Items/Object/Dice 6.png |
| [ ] | `art/icons/dash-arrow.png` | dash button icon (data-icon, controls.ts, dungeonUi) | Code + Code 2 | Ui/Skill Icon/Items & Weapon/Boot.png 24x24 (or Ui/Theme/Theme Wood/arrow_right.png) |
| [ ] | `art/icons/house.png` | new-village chip, home edge arrow, house marker (game.ts ic-house) | Code | STAND-IN: Backgrounds/Tilesets/TilesetHouse.png round straw hut 48,128,47,32 (small, reads as home) |
| [x] | `art/icons/coin.png` | dungeon gold HUD + end stat (index.html) | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: Items/Treasure/Coin2.png frame 0 (10x10) or GoldCoin.png 7x7 |

## Meadow HUD

| Done | Old file (public/) | Used in | Owner | Ninja replacement |
|---|---|---|---|---|
| [ ] | `art/gather/hud-wood.png` | quest rows, bank, edge arrows, build costs | Code | Items/Resource/Branch.png 16x16 |
| [ ] | `art/gather/hud-stone.png` | quest rows, bank, edge arrows, build costs | Code | Items/Resource/Rock.png 16x16 |
| [ ] | `art/gather/hud-berries.png` | quest rows, bank, edge arrows, build costs | Code | Items/Food/Nut2.png 15x15 |
| [ ] | `art/gather/item-berries.png` | Bärregn title, basket, intro, end line (index.html) | Code | Items/Food/Nut2.png 15x15 |
| [ ] | `art/gather/quest-card.png` | quest card frame (style.css border-image 5) | Code | Ui/Theme/Theme Wood/nine_path_panel_3.png, slice 6 6 5 5 fill |
| [ ] | `art/gather/daybar-frame.png` | day bar + quest bar frame (style.css) | Code | Ui/Receptacle/LifeBarMiniUnder.png 18x4 (long: Ui/Theme/Theme Wood/nine_path_bg.png slice 1) |
| [ ] | `art/gather/daybar-fill.png` | day bar fill | Code | Ui/Receptacle/LifeBarMiniProgress.png recoloured yellow #ffe18d |
| [ ] | `art/gather/bar-fill-green.png` | quest bar fill | Code | Ui/Receptacle/LifeBarMiniProgress.png recoloured green |
| [ ] | `art/gather/sun.png` | day bar sun, end screen sun | Code | Ui/Skill Icon/Meteo/Sun.png 24x24 |
| [x] | `art/gather/star.png` | quest / Bärregn / end stars (main.ts) | Code | DONE: ChatGPT N-10 (19x17; old was 11x11, check CSS size) |
| [x] | `art/gather/star-empty.png` | empty stars (index.html, main.ts) | Code | DONE: ChatGPT N-10 (19x17) |
| [ ] | `art/fine/icons/quest-home.png` | quest title "bring home" (index.html) | Code | STAND-IN: Backgrounds/Tilesets/TilesetHouse.png round straw hut 48,128,47,32 |
| [ ] | `art/gather/btn-axe.png` | action button with axe (controls.ts) | Code | Ui/Skill Icon/Job & Action/Harvest.png 24x24 (or Items/Tool/Axe.png) |
| [ ] | `art/gather/btn-pickaxe.png` | action button with pickaxe | Code | Ui/Skill Icon/Job & Action/Mine.png 24x24 |
| [ ] | `art/gather/btn-rake.png` | action button with rake | Code | Ui/Skill Icon/Job & Action/Plant.png 24x24 (or Items/Tool/Sickle.png) |
| [ ] | `art/base/btn-build.png` | build chip + build panel (index.html, main.ts) | Code | Ui/Skill Icon/Job & Action/Repair.png 24x24 |

## Build hints

| Done | Old file (public/) | Used in | Owner | Ninja replacement |
|---|---|---|---|---|
| [ ] | `art/fine/icons/carry-4.png` | build card: storage (main.ts BUILD_ICONS) | Code | STAND-IN: Items/Object/CrateEmpty.png (storage holds more) |
| [ ] | `art/fine/icons/hit-minus.png` | build card: workshop | Code | STAND-IN: Ui/Skill Icon/Spell/AttackUpgrade.png |
| [ ] | `art/fine/icons/speed.png` | build card: workshop; speed power-up (game.ts) | Code | Ui/Skill Icon/Items & Weapon/Boot.png 24x24 |
| [ ] | `art/fine/icons/berry-plus.png` | build card: garden | Code | STAND-IN: Ui/Skill Icon/Job & Action/Plant.png |
| [ ] | `art/fine/icons/berry-x2-home.png` | build card: well | Code | STAND-IN: Ui/Skill Icon/Spell/LuckUpgrade.png (clover = double luck) |
| [ ] | `art/fine/icons/arrow-to-resource.png` | build card: watchtower | Code | STAND-IN: Ui/Skill Icon/Spell/Vision.png (the tower shows where things are) |
| [ ] | `art/fine/icons/new-corner.png` | build card: bridge | Code | STAND-IN: Items/Scroll/Scroll.png (map) |
| [ ] | `art/fine/icons/carry-plus-1.png` | build card: cottage 2 | Code | STAND-IN: Items/Object/Bag.png |
| [ ] | `art/fine/icons/regrow-fast.png` | build card: cottage 3 | Code | STAND-IN: Items/Object/Hourglass.png |
| [ ] | `art/fine/icons/village-badge.png` | village badge (main.ts) | Code | Backgrounds/Animated/Flag/Flag{Color}16x16.png frame 0 (4 frames 16x16) |

## Meadow world

| Done | Old file (public/) | Used in | Owner | Ninja replacement |
|---|---|---|---|---|
| [ ] | `art/fine/tiles/grass.png` | meadow ground (game.ts f-grass) | Code | Backgrounds/Tilesets/TilesetFloor.png grass 0,192,16,16 + variants 16..64,192 (Code: bakeNinjaMeadow on claude/blobz-code) |
| [ ] | `art/fine/tiles/dirt.png` | yard / path (game.ts f-dirt) | Code | Backgrounds/Tilesets/TilesetFloor.png dirt 3x3 0,112,48,48 (Code: drawNinjaDirt on claude/blobz-code) |
| [ ] | `art/props/tree-green.png` | wood node 0, map picker (index.html) | Code | Backgrounds/Tilesets/TilesetNature.png 0,0,32,32 |
| [ ] | `art/props/tree-orange.png` | wood node 1, map picker | Code | Backgrounds/Tilesets/TilesetNature.png autumn big tree 144,288,48,48 (or pink 224,0,32,32) |
| [ ] | `art/props/tree-pine.png` | wood node 2 | Code | Backgrounds/Tilesets/TilesetNature.png 32,0,32,32 |
| [ ] | `art/props/rock.png` | stone node 3; Bärregn bomb (index.html) | Code | Backgrounds/Tilesets/TilesetNature.png grey rock 256,128,32,32 |
| [ ] | `art/props/boulder.png` | stone node 4 | Code | Backgrounds/Tilesets/TilesetNature.png brown rock 208,128,32,32 (or teal boulder 0,192,32,32) |
| [ ] | `art/gather/bush-berries.png` | berry node 5, map picker | Code | PENDING (Art piece, waits for Stefan rating): public/art/props/berry-bush-ninja.png 32x32 (else GAP: Ninja has no berry bush) |
| [ ] | `art/gather/bush-empty.png` | picked berry node | Code | Backgrounds/Tilesets/TilesetNature.png 256,0,32,32 (= berry-bush-ninja without berries) |
| [ ] | `art/props/stump.png` | cut tree (spent wood node) | Code | Backgrounds/Tilesets/TilesetNature.png orange stump 32,128,32,32 |
| [ ] | `art/gather/rubble.png` | spent stone node | Code | Backgrounds/Tilesets/TilesetNature.png pebbles 240,288,16,16 (or small rock 288,144,16,16) |
| [ ] | `art/fine/gather/item-stone.png` | stone item on ground / carried | Code | Items/Resource/Rock.png 16x16 |
| [ ] | `art/fine/gather/item-berries.png` | berry item on ground / carried | Code | Items/Food/Nut2.png 15x15 |
| [ ] | `art/fine/icons/log.png` | wood item on ground / carried (game.ts ic-log) | Code | Items/Resource/Branch.png 16x16 (chunky: tileset_camp.png 0,0,32,16) |
| [ ] | `art/fine/icons/chest.png` | puzzle chest, dungeon chest icon (game.ts, dungeonScene) | Code + Code 2 | Items/Treasure/LittleTreasureChest.png 2 x 16x16 (closed, open) |
| [ ] | `art/fine/icons/boot.png` | speed power-up (game.ts ic-boot) | Code | Ui/Skill Icon/Items & Weapon/Boot.png 24x24 |
| [ ] | `art/fine/icons/magnet.png` | magnet power-up (game.ts, sim.ts) | Code | STAND-IN: Ui/Skill Icon/Items & Weapon/Hook.png 24x24 (pulls things in) |
| [ ] | `art/fine/icons/base-marker.png` | base marker (game.ts m-base-marker) | Code | Backgrounds/Animated/Flag/Flag{Color}16x16.png (4 frames) |
| [ ] | `art/gather/tool-axe.png` | tool swing strip (game.ts tool-axe) | Code | Items/Tool/Axe.png 16x16, swung in code (no strip) |
| [ ] | `art/gather/tool-pickaxe.png` | tool swing strip | Code | Items/Tool/Pickaxe.png 16x16, swung in code |
| [ ] | `art/gather/tool-rake.png` | tool swing strip | Code | Items/Tool/Sickle.png 16x16 (no rake in Ninja; Hoe.png alt) |
| [ ] | `art/fine/gather/chips-wood.png` | wood hit chips | Code | FX/Particle/Wood.png 6 x 16x16 |
| [ ] | `art/fine/gather/chips-stone.png` | stone hit chips | Code | FX/Particle/RockGray.png 5 x 16x16 |
| [ ] | `art/fine/fx/dust.png` | glide dust | Code | FX/Smoke/SmokeCircular/SpriteSheet.png 8 x 30x14 |
| [ ] | `art/fine/fx/levelup.png` | cottage level-up | Code | FX/Magic/Spark/SpriteSheet.png 6 x 45x35 |
| [ ] | `art/fine/fx/coin-sparkle.png` | pickup sparkle (meadow + dungeon) | Code + Code 2 | FX/Magic/Circle/SpriteSheetSpark.png 6 x 32x32 |
| [ ] | `art/fine/fx/plate-glow.png` | pressure plate glow | Code | FX/Magic/Aura/SpriteSheet.png 5 x 25x24 (or a code-drawn glow) |
| [ ] | `art/props/bush.png` | decor (PROPS) | Code | Backgrounds/Tilesets/TilesetNature.png 160,128,16,16 |
| [ ] | `art/props/flowers.png` | decor (DECOR) | Code | Backgrounds/Tilesets/TilesetNature.png flowers row y176 (0,176 / 16,176 / 48,176 / 96,176, 16x16) |
| [ ] | `art/props/pond.png` | pond decor | Code | Backgrounds/Tilesets/TilesetWater.png pond 3x3 0,96,48,48 + open water 16,112 |
| [ ] | `art/props/fence.png` | fence | Code | Backgrounds/Tilesets/TilesetHouse.png wood fence tiles 128,64..256,128 |
| [ ] | `art/props/sign.png` | sign | Code | Backgrounds/Tilesets/TilesetElement.png signpost 96,48,16,32 |
| [ ] | `art/props/plate.png` | pressure plate | Code | Backgrounds/Tilesets/TilesetDungeon.png 0,16,16,16 |
| [ ] | `art/props/plate-down.png` | pressure plate pressed | Code | Backgrounds/Tilesets/TilesetDungeon.png 16,16,16,16 |
| [ ] | `art/props/gate.png` | puzzle gate closed (game.ts, sim.ts) | Code | STAND-IN: Backgrounds/Tilesets/TilesetHouse.png iron fence with gateway, block 150,162,68,46: a closed fence run from its top edge (crop by eye) |
| [ ] | `art/props/gate-open.png` | puzzle gate open | Code | STAND-IN: Backgrounds/Tilesets/TilesetHouse.png the open iron gateway arch at the bottom of block 150,162,68,46 (or torii 0,78,41,33) |
| [ ] | `art/props/gate-post.png` | puzzle gate post | Code | STAND-IN: Backgrounds/Tilesets/TilesetHouse.png the open iron gateway arch at the bottom of block 150,162,68,46 (or torii 0,78,41,33) |

## Base

| Done | Old file (public/) | Used in | Owner | Ninja replacement |
|---|---|---|---|---|
| [ ] | `art/base/cottage-1.png` | cottage level 1 (game.ts, build panel) | Code | Backgrounds/Tilesets/TilesetHouse.png hut 0,128,45,47 |
| [ ] | `art/base/cottage-2.png` | cottage level 2 | Code | Backgrounds/Tilesets/TilesetHouse.png orange-thatch house 0,0,64,48 |
| [ ] | `art/base/cottage-3.png` | cottage level 3 | Code | Backgrounds/Tilesets/TilesetHouse.png big thatched hall 400,112,64,80 + front 400,192,64,32 |
| [ ] | `art/base/build-spot.png` | empty build spot | Code | Backgrounds/Tilesets/TilesetFloor.png dirt patch 3x3 0,112,48,48 |
| [ ] | `art/base/bridge.png` | bridge building (game.ts, sim.ts) | Code | Backgrounds/Tilesets/TilesetHouse.png 144,240,64,46 |
| [ ] | `art/base/watchtower.png` | watchtower | Code | Backgrounds/Tilesets/TilesetTowers.png 4,0,24,32 |
| [ ] | `art/base/garden.png` | garden | Code | Backgrounds/Tilesets/TilesetElement.png wheat field 208,64,48,48 |
| [ ] | `art/base/workshop.png` | workshop | Code | Backgrounds/Tilesets/TilesetHouse.png shed 304,304,48,48 |
| [ ] | `art/base/storage.png` | storage | Code | Backgrounds/Tilesets/TilesetHouse.png barn 400,224,64,80 (small: crates 304,224,32,32) |
| [ ] | `art/base/well.png` | well | Code | Backgrounds/Tilesets/TilesetElement.png roofed well 112,27,16,21 (draw 2x) |
| [ ] | `art/base/bridge-site.png` | bridge under construction | Code | STAND-IN: Backgrounds/Tilesets/TilesetWater.png plank strip 0,240,64,16 (deck being laid) |
| [ ] | `art/base/watchtower-site.png` | watchtower site | Code | Backgrounds/Tilesets/TilesetTowers.png damaged tower 64,0,32,32 |
| [ ] | `art/base/garden-site.png` | garden site | Code | Backgrounds/Tilesets/tileset_camp.png soil plots 0,128,64,16 |
| [ ] | `art/base/workshop-site.png` | workshop site | Code | STAND-IN: Backgrounds/Tilesets/TilesetHouse.png crates of goods 304,224,32,32 |
| [ ] | `art/base/storage-site.png` | storage site | Code | Backgrounds/Tilesets/tileset_camp.png wood pile 0,16,48,32 (materials waiting) |
| [ ] | `art/base/well-site.png` | well site | Code | Backgrounds/Tilesets/TilesetElement.png stone well 96,16,16,16 (no roof yet) |

## Snow world

| Done | Old file (public/) | Used in | Owner | Ninja replacement |
|---|---|---|---|---|
| [x] | `art/props-winter/tree-snow-round.png` | snow wood node 0, map picker | Code | ARCHIVED: snow map archived (Code keeps it behind a flag). Was: Backgrounds/Tilesets/TilesetNature.png 192,0,32,32 |
| [x] | `art/props-winter/tree-snow-pine.png` | snow wood node 1, map picker | Code | ARCHIVED: snow map archived (Code keeps it behind a flag). Was: Backgrounds/Tilesets/TilesetNature.png 160,0,32,32 (green showing: 128,0) |
| [x] | `art/props-winter/tree-snow-small.png` | snow wood node 2 | Code | ARCHIVED: snow map archived (Code keeps it behind a flag). Was: Backgrounds/Tilesets/TilesetNature.png 128,0,32,32 |
| [x] | `art/props-winter/rock-snow.png` | snow stone node 3 | Code | ARCHIVED: snow map archived (Code keeps it behind a flag). Was: Backgrounds/Tilesets/TilesetNature.png snowy boulder 32,192,32,32 |
| [x] | `art/props-winter/ice-rock.png` | snow stone node 4 | Code | ARCHIVED: snow map archived (Code keeps it behind a flag). Was: Backgrounds/Tilesets/TilesetNature.png snowy rock 64,192,16,16 (or snowy peaks 144,192) |
| [x] | `art/props-winter/bush-berries-snow.png` | snow berry node 5 | Code | ARCHIVED: snow map archived (Code keeps it behind a flag). Was: STAND-IN: Backgrounds/Tilesets/TilesetNature.png snow bush 192,0,32,32 with Items/Food/Nut2.png drawn on top in code |
| [x] | `art/props-winter/bush-empty-snow.png` | picked snow berry node | Code | ARCHIVED: snow map archived (Code keeps it behind a flag). Was: Backgrounds/Tilesets/TilesetNature.png snow bush 192,0,32,32 |
| [x] | `art/props-winter/snowman.png` | snow decor, map picker | Code | ARCHIVED: snow map archived (Code keeps it behind a flag). Was: STAND-IN: Backgrounds/Tilesets/TilesetNature.png snowball 80,192,16,16 / snow mound 160,192,16,16 |
| [x] | `art/props-winter/igloo.png` | snow decor | Code | ARCHIVED: snow map archived (Code keeps it behind a flag). Was: Backgrounds/Tilesets/TilesetHouse.png igloo 0,176,48,46 |
| [x] | `art/props-winter/ice.png` | snow decor | Code | ARCHIVED: snow map archived (Code keeps it behind a flag). Was: Backgrounds/Tilesets/TilesetFloor.png frozen pond 3x3 0,336,48,48 |
| [x] | `art/props-winter/tree-bare.png` | snow decor | Code | ARCHIVED: snow map archived (Code keeps it behind a flag). Was: Backgrounds/Tilesets/TilesetNature.png dead tree 64,0,32,32 |
| [x] | `art/props-winter/pond-frozen-tiles.png` | frozen pond tiles (w-pond) | Code | ARCHIVED: snow map archived (Code keeps it behind a flag). Was: Backgrounds/Tilesets/TilesetFloor.png ice block 0,336,48,48, ice fill 16,352,16,16 |

## Bärregn

| Done | Old file (public/) | Used in | Owner | Ninja replacement |
|---|---|---|---|---|
| [ ] | `art/fine/dungeon/ko-stars.png` | mini-ko (game.ts) + dungeon KO (dungeonScene) | Code + Code 2 | STAND-IN: Ui/Emote/emote3.png 14x13 (dizzy x-x face bubble) |
| [ ] | `art/dungeon/ko-stars.png` | Bärregn intro .mi-ko (style.css) | Code | STAND-IN: Ui/Emote/emote3.png |
| [ ] | `art/fine/dungeon/slam-warning.png` | mini-warn (game.ts) | Code | STAND-IN: Ui/Emote/emote22.png red "!" + FX/Magic/Circle/SpriteSheetWhite.png ring on the ground |
| [ ] | `art/fine/dungeon/shockwave.png` | mini-wave (game.ts) + dungeon shockwave | Code + Code 2 | FX/Smoke/SmokeCircular/SpriteSheet.png 8 x 30x14 |

## Dungeon

| Done | Old file (public/) | Used in | Owner | Ninja replacement |
|---|---|---|---|---|
| [x] | `art/fine/tiles/dungeon-floor.png` | dungeon floor | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: Backgrounds/Tilesets/Interior/TilesetInteriorFloor.png stone brick fill 176,192,16,16 (block 176,192,176,80) |
| [x] | `art/fine/tiles/dungeon-wall.png` | dungeon walls | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: Backgrounds/Tilesets/Interior/TilesetWallSimple.png brown room 0,96,80,80 |
| [x] | `art/fine/dungeon/stairs-down.png` | stairs down | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: Backgrounds/Tilesets/TilesetElement.png 128,176,16,16 (orange style) |
| [x] | `art/fine/dungeon/stairs-up.png` | stairs up | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: Backgrounds/Tilesets/TilesetElement.png 128,192,16,16 |
| [x] | `art/fine/dungeon/chest-closed.png` | loot chest closed | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: Items/Treasure/BigTreasureChest.png frame 0 (16x14) |
| [x] | `art/fine/dungeon/chest-open.png` | loot chest open | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: Items/Treasure/BigTreasureChest.png frame 1 |
| [x] | `art/fine/dungeon/potion.png` | potion pickup | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: Items/Potion/LifePot.png 9x11 |
| [x] | `art/fine/dungeon/revive.png` | revive effect | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: FX/Magic/Spirit/SpriteSheet.png 5 x 32x32 |
| [x] | `art/fine/dungeon/fx-spin.png` | spin special | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: FX/Attack/CircularSlash/SpriteSheet.png 4 x 32x32 |
| [x] | `art/fine/dungeon/fx-slam.png` | hammer slam | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: FX/Elemental/Rock/SpriteSheet.png 14 x 30x30 |
| [x] | `art/fine/dungeon/fx-charge.png` | tank charge | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: FX/Smoke/SmokeCircular/SpriteSheet.png 8 x 30x14 (trail) |
| [x] | `art/fine/dungeon/fx-sidestep.png` | sidestep puff | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: FX/Smoke/Smoke/SpriteSheet.png 6 x 32x32 |
| [x] | `art/fine/dungeon/fx-heal.png` | heal | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: FX/Magic/Spirit/SpriteSheet.png 5 x 32x32 |
| [x] | `art/fine/dungeon/fx-wall.png` | tank wall | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: FX/Magic/Shield/SpriteSheetYellow.png 6 x 24x26 |
| [x] | `art/fine/dungeon/fx-block.png` | block | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: FX/Magic/Shield/SpriteSheetBlue.png 6 x 24x26 |
| [x] | `art/fine/fx/coin-pile-s.png` | gold drop small | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: Items/Treasure/Coin2.png 4 x 10x10 |
| [x] | `art/fine/fx/coin-pile-m.png` | gold drop medium | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: Items/Treasure/Coin2.png x2-3 placed in code |
| [x] | `art/fine/fx/coin-pile-l.png` | gold drop large | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: Items/Object/MoneyBag.png 14x15 |
| [x] | `art/dungeon/arrow.png` | marksman bolt | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: FX/Projectile/Arrow.png 13x5 |
| [x] | `art/dungeon/entrance.png` | dungeon entrance on the meadow | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: Backgrounds/Tilesets/TilesetHouse.png stone arch 464,322,48,42 |
| [x] | `art/dungeon/entrance-snow.png` | dungeon entrance on snow | Code 2 | ARCHIVED: snow map archived (Code keeps it behind a flag). Was: Backgrounds/Tilesets/TilesetHouse.png stone arch 464,322,48,42 (or igloo 0,176,48,46) |
| [x] | `art/dungeon/level-badge.png` | XP level badge (dungeon.css) | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: Ui/Receptacle/Receptacle Sphere/BackgroundWood.png 32x32 with the number on top |
| [x] | `art/dungeon/xp-frame.png` | XP bar frame (dungeon.css) | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: Ui/Receptacle/LifeBarMiniUnder.png 18x4 |
| [x] | `art/dungeon/xp-fill.png` | XP bar fill (dungeon.css) | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: Ui/Receptacle/LifeBarMiniProgress.png recoloured yellow |
| [x] | `art/dungeon/btn-sidestep.png` | sidestep button (dungeonUi) | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: Ui/Skill Icon/Spell/Camouflage.png 24x24 (substitute) |
| [x] | `art/dungeon/card-class-rogue.png` | class pick card | Code 2 | DONE: ChatGPT N-5, sliced by scripts/slice_cards.py |
| [x] | `art/dungeon/card-class-healer.png` | class pick card | Code 2 | DONE: ChatGPT N-5 |
| [x] | `art/dungeon/card-class-marksman.png` | class pick card | Code 2 | DONE: ChatGPT N-5 |
| [x] | `art/dungeon/card-class-tank.png` | class pick card | Code 2 | DONE: ChatGPT N-5 |
| [x] | `art/dungeon/card-sword.png` | rogue weapon card | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: Items/Weapons/Sword/Sprite.png 6x17 on a nine_path_panel card |
| [x] | `art/dungeon/card-hammer.png` | rogue weapon card | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: Items/Weapons/Hammer/Sprite.png 9x16 |
| [x] | `art/dungeon/card-dagger.png` | rogue weapon card | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: Items/Weapons/Sai/Sprite.png 7x13 |
| [x] | `art/dungeon/btn-special-sword.png` | special button (dungeonUi) | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: Ui/Skill Icon/Spell/Cut.png |
| [x] | `art/dungeon/btn-special-hammer.png` | special button | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: Ui/Skill Icon/Spell/Explosion.png |
| [x] | `art/dungeon/btn-special-spear.png` | special button | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: Ui/Skill Icon/Spell/MagicWeapon.png |
| [x] | `art/dungeon/btn-special-staff.png` | special button | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: Ui/Skill Icon/Spell/Heal.png |
| [x] | `art/dungeon/btn-special-bow.png` | special button | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: Ui/Skill Icon/Items & Weapon/Kunai.png (volley) |
| [x] | `art/dungeon/btn-special-shield.png` | special button | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: Ui/Skill Icon/Spell/DefenseUpgrade.png |
| [x] | `art/dungeon/btn-special-dagger.png` | special button | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: Ui/Skill Icon/Items & Weapon/Shuriken.png |
| [x] | `art/dungeon/item-ring.png` | loot item (dungeonUi) | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: Ui/Skill Icon/Items & Weapon/Ring.png |
| [x] | `art/dungeon/item-helm.png` | loot item | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: Ui/Skill Icon/Items & Weapon/Helmet.png |
| [x] | `art/dungeon/item-gloves.png` | loot item | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: Ui/Skill Icon/Job & Action/Punch.png (no gloves in Ninja) |
| [x] | `art/dungeon/item-amulet.png` | loot item | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: Ui/Skill Icon/Items & Weapon/Amulet.png |
| [x] | `art/dungeon/item-stone.png` | loot item (regen stone) | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: Items/Resource/GemGreen.png 16x16 |
| [x] | `art/dungeon/weapons/sword.png` | hovering weapon (WIMG) | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: Items/Weapons/Sword/Sprite.png 6x17 (Code 2 switching) |
| [x] | `art/dungeon/weapons/hammer.png` | hovering weapon | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: Items/Weapons/Hammer/Sprite.png 9x16 |
| [x] | `art/dungeon/weapons/spear.png` | hovering weapon | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: Items/Weapons/Lance/Sprite.png 6x23 |
| [x] | `art/dungeon/weapons/staff.png` | hovering weapon | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: Items/Weapons/MagicWand/Sprite.png 5x18 |
| [x] | `art/dungeon/weapons/dagger-1.png` | hovering dagger | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: Items/Weapons/Sai/Sprite.png 7x13 |
| [x] | `art/dungeon/weapons/dagger-2.png` | hovering dagger | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: Items/Weapons/Sai/Sprite.png 7x13 (mirrored) |
| [x] | `art/dungeon/weapons/shield.png` | hovering shield | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: PENDING (Art piece, waits for Stefan rating): public/art/dungeon/weapons/ninja-shield.png 12x12 |
| [x] | `art/dungeon/weapon-sword.png` | old weapon strip (fallback) | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: Items/Weapons/Sword/Sprite.png rotated in code + FX/Slash/SpriteSheetArc.png |
| [x] | `art/dungeon/weapon-hammer.png` | old weapon strip | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: Items/Weapons/Hammer/Sprite.png rotated in code |
| [x] | `art/dungeon/weapon-spear.png` | old weapon strip | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: Items/Weapons/Lance/Sprite.png rotated in code |
| [x] | `art/dungeon/gear-staff.png` | old gear strip | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: Items/Weapons/MagicWand/Sprite.png |
| [x] | `art/dungeon/gear-shield.png` | old gear strip | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: PENDING (Art piece, waits for Stefan rating): ninja-shield.png |
| [x] | `art/dungeon/gear-daggers.png` | old gear strip | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: Items/Weapons/Sai/Sprite.png x2 |
| [x] | `art/dungeon/gear-crossbow.png` | marksman weapon strip (no WIMG sprite yet) | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: PENDING (Art piece, waits for Stefan rating): public/art/dungeon/weapons/ninja-crossbow.png 16x10 (Ninja alt: Items/Weapons/Bow/Sprite.png 15x7) |

## Kenney

| Done | Old file (public/) | Used in | Owner | Ninja replacement |
|---|---|---|---|---|
| [x] | `assets/kenney-tiny-dungeon/tilemap_packed.png` | DOM icon fallback when an art/dungeon file 404s (dungeonUi icon()); placeholder weapons staff/shield/dagger (WEAPON_TILE) | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: Nothing: every art/dungeon file above exists; drop the fallback once the Ninja rows are done |
| [ ] | `assets/kenney-tiny-ski/tilemap_packed.png` | pixel font fallback for the logo (art.ts pixelText) | Code | Ui/Font/NormalFont.ttf (or font8x8.png) |
| [ ] | `assets/kenney-tiny-town/tilemap_packed.png` | loaded (game.ts, art.ts) but no frame used | Code | Nothing: remove the dead load |
| [ ] | `assets/kenney-tiny-farm/tilemap_packed.png` | loaded but no frame used | Code | Nothing: remove the dead load |
| [ ] | `assets/kenney-tiny-battle/tilemap_packed.png` | loaded but no frame used | Code | Nothing: remove the dead load |
| [ ] | `assets/kenney-pixel-platformer/tilemap_packed.png` | loaded by art.ts, no frame used | Code | Nothing: remove the dead load |

## Dungeon skills

| Done | Old file (public/) | Used in | Owner | Ninja replacement |
|---|---|---|---|---|
| [x] | `art/dungeon/skills/rogue-rage.png` | level-up skill card (dungeon.ts SKILLS) | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: Ui/Skill Icon/Spell/OrbFire.png 24x24 (+ OrbFireDisabled.png for locked) |
| [x] | `art/dungeon/skills/rogue-knockback.png` | level-up skill card (dungeon.ts SKILLS) | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: Ui/Skill Icon/Spell/Explosion.png 24x24 (+ ExplosionDisabled.png for locked) |
| [x] | `art/dungeon/skills/rogue-whirlwind.png` | level-up skill card (dungeon.ts SKILLS) | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: Ui/Skill Icon/Items & Weapon/Shuriken.png 24x24 (+ ShurikenDisabled.png for locked) |
| [x] | `art/dungeon/skills/rogue-extraheart.png` | level-up skill card (dungeon.ts SKILLS) | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: Ui/Skill Icon/Spell/Heal.png 24x24 (+ HealDisabled.png for locked) |
| [x] | `art/dungeon/skills/rogue-lifesteal.png` | level-up skill card (dungeon.ts SKILLS) | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: Ui/Skill Icon/Job & Action/Potion.png 24x24 (+ PotionDisabled.png for locked) |
| [x] | `art/dungeon/skills/rogue-power.png` | level-up skill card (dungeon.ts SKILLS) | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: Ui/Skill Icon/Spell/AttackUpgrade.png 24x24 (+ AttackUpgradeDisabled.png for locked) |
| [x] | `art/dungeon/skills/healer-heal.png` | level-up skill card (dungeon.ts SKILLS) | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: Ui/Skill Icon/Spell/Heal.png 24x24 (+ HealDisabled.png for locked) |
| [x] | `art/dungeon/skills/healer-regen.png` | level-up skill card (dungeon.ts SKILLS) | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: Ui/Skill Icon/Spell/OrbPlant.png 24x24 (+ OrbPlantDisabled.png for locked) |
| [x] | `art/dungeon/skills/healer-bubble.png` | level-up skill card (dungeon.ts SKILLS) | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: Ui/Skill Icon/Spell/DefenseUpgrade.png 24x24 (+ DefenseUpgradeDisabled.png for locked) |
| [x] | `art/dungeon/skills/healer-revive.png` | level-up skill card (dungeon.ts SKILLS) | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: Ui/Skill Icon/Spell/OrbLight.png 24x24 (+ OrbLightDisabled.png for locked) |
| [x] | `art/dungeon/skills/healer-holy.png` | level-up skill card (dungeon.ts SKILLS) | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: Ui/Skill Icon/Spell/BookLight.png 24x24 (+ BookLightDisabled.png for locked) |
| [x] | `art/dungeon/skills/healer-cleanse.png` | level-up skill card (dungeon.ts SKILLS) | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: Ui/Skill Icon/Spell/OrbWater.png 24x24 (+ OrbWaterDisabled.png for locked) |
| [x] | `art/dungeon/skills/marksman-multishot.png` | level-up skill card (dungeon.ts SKILLS) | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: Ui/Skill Icon/Items & Weapon/Kunai.png 24x24 (+ KunaiDisabled.png for locked) |
| [x] | `art/dungeon/skills/marksman-pierce.png` | level-up skill card (dungeon.ts SKILLS) | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: Ui/Skill Icon/Items & Weapon/Arrow.png 24x24 (+ ArrowDisabled.png for locked) |
| [x] | `art/dungeon/skills/marksman-crit.png` | level-up skill card (dungeon.ts SKILLS) | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: Ui/Skill Icon/Spell/Vision.png 24x24 (+ VisionDisabled.png for locked) |
| [x] | `art/dungeon/skills/marksman-speed.png` | level-up skill card (dungeon.ts SKILLS) | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: Ui/Skill Icon/Spell/Upgrade.png 24x24 (+ UpgradeDisabled.png for locked) |
| [x] | `art/dungeon/skills/marksman-poison.png` | level-up skill card (dungeon.ts SKILLS) | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: Ui/Skill Icon/Spell/BookIce.png 24x24 (+ BookIceDisabled.png for locked) |
| [x] | `art/dungeon/skills/marksman-trap.png` | level-up skill card (dungeon.ts SKILLS) | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: Ui/Skill Icon/Items & Weapon/Hook.png 24x24 (+ HookDisabled.png for locked) |
| [x] | `art/dungeon/skills/tank-block.png` | level-up skill card (dungeon.ts SKILLS) | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: Ui/Skill Icon/Spell/Counter.png 24x24 (+ CounterDisabled.png for locked) |
| [x] | `art/dungeon/skills/tank-taunt.png` | level-up skill card (dungeon.ts SKILLS) | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: Ui/Skill Icon/Job & Action/Talk.png 24x24 (+ TalkDisabled.png for locked) |
| [x] | `art/dungeon/skills/tank-armor.png` | level-up skill card (dungeon.ts SKILLS) | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: Ui/Skill Icon/Items & Weapon/Armor.png 24x24 (+ ArmorDisabled.png for locked) |
| [x] | `art/dungeon/skills/tank-charge.png` | level-up skill card (dungeon.ts SKILLS) | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: Ui/Skill Icon/Spell/RockSpike.png 24x24 (+ RockSpikeDisabled.png for locked) |
| [x] | `art/dungeon/skills/tank-stun.png` | level-up skill card (dungeon.ts SKILLS) | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: Ui/Skill Icon/Spell/BookThunder.png 24x24 (+ BookThunderDisabled.png for locked) |
| [x] | `art/dungeon/skills/tank-guard.png` | level-up skill card (dungeon.ts SKILLS) | Code 2 | DONE: Ninja in the dungeon (Code 2, d0f50b9). Mapped to: Ui/Skill Icon/Items & Weapon/Guard.png 24x24 (+ GuardDisabled.png for locked) |

## Not counted (on disk but not loaded)

Old files nothing references any more (safe to delete later, by Lead): `art/icons/{boot,chest,log,magnet,dash,clock,diamond*,gem*,
mushroom,sparkle,team}.png`, `art/gather/{item-stone,chips-*,btn-dash}.png`, `art/fx/*`, `art/fine/base/build-spot.png`,
`art/dungeon/{chest-*,stairs-*,potion,revive,shockwave,slam-warning,fx-*,flash-goo-*,heart-*,btn-attack,btn-dash-small,
icon-crossbow,card-spear,gear-bow}.png`, `art/dungeon/weapons/daggers.png`.
