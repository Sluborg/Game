#!/usr/bin/env python3
"""Writes docs/OLD_ART_CHECKLIST.md: every non-Ninja image the game still uses, with its Ninja replacement.

usage (from blobz/): python3 scripts/old_art_checklist.py
The rows are curated by hand (Art grepped src/, index.html, style.css on deploy + Code/Code 2 heads); this script only
formats them and counts mapped / pending / gaps. Paths in "Ninja" are relative to public/assets/ninja-adventure/.
"""
import os

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'docs', 'OLD_ART_CHECKLIST.md')
C, C2 = 'Code', 'Code 2'
SI = 'Ui/Skill Icon/'
T = 'Backgrounds/Tilesets/'
W = 'Ui/Theme/Theme Wood/'
PEND = 'PENDING (Art piece, waits for Stefan rating): '

# (area, old file under public/, where used, owner, replacement)
ROWS = [
    # ---------------- screens / illustrations ----------------
    ('Screens', 'art/title.png', 'start screen bg (style.css #start, i18n)', C, 'GAP: ChatGPT N-2 (landscape) + start-portrait'),
    ('Screens', 'art/start-portrait.png', 'start screen portrait bg (style.css)', C, 'GAP: ChatGPT N-2 (portrait approved 4/5)'),
    ('Screens', 'art/lobby.png', 'lobby bg (style.css #lobby, index.html, net.ts)', C, 'GAP: needs ChatGPT (no N-order yet; or reuse N-2 art)'),
    ('Screens', 'art/loading.png', 'loading screen (index.html, main.ts, style.css)', C, 'GAP: needs ChatGPT (no N-order yet; or reuse N-2 art)'),
    ('Screens', 'art/loading-portrait.png', 'loading screen portrait (style.css)', C, 'GAP: needs ChatGPT (with loading.png)'),
    ('Screens', 'art/loading-landscape.png', 'loading screen landscape (style.css)', C, 'GAP: needs ChatGPT (with loading.png)'),
    ('Screens', 'art/logo.png', 'logo on loading/start (index.html, main.ts)', C, 'GAP: needs ChatGPT (logo; fallback text uses Kenney Ski font)'),
    ('Screens', 'art/victory.png', 'end screen bg (style.css #end)', C, 'GAP: ChatGPT N-6 (Art alt public/art/victory-ninja.png waits for rating)'),
    # ---------------- UI kit ----------------
    ('UI kit', 'art/ui/panel.png', 'all panels / cards (style.css border-image 4)', C, f'{W}nine_path_panel.png, border-image slice 6 6 5 5 fill (white text fill: nine_path_panel_3)'),
    ('UI kit', 'art/ui/btn-orange.png', 'big buttons, #dash, #attack (style.css, dungeon.css)', 'Code + Code 2', f'{W}button_normal.png 16x8, slice 2 fill'),
    ('UI kit', 'art/ui/btn-orange-down.png', 'big button :active', 'Code + Code 2', f'{W}button_pressed.png 16x8, slice T3 R2 B1 L2 (label 1 px down)'),
    ('UI kit', 'art/ui/btn-blue.png', 'button.big.alt, .edit', C, f'{W}button_normal.png recoloured blue (recolour allowed) or nine_path_panel_2'),
    ('UI kit', 'art/ui/btn-blue-down.png', 'button.big.alt:active', C, f'{W}button_pressed.png recoloured blue'),
    ('UI kit', 'art/ui/btn-yellow.png', '.chip, .opt.on, .mapcard.on, #hud-double', C, f'{W}button_hover.png 16x8 (lighter wood), slice 2'),
    ('UI kit', 'art/ui/btn-yellow-down.png', '.chip:active', C, f'{W}button_pressed.png'),
    ('UI kit', 'art/ui/input.png', 'inputs, code boxes, map cards (style.css, main.ts)', C, f'{W}nine_path_bg.png 16x16, slice 1 fill (or nine_path_panel_interior)'),
    ('UI kit', 'art/ui/tab-off.png', '.tab (skin picker)', C, f'{W}tab_unselected.png 16x12, slice L4 T4 R6 B0'),
    ('UI kit', 'art/ui/tab-on.png', '.tab.on', C, f'{W}tab_selected.png 16x12, same slice'),
    ('UI kit', 'art/ui/stick-base.png', 'joystick base #stick', C, 'Ui/Receptacle/Receptacle Sphere/BackgroundWood.png 32x32 (substitute, no real stick)'),
    ('UI kit', 'art/ui/stick-knob.png', 'joystick knob #knob', C, 'Ui/Receptacle/Receptacle Sphere/ProgressYellow.png 22x22'),
    ('UI kit', 'art/icons/back.png', 'back buttons (data-icon, dungeonUi)', 'Code + Code 2', f'{W}arrow_left.png 16x16'),
    ('UI kit', 'art/icons/check.png', 'done button, checked option (data-icon, style.css), Bärregn intro', C, 'GAP: no check mark in Ninja (Ui/Dialog/YesButton.png 26x16 has English text)'),
    ('UI kit', 'art/icons/dice.png', 'random skin button (data-icon)', C, 'Items/Object/Dice 6.png'),
    ('UI kit', 'art/icons/dash-arrow.png', 'dash button icon (data-icon, controls.ts, dungeonUi)', 'Code + Code 2', f'{SI}Items & Weapon/Boot.png 24x24 (or {W}arrow_right.png)'),
    ('UI kit', 'art/icons/house.png', 'new-village chip, home edge arrow, house marker (game.ts ic-house)', C, 'GAP: no home icon in Ninja (ART_MAP gaps)'),
    ('UI kit', 'art/icons/coin.png', 'dungeon gold HUD + end stat (index.html)', C2, 'Items/Treasure/Coin2.png frame 0 (10x10) or GoldCoin.png 7x7'),
    # ---------------- meadow HUD ----------------
    ('Meadow HUD', 'art/gather/hud-wood.png', 'quest rows, bank, edge arrows, build costs', C, 'Items/Resource/Branch.png 16x16'),
    ('Meadow HUD', 'art/gather/hud-stone.png', 'quest rows, bank, edge arrows, build costs', C, 'Items/Resource/Rock.png 16x16'),
    ('Meadow HUD', 'art/gather/hud-berries.png', 'quest rows, bank, edge arrows, build costs', C, 'Items/Food/Nut2.png 15x15'),
    ('Meadow HUD', 'art/gather/item-berries.png', 'Bärregn title, basket, intro, end line (index.html)', C, 'Items/Food/Nut2.png 15x15'),
    ('Meadow HUD', 'art/gather/quest-card.png', 'quest card frame (style.css border-image 5)', C, f'{W}nine_path_panel_3.png, slice 6 6 5 5 fill'),
    ('Meadow HUD', 'art/gather/daybar-frame.png', 'day bar + quest bar frame (style.css)', C, f'Ui/Receptacle/LifeBarMiniUnder.png 18x4 (long: {W}nine_path_bg.png slice 1)'),
    ('Meadow HUD', 'art/gather/daybar-fill.png', 'day bar fill', C, 'Ui/Receptacle/LifeBarMiniProgress.png recoloured yellow #ffe18d'),
    ('Meadow HUD', 'art/gather/bar-fill-green.png', 'quest bar fill', C, 'Ui/Receptacle/LifeBarMiniProgress.png recoloured green'),
    ('Meadow HUD', 'art/gather/sun.png', 'day bar sun, end screen sun', C, f'{SI}Meteo/Sun.png 24x24'),
    ('Meadow HUD', 'art/gather/star.png', 'quest / Bärregn / end stars (main.ts)', C, 'GAP: no star icon in Ninja (Items/Treasure/GoldCup.png 9x11 as alt)'),
    ('Meadow HUD', 'art/gather/star-empty.png', 'empty stars (index.html, main.ts)', C, 'GAP: with star.png (SilverCup.png as alt)'),
    ('Meadow HUD', 'art/fine/icons/quest-home.png', 'quest title "bring home" (index.html)', C, 'GAP: no home icon (same as icons/house)'),
    ('Meadow HUD', 'art/gather/btn-axe.png', 'action button with axe (controls.ts)', C, f'{SI}Job & Action/Harvest.png 24x24 (or Items/Tool/Axe.png)'),
    ('Meadow HUD', 'art/gather/btn-pickaxe.png', 'action button with pickaxe', C, f'{SI}Job & Action/Mine.png 24x24'),
    ('Meadow HUD', 'art/gather/btn-rake.png', 'action button with rake', C, f'{SI}Job & Action/Plant.png 24x24 (or Items/Tool/Sickle.png)'),
    ('Meadow HUD', 'art/base/btn-build.png', 'build chip + build panel (index.html, main.ts)', C, f'{SI}Job & Action/Repair.png 24x24'),
    # ---------------- build hint icons ----------------
    ('Build hints', 'art/fine/icons/carry-4.png', 'build card: storage (main.ts BUILD_ICONS)', C, 'GAP: composite hint icon, no Ninja equivalent (compose from Ninja pieces needs Stefan OK, or ChatGPT)'),
    ('Build hints', 'art/fine/icons/hit-minus.png', 'build card: workshop', C, 'GAP: composite hint icon'),
    ('Build hints', 'art/fine/icons/speed.png', 'build card: workshop; speed power-up (game.ts)', C, f'{SI}Items & Weapon/Boot.png 24x24'),
    ('Build hints', 'art/fine/icons/berry-plus.png', 'build card: garden', C, 'GAP: composite hint icon'),
    ('Build hints', 'art/fine/icons/berry-x2-home.png', 'build card: well', C, 'GAP: composite hint icon'),
    ('Build hints', 'art/fine/icons/arrow-to-resource.png', 'build card: watchtower', C, 'GAP: composite hint icon'),
    ('Build hints', 'art/fine/icons/new-corner.png', 'build card: bridge', C, 'GAP: composite hint icon'),
    ('Build hints', 'art/fine/icons/carry-plus-1.png', 'build card: cottage 2', C, 'GAP: composite hint icon'),
    ('Build hints', 'art/fine/icons/regrow-fast.png', 'build card: cottage 3', C, 'GAP: composite hint icon'),
    ('Build hints', 'art/fine/icons/village-badge.png', 'village badge (main.ts)', C, 'Backgrounds/Animated/Flag/Flag{Color}16x16.png frame 0 (4 frames 16x16)'),
    # ---------------- meadow world ----------------
    ('Meadow world', 'art/fine/tiles/grass.png', 'meadow ground (game.ts f-grass)', C, f'{T}TilesetFloor.png grass 0,192,16,16 + variants 16..64,192 (Code: bakeNinjaMeadow on claude/blobz-code)'),
    ('Meadow world', 'art/fine/tiles/dirt.png', 'yard / path (game.ts f-dirt)', C, f'{T}TilesetFloor.png dirt 3x3 0,112,48,48 (Code: drawNinjaDirt on claude/blobz-code)'),
    ('Meadow world', 'art/props/tree-green.png', 'wood node 0, map picker (index.html)', C, f'{T}TilesetNature.png 0,0,32,32'),
    ('Meadow world', 'art/props/tree-orange.png', 'wood node 1, map picker', C, f'{T}TilesetNature.png autumn big tree 144,288,48,48 (or pink 224,0,32,32)'),
    ('Meadow world', 'art/props/tree-pine.png', 'wood node 2', C, f'{T}TilesetNature.png 32,0,32,32'),
    ('Meadow world', 'art/props/rock.png', 'stone node 3; Bärregn bomb (index.html)', C, f'{T}TilesetNature.png grey rock 256,128,32,32'),
    ('Meadow world', 'art/props/boulder.png', 'stone node 4', C, f'{T}TilesetNature.png brown rock 208,128,32,32 (or teal boulder 0,192,32,32)'),
    ('Meadow world', 'art/gather/bush-berries.png', 'berry node 5, map picker', C, PEND + 'public/art/props/berry-bush-ninja.png 32x32 (else GAP: Ninja has no berry bush)'),
    ('Meadow world', 'art/gather/bush-empty.png', 'picked berry node', C, f'{T}TilesetNature.png 256,0,32,32 (= berry-bush-ninja without berries)'),
    ('Meadow world', 'art/props/stump.png', 'cut tree (spent wood node)', C, f'{T}TilesetNature.png orange stump 32,128,32,32'),
    ('Meadow world', 'art/gather/rubble.png', 'spent stone node', C, f'{T}TilesetNature.png pebbles 240,288,16,16 (or small rock 288,144,16,16)'),
    ('Meadow world', 'art/fine/gather/item-stone.png', 'stone item on ground / carried', C, 'Items/Resource/Rock.png 16x16'),
    ('Meadow world', 'art/fine/gather/item-berries.png', 'berry item on ground / carried', C, 'Items/Food/Nut2.png 15x15'),
    ('Meadow world', 'art/fine/icons/log.png', 'wood item on ground / carried (game.ts ic-log)', C, 'Items/Resource/Branch.png 16x16 (chunky: tileset_camp.png 0,0,32,16)'),
    ('Meadow world', 'art/fine/icons/chest.png', 'puzzle chest, dungeon chest icon (game.ts, dungeonScene)', 'Code + Code 2', 'Items/Treasure/LittleTreasureChest.png 2 x 16x16 (closed, open)'),
    ('Meadow world', 'art/fine/icons/boot.png', 'speed power-up (game.ts ic-boot)', C, f'{SI}Items & Weapon/Boot.png 24x24'),
    ('Meadow world', 'art/fine/icons/magnet.png', 'magnet power-up (game.ts, sim.ts)', C, 'GAP: no magnet in Ninja'),
    ('Meadow world', 'art/fine/icons/base-marker.png', 'base marker (game.ts m-base-marker)', C, 'Backgrounds/Animated/Flag/Flag{Color}16x16.png (4 frames)'),
    ('Meadow world', 'art/gather/tool-axe.png', 'tool swing strip (game.ts tool-axe)', C, 'Items/Tool/Axe.png 16x16, swung in code (no strip)'),
    ('Meadow world', 'art/gather/tool-pickaxe.png', 'tool swing strip', C, 'Items/Tool/Pickaxe.png 16x16, swung in code'),
    ('Meadow world', 'art/gather/tool-rake.png', 'tool swing strip', C, 'Items/Tool/Sickle.png 16x16 (no rake in Ninja; Hoe.png alt)'),
    ('Meadow world', 'art/fine/gather/chips-wood.png', 'wood hit chips', C, 'FX/Particle/Wood.png 6 x 16x16'),
    ('Meadow world', 'art/fine/gather/chips-stone.png', 'stone hit chips', C, 'FX/Particle/RockGray.png 5 x 16x16'),
    ('Meadow world', 'art/fine/fx/dust.png', 'glide dust', C, 'FX/Smoke/SmokeCircular/SpriteSheet.png 8 x 30x14'),
    ('Meadow world', 'art/fine/fx/levelup.png', 'cottage level-up', C, 'FX/Magic/Spark/SpriteSheet.png 6 x 45x35'),
    ('Meadow world', 'art/fine/fx/coin-sparkle.png', 'pickup sparkle (meadow + dungeon)', 'Code + Code 2', 'FX/Magic/Circle/SpriteSheetSpark.png 6 x 32x32'),
    ('Meadow world', 'art/fine/fx/plate-glow.png', 'pressure plate glow', C, 'FX/Magic/Aura/SpriteSheet.png 5 x 25x24 (or a code-drawn glow)'),
    ('Meadow world', 'art/props/bush.png', 'decor (PROPS)', C, f'{T}TilesetNature.png 160,128,16,16'),
    ('Meadow world', 'art/props/flowers.png', 'decor (DECOR)', C, f'{T}TilesetNature.png flowers row y176 (0,176 / 16,176 / 48,176 / 96,176, 16x16)'),
    ('Meadow world', 'art/props/pond.png', 'pond decor', C, f'{T}TilesetWater.png pond 3x3 0,96,48,48 + open water 16,112'),
    ('Meadow world', 'art/props/fence.png', 'fence', C, f'{T}TilesetHouse.png wood fence tiles 128,64..256,128'),
    ('Meadow world', 'art/props/sign.png', 'sign', C, f'{T}TilesetElement.png signpost 96,48,16,32'),
    ('Meadow world', 'art/props/plate.png', 'pressure plate', C, f'{T}TilesetDungeon.png 0,16,16,16'),
    ('Meadow world', 'art/props/plate-down.png', 'pressure plate pressed', C, f'{T}TilesetDungeon.png 16,16,16,16'),
    ('Meadow world', 'art/props/gate.png', 'puzzle gate closed (game.ts, sim.ts)', C, f'GAP: no gate in Ninja (iron fence {T}TilesetHouse.png 144,160,80,32 as a stand-in)'),
    ('Meadow world', 'art/props/gate-open.png', 'puzzle gate open', C, 'GAP: with gate.png'),
    ('Meadow world', 'art/props/gate-post.png', 'puzzle gate post', C, 'GAP: with gate.png'),
    # ---------------- base ----------------
    ('Base', 'art/base/cottage-1.png', 'cottage level 1 (game.ts, build panel)', C, f'{T}TilesetHouse.png hut 0,128,45,47'),
    ('Base', 'art/base/cottage-2.png', 'cottage level 2', C, f'{T}TilesetHouse.png orange-thatch house 0,0,64,48'),
    ('Base', 'art/base/cottage-3.png', 'cottage level 3', C, f'{T}TilesetHouse.png big thatched hall 400,112,64,80 + front 400,192,64,32'),
    ('Base', 'art/base/build-spot.png', 'empty build spot', C, f'{T}TilesetFloor.png dirt patch 3x3 0,112,48,48'),
    ('Base', 'art/base/bridge.png', 'bridge building (game.ts, sim.ts)', C, f'{T}TilesetHouse.png 144,240,64,46'),
    ('Base', 'art/base/watchtower.png', 'watchtower', C, f'{T}TilesetTowers.png 4,0,24,32'),
    ('Base', 'art/base/garden.png', 'garden', C, f'{T}TilesetElement.png wheat field 208,64,48,48'),
    ('Base', 'art/base/workshop.png', 'workshop', C, f'{T}TilesetHouse.png shed 304,304,48,48'),
    ('Base', 'art/base/storage.png', 'storage', C, f'{T}TilesetHouse.png barn 400,224,64,80 (small: crates 304,224,32,32)'),
    ('Base', 'art/base/well.png', 'well', C, f'{T}TilesetElement.png roofed well 112,27,16,21 (draw 2x)'),
    ('Base', 'art/base/bridge-site.png', 'bridge under construction', C, 'GAP: no construction sites in Ninja (or the finished Ninja building at 50% alpha in code)'),
    ('Base', 'art/base/watchtower-site.png', 'watchtower site', C, f'{T}TilesetTowers.png damaged tower 64,0,32,32'),
    ('Base', 'art/base/garden-site.png', 'garden site', C, f'{T}tileset_camp.png soil plots 0,128,64,16'),
    ('Base', 'art/base/workshop-site.png', 'workshop site', C, 'GAP: with bridge-site'),
    ('Base', 'art/base/storage-site.png', 'storage site', C, f'{T}tileset_camp.png wood pile 0,16,48,32 (materials waiting)'),
    ('Base', 'art/base/well-site.png', 'well site', C, f'{T}TilesetElement.png stone well 96,16,16,16 (no roof yet)'),
    # ---------------- snow ----------------
    ('Snow world', 'art/props-winter/tree-snow-round.png', 'snow wood node 0, map picker', C, f'{T}TilesetNature.png 192,0,32,32'),
    ('Snow world', 'art/props-winter/tree-snow-pine.png', 'snow wood node 1, map picker', C, f'{T}TilesetNature.png 160,0,32,32 (green showing: 128,0)'),
    ('Snow world', 'art/props-winter/tree-snow-small.png', 'snow wood node 2', C, f'{T}TilesetNature.png 128,0,32,32'),
    ('Snow world', 'art/props-winter/rock-snow.png', 'snow stone node 3', C, f'{T}TilesetNature.png snowy boulder 32,192,32,32'),
    ('Snow world', 'art/props-winter/ice-rock.png', 'snow stone node 4', C, f'{T}TilesetNature.png snowy rock 64,192,16,16 (or snowy peaks 144,192)'),
    ('Snow world', 'art/props-winter/bush-berries-snow.png', 'snow berry node 5', C, 'GAP: no snowy berry bush (berry-bush-ninja is pending; a snowy variant would be a new Art piece)'),
    ('Snow world', 'art/props-winter/bush-empty-snow.png', 'picked snow berry node', C, f'{T}TilesetNature.png snow bush 192,0,32,32'),
    ('Snow world', 'art/props-winter/snowman.png', 'snow decor, map picker', C, 'GAP: no snowman in Ninja (snowball 80,192 / snow mound 160,192 as decor)'),
    ('Snow world', 'art/props-winter/igloo.png', 'snow decor', C, f'{T}TilesetHouse.png igloo 0,176,48,46'),
    ('Snow world', 'art/props-winter/ice.png', 'snow decor', C, f'{T}TilesetFloor.png frozen pond 3x3 0,336,48,48'),
    ('Snow world', 'art/props-winter/tree-bare.png', 'snow decor', C, f'{T}TilesetNature.png dead tree 64,0,32,32'),
    ('Snow world', 'art/props-winter/pond-frozen-tiles.png', 'frozen pond tiles (w-pond)', C, f'{T}TilesetFloor.png ice block 0,336,48,48, ice fill 16,352,16,16'),
    # ---------------- Bärregn (meadow mini game) ----------------
    ('Bärregn', 'art/fine/dungeon/ko-stars.png', 'mini-ko (game.ts) + dungeon KO (dungeonScene)', 'Code + Code 2', 'GAP: no dizzy stars in Ninja (Ui/Emote/emote29.png star bubble as stand-in)'),
    ('Bärregn', 'art/dungeon/ko-stars.png', 'Bärregn intro .mi-ko (style.css)', C, 'GAP: with fine/dungeon/ko-stars'),
    ('Bärregn', 'art/fine/dungeon/slam-warning.png', 'mini-warn (game.ts)', C, 'GAP: no warning marker (FX/Magic/Circle/SpriteSheetWhite.png ring as stand-in)'),
    ('Bärregn', 'art/fine/dungeon/shockwave.png', 'mini-wave (game.ts) + dungeon shockwave', 'Code + Code 2', 'FX/Smoke/SmokeCircular/SpriteSheet.png 8 x 30x14'),
    # ---------------- dungeon ----------------
    ('Dungeon', 'art/fine/tiles/dungeon-floor.png', 'dungeon floor', C2, f'{T}Interior/TilesetInteriorFloor.png stone brick fill 176,192,16,16 (block 176,192,176,80)'),
    ('Dungeon', 'art/fine/tiles/dungeon-wall.png', 'dungeon walls', C2, f'{T}Interior/TilesetWallSimple.png brown room 0,96,80,80'),
    ('Dungeon', 'art/fine/dungeon/stairs-down.png', 'stairs down', C2, f'{T}TilesetElement.png 128,176,16,16 (orange style)'),
    ('Dungeon', 'art/fine/dungeon/stairs-up.png', 'stairs up', C2, f'{T}TilesetElement.png 128,192,16,16'),
    ('Dungeon', 'art/fine/dungeon/chest-closed.png', 'loot chest closed', C2, 'Items/Treasure/BigTreasureChest.png frame 0 (16x14)'),
    ('Dungeon', 'art/fine/dungeon/chest-open.png', 'loot chest open', C2, 'Items/Treasure/BigTreasureChest.png frame 1'),
    ('Dungeon', 'art/fine/dungeon/potion.png', 'potion pickup', C2, 'Items/Potion/LifePot.png 9x11'),
    ('Dungeon', 'art/fine/dungeon/revive.png', 'revive effect', C2, 'FX/Magic/Spirit/SpriteSheet.png 5 x 32x32'),
    ('Dungeon', 'art/fine/dungeon/fx-spin.png', 'spin special', C2, 'FX/Attack/CircularSlash/SpriteSheet.png 4 x 32x32'),
    ('Dungeon', 'art/fine/dungeon/fx-slam.png', 'hammer slam', C2, 'FX/Elemental/Rock/SpriteSheet.png 14 x 30x30'),
    ('Dungeon', 'art/fine/dungeon/fx-charge.png', 'tank charge', C2, 'FX/Smoke/SmokeCircular/SpriteSheet.png 8 x 30x14 (trail)'),
    ('Dungeon', 'art/fine/dungeon/fx-sidestep.png', 'sidestep puff', C2, 'FX/Smoke/Smoke/SpriteSheet.png 6 x 32x32'),
    ('Dungeon', 'art/fine/dungeon/fx-heal.png', 'heal', C2, 'FX/Magic/Spirit/SpriteSheet.png 5 x 32x32'),
    ('Dungeon', 'art/fine/dungeon/fx-wall.png', 'tank wall', C2, 'FX/Magic/Shield/SpriteSheetYellow.png 6 x 24x26'),
    ('Dungeon', 'art/fine/dungeon/fx-block.png', 'block', C2, 'FX/Magic/Shield/SpriteSheetBlue.png 6 x 24x26'),
    ('Dungeon', 'art/fine/fx/coin-pile-s.png', 'gold drop small', C2, 'Items/Treasure/Coin2.png 4 x 10x10'),
    ('Dungeon', 'art/fine/fx/coin-pile-m.png', 'gold drop medium', C2, 'Items/Treasure/Coin2.png x2-3 placed in code'),
    ('Dungeon', 'art/fine/fx/coin-pile-l.png', 'gold drop large', C2, 'Items/Object/MoneyBag.png 14x15'),
    ('Dungeon', 'art/dungeon/arrow.png', 'marksman bolt', C2, 'FX/Projectile/Arrow.png 13x5'),
    ('Dungeon', 'art/dungeon/entrance.png', 'dungeon entrance on the meadow', C2, f'{T}TilesetHouse.png stone arch 464,322,48,42'),
    ('Dungeon', 'art/dungeon/entrance-snow.png', 'dungeon entrance on snow', C2, f'{T}TilesetHouse.png stone arch 464,322,48,42 (or igloo 0,176,48,46)'),
    ('Dungeon', 'art/dungeon/level-badge.png', 'XP level badge (dungeon.css)', C2, 'Ui/Receptacle/Receptacle Sphere/BackgroundWood.png 32x32 with the number on top'),
    ('Dungeon', 'art/dungeon/xp-frame.png', 'XP bar frame (dungeon.css)', C2, 'Ui/Receptacle/LifeBarMiniUnder.png 18x4'),
    ('Dungeon', 'art/dungeon/xp-fill.png', 'XP bar fill (dungeon.css)', C2, 'Ui/Receptacle/LifeBarMiniProgress.png recoloured yellow'),
    ('Dungeon', 'art/dungeon/btn-sidestep.png', 'sidestep button (dungeonUi)', C2, f'{SI}Spell/Camouflage.png 24x24 (substitute)'),
    ('Dungeon', 'art/dungeon/card-class-rogue.png', 'class pick card', C2, 'GAP: ChatGPT N-5 class cards'),
    ('Dungeon', 'art/dungeon/card-class-healer.png', 'class pick card', C2, 'GAP: ChatGPT N-5'),
    ('Dungeon', 'art/dungeon/card-class-marksman.png', 'class pick card', C2, 'GAP: ChatGPT N-5'),
    ('Dungeon', 'art/dungeon/card-class-tank.png', 'class pick card', C2, 'GAP: ChatGPT N-5'),
    ('Dungeon', 'art/dungeon/card-sword.png', 'rogue weapon card', C2, 'Items/Weapons/Sword/Sprite.png 6x17 on a nine_path_panel card'),
    ('Dungeon', 'art/dungeon/card-hammer.png', 'rogue weapon card', C2, 'Items/Weapons/Hammer/Sprite.png 9x16'),
    ('Dungeon', 'art/dungeon/card-dagger.png', 'rogue weapon card', C2, 'Items/Weapons/Sai/Sprite.png 7x13'),
    ('Dungeon', 'art/dungeon/btn-special-sword.png', 'special button (dungeonUi)', C2, f'{SI}Spell/Cut.png'),
    ('Dungeon', 'art/dungeon/btn-special-hammer.png', 'special button', C2, f'{SI}Spell/Explosion.png'),
    ('Dungeon', 'art/dungeon/btn-special-spear.png', 'special button', C2, f'{SI}Spell/MagicWeapon.png'),
    ('Dungeon', 'art/dungeon/btn-special-staff.png', 'special button', C2, f'{SI}Spell/Heal.png'),
    ('Dungeon', 'art/dungeon/btn-special-bow.png', 'special button', C2, f'{SI}Items & Weapon/Kunai.png (volley)'),
    ('Dungeon', 'art/dungeon/btn-special-shield.png', 'special button', C2, f'{SI}Spell/DefenseUpgrade.png'),
    ('Dungeon', 'art/dungeon/btn-special-dagger.png', 'special button', C2, f'{SI}Items & Weapon/Shuriken.png'),
    ('Dungeon', 'art/dungeon/item-ring.png', 'loot item (dungeonUi)', C2, f'{SI}Items & Weapon/Ring.png'),
    ('Dungeon', 'art/dungeon/item-helm.png', 'loot item', C2, f'{SI}Items & Weapon/Helmet.png'),
    ('Dungeon', 'art/dungeon/item-gloves.png', 'loot item', C2, f'{SI}Job & Action/Punch.png (no gloves in Ninja)'),
    ('Dungeon', 'art/dungeon/item-amulet.png', 'loot item', C2, f'{SI}Items & Weapon/Amulet.png'),
    ('Dungeon', 'art/dungeon/item-stone.png', 'loot item (regen stone)', C2, 'Items/Resource/GemGreen.png 16x16'),
    ('Dungeon', 'art/dungeon/weapons/sword.png', 'hovering weapon (WIMG)', C2, 'Items/Weapons/Sword/Sprite.png 6x17 (Code 2 switching)'),
    ('Dungeon', 'art/dungeon/weapons/hammer.png', 'hovering weapon', C2, 'Items/Weapons/Hammer/Sprite.png 9x16'),
    ('Dungeon', 'art/dungeon/weapons/spear.png', 'hovering weapon', C2, 'Items/Weapons/Lance/Sprite.png 6x23'),
    ('Dungeon', 'art/dungeon/weapons/staff.png', 'hovering weapon', C2, 'Items/Weapons/MagicWand/Sprite.png 5x18'),
    ('Dungeon', 'art/dungeon/weapons/dagger-1.png', 'hovering dagger', C2, 'Items/Weapons/Sai/Sprite.png 7x13'),
    ('Dungeon', 'art/dungeon/weapons/dagger-2.png', 'hovering dagger', C2, 'Items/Weapons/Sai/Sprite.png 7x13 (mirrored)'),
    ('Dungeon', 'art/dungeon/weapons/shield.png', 'hovering shield', C2, PEND + 'public/art/dungeon/weapons/ninja-shield.png 12x12'),
    ('Dungeon', 'art/dungeon/weapon-sword.png', 'old weapon strip (fallback)', C2, 'Items/Weapons/Sword/Sprite.png rotated in code + FX/Slash/SpriteSheetArc.png'),
    ('Dungeon', 'art/dungeon/weapon-hammer.png', 'old weapon strip', C2, 'Items/Weapons/Hammer/Sprite.png rotated in code'),
    ('Dungeon', 'art/dungeon/weapon-spear.png', 'old weapon strip', C2, 'Items/Weapons/Lance/Sprite.png rotated in code'),
    ('Dungeon', 'art/dungeon/gear-staff.png', 'old gear strip', C2, 'Items/Weapons/MagicWand/Sprite.png'),
    ('Dungeon', 'art/dungeon/gear-shield.png', 'old gear strip', C2, PEND + 'ninja-shield.png'),
    ('Dungeon', 'art/dungeon/gear-daggers.png', 'old gear strip', C2, 'Items/Weapons/Sai/Sprite.png x2'),
    ('Dungeon', 'art/dungeon/gear-crossbow.png', 'marksman weapon strip (no WIMG sprite yet)', C2, PEND + 'public/art/dungeon/weapons/ninja-crossbow.png 16x10 (Ninja alt: Items/Weapons/Bow/Sprite.png 15x7)'),
    # ---------------- Kenney sheets ----------------
    ('Kenney', 'assets/kenney-tiny-dungeon/tilemap_packed.png', 'DOM icon fallback when an art/dungeon file 404s (dungeonUi icon()); placeholder weapons staff/shield/dagger (WEAPON_TILE)', C2, 'Nothing: every art/dungeon file above exists; drop the fallback once the Ninja rows are done'),
    ('Kenney', 'assets/kenney-tiny-ski/tilemap_packed.png', 'pixel font fallback for the logo (art.ts pixelText)', C, 'Ui/Font/NormalFont.ttf (or font8x8.png)'),
    ('Kenney', 'assets/kenney-tiny-town/tilemap_packed.png', 'loaded (game.ts, art.ts) but no frame used', C, 'Nothing: remove the dead load'),
    ('Kenney', 'assets/kenney-tiny-farm/tilemap_packed.png', 'loaded but no frame used', C, 'Nothing: remove the dead load'),
    ('Kenney', 'assets/kenney-tiny-battle/tilemap_packed.png', 'loaded but no frame used', C, 'Nothing: remove the dead load'),
    ('Kenney', 'assets/kenney-pixel-platformer/tilemap_packed.png', 'loaded by art.ts, no frame used', C, 'Nothing: remove the dead load'),
]

