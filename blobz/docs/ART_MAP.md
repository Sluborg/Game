# ART_MAP: Ninja Adventure -> Blobz game objects

Reference for wiring art. **One art source:** CC0 "Ninja Adventure" pack, vendored at
`public/assets/ninja-adventure/`. All paths below are relative to that folder.

- Tiles and frames are **16 px**. Draw Ninja art at **integer scale only** (pixelArt / NEAREST).
  The blobz are redrawn by Art on the same 16 px grid.
- Rects are `x,y,w,h` in **pixels** of the source PNG. "tile c,r" = column,row on the 16 px grid
  (x = c*16, y = r*16). Every rect here was cropped and checked by eye.
- Autotile 3x3 blocks are laid out: row 1 = TL, T, TR; row 2 = L, fill, R; row 3 = BL, B, BR.
- "inner corner XX" = the fill tile with the *other* terrain poking into its XX corner.
- `MISSING:` = the pack has nothing usable; a substitute or "Art draws in code" is given.

## Sheet conventions
| Kind | Layout |
|---|---|
| `Actor/Character/*/SpriteSheet.png` (64x112) | 16x16 frames, 4 cols x 7 rows. **Cols = facing down, up, left, right.** Rows 0-3 walk, row 4 attack, row 5 jump, row 6 misc (item/dead/special). `SeparateAnim/` has the same as strips. |
| `Actor/Monster/*/*.png` (64x64) | 16x16 frames, 4x4. **Cols = facing down, up, left, right; rows = 4 anim frames** (idle/move loop). |
| `Actor/Boss/*/*.png` | One strip per anim, horizontal, single facing. Frame size per boss below. |
| `FX/**/SpriteSheet*.png` | Horizontal strip, frame size listed per row below. |
| `Ui/Skill Icon/**/X.png` | 24x24 icon; every icon has an `XDisabled.png` grey twin. |

---

## 1. Meadow ground
| Game object | File | Rect / frames | Notes |
|---|---|---|---|
| Grass fill (main) | Backgrounds/Tilesets/TilesetFloor.png | 0,192,16,16 (tile 0,12) | Plain lime grass. |
| Grass variants | TilesetFloor.png | 16,192 / 32,192 / 48,192 / 64,192 / 32,176 / 48,176 (each 16x16) | Same green + faint tufts. Sprinkle ~1 in 6. |
| Dark-grass fill (alt meadow) | TilesetFloor.png | 176,192,16,16 (tile 11,12) | Darker green; its own dirt-path block is cols 11-21 rows 7-13 (same layout as below, x+176). |
| Dirt path patch 3x3 (on grass) | TilesetFloor.png | 0,112,48,48 (tiles 0-2,7-9) | TL/T/TR/L/fill/R/BL/B/BR. Dirt fill = 16,128,16,16. |
| Dirt path 1-wide vertical | TilesetFloor.png | 48,112,16,48 (tile 3,7-9) | Top cap, middle, bottom cap. |
| Dirt path 1-wide horizontal | TilesetFloor.png | 0,160,48,16 (tiles 0-2,10) | Left cap, middle, right cap. Single dot: 48,160,16,16. |
| Dirt inner corners | TilesetFloor.png | BR 80,128 / BL 96,128 / TR 80,144 / TL 96,144 (16x16) | Dirt with grass in that corner. |
| Dirt decor | TilesetFloor.png | stick 0,176 / pebble 16,176 (16x16) | Dirt tiles with a stick or stone. |
| Raised grass patch (alt, chunky edge) | Backgrounds/Tilesets/TilesetField.png | 0,48,48,48 (3x3), fill 48,48,16,16 | 5 colour blocks stacked every 48 px: orange y0, lime y48, dark green y96, pink y144, white/snow y192. |
| Tufts / sprouts / flowers (overlay) | Backgrounds/Tilesets/TilesetFloorDetail.png | row y32: 8 tiles 0,32 .. 112,32 (16x16) | Grass tufts, sprouts, 80,32 = red flowers, 112,32 = leaf clump. |
| Debris (overlay) | TilesetFloorDetail.png | row y0: 0,0 .. 240,0 | Leaves, sparks, bones, rock; 0,16 = blue pebbles. |
| Grass tufts (bigger) | Backgrounds/Tilesets/TilesetNature.png | row y160: 12 tiles 0,160 .. 176,160 | Bushes and tufts, 16x16 each. |
| Flowers | TilesetNature.png | row y176: sunflower 0,176 / 16,176, clover 32,176, red flower 48,176, ferns 64,176 / 80,176, daisy 96,176, hedge 112,176 | 16x16 each. |
| Animated flower | Backgrounds/Animated/Flower/SpriteSheet16x16.png | 2 frames of 10x8 | Tiny sway. |
| Animated plant | Backgrounds/Animated/Plant/SpriteSheet16x16.png | 4 frames of 16x16 | |

