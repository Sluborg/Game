# UI index: dungeon (Code 2)

The dungeon part of the UI index (menus + meadow: `UI_INDEX.md` by Code; Lead merges the two). One row per element.

- **Name**: `<id>.<element>` with the official UI ids (Stefan 2026-11-15): screens **80 dungeonEnter**, **90 classPick**,
  **100 dungeon**, **110 dungeonEnd**, **120 dungeonFail** (does not exist, see below); overlays **20 levelUp**, **30 loot**,
  **40 bossStrip**, **50 toast**; HUD **dungeonHud**. Use these names in board questions and orders.
- **Type**: button / tab / card / chip / selection / HUD / badge / panel / overlay / text.
- **Style system**: CSS-drawn | pixel 9-slice image | Ninja image | ChatGPT image | code-drawn canvas (Phaser).
- **Source**: CSS selector + image path + origin (Ninja = Ninja Adventure CC0 under `public/assets/ninja-adventure/`;
  ChatGPT N-x = the order in `docs/ART_ORDERS.md`, files under `public/art/`).
- **File:line**: where it is styled / built (`src/dungeon.css` unless noted; markup in `index.html`, logic in
  `src/dungeonUi.ts`, in-world pieces in `src/dungeonScene.ts`).
- **Status**: **KIT-A** = UI kit A dark-wood variant (parchment inside, one dark-wood frame, calm press, green tick
  selection, words only, Fredoka >= 14 px); **OLD** = not on the kit yet / legacy; **DUP** = styled in more than one
  place (later rules override earlier ones; candidates for clean-up, no visual change intended).

Kit A dark-wood tokens: `src/dungeon.css:8-19` (`--dw-wood`, `--dw-wood-hi`, `--dw-parch`, `--dw-parch-2`, `--dw-edge`,
`--dw-gold`, ...). Shared panel frame: `src/dungeon.css:26` + title band `:256-264`.

## 90 classPick (screen, before going down)

| Name | Type | Style system | Source | File:line | Status |
|---|---|---|---|---|---|
| classPick.screen | overlay | CSS-drawn | `#weapon-pick` dark backdrop `#120a07ee`; `body.dgpick` hides the whole meadow HUD | dungeon.css:131, 253, 252; dungeonUi.ts:335 | KIT-A, DUP (131 + 253) |
| classPick.panel | panel | CSS-drawn | `#weapon-pick .card` parchment + 6 px dark-wood frame | dungeon.css:26, 256; index.html:153 | KIT-A, DUP (26 + 256) |
| classPick.title | text | CSS-drawn | `#weapon-pick .card h2` dark title band, cream text 22 px ("Välj klass") | dungeon.css:260 | KIT-A |
| classPick.card | card | CSS-drawn | `.wcard` parchment tile, 2 px quiet edge, calm press | dungeon.css:33, 134-150; dungeonUi.ts:57 | KIT-A, DUP (33 + 134) |
| classPick.card.art | image | ChatGPT image | `.wcard .cardimg` = `art/dungeon/card-class-{healer,rogue,tank,marksman}.png` (ChatGPT N-5 / N-5b) | dungeon.css:136; dungeonUi.ts:65 | KIT-A |
| classPick.card.selected | selection | CSS-drawn + ChatGPT image | `.wcard.on` 3 px plum outline + tick `art/icons/state/tick-green-16.png` (ChatGPT N-18) at 2x | dungeon.css:38-43; dungeonUi.ts:80 | KIT-A |
| classPick.card.name / hint | text | CSS-drawn | `.wcard b` 18 px, `.wcard small` 14 px | dungeon.css:141-142 | KIT-A |
| classPick.card.back | card | CSS-drawn | `.wcard .back` arrow tile (weapon step; never shown now: one weapon per class) | dungeon.css:139, 150 | OLD, DUP |
| classPick.card.weapon | image | Ninja image | `.wcard img.wpnimg` = Ninja `Items/Weapons/*/Sprite.png` (weapon step; never shown now) | dungeon.css:138; dungeonUi.ts:74 | OLD |
| classPick.wait | text | CSS-drawn | `#pick-wait` "Tryck på en klass" / "Väntar på kompisar n/m" (no timer) | dungeon.css:143; dungeonUi.ts:342 | KIT-A |

## dungeonHud (HUD, top-left; the KO banner is the 50 toast overlay)