# The skill icons (Code 2): id -> Ninja icon
SKILLS = {
    'rogue-rage': 'Spell/OrbFire', 'rogue-knockback': 'Spell/Explosion', 'rogue-whirlwind': 'Items & Weapon/Shuriken',
    'rogue-extraheart': 'Spell/Heal', 'rogue-lifesteal': 'Job & Action/Potion', 'rogue-power': 'Spell/AttackUpgrade',
    'healer-heal': 'Spell/Heal', 'healer-regen': 'Spell/OrbPlant', 'healer-bubble': 'Spell/DefenseUpgrade',
    'healer-revive': 'Spell/OrbLight', 'healer-holy': 'Spell/BookLight', 'healer-cleanse': 'Spell/OrbWater',
    'marksman-multishot': 'Items & Weapon/Kunai', 'marksman-pierce': 'Items & Weapon/Arrow', 'marksman-crit': 'Spell/Vision',
    'marksman-speed': 'Spell/Upgrade', 'marksman-poison': 'Spell/BookIce', 'marksman-trap': 'Items & Weapon/Hook',
    'tank-block': 'Spell/Counter', 'tank-taunt': 'Job & Action/Talk', 'tank-armor': 'Items & Weapon/Armor',
    'tank-charge': 'Spell/RockSpike', 'tank-stun': 'Spell/BookThunder', 'tank-guard': 'Items & Weapon/Guard',
}
for k, v in SKILLS.items():
    ROWS.append(('Dungeon skills', f'art/dungeon/skills/{k}.png', 'level-up skill card (dungeon.ts SKILLS)', C2, f'{SI}{v}.png 24x24 (+ {v.split("/")[-1]}Disabled.png for locked)'))