## 2. Water + shore
| Game object | File | Rect / frames | Notes |
|---|---|---|---|
| Pond 3x3 on grass (outer corners + edges) | Backgrounds/Tilesets/TilesetWater.png | 0,96,48,48 (tiles 0-2,6-8) | Grass shore, brown bank, white foam line. |
| Open water | TilesetWater.png | 16,112,16,16 (tile 1,7) | Plain light blue. |
| Inner corners (land poking into water) | TilesetWater.png | BR 80,112 / BL 96,112 / TR 80,128 / TL 96,128 | Together they form a 2x2 island. |
| River 1-wide vertical / horizontal | TilesetWater.png | V 48,96,16,48 / H 0,144,48,16 | End caps included. |
| Other combos (T-junctions, diagonals) | TilesetWater.png | tiles 4-10, rows 6-10 (64,96,112,80) | Use only if a map needs them. |
| Water on sand / ice / poison | TilesetWater.png | sand block 0,0,176,96; white/ice 208,0,176,96; purple poison on dirt 208,96,176,96 | Same layout as the grass block. |
| Lily pad / rock in water | TilesetWater.png | lily 384,48,16,16; rock 384,0,16,16 | Water variants 384,16..384,64. |
| Floating log | TilesetWater.png | 416,0,32,16 | |
| Water ripple (animated) | Backgrounds/Animated/Water Ripples/SpriteSheet16x16.png | 4 frames 16x16 | Overlay on open water. |
| Waterfall | Backgrounds/Animated/Waterfall/{Top,Middle,Bottom}Sheet16x16.png | 5 / 5 / 3 frames 16x16 | Optional. |
| **Bridge (pre-assembled)** | Backgrounds/Tilesets/TilesetHouse.png | 144,240,64,46 | Wooden plank bridge with rails, crossing left-right. Green-stone version 144,304,64,46. |
| Bridge / dock planks (tiled) | TilesetWater.png | 3x3 deck 0,192,48,48; 1-wide vertical 48,192,16,48; horizontal strip 0,240,64,16; big deck 64,192,80,80 | Plain orange planks with a dark bottom edge. |

## 3. Snow map
| Game object | File | Rect / frames | Notes |
|---|---|---|---|
| Snow fill (white) | TilesetFloor.png | 16,240,16,16 (tile 1,15) | Pure white. |
| Snow fill (shaded) | TilesetFloor.png | 0,304,16,16 (tile 0,19); variants 16,304 .. 64,304 | Pale lavender; good as the base, white patches on top. |
| Snow path / patch 3x3 | TilesetFloor.png | 0,224,48,48 (tiles 0-2,14-16) | White patch on shaded snow. Full block cols 0-10 rows 14-20, same layout as the dirt block. |
| Snow drift overlay 3x3 (on any ground) | Backgrounds/Tilesets/TilesetFloorB.png | 0,0,48,48, fill 16,16,16,16 | Light-blue rim. 1-wide strips 48,0,16,48 and 0,48,48,16. |
| Frozen pond / ice 3x3 | TilesetFloor.png | 0,336,48,48, ice fill 16,352,16,16 | Ice patch on snow. Ice on sand/water: TilesetWater.png 208,0,176,96. |
| Raised snow patch | TilesetField.png | 0,192,48,48, fill 48,192,16,16 | |
| Snow tufts (overlay) | TilesetFloorDetail.png | row y48: 0,48 .. 112,48 | Snowy copies of the grass tufts. |
| Snow pine | TilesetNature.png | 128,0,32,32 (green showing) / 160,0,32,32 (fully white) | |
| Snow bush / round tree | TilesetNature.png | 192,0,32,32 | |
| Snow grove (3 trees, 64x48) | TilesetNature.png | round 128,32,64,48; pines 64,80,64,48; white pines 128,80,64,48 | |
| Big snow tree | TilesetNature.png | 96,288,48,48 | |
| Snowy boulder | TilesetNature.png | 32,192,32,32 | Small: snowy rock 64,192; snowball 80,192; snowy peaks 144,192; snow mound 160,192. |
| Igloo | TilesetHouse.png | 0,176,48,46; narrow igloo 55,176,34,46; ice-brick house 96,176,48,46 | Snow-map base or shelter. |
| Snow cliffs | Backgrounds/Tilesets/TilesetRelief.png | snow plateau block 0,0,192,80 | White top, grey-green cliff face. Optional. |
| Snowfall | FX/Particle/Snow.png | 7 frames of 8x8 | |