| Name | Type | Style system | Source | File:line | Status |
|---|---|---|---|---|---|
| dungeonHud.panel | HUD | CSS-drawn | `#hud-dg` dark wood plate `#2a1810e6`, 4 px frame, cream text; compact in landscape | dungeon.css:58, 275-286; index.html:142 | KIT-A, DUP (58 + landscape 275) |
| dungeonHud.heart | HUD | Ninja image | `#dg-hearts::before` = Ninja `Ui/Receptacle/IconHeart.png` | dungeon.css:65, 277 | KIT-A |
| dungeonHud.hpBar | HUD | CSS-drawn | `.hpbar` dark track + red fill (`.low` blinks); numbers `.hpnum` | dungeon.css:69-74 | KIT-A |
| dungeonHud.gold | HUD | Ninja image | `#dg-row img.icon` = Ninja `Items/Treasure/Coin2.png` frame 0 (object-fit crop) + `#dg-gold` (pops up) | dungeon.css:76, 281, 247; dungeonUi.ts:124 | KIT-A, DUP (76 + 281) |
| dungeonHud.floor | HUD | CSS-drawn | `#dg-floor` "Grotta 1 · Våning 2/5" | dungeon.css:77, 279; dungeonUi.ts:134 | KIT-A |
| dungeonHud.time | HUD | CSS-drawn | `#dg-time` (hidden: `DUNGEON_TIMER_ENABLED` off) | dungeon.css:77-78; dungeonUi.ts:136 | OLD (archived) |
| dungeonHud.level | badge | CSS-drawn | `#dg-level` gold disc with the level number (pops up) | dungeon.css:80, 282 | KIT-A |
| dungeonHud.xpBar | HUD | CSS-drawn | `#dg-xp .xpbar` + `#dg-xpfill` orange | dungeon.css:69, 84-85 | KIT-A |
| dungeonHud.item | HUD | Ninja image + ChatGPT image | `#dg-item` square wood cell = Ninja `Ui/Theme/Theme Wood/inventory_cell.png` + item icon `art/dungeon/items/<id>.png` (ChatGPT N-23) | dungeon.css:87, 284; dungeonUi.ts:289 | KIT-A |
| toast.ko | panel | CSS-drawn | `#dg-ko` "Knockad! Tillbaka om N" in the dark-wood panel | dungeon.css:26, 93, 265; index.html:147 | KIT-A, DUP (93 + 265) |

## dungeonHud: round combat buttons + stick (bottom-right / thumb)

| Name | Type | Style system | Source | File:line | Status |
|---|---|---|---|---|---|
| dungeonHud.action | button | ChatGPT image | `#attack` N-19b ring `art/dungeon/ui/btn-round-{normal,pressed}-24.png` at 3x = 72 px (ChatGPT N-19b) | dungeon.css:97-104 (sizes in the N-23 block near the end) | KIT-A, DUP (old 64 px ring rules overridden) |
| dungeonHud.action.symbol | button | ChatGPT image | `#attack-icon`: healer `art/dungeon/icons/{damage,heal}-mode-16.png` (N-12), rogue/marksman/knight `art/dungeon/weapons/{dagger,crossbow,shield}-16.png` (N-11) at 3x | dungeon.css:103; dungeonUi.ts:158 | KIT-A |
| dungeonHud.action.cooldown | HUD | CSS-drawn | `#attack::after` conic sweep (plum 55%) | dungeon.css:106 | KIT-A |
| dungeonHud.move | button | ChatGPT image + CSS-drawn | `#dash` underground: N-19b ring `art/dungeon/ui/btn-round-{normal,pressed,disabled}-18.png` at 3x = 54 px + dark centre disc (CSS radial) | dungeon.css:111-121, 316-318 | KIT-A, DUP (111 + 316) |
| dungeonHud.move.symbol | button | ChatGPT image | `#dash img` = `art/dungeon/icons/{dodge,jump-back,shield-charge,phase-out}-16.png` (ChatGPT N-12) at 2x | dungeonUi.ts:168 | KIT-A |
| dungeonHud.move.cooldown | HUD | CSS-drawn | `#dash::after` conic sweep | dungeon.css:106, 116 | KIT-A |
| dungeonHud.move.pips | badge | CSS-drawn | `.dg-pips i` rogue charge dots (gold = ready) | dungeon.css:123-125; dungeonUi.ts:170 | KIT-A |
| dungeonHud.stick | HUD | Ninja image | `#hud.dungeon #stick` = Ninja `Ui/Receptacle/Receptacle Sphere/BackgroundWood.png`, `#knob` = `.../ProgressWhite.png` | dungeon.css:127-128; index.html:140 | OLD (Ninja, not kit A) |

## 20 levelUp (overlay: 1 of 3 skills)