def kind(r):
    rep = r[4]
    if rep.startswith('PENDING'):
        return 'pending'
    if rep.startswith('GAP'):
        return 'gap'
    return 'mapped'


def main():
    for r in ROWS:
        assert os.path.exists(os.path.join(ROOT, 'public', r[1])), r[1]
    n = {'mapped': 0, 'pending': 0, 'gap': 0}
    for r in ROWS:
        n[kind(r)] += 1
    out = ['# Old art checklist: every non-Ninja image still used, and its Ninja replacement', '',
           'Made by Art for "replace old art" (Stefan). Source: grep of `src/`, `index.html`, `style.css`, `dungeon.css` on the',
           'deploy branch `claude/mobile-game-5-players-8qthjq` (cd8ceb3) plus the heads of `claude/blobz-code` (7fdedd0) and',
           '`claude/blobz-dungeon` (05d0118); none of the branch heads adds a new old-art reference. Regenerate with',
           '`python3 scripts/old_art_checklist.py` after editing the rows there.', '',
           '- **Ninja** paths are relative to `public/assets/ninja-adventure/`; rects are `x,y,w,h` (see `docs/ART_MAP.md`).',
           '- **GAP** = Ninja has nothing usable: needs a ChatGPT order (or an Art piece only with Stefan\'s OK).',
           '- **PENDING** = an Art piece made before the "no own art" rule; it waits for Stefan\'s rating.',
           '- Owner = who swaps the reference: Code (meadow, UI, `game.ts`/`main.ts`/`style.css`/`index.html`), Code 2 (`dungeon*`).',
           '- Tick the box when the game no longer loads the old file.', '',
           f'**Counts: {len(ROWS)} total / {n["mapped"]} mapped to Ninja / {n["pending"]} pending Art rating / {n["gap"]} gaps.**', '']
    area = None
    for r in ROWS:
        if r[0] != area:
            area = r[0]
            out += ['', f'## {area}', '', '| Done | Old file (public/) | Used in | Owner | Ninja replacement |', '|---|---|---|---|---|']
        out.append(f'| [ ] | `{r[1]}` | {r[2]} | {r[3]} | {r[4]} |')
    out += ['', '## Not counted (on disk but not loaded)', '',
            'Old files nothing references any more (safe to delete later, by Lead): `art/icons/{boot,chest,log,magnet,dash,clock,diamond*,gem*,',
            'mushroom,sparkle,team}.png`, `art/gather/{item-stone,chips-*,btn-dash}.png`, `art/fx/*`, `art/fine/base/build-spot.png`,',
            '`art/dungeon/{chest-*,stairs-*,potion,revive,shockwave,slam-warning,fx-*,flash-goo-*,heart-*,btn-attack,btn-dash-small,',
            'icon-crossbow,card-spear,gear-bow}.png`, `art/dungeon/weapons/daggers.png`.', '']
    open(OUT, 'w').write('\n'.join(out))
    print(len(ROWS), n)


if __name__ == '__main__':
    main()