## 4. Nature props (TilesetNature.png unless noted)
| Game object | File | Rect | Notes |
|---|---|---|---|
| Tree, round (wood node) | TilesetNature.png | 0,0,32,32 | Trunk at the bottom. Same tree: 256,0 and 288,0 (bush-like). |
| Tree, pine | TilesetNature.png | 32,0,32,32 | |
| Tree, with roots | TilesetNature.png | 96,0,32,32 | Also 96,128,32,32 (smaller). |
| Tree, dead | TilesetNature.png | 64,0,32,32 | |
| Tree, pink blossom | TilesetNature.png | 224,0,32,32 | |
| Big trees 48x48 | TilesetNature.png | pink 0,288; green 48,288; white 96,288; autumn 144,288 (all 48x48) | |
| Groves 64x48 | TilesetNature.png | pines 0,32; round 64,32; green 256,32 / 320,32 | Map edge filler. |
| Rock, brown (stone node) | TilesetNature.png | 208,128,32,32 | Small: 240,144,16,16. Rock pile 192,80,64,48. |
| Rock, grey (stone node) | TilesetNature.png | 256,128,32,32 | Small: 288,144,16,16. Rock pile 256,80,64,48. |
| Boulder, teal | TilesetNature.png | 0,192,32,32 | Small teal rocks 96,192 / 112,192 / 128,192. |
| Big cliff rocks | TilesetNature.png | grey 240,208,112,80 area; brown 240,160,128,48 area | Free-form, not autotiled. |
| Pebbles | TilesetNature.png | 240,288,64,16 (4 tiles) | Sand-coloured decor. |
| **Berry bush** | `public/art/props/berry-bush-ninja.png` 32x32 / `berry-bush-ninja-s.png` 16x16 (Art, not in the Ninja folder) | | Ninja has NO berry bush. Red berries drawn on Ninja's round bush (Nature 256,0,32,32) and small bush (Nature 96,160,16,16) by `scripts/berry_bush.py`. Picked clean = the plain source rects. |
| **Ore rocks (crystal / stone node)** | TilesetNature.png | small 16x16: cols x64,80,96 rows y224 (grey), y240 (brown), y256 (blue), y272 (orange); big 32x32: grey 112,224; brown 144,224; blue 112,256; orange 144,256 | Rocks with coloured gems. **Not berry bushes** (an earlier version of this map said so; fixed). Big = crystal node, small = rubble / gem chips. |
| Bush (plain) | TilesetNature.png | 160,128 / 160,144 (16x16) | |
| Stump | TilesetNature.png | dark 0,128,32,32; orange 32,128,32,32; small 64,128,16,16 | Tree-cut state. Stump tops 64,208 / 80,208 / 96,208. |
| Log (small) | TilesetNature.png | 80,128,16,16 | |
| Logs upright | TilesetNature.png | 192,224,32,32 | Two standing logs. |
| Log lying (big) | Backgrounds/Tilesets/tileset_camp.png | 0,0,32,16 brown; 32,0,32,16 birch; 16,32,32,16; upright 48,16,16,32 | |
| Wood pile | tileset_camp.png | 0,16,48,32 | Stack of logs. |
| Big stump table | tileset_camp.png | 16,80,32,32 | |
| Crystal node | TilesetNature.png | crystal clusters 0,224 / 16,224 / 32,224 / 48,224 (orange, blue, pink, green, 16x16); cut gems 0,240..48,240; big gem blocks 0,256..48,256 (16x16) | Or the ore rocks above for a rock-with-crystals node. |
| Bamboo | TilesetNature.png | 176,128,16,32 | |