| Name | Type | Style system | Source | File:line | Status |
|---|---|---|---|---|---|
| levelUp.panel | panel | CSS-drawn | `#dg-cards` parchment + dark-wood frame; portrait top, landscape top-left under the HUD | dungeon.css:26, 154-155, 168, 293, 312 | KIT-A, DUP (5 rules) |
| levelUp.title | text | CSS-drawn | `#dg-cards-title` dark band "Nivå 2! Välj en" | dungeon.css:260, 270 | KIT-A |
| levelUp.card | card | CSS-drawn | `.skcard` parchment tile, calm press | dungeon.css:33, 157; dungeonUi.ts:202 | KIT-A, DUP |
| levelUp.card.badge | badge | CSS-drawn + ChatGPT image | `.skcard .dgicon` round badge in the class colour (`.skcard[data-cls]`), gold rim + `art/dungeon/skills/<id>.png` (ChatGPT N-23) at 3x | dungeon.css:298-307; dungeon.ts skillIcon() | KIT-A, DUP (158/169 older badge rules) |
| levelUp.card.selected | selection | CSS-drawn + ChatGPT image | `.skcard.on` plum outline + N-18 tick, bounce | dungeon.css:38-43, 243 | KIT-A |
| levelUp.card.text | text | CSS-drawn | `.skcard b` 16 px name, `.skfx` 14 px green effect | dungeon.css:159-160 | KIT-A |
| levelUp.safe | text | CSS-drawn | `#dg-cards-safe` "Du är skyddad tills du väljer" | dungeon.css:161 | KIT-A |
| levelUp.bar | HUD | CSS-drawn | `.dgbar` orange countdown bar (unused: no timer) | dungeon.css:165-166 | OLD |

## 30 loot (overlay: rare item, roll / pass)

| Name | Type | Style system | Source | File:line | Status |
|---|---|---|---|---|---|
| loot.panel | panel | CSS-drawn | `#dg-loot` parchment + dark-wood frame; portrait docked above the round buttons, landscape bottom-centre | dungeon.css:26, 154, 173, 189, 268, 290-292, 313 | KIT-A, DUP (7 rules) |
| loot.title | text | CSS-drawn | `#dg-loot-title` dark band "Ny skatt!" / result line | dungeon.css:260, 270 | KIT-A |
| loot.item | card | Ninja image + ChatGPT image | `.lootnew .dgicon` 64 px in the square wood cell (Ninja `inventory_cell.png`) + `art/dungeon/items/<id>.png` (ChatGPT N-23); name 20 px + effect 14 px | dungeon.css:176-180, 191; dungeonUi.ts:229 | KIT-A, DUP (176 + 191) |
| loot.replaces | text | ChatGPT image | `.lootrep` "Byter ut din [icon] X" / "Du har redan den" (24 px N-23 icon) | dungeon.css:181-183; dungeonUi.ts:233 | KIT-A |
| loot.roll | button | pixel 9-slice image | `#dg-roll` primary orange = Ninja `Ui/Theme/Theme Wood/button_normal.png` 9-slice (6 px), "Använd" / "Rulla" | dungeon.css:46-50 | KIT-A |
| loot.pass | button | CSS-drawn | `#dg-pass` secondary: cream + plum text + quiet edge, "Avstå" | dungeon.css:52-55 | KIT-A |
| loot.msg | text | CSS-drawn | `#dg-loot-msg` 14 px roll list | dungeon.css:186 | KIT-A |

## 40 bossStrip (overlay: top, while the boss is on the floor)

| Name | Type | Style system | Source | File:line | Status |
|---|---|---|---|---|---|
| bossStrip.strip | HUD | CSS-drawn | `#dg-boss` (hidden while picking a level-up card) | dungeon.css:203, 217; dungeonUi.ts:281, 295 | KIT-A, DUP (portrait + landscape) |
| bossStrip.emblem | badge | ChatGPT image | `.dg-boss-emblem` = `art/dungeon/ui/boss-emblem.png` (ChatGPT N-21) at 3x | dungeon.css:207 | KIT-A |
| bossStrip.name | text | CSS-drawn | `#dg-boss-name` "Jätteslemmet" / "Giant Slime" | dungeon.css:209 | KIT-A |
| bossStrip.bar | HUD | ChatGPT image + CSS-drawn | `.dg-boss-bar` frame = `art/dungeon/ui/boss-bar-frame.png` (ChatGPT N-21) at 2x, fill `#dg-boss-fill` CSS red | dungeon.css:210-213, 218 | KIT-A |

## 110 dungeonEnd (screen)

| Name | Type | Style system | Source | File:line | Status |
|---|---|---|---|---|---|
| dungeonEnd.screen | overlay | ChatGPT image | `#dg-end.screen` background `art/dungeon-end.png` / `art/dungeon-end-landscape.png` (ChatGPT N-22) | dungeon.css:232-234; index.html:162 | KIT-A |
| dungeonEnd.panel | panel | CSS-drawn | `#dg-end .card` parchment + dark-wood frame + title band "Dungeon klar!" | dungeon.css:26, 196, 256, 266 | KIT-A, DUP |
| dungeonEnd.why | text | CSS-drawn | `#dg-end-why` (boss / exit) | dungeonUi.ts:114 | KIT-A |
| dungeonEnd.stats | text | Ninja image | `.dgstat` gold (Ninja `Coin2.png` crop), level, monsters | dungeon.css:198-199; index.html:165-167 | KIT-A |
| dungeonEnd.back | text | CSS-drawn | `#dg-end .tag` "Tillbaka till ängen..." | dungeon.css:200 | KIT-A |

## 80 dungeonEnter + 100 dungeon (screen: entry, in-world pieces, flow)

| Name | Type | Style system | Source | File:line | Status |
|---|---|---|---|---|---|
| dungeonEnter.loading | overlay | ChatGPT image | `#dg-loading` ~2 s dusk cave `art/loading-portrait.png` / `art/loading-landscape.png` + "In i grottan..." chip; never blocks taps | dungeon.css:222-229; dungeonUi.ts:285, 308 | KIT-A |
| dungeon.hideMeadow | overlay | CSS-drawn | `body.dgflow #hud > :not(...)` hides the meadow HUD underground | dungeon.css:252; dungeonUi.ts:335 | KIT-A |
| dungeon.juicePop | overlay | CSS-drawn | `@keyframes dgpop` (cards, loot, KO, end, boss strip pop in), `dgpick`, `dgbump` (HUD numbers) | dungeon.css:239-249 | KIT-A |
| dungeon.floorBanner | text | code-drawn canvas | Phaser text "Grotta 1 · Våning 2" (Fredoka, yellow, plum stroke) | dungeonScene.ts:290 | OLD (not kit A styling) |
| dungeon.floatText | text | code-drawn canvas | Phaser text: +gold, level, heart, item name | dungeonScene.ts:676 | OLD |
| dungeon.lifeBar | HUD | Ninja image | monster / friend life bars = Ninja `Ui/Receptacle/LifeBarMiniUnder.png` + `LifeBarMiniProgress.png` | dungeonScene.ts:690 | OLD (Ninja, not kit A) |
| dungeon.koStars | overlay | ChatGPT image | `art/dungeon/fx/ko-stars.png` strip (ChatGPT N-13) over a knocked-out blob | dungeonScene.ts:427 | KIT-A |
| dungeon.hazardRing | overlay | ChatGPT image | `art/dungeon/ui/hazard-ring.png` strip (ChatGPT N-21) = the boss slam's reach | dungeonScene.ts:731 | KIT-A |
| dungeon.landingWarning | overlay | ChatGPT image | `art/dungeon/fx/slam-warning.png` (ChatGPT N-13) where a dash / bite lands | dungeonScene.ts:749 | KIT-A |
| dungeon.telegraph | overlay | Ninja image | red chevrons / purple aura / orange dots = Ninja `FX/Elemental/Thunder`, `FX/Magic/Aura`, `FX/Particle/Spark` tinted (hostile palette) | dungeonScene.ts:723 | OLD (Ninja FX) |
| dungeon.wandGlow | overlay | code-drawn canvas | healer wand tip glow + bolts (red damage / green heal circles) | dungeonScene.ts:641 | OLD (code-drawn) |
| dungeon.modeBurst | overlay | code-drawn canvas | burst dots when the healer switches mode | dungeonScene.ts:889 | OLD (code-drawn) |
| dungeon.levelUpFx | overlay | ChatGPT image | `art/dungeon/fx/levelup.png` (ChatGPT N-13) on every blob | dungeonScene.ts:859 | KIT-A |

## 120 dungeonFail: does not exist

There is no separate team-wipe / fail screen. A knocked-out blob comes back by itself after a few seconds (kid-safe:
auto-revive, no fail state), even when the whole team is down at once; the floor and the run go on. A run ends only
at the exit (floor 1 stairs up, "Ni klev upp ur grottan") or by beating the boss (floor 5); both show 110 dungeonEnd.
The time-out end ("Tiden tog slut") is archived with the dungeon clock (`DUNGEON_TIMER_ENABLED` off).

## Notes for the merge

- DUP rows are layered history in `src/dungeon.css`: the file grew in passes (kit A rewrite, then fixes appended at
  the end). Folding each element into one rule is a pure clean-up, no visual change; ask Code 2 when wanted.
- OLD rows that are visible today: the stick (Ninja wood sphere), the in-world floor banner and float texts (Phaser
  text), monster life bars (Ninja), the Ninja telegraph FX and the code-drawn wand glow / bolts.