## 5. Base + the 6 buildings
| Game object | File | Rect | Notes |
|---|---|---|---|
| **Base cottage** | TilesetHouse.png | 0,0,64,48 | Orange thatch roof, door centre. Alt: beige walls 128,0,64,48; flat roof 64,0,64,48; wooden house 416,0,48,47. |
| Other houses | TilesetHouse.png | red temple 192,0,64,48; shop 256,0,48,48; green-roof shop 304,0,64,48; stone house 368,0,48,48; huts 0,128,45,47 / 48,128,47,32 | For villages / variety. |
| **Bridge** | TilesetHouse.png | 144,240,64,46 | See section 2. |
| **Watchtower** | Backgrounds/Tilesets/TilesetTowers.png | 4,0,24,32 (wooden tower on legs) | 32x32 cells. Wood row y0, stone row y32, sand-base row y64. Each row has 6 cells at x 0/32/.../160: intact and damaged looks (64,0 is visibly damaged), which can serve as build stages. Turret alts at x 192-383. |
| **Garden** | Backgrounds/Tilesets/TilesetElement.png | wheat field 208,64,48,48 (3x3); wheat sheaf 192,70,16,25 | Soil plots: tileset_camp.png 0,128,64,16. Plants: TilesetNature row y176. |
| **Workshop** | TilesetHouse.png | wooden shed 304,304,48,48 | Alt: clay kiln/forge dome 466,64,45,63. Tools on top: Items/Tool/Anvil.png, Hammer.png. |
| **Storage** | TilesetHouse.png | big barn 400,224,64,80 | Small: crates of goods 304,224,32,32; barrels 256,240,48,16; wood pile (camp 0,16,48,32). |
| **Well** | TilesetElement.png | stone well 96,16,16,16; with plaque 96,32,16,16; roofed well 112,27,16,21 | All 1-tile. Draw at 2x or MISSING a big well: Art can compose roofed well + bucket (TilesetElement 64,0 / 80,0). |
| Big thatched hall | TilesetHouse.png | roof 400,112,64,80 + door front 400,192,64,32 (stack -> 64x112) | Modular; check the join in game. |
| Tent | tileset_camp.png | 64,0,48,48 | 2 more at 112,0 and 160,0. |
| Campfire | tileset_camp.png | 192,48,32,32 | Static; flames from FX/Particle/Fire.png. |
| Fences | TilesetHouse.png | wood fence tiles 128,64..256,128; sand wall 128,128..256,160; iron fence 144,160,80,32 | |
| Flag (animated) | Backgrounds/Animated/Flag/Flag{Color}16x16.png | 4 frames 16x16 | Team / base marker. |
| Cart | TilesetElement.png | empty 0,48,32,32; loaded 32,48,32,32 | Delivery / carry flavour. |
| Signpost | TilesetElement.png | 96,48,16,32 | |
| Bowls of produce | TilesetHouse.png | water 256,208; greens 272,208; red berries 288,208 (16x16) | Garden output / berry storage decor. |

## 6. Carry resources
| Game object | File | Rect / frames | Notes |
|---|---|---|---|
| Wood | Items/Resource/Branch.png | 16x16 | A branch. For a chunkier log: camp log 0,0,32,16 or Nature 80,128,16,16. |
| Stone | Items/Resource/Rock.png | 16x16 | Grey rock. |
| Crystal | Items/Resource/GemRed.png / GemGreen.png / GemPurple.png / GemYellow.png | 15x15 / 16x16 / 16x16 / 14x14 | |
| Berry | Items/Food/Nut2.png | 15x15 | MISSING a real berry: Nut2 is a dark-red round fruit, the closest. Or Art draws a 3-berry cluster in code. |
| Extras | Items/Resource/Grass.png, Water.png, feather.png, Bar*.png | 16x16 | |

## 7. HUD / UI
| Game object | File | Rect / frames | Notes |
|---|---|---|---|
| Heart (HP) | Ui/Receptacle/Heart.png | 5 frames 16x16: empty, 1/4, 1/2, 3/4, full | |
| Heart icon (small) | Ui/Receptacle/IconHeart.png | 14x12 | |
| Energy / box pips | Ui/Receptacle/Heart2.png | 4 frames 16x16 (0-3 bars) | Heart3.png = triangle pips. |
| Mini HP bar (over enemies) | Ui/Receptacle/LifeBarMiniUnder.png + LifeBarMiniProgress.png | 18x4 each | Scale the progress bar's width. |
| Coin (spinning) | Items/Treasure/Coin2.png | 4 frames 10x10 | Static: GoldCoin.png 7x7, SilverCoin.png 6x6. |
| Panel 9-slice | Ui/Theme/Theme Wood/nine_path_panel.png | 16x16, slice L6 T6 R5 B5 | Orange wood frame with an inner rim; the fill is the inner colour. _2 (purple-grey fill) and _3 (white fill, for text) use the same slices; _disabled greyed. More skins: Ui/Theme/Wip/*/nine_path_panel.png (not slice-checked). |
| Button normal / hover / pressed / disabled | Ui/Theme/Theme Wood/button_normal / _hover / _pressed / _disabled.png | 16x8, slice 2 px all sides | **Pressed** has a thicker top (T3 B1): move the label down 1 px while pressed. Toggle buttons: button_checked / _unchecked 26x14. |
| Arrows (back / next / play) | Ui/Theme/Theme Wood/arrow_left.png / arrow_right.png (+ _hover) | 16x16 | Use arrow_right as "play". |
| Close (X) | Ui/Theme/Theme Wood/checked.png | 16x16 | An X in a box. |
| Yes / No | Ui/Dialog/YesButton.png / NoButton.png | 26x16 | Text baked in (English). |
| Check mark | MISSING | | Art draws in code, or use YesButton. |
| Home / settings / pause icons | MISSING | | Art draws in code (16 px). |
| Joystick base + knob | Ui/Receptacle/Receptacle Sphere/BackgroundWood.png (32x32) + ProgressYellow.png (22x22) | | MISSING a real on-screen stick; this pairing is a substitute. Gamepad stick icon: Ui/Input/Gamepad/JoystickLeft.png 15x18. |
| Action button | Ui/Receptacle/Receptacle Sphere/BackgroundRed.png 32x32 with a skill icon inside, or Ui/Input/Gamepad/ButtonA/{Idle,Pressed}.png 16x15 | | ButtonA has a baked "A". |
| Dialog box | Ui/Dialog/DialogBox.png 300x58 (slice L6 T14 R6 B6, title tab on top); DialogueBoxSimple.png 316x60 (slice 6); DialogBoxFaceset.png 300x58 + FacesetBox.png 48x48 (portrait frame) | | Use DialogueBoxSimple for short no-reading hints with an icon. |
| Choice / info strip | Ui/Dialog/ChoiceBox.png 64x20 (slice 5), DialogInfo.png 80x16 | | |
| HP bar (players, horizontal) | Ui/Receptacle/LifeBarMiniUnder.png (track) + LifeBarMiniProgress.png (red fill) | 18x4 each | Scale integer x2-x3 in the HUD; crop the fill's width to the HP fraction (do not stretch). |
| XP / build-progress bar | Track: LifeBarMiniUnder.png; fill: LifeBarMiniProgress.png **recoloured** (yellow #ffe18d or green) | 18x4 | MISSING a dedicated XP bar; recolour is allowed. Long bars: 9-slice nine_path_bg (slice 1) as track and slider_progress.png (16x16, slice 2) as fill. |
| Big HP / mana gauge (vertical) | Ui/Receptacle/Receptacle Rectangle/BackgroundWood.png 34x56 + ProgressHealth.png / ProgressWhite.png 22x40 | | Fill from the bottom by cropping. Other frames: BackgroundBag, Bamboo, Bottle, Scroll. Round gauge: Receptacle Sphere Background*.png 32x32 + Progress*.png 22x22 (+ Over.png glass). |
| Resource counters (HUD) | Wood Items/Resource/Branch.png, Stone Rock.png, Berry Items/Food/Nut2.png, Gold Items/Treasure/Coin2.png (frame 0) or GoldCoin.png 7x7, Crystal Items/Resource/GemPurple.png | 16x16 (coin 10x10) | Same sprites as the carry items in section 6, drawn x2 next to the number. Skill-style 24x24 alt for gold: Ui/Skill Icon/Items & Weapon/Money.png. |
| Tabs | Ui/Theme/Theme Wood/tab.png / tab_selected / tab_hover / tab_unselected / tab_disabled | 16x12, slice L4 T4 R6, open bottom | |
| Checkbox / radio / slider | unchecked / checked, radio_unchecked / radio_checked 16x16; h_slidder_grabber 13x11 | | |
| Focus ring | Ui/Theme/Theme Wood/nine_path_focus.png | 8x8, slice 3 | Selected slot / button highlight. |
| Inventory slot | Ui/Theme/Theme Wood/inventory_cell.png | 16x16 | |
| Font | Ui/Font/NormalFont.ttf; bitmap font8x8.png (120x64), font24x30.png (360x240) | | |
| Emotes (speech bubbles) | Ui/Emote/emote1..30.png | 14x13 each | 1 shout, 11 smile, 21 "!", 22 red "!", 23 "?", 25 red "?", 26 broken heart, 27 heart, 28 "zz", 29 star, 30 cross. |

**Skill / action icons** (24x24, `Ui/Skill Icon/...`; every icon has an `XDisabled.png` grey twin for cooldown / locked):
| Action | File | Notes |
|---|---|---|
| Heal | Spell/Heal.png | Heart with plus. |
| Crit | Spell/AttackUpgrade.png | Sword with up arrow. |
| Block | Spell/DefenseUpgrade.png | Shield. |
| Attack | Spell/Cut.png | Slash. Alt: Job & Action/Punch.png. |
| Dash | Items & Weapon/Boot.png | |
| Spin | Items & Weapon/Shuriken.png | MISSING a spin icon; shuriken reads as "spinning". |
| Sidestep | Spell/Camouflage.png | MISSING a true sidestep icon; Art can draw one in code. |
| Build | Job & Action/Repair.png | Hammer on planks. |
| Gather wood / stone / berry | Job & Action/Harvest.png, Mine.png, Plant.png | |
| Interact / carry | Job & Action/Interact.png | |
| Guard / taunt (tank) | Items & Weapon/Guard.png | Crossed swords. |
| Arrow shot (marksman) | Items & Weapon/Arrow.png | |
| Money / loot | Items & Weapon/Money.png | |
| Upgrade | Spell/Upgrade.png | Big up arrow. |

## 8. Weapons + class gear (`Items/Weapons/<Name>/Sprite.png`, plus `SpriteInHand.png` for most)
| Class / item | File | Size | Notes |
|---|---|---|---|
| Rogue dagger | Items/Weapons/Sai/Sprite.png; Ninjaku/Sprite.png; Items/Projectile/Kunai.png | 7x13; 7x12; 16x16 | Thrown kunai FX: FX/Projectile/Kunai.png 14x5. |
| Sword | Items/Weapons/Sword/Sprite.png; Sword2; Katana; BigSword | 6x17; 6x15; 6x14; 7x16 | |
| Tank hammer | Items/Weapons/Hammer/Sprite.png | 9x16 | Also Club 8x14, Axe 11x13. |
| Spear | Items/Weapons/Lance/Sprite.png; Lance2; Fork | 6x23; 7x21; 7x16 | |
| Healer staff | Items/Weapons/MagicWand/Sprite.png | 5x18 | Plain staff: Stick 3x16. Book 9x9 for a tome. |
| Marksman bow | Items/Weapons/Bow/Sprite.png (+ Arrow.png 13x5); Bow2 | 15x7 | No in-hand sprite. Flying arrow: FX/Projectile/Arrow.png 13x5. |
| Crossbow | `public/art/dungeon/weapons/ninja-crossbow.png` (Art, not in the Ninja folder) | 16x10, pivot 2,5 | Hand-drawn Ninja-style, points right, bolt nocked. |
| Shield | `public/art/dungeon/weapons/ninja-shield.png` (Art, not in the Ninja folder) | 12x12, pivot 6,6 | Hand-drawn Ninja-style. Icon: Ui/Skill Icon/Spell/DefenseUpgrade.png 24x24; bubble FX: FX/Magic/Shield. |
| Gather tools | Items/Tool/Axe.png, Pickaxe.png, Hammer.png, Shovel.png, Sickle.png, WateringCan.png | 16x16 | |
| Weapon swing overlays | Actor/CharacterAnimated/Weapon/{Katana,Axe,Hammer,Pickaxe,Net}.png | 256x256, 32x32 cells | Built for Actor/CharacterAnimated/NinjaGreen only; positions will not match blobz. Skip unless Art aligns by hand. |

## 9. Enemies
| Role | File | Frames | Notes |
|---|---|---|---|
| **Goo small** | Actor/Monster/Slime/Slime.png | 16x16, 4x4 (cols down/up/left/right, rows frames) | Blue, one eye. Faceset.png 38x38 for UI. |
| **Goo medium** | Actor/Monster/Slime3/Slime3.png | 16x16, 4x4 | Blue with a face. Draw at 2x (32 px) to read as "bigger"; or tint. |
| **Goo spitter** | Actor/Monster/Slime2/Slime2.png | 16x16, 4x4 | Green, red eye. Projectile: FX/Projectile/EnergyBall.png (4 frames 16x16) or SpriteSheetRock.png. |
| Goo angry (elite) | Actor/Monster/Slime4/Slime4.png | 16x16, 4x4 | Green, angry face. |
| Cute extras | Actor/Monster/Mushroom/mushroom.png; Spirit/SpriteSheet.png; Bamboo/SpriteSheet.png; BlueBat/SpriteSheet.png; Skull/SpriteSheet.png; Larva/Larva.png; HeartRed/SpriteSheet.png | all 16x16, 4x4 | Mushroom and Spirit read best for kids. |
| **Boss: Giant Slime** | Actor/Boss/GiantSlime/Idle.png (5 fr), Hit.png (5 fr), Jump.png (13 fr) | **62x52** frames | Blue one-eyed slime, matches goo. GiantSlime2 = colour variant. Faceset.png 38x38. |
| Boss: Giant Frog | Actor/Boss/GiantFrog/Idle40x40.png (5), Jump (6), Charge (7), Attack (3), Hit (3) | 40x40 | GiantFrog2 = variant. |
| Boss: Giant Spirit | Actor/Boss/GiantSpirit/Idle.png (5), Hit.png (3) | 50x50 | Also GiantFlam, DemonCyclop (+Walk 6) at 50x50. |
| Boss: Giant Racoon | Actor/Boss/GiantRacoon/Idle (6), Jump (5), Attack (4), Charge (2) | 60x60 | |
| Boss: Squid | Actor/Boss/SquidGreen/*.png | 79 px tall, about 76 px wide (Idle 4 fr) | Frame width is a guess: check before use. |
| Death puff | FX/Smoke/Smoke/SpriteSheet.png | 6 frames 32x32 | |

## 10. FX
| Effect | File | Frames | Notes |
|---|---|---|---|
| Hit / slash | FX/Attack/Cut/SpriteSheet.png | 4 x 32x32 | Straight slash. Curved: SlashCurved (4x32), double: CutDouble (5x32), X: CutX (4x32). |
| Claw (enemy hit) | FX/Attack/Claw/SpriteSheet.png | 4 x 32x32 | |
| Spin attack | FX/Attack/CircularSlash/SpriteSheet.png | 4 x 32x32 | Full ring slash. |
| Heal | FX/Magic/Spirit/SpriteSheet.png (white) / SpriteSheetBlue.png | 5 x 32x32 | Rising swirl. Alt: FX/Magic/Aura/SpriteSheet.png 5 x 25x24 (pink). |
| Shield / block | FX/Magic/Shield/SpriteSheetBlue.png / SpriteSheetYellow.png | 6 x 24x26 | Rising zig-zag dome. |
| Explosion | FX/Elemental/Explosion/SpriteSheet.png | 9 x 40x40 | |
| Rock burst (stone break) | FX/Elemental/Rock/SpriteSheet.png | 14 x 30x30 | |
| Dust ring (landing / dash) | FX/Smoke/SmokeCircular/SpriteSheet.png | 8 x 30x14 | |
| Smoke puff | FX/Smoke/Smoke/SpriteSheet.png | 6 x 32x32 | |
| Level-up / sparkle | FX/Magic/Spark/SpriteSheet.png | 6 x 45x35 | Gold sparkles. Blue sparkles: FX/Magic/Boost/SpriteSheet.png 8 x 53x35 (frame width likely; check). |
| Star burst (pickup, crit) | FX/Magic/Circle/SpriteSheetSpark.png | 6 x 32x32 | Ring + 4-point star. White ring only: SpriteSheetWhite.png 4x32. |
| Splash | FX/Elemental/Water/SpriteSheet.png | 10 x 44x33 | Big splash. Small drop: FX/Particle/RainOnFloor.png 3 x 8x8. |
| Wood chips / stone chips | FX/Particle/Wood.png 6 x 16x16; Rock.png / RockGray.png 5 x 16x16 | | For gather hits. |
| Leaves / grass bits | FX/Particle/Leaf.png 6 x 12x7; Grass.png 6 x 12x13 | | Bush hit. |
| Fire | FX/Particle/Fire.png | 12 x 8x12 | Campfire flames. |
| Ice flakes | FX/Elemental/Ice/SpriteSheetFlake.png | 9 x 32x32 | Snow map ambience. |

## 11. Loot
| Item | File | Frames | Notes |
|---|---|---|---|
| Chest (red, big) | Items/Treasure/BigTreasureChest.png | 2 x 16x14: closed, open | |
| Chest (teal, small) | Items/Treasure/LittleTreasureChest.png | 2 x 16x16: closed, open | |
| Chest (wood, map prop) | tileset_camp.png 64,128,16,16 and 80,128,16,16; TilesetElement.png 48,16,16,16 | | Static only. |
| Coins | Items/Treasure/Coin2.png (4 x 10x10 spin), GoldCoin.png 7x7, SilverCoin.png 6x6, Items/Object/MoneyBag.png 14x15 | | |
| Keys | Items/Treasure/GoldKey.png / SilverKey.png | 12x8 | |
| Potions | Items/Potion/LifePot.png (red), WaterPot.png (blue), MilkPot.png, EmptyPot.png | 9x11 | Heart.png 9x8 = small heal pickup; Medipack.png 10x10. |
| Trophy | Items/Treasure/GoldCup.png / SilverCup.png | 9x11 | End-of-level stars alt. |

## 12. Dungeon
| Game object | File | Rect | Notes |
|---|---|---|---|
| Floor (stone brick) | Backgrounds/Tilesets/Interior/TilesetInteriorFloor.png | fill 176,192,16,16; block 176,192,176,80 | Dark cobble. Sand brick: 0,192,176,80. |
| Floor (green tiles) | TilesetInteriorFloor.png | 3x3 tile 176,96,48,48; plain 176,176,16,16 | Temple feel. |
| Floor (cave dirt) | TilesetFloor.png | fill 192,240,16,16; patch 176,224,48,48 | Brown cave ground, block cols 11-21 rows 14-20. |
| Room walls (simple frame) | Backgrounds/Tilesets/Interior/TilesetWallSimple.png | brown room 0,96,80,80 (5x5 tiles); green room 80,96,80,80 | Corners: TL 0,96 / TR 64,96 / BL 0,160 / BR 64,160. Straight runs: top 48,96; bottom 48,160; left 0,112; right 64,112. Walls have end caps at the 1-2 column and 8-9 row seams (usable as door gaps). Black void outside: 0,80,16,16. |
| Room walls (full autotile) | Backgrounds/Tilesets/Interior/TilesetInterior.png | brown 0,160,128,160; green 128,160,128,160 | Many junction pieces; use only for non-rectangular rooms. |
| Floor hatch (entrance / exit) | TilesetWallSimple.png | 32,112,32,32 (brown), 112,112,32,32 (green) | Round hatch with a hole. Vent: 16,112,16,16. |
| Stairs down / up | Backgrounds/Tilesets/TilesetElement.png | down: 96,176 / 112,176 / 128,176 / 144,176; up: same x at y192 (16x16) | Sand, snow, orange, green-stone styles. Trapdoor tiles at y208. |
| Dungeon entrance (overworld) | TilesetHouse.png | stone arch 464,322,48,42 | Put a dark tile or stairs-down under it. Alt: green stone hut 464,208,32,32. |
| Pressure plate | Backgrounds/Tilesets/TilesetDungeon.png | 0,16,16,16 (red); 16,16,16,16 (pressed) | Fits the "N blobz on a plate" co-op moment. |
| Push block | TilesetDungeon.png | 32,16,16,16 / 48,16,16,16 | |
| Spike trap / grate | TilesetDungeon.png | 64,16,16,16 / 80,16,16,16 | |
| Lock block | TilesetDungeon.png | 0,0,16,16 | Keyhole. Second at 16,0. |
| Switch / lever | TilesetDungeon.png | 32,32,16,32 (on top, off below) | |
| Orbs on pedestals | TilesetDungeon.png | 48,32,80,16 (5 colours) | |
| Pit / hole | Backgrounds/Tilesets/TilesetHole.png | 3x3 pit 0,0,48,48 | Dark hole with brown rim. |
| Door | TilesetHouse.png | wooden doors 400,304,16,16 / 416,304,16,16 | MISSING a dungeon gate: use the stone arch, or Art draws in code. |

## Gaps summary (MISSING)
- Berry item: Items/Food/Nut2.png is the closest. Berry bush: none in the pack; Art's `public/art/props/berry-bush-ninja*.png` fill it.
- Shield item and crossbow: DONE, hand-drawn Ninja-style at `public/art/dungeon/weapons/ninja-shield.png` (12x12) and `ninja-crossbow.png` (16x10), see that folder's README.
- Spin / sidestep skill icons: substitutes listed; draw in code if they read badly.
- Check, home, settings, pause UI icons: draw in code.
- On-screen joystick: Receptacle Sphere substitute.
- XP bar: recolour LifeBarMiniProgress (no dedicated XP bar in the pack).
- Large well (only 16 px wells), dungeon gate.
- "Medium goo": no 32 px slime; scale Slime3 x2 or use GiantSlime (62x52) as a mini-boss.
