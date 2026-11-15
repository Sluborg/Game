# Blobz UI index

Every UI element on every meadow-side screen, with its style system, its source and where it is created. This is
step 1 of the button decision (Stefan 2026-11-15, option A): the menu buttons move to the CSS "Slumpa" style
(thin even border, rounded corners, soft flush shadow, drawn at screen resolution), with an orange primary variant for
Klar / Nytt spel / Starta. Pixel art stays for the world, the icons and the blobs. Step 2 (one standard component
sheet) comes after Stefan has seen this index.

- **Built from:** a computed-style scan of the running game (390x844, Swedish) plus `index.html`, `src/style.css`,
  `src/main.ts` and `src/game.ts` at commit 717670d (on top of deploy 85f9648).
- **Dungeon screens:** Code 2 fills them (see [Dungeon (Code 2)](#dungeon-code-2)).
- **Line numbers:** `file:line` points to where the element is created (markup or code) and to the CSS rule that wins.
  Line numbers drift; the selector is the stable reference.

## Legend

**Style system**
- **CSS**: drawn by CSS (borders, fills, shadows), sharp at any resolution.
- **9-slice**: a pixel image stretched with `border-image` (Ninja Adventure, Theme Wood).
- **Ninja**: a Ninja Adventure image (CC0), whole or cut out by `scripts/ninja_crops.py`.
- **ChatGPT**: a ChatGPT order (N-number, see `docs/ART_ORDERS.md`).
- **Code**: drawn in code (canvas / data URL / Phaser text).

**Status**
- **KIT-A**: styled by the current UI kit A layer (`src/style.css` from line 923).
- **OLD**: still styled by an older layer (the first cream/plum style, lines 1-190, or the Theme Wood layers, lines
  194-922). Not in kit A.
- **DUP**: does the same job as another element but looks different. The other element is named in the row.
- **ARCH**: belongs to an archived feature (`docs/ARCHIVED.md`), hidden in the game today.

**Shorthand for the shared styles** (used in the tables, counted in the [Summary](#summary-distinct-buttonframe-styles))
- `B-PRIMARY`: option A (2026-11-15): the B-SECONDARY geometry in orange. `#f06733` fill, 2 px `#a8461f` border, 4 px
  radius, inner bottom line `#c9521f`, 4 px flush shadow, cream Fredoka 20 bold, same 2 px press (`button.big:not(.alt)`,
  last block of `src/style.css`). Was the Ninja `button_normal.png` 9-slice.
- `B-SECONDARY`: the "Slumpa" style. Parchment `#fbf2da`, 2 px solid `#a87e46` border, 4 px radius, inner
  bottom line `#e4cf9f`, 4 px flush shadow, plum text (`button.big.alt, .chip, #btn-build`, `src/style.css:952`, plus
  `.backbtn` 972, `.kclose` 980, `.pgbtn` 1109, `.edit` 1027).
- `F-PANEL`: Ninja `nine_path_panel_3.png` 9-slice, 6 px frame, parchment `#f6e8c4` inside (`src/style.css:936`; corners
  clean since 61145fb).
- `F-THIN`: CSS 2 px solid `#c9a46a` (`--k-edge`), 4 px radius, parchment `#fbf2da`.

## Official names

Stefan's approved ids (2026-11-15). An element is named `<id>.<element>`, e.g. `home.newGame`, `meadowHud.dash`,
`build.card`. Ordered with 10, 20, 30 so new ones can slot in between.

| Kind | Order | Id | Section |
|---|---|---|---|
| Screen | 10 | loading | [10 loading](#10-loading) |
| Screen | 20 | home | [20 home](#20-home) |
| Screen | 30 | designer | [30 designer](#30-designer) |
| Screen | 40 | lobby | [40 lobby](#40-lobby) |
| Screen | 50 | join | [50 join](#50-join) |
| Screen | 60 | meadow | [60 meadow](#60-meadow) (the world itself; its HUD is `meadowHud`) |
| Screen | 70 | meadowEnd | [70 meadowEnd](#70-meadowend) |
| Screen | 80 | dungeonEnter | [Dungeon (Code 2)](#dungeon-code-2) |
| Screen | 90 | classPick | [Dungeon (Code 2)](#dungeon-code-2) |
| Screen | 100 | dungeon | [Dungeon (Code 2)](#dungeon-code-2) |
| Screen | 110 | dungeonEnd | [Dungeon (Code 2)](#dungeon-code-2) |
| Screen | 120 | dungeonFail | [Dungeon (Code 2)](#dungeon-code-2) (only if it exists) |
| Overlay | 10 | build | [overlay 10 build](#overlay-10-build) |
| Overlay | 20 | levelUp | [Dungeon (Code 2)](#dungeon-code-2) |
| Overlay | 30 | loot | [Dungeon (Code 2)](#dungeon-code-2) |
| Overlay | 40 | bossStrip | [Dungeon (Code 2)](#dungeon-code-2) |
| Overlay | 50 | toast | [overlay 50 toast](#overlay-50-toast) |
| HUD | | meadowHud | [HUD meadowHud](#hud-meadowhud) |
| HUD | | dungeonHud | [Dungeon (Code 2)](#dungeon-code-2) |

## 10 loading

| Name | What | Style system | Source | Created at | Status |
|---|---|---|---|---|---|
| loading.screen | full-screen background | ChatGPT | `#loading` bg `art/start-portrait.png` (N-2), sky `#45b2fc` | index.html:23, style.css:1187 | KIT-A |
| loading.bar | progress bar frame | 9-slice | `.loadbar`, Ninja `Theme Wood/nine_path_bg.png` 2 fill / 6 px | index.html:25, style.css:1189 | DUP (other bar frames are F-THIN: meadowHud.questBar, meadowEnd.bar) |
| loading.fill | progress bar fill | CSS | `#loadfill`, orange `#f08a3c` + inset shadow | index.html:25 | DUP (meadowHud.questBar fill is the Ninja `slider_progress.png` image, meadowEnd.bar fill is plain CSS) |
| loading.text | status line | CSS | `#loading-text`, Fredoka | index.html:26 | KIT-A |

## 20 home

| Name | What | Style system | Source | Created at | Status |
|---|---|---|---|---|---|
| home.background | full-screen background | ChatGPT | `#menu` bg `art/start-portrait.png` (N-2) | style.css:704 | KIT-A |
| home.logo | logo | ChatGPT | `img.logo-img`, `art/logo.png` (N-1), text fallback `.logo-text` | index.html:34, main.ts:193 | KIT-A |
| home.playerCard | card (button: opens the designer) | 9-slice | `#me.me`, F-PANEL | index.html:35, style.css:936 | KIT-A |
| home.playerCard.blob | blob picture | Code | `#preview .blob`, blob.ts data URL (Art's file) | index.html:36 | KIT-A |
| home.playerCard.name | label | CSS | `#me-name`, Fredoka 22 | index.html:37, style.css:826 | KIT-A |
| home.editBlob | icon button (quill) | CSS + Ninja icon | `.me-text .edit`, B-SECONDARY 48x48 + `Items/Resource/feather.png` via `::before` | index.html:37, style.css:1027 / 830 | KIT-A |
| home.newGame | primary button | CSS | `#btn-host.big`, B-PRIMARY | index.html:40 | KIT-A |
| home.join | secondary button | CSS | `#btn-show-join.big.alt`, B-SECONDARY | index.html:41 | KIT-A |
| home.msg | message line | CSS | `#menu-msg.msg` | index.html:42, style.css:942 | KIT-A |
| home.version | version text | CSS | `#version.version` | index.html:45, style.css:834 | KIT-A |
| home.langToggle | segmented toggle (SV / EN) | CSS | `#lang-toggle.langtog`, active = plum fill, 6 px radius, 36x32 (under 48 px) | index.html:46, style.css:622 / 834 | OLD |

## 30 designer

| Name | What | Style system | Source | Created at | Status |
|---|---|---|---|---|---|
| designer.panel | card | 9-slice | `#custom.card`, F-PANEL | index.html:51, style.css:936 | KIT-A |
| designer.preview | blob picture | Code | `#preview2 .blob`, blob.ts | index.html:54 | KIT-A |
| designer.random | secondary button ("Slumpa", the option-A reference) | CSS | `#btn-random.chip`, B-SECONDARY; dice icon `art/icons/ui/dice-16.png` (N-17) hidden (words only) | index.html:55 | KIT-A |
| designer.nameLabel | field label | CSS | `.lbl` | index.html:58, style.css:943 | KIT-A |
| designer.nameField | text field | CSS | `input#name`, F-THIN 48 px | index.html:59, style.css:987 | KIT-A |
| designer.tab | tab (x5) | CSS | `.tab`, F-THIN edge, active joins the panel, inactive darker `#efdcae` and 4 px lower (717670d) | index.html:61-65, style.css:1340 | KIT-A |
| designer.optionsPanel | tab panel | CSS | `#opts.opts`, F-THIN, top border = the tab baseline | index.html:67, style.css:1001 | KIT-A |
| designer.optionTile | selection tile | CSS | `.opt`, 2 px `--k-edge`, fill `#fffaf0` | main.ts:102, style.css:1004 | KIT-A |
| designer.optionTile.selected | selection state | CSS + ChatGPT badge | `.opt.on`: 3 px plum outline + `::after` green tick `art/icons/check.png` (N-10) | style.css:1009 | KIT-A |
| designer.colorSwatch | selection tile (colour) | CSS | `.opt.swatch-opt > i`, colour block 2 px radius | main.ts:89 | KIT-A |
| designer.part.shape | tile picture | Code | blob.ts with neutral face | partArt.ts:81 | KIT-A |
| designer.part.eyes | tile picture | Code | face crop at 4x | partArt.ts:66 | KIT-A |
| designer.part.mouth | tile picture | ChatGPT | `art/icons/mouth-1..5.png` (N-25), 48 px | partArt.ts:82 | KIT-A |
| designer.part.hat | tile picture | Code | isolated hat pixels at 4x | partArt.ts:92 | KIT-A |
| designer.pagerPrev / pagerNext | icon buttons | CSS + ChatGPT icon | `.pgbtn`, B-SECONDARY + `art/icons/ui/back-16.png` (N-17) | index.html:68, style.css:1109 | KIT-A |
| designer.pagerDots | page dots | CSS | `#pg-dots > i`, 10 px dots, plum = current | main.ts:114 | KIT-A |
| designer.done | primary button | CSS | `#btn-custom-done.big`, B-PRIMARY (check icon hidden) | index.html:69 | KIT-A |

## 40 lobby

| Name | What | Style system | Source | Created at | Status |
|---|---|---|---|---|---|
| lobby.background | full-screen background | ChatGPT | `#lobby` bg `art/start-portrait.png` (N-2) | style.css:847 | KIT-A |
| lobby.panel | card | 9-slice | `#lobby .card.lobbycard`, F-PANEL | index.html:87, style.css:936 | KIT-A |
| lobby.back | icon button | CSS + ChatGPT icon | `#btn-leave.backbtn`, B-SECONDARY + back-16 (N-17) | index.html:88 | KIT-A |
| lobby.title | heading | CSS | `#lobby .card h2`, 24 px plum | index.html:89, style.css:941 | KIT-A |
| lobby.platform | picture | ChatGPT | `#lobby-list` bg `art/lobby/party-platform.png` (N-20) at 2x | index.html:90, style.css:1131 / 1324 | KIT-A |
| lobby.seat | joined player | Code | `li.seat` + blob.ts | main.ts:343 | KIT-A |
| lobby.seat.name | name tag | CSS | `.seatname`, 1 px `--k-edge`, 4 px radius, hangs over the platform edge | main.ts:344, style.css:1252 / 1336 | KIT-A |
| lobby.freeSeat | empty seat | ChatGPT + CSS | `span.seat.free`, `art/lobby/waiting-silhouette.png` (N-20) + CSS dashed outline + bob | main.ts:350, style.css:1248 | KIT-A |
| lobby.mapPick | selection cards (meadow / snow) | 9-slice | `.mapcard`, Ninja `button_hover.png` 9-slice + 4 px plum ring; previews use Ninja / winter props | index.html:91, style.css:502-538 | OLD + ARCH (snow map archived, hidden) |
| lobby.villageTag / lanTag | info tags | CSS | `#lobby-village.tag`, `#lobby-lan.tag` | index.html:95-96, style.css:50 / 942 | KIT-A |
| lobby.start | primary button | CSS | `#btn-start.big`, B-PRIMARY | index.html:97 | KIT-A |
| lobby.wait | message line | CSS | `#lobby-wait.msg` | index.html:98 | KIT-A |
| lobby.newVillage | small secondary button | CSS | `#btn-newvillage.chip.newvillage`, B-SECONDARY | index.html:99, style.css:1146 | KIT-A |
| lobby.newVillageAsk | confirm box (overlay in the card) | CSS | `#newvillage-ask.ask`, red bold question, no frame | index.html:100, style.css:495 | OLD |
| lobby.newVillageYes / No | secondary buttons | CSS | `#btn-newvillage-yes/no.chip`, B-SECONDARY | index.html:102 | KIT-A |

## 50 join

| Name | What | Style system | Source | Created at | Status |
|---|---|---|---|---|---|
| join.panel | card | 9-slice | `#join.card`, F-PANEL | index.html:74 | KIT-A |
| join.back | icon button | CSS + ChatGPT icon | `#btn-join-back.backbtn`, B-SECONDARY 56x56 + back-16 (N-17) | index.html:81, style.css:972 | KIT-A |
| join.searching | animated picture | ChatGPT | `#lan-search.lansearch` bg `art/lobby/searching-blob.png` (N-20) | index.html:76, style.css:1153 | KIT-A |
| join.status | status line | CSS | `#lan-status.help`, 17 px plum | index.html:77 | KIT-A |
| join.gameRow | list row button (a found game) | CSS | `.lanrow`, 3 px green `#4caf3a` border, 80 px high, with `.lantext` / `.lansub` | main.ts:255, style.css:1155 / 1017 | DUP (a third button look: green-bordered card, close to build.card `.can`) |
| join.rescan | secondary button | CSS | `#btn-rescan.big.alt`, B-SECONDARY | index.html:79 | KIT-A |
| join.msg | message line | CSS | `#join-msg.msg` | index.html:80 | KIT-A |

## 60 meadow

In-world UI drawn by Phaser (`src/game.ts`).


| Name | What | Style system | Source | Created at | Status |
|---|---|---|---|---|---|
| meadow.nameplate | label under each blob | Code | Phaser text, Fredoka 11 px `#fff8e8`, always on top | game.ts:677 / 764 | KIT-A |
| meadow.youArrow | marker over my blob | ChatGPT | `art/icons/state/you-arrow-16.png` (N-18) at 3x, bobbing | game.ts:269 / 766 | KIT-A |
| meadow.floatGain | "+N" pop-up with resource icon | Code + Ninja | Phaser text Fredoka 26 / 24 `#ffe08a` + item icon | game.ts:1142 / 1187 | KIT-A |
| meadow.pile | pile of items at home | Ninja | item icons | game.ts:967 | KIT-A |
| meadow.portalRing | gather ring on the portal (one segment per player, gold = standing on it, bright sweep = start countdown) | Code | `drawGatherRing` (`src/gatherRing.ts`), plum outline, cream track, gold `#ffc93c`; shared with Code 2's room doors | game.ts portalFrame | KIT-A |
| meadow.plateBubble | "0/1" plate counter | Code | Phaser text bubble | game.ts:1084 | ARCH (puzzle pens) |

## 70 meadowEnd

| Name | What | Style system | Source | Created at | Status |
|---|---|---|---|---|---|
| meadowEnd.background | full-screen background | ChatGPT | `#end` bg `art/victory.png` (N-6) | style.css:38 / 1218 | KIT-A |
| meadowEnd.panel | card | 9-slice | `#end .card`, F-PANEL | index.html:174, style.css:936 | KIT-A |
| meadowEnd.stars | 3 stars | ChatGPT | `img.star`, `art/gather/star(-empty).png` (N-10), 76x68 | main.ts:609, style.css:1165 | KIT-A |
| meadowEnd.team | team blobs | Code | `#end-team .blob` | index.html:176, style.css:1166 | KIT-A |
| meadowEnd.bar | result bar per resource | CSS | `.endrows .qbar` F-THIN 18 px + plain CSS `.qfill` (gold / green) | style.css:1173-1175 | DUP (same job as meadowHud.questBar, different fill) |
| meadowEnd.again | primary button | CSS | `#btn-again.big`, B-PRIMARY | index.html:180 | KIT-A |
| meadowEnd.menu | secondary button with icon | CSS + ChatGPT icon | `#btn-menu.big.alt`, B-SECONDARY + `art/icons/ui/home-16.png` (N-17) | index.html:182 | KIT-A |
| meadowEnd.wait | message line | CSS | `#end-wait.msg` | index.html:181 | KIT-A |
| meadowEnd.mini | mini-game result | Ninja + ChatGPT | `#end-mini`, berry icon + stars | index.html:178 | ARCH (Bärregn) |

## HUD meadowHud

DOM layer over the game (`#hud`, index.html:108).

| Name | What | Style system | Source | Created at | Status |
|---|---|---|---|---|---|
| meadowHud.quest | HUD card | 9-slice | `#hud-quest`, F-PANEL | index.html:109, style.css:936 / 1041 | KIT-A |
| meadowHud.quest.home | icon | Ninja | `art/ninja/hut.png` (Ninja crop) | index.html:110 | KIT-A |
| meadowHud.quest.resIcon | icon | Ninja | `img.qicon`, `art/ninja/res-*.png` (Ninja crops, `src/resArt.ts`) | index.html:111 | KIT-A |
| meadowHud.questBar | progress bar | CSS + Ninja image fill | `.qbar` F-THIN 3 px radius; `.qfill` Ninja `Theme Wood/slider_progress.png` | index.html:111, style.css:1042 / 397 | DUP (fill differs from meadowEnd.bar and loading.fill) |
| meadowHud.questStar | star | ChatGPT | `img.qstar`, `art/gather/star(-empty).png` (N-10), empty one tinted cream | index.html:111, style.css:1261 | KIT-A |
| meadowHud.questBuild | build goal row | ChatGPT + Ninja | `#q-build.qbuild`: building image + state badge | index.html:114, main.ts:487, style.css:484 / 641 | OLD (no kit A rule; hidden unless a build goal is active) |
| meadowHud.bank | HUD card (team store) | 9-slice | `#hud-bank`, F-PANEL + Ninja res icons | index.html:117, style.css:936 | KIT-A |
| meadowHud.edgeArrow | off-screen pointer | CSS | `.edge`, 46 px cream disc + 3 px plum ring (`box-shadow`); `.edge.home` orange | game.ts:918, style.css:488-492 | OLD |
| meadowHud.build | secondary button with icon | CSS + ChatGPT icon | `#btn-build.chip`, B-SECONDARY + `art/icons/ui/hammer-16.png` (N-17); `.can` = yellow glow | index.html:135, style.css:952 / 1037 | KIT-A |
| meadowHud.dash | round action button | ChatGPT + CSS | `#dash`: ring `art/dungeon/ui/btn-round-normal-24.png` (N-19b) at 72 px + plum disc + `art/icons/ui/dash-16.png` (N-24) | index.html:148, style.css:1300 | KIT-A (round-button family, shared with the dungeon `#attack`) |
| meadowHud.stick | thumbstick | Ninja | `#stick` / `#knob`, `Ui/Receptacle/Receptacle Sphere/BackgroundWood.png` + `ProgressYellow.png` | index.html:140, style.css:248 | OLD |
| meadowHud.day | day bar | 9-slice + Ninja | `#hud-day`, `nine_path_bg.png` + slider + `Meteo/Sun.png` | index.html:116 | OLD + ARCH (day cycle) |
| meadowHud.mini | mini-game HUD | 9-slice | `#mini-hud`, F-PANEL; bar `nine_path_bg.png` + slider; timer CSS | index.html:124 | ARCH (Bärregn) |
| meadowHud.miniIntro | intro card | CSS | `#mini-intro`, 14 px radius cream + 4 px plum ring | index.html:130 | OLD + ARCH |
| meadowHud.miniSkip | secondary button | CSS | `#btn-skip-mini.chip`, B-SECONDARY | index.html:134 | KIT-A + ARCH |

## Overlay 10 build

| Name | What | Style system | Source | Created at | Status |
|---|---|---|---|---|---|
| build.open | secondary button | CSS | = meadowHud.build | index.html:135 | KIT-A |
| build.panel | dialog card | 9-slice | `#build-panel`, F-PANEL | index.html:136, style.css:936 / 1034 | KIT-A |
| build.title | heading | CSS | `.bphead b`, 24 px plum | index.html:137 | KIT-A |
| build.close | square icon button | CSS + ChatGPT icon | `#btn-build-close.kclose`, B-SECONDARY 56x56 + `art/icons/ui/close-16.png` (N-17) | index.html:137, style.css:980 | KIT-A |
| build.card | selection card (button) | CSS | `.bcard`, F-THIN; `.can` = 3 px green `#4caf3a`; tap bounce | main.ts:421, style.css:1073 | KIT-A |
| build.card.picture | building picture | Ninja | `.bimg img`, `art/ninja/*.png` (Ninja crops) in a 64 px box | main.ts:421 | KIT-A |
| build.card.cost | cost strip | CSS + Ninja icons | `.bcost`, 2 px `#e4cf9f` top line; `.c.ok` / `.c.no` | main.ts:476, style.css:1077 | KIT-A |
| build.card.state | badge | ChatGPT | `img.bstate`, `art/icons/state/can-build-16.png` / `lock-16.png` (N-18) at 2x | main.ts:415, style.css:1084 | KIT-A |

## Overlay 50 toast

| Name | What | Style system | Source | Created at | Status |
|---|---|---|---|---|---|
| toast.hint | toast | CSS | `#hint`, plum `rgba(63,38,49,.9)` box, light text | index.html:149, style.css:162 / 259 / 334 | OLD |

## Dungeon (Code 2)

Code 2 fills these ids: screens 80 dungeonEnter, 90 classPick, 100 dungeon, 110 dungeonEnd, 120 dungeonFail (if it
exists), overlays 20 levelUp, 30 loot, 40 bossStrip, and the HUD dungeonHud. Elements today: class pick (`#weapon-pick`, index.html:153), dungeon HUD (`#hud-dg`, `#dg-ko`, `#dg-cards`,
`#dg-loot`, `#dg-boss`, `#attack`), dungeon end (`#dg-end`, index.html:162) and the in-world dungeon UI
(`src/dungeonScene.ts`, `src/dungeonUi.ts`, `src/dungeon.css`). From the meadow scan only, for orientation:
- **Frames:** the dungeon cards use a dark-wood CSS frame (6 px `#2a1810` border + 2 px `#7a4b2a` ring).
- **Buttons:** `#dg-roll` is still the old Ninja `button_normal` 9-slice (Code 2's `dungeon.css`), not yet option A; `#dg-pass` is a cream CSS button with a different edge
  (`#b88b55`). `#attack` uses the round ring (N-19b), like meadowHud.dash.

## Scale audit (2026-11-15)

Stefan: art must never lose pixels across screen sizes (integer scale only). Measured in Chromium at **360, 390 and 412
px** wide portrait (844 tall): every visible DOM image, background and 9-slice frame (computed sizes) and the Phaser
camera zoom. Docs only, nothing changed. "Factor" = displayed CSS px per art px.

**The device-pixel catch (read first).** Stefan's Pixel renders at a device-pixel ratio of about **2.625** (his
screenshots are 1080 px for 411 CSS px). So even an icon at an exact **3x in CSS is 7.875 device px per art px**: the
phone still has to round, some art pixels come out 7 device px wide and some 8. Integer CSS factors are only truly
crisp on 1x / 2x / 3x screens. Real "never loses pixels" means an integer number of **device** pixels per art pixel.
Proposed rule:
- read `devicePixelRatio` at start;
- size pixel art in device px (e.g. one art px = 8 device px = 3.048 CSS px on the Pixel);
- render the Phaser canvas at the device resolution too (today it renders at CSS resolution, 1 canvas px = 1 CSS px,
  and the browser stretches it by 2.625).

### World (Phaser canvas): the biggest item

| What | Native | Factor 360 / 390 / 412 | Why |
|---|---|---|---|
| all meadow art (props at 3x, items at 2x, blobz) | 16 px tiles | 3x times zoom 0.837 / 0.907 / 0.958 = **2.51 / 2.72 / 2.87** CSS px per art px | `fitCamera` zoom = min(max(w,h)/820, min(w,h)/430); never an integer |
| the same, in device px (Pixel, 2.625) | | 6.6 / 7.1 / 7.5 device px per art px | canvas is drawn at CSS resolution and stretched by the browser |

- **Snapping rule (proposed):** zoom = max(1, round(3 * rawZoom)) / 3. That gives zoom 1 on all three widths, so every
  art px is exactly 3 CSS px.
- **Cost:** about 10% less world on screen (390 x 844 world px instead of 430 x 930).
- **Device level:** also set the Phaser resolution to `devicePixelRatio` and pick the zoom so an art px is a whole
  number of device px.

### DOM art at a non-integer factor

| Element (UI_INDEX name) | File | Native | Displayed 360 / 390 / 412 (CSS px) | Factor | Native size (or rule) for an exact integer on all three |
|---|---|---|---|---|---|
| lobby.platform | `art/lobby/party-platform.png` | 160x32 | 284 / 314 / 324 wide | 1.78 / 1.96 / 2.03 | **140x28** at 2x = 280 px (fits all three panels); or rule: floor(width / 160), centred (1x at 360, 2x at 390 / 412) |
| home.background, lobby.background | `art/start-portrait.png` | 941x1672 | cover, 475x844 | 0.505 | ChatGPT art has **no clean pixel grid** (resampled), so no integer exists. Order a native **240x430** pixel picture at 2x (480x860 covers all three, centred) |
| meadowEnd.background | `art/victory.png` | 941x1672 | cover, 475x844 | 0.505 | same: native **240x430** at 2x |
| home.logo | `art/logo.png` | 672x464 | 317 / 343 / 363 wide | 0.47 / 0.51 / 0.54 | no clean grid; native **150x104** at 2x = 300 px (fits all three) |
| loading.screen, dungeonEnd (Code 2) | `art/loading-portrait.png`, `art/dungeon-end.png` | 941x1672 | cover | 0.505 | same as the backgrounds |
| F-PANEL frames (all cards, HUD boxes) | `nine_path_panel_3.png`, slice 6 5 5 6 / 6px | 16x16 | right and bottom 5 px slices drawn 6 px | 1.0 (left/top) / **1.2** (right/bottom) | CSS only: `border-image-width: 6px 5px 5px 6px` (1x everywhere), or slice 6 on all sides |
| meadowHud.quest wood, bank wood, build cost wood, edge arrow | `art/icons/res-wood-32.png` | 32x32 | 20 / 17 / 16 / 18 | 0.62 / 0.53 / 0.50 / 0.56 | use **res-wood-16.png** at 1x (16 px) everywhere, or 2x (32 px) where there is room |
| meadowHud.quest food, bank food | `art/ninja/res-berry.png` | 15x15 | 20 / 17 | 1.33 / 1.13 | 1x (15) or 2x (30) |
| meadowHud.quest.home, edge home | `art/ninja/hut.png` | 47x32 | 32x22 | 0.69 | order a **16x16** hut icon (2x = 32 px) |
| meadowEnd.bar star | `art/gather/star.png` | 19x17 | 24x22 | 1.26 | 1x (19) or 2x (38) |
| meadowHud.build hammer | `art/icons/ui/hammer-16.png` | 16x16 | 52.9 / 48.2 / 51.2 | 3.30 / 3.01 / 3.20 | CSS only: the chip's flex sizing stretches the 48 px icon; pin it to 48x48 |
| meadowHud.questBuild picture / badge | `art/ninja/bridge.png`, hammer-16 | 64x46, 16x16 | 33x24, 19-20 | 0.52, 1.2-1.27 | 1x picture (64x46) or a 16 px icon at 2x (32) |
| designer.preview | blob grid (code) | 20x20 grid (120 px image) | 115.5 | **5.77** | 6x = 120 px (or 5x = 100 px) |
| lobby.seat blob | blob grid | 20x20 | 50.7 / 60.9 / 62.2 (breathing) | 2.54 / 3.04 / 3.11 | fixed 60 px (3x); 2x at 360 if the column is narrower (floor, centred) |
| home.playerCard blob | blob grid | 20x20 | 60 / 62 / 62 (breathing) | 3.0-3.1 | already 3x; the breathing squash briefly makes it uneven (by design) |
| meadowHud.stick, knob | Ninja Receptacle 32 / 22 | | 120 / 52 | 3.75 / 2.36 | 128 px (4x) / 44 px (2x) |
| dungeon hearts, coin, item slot, cell (Code 2) | see ICON_INDEX #34, #35, #40, #44 | | | 1.71 / 0.6 strip / 1.5 / 1.88 | 2x of the native (or the first coin frame at 2x) |

### Already exact (integer at all three widths)

- **Icons at 2x:** tick badge, can-build / lock badges, dungeon move icon.
- **Icons at 3x:** quill, back chevron, close, home, dash symbol and ring, mouths, searching blob.
- **Build-card pictures:** 1x / 2x / 3x.
- **Stars:** quest star 1x, end-screen stars 4x.
- **Other:** the designer tick badge, and the designer blob tiles (3x).

### Snapping rule (proposed, one rule for all pixel art)

- **Fit:** factor = the largest whole number k with native x k <= the space available (at least 1), centred in that
  space. Never stretch to fill.
- **Full-screen pictures:** pixel-art originals at a small native size, shown at the smallest whole k that covers the
  screen, centred and cropped.
- **Where it must fill a width** (the platform): order native art sized so 2x fits the narrowest phone (360 px wide:
  about 284 px available).
- **Crisp on the phone itself:** compute k in device px (k / devicePixelRatio CSS px).

## Summary: distinct button/frame styles

Counted per element row in the meadow-side sections above (a tab set or a tile grid counts once). The dungeon is not
counted.

**Buttons**

| Style | Looks like | System | Places | Where | Note for option A |
|---|---|---|---|---|---|
| B-PRIMARY | orange "Slumpa" geometry (option A, done 2026-11-15) | CSS | 4 | home.newGame, designer.done, lobby.start, meadowEnd.again | done: no pixel image left on a menu button |
| B-SECONDARY | "Slumpa": parchment, 2 px wood edge, 4 px radius, flush shadow | CSS | 15 | home.join, home.editBlob, designer.random, designer.pagerPrev/Next (2), join.back, join.rescan, lobby.back, lobby.newVillage, lobby.newVillageYes, lobby.newVillageNo, meadowHud.build (= build.open), build.close, meadowEnd.menu, meadowHud.miniSkip (ARCH) | already the target style |
| Tab | joined tab, darker inactive | CSS | 1 (5 tabs) | designer.tab | kit A, matches the target family |
| Selection tile | white tile, plum outline + green tick when chosen | CSS | 2 | designer.optionTile, designer.colorSwatch | kit A |
| Build card | parchment card, green 3 px border when buildable | CSS | 1 | build.card | kit A |
| Game row | green 3 px bordered row | CSS | 1 | join.gameRow | DUP of the build card "can" look |
| Language pill | small plum-filled segment, 32 px high | CSS | 1 | home.langToggle | OLD, under 48 px |
| Map card | Ninja `button_hover` 9-slice + plum ring | 9-slice | 1 | lobby.mapPick | OLD + ARCH |
| Round ring | ChatGPT N-19b ring + plum disc + icon | ChatGPT | 1 (+1 dungeon) | meadowHud.dash (+ `#attack`) | pixel art, stays (action button) |

**Frames, bars and toasts**

| Style | Looks like | System | Places | Where | Note |
|---|---|---|---|---|---|
| F-PANEL | Ninja `nine_path_panel_3`, 6 px | 9-slice | 9 | home.playerCard, designer.panel, join.panel, lobby.panel, build.panel, meadowEnd.panel, meadowHud.quest, meadowHud.bank, meadowHud.mini (ARCH) | the kit A frame |
| F-THIN | 2 px `#c9a46a` CSS line | CSS | 6 | designer.nameField, designer.optionsPanel, designer.tab, meadowHud.questBar frame, meadowEnd.bar frame, build.card (+ 1 px lobby.seat.name) | kit A inner frame |
| Bar fill: Ninja image | `slider_progress.png` | Ninja | 3 | meadowHud.questBar, meadowHud.day (ARCH), meadowHud.mini (ARCH) | DUP with the CSS fills |
| Bar fill: CSS | flat colour | CSS | 2 | meadowEnd.bar, loading.fill | DUP with the image fill |
| F-BG | Ninja `nine_path_bg` 9-slice | 9-slice | 3 | loading.bar, meadowHud.day (ARCH), meadowHud.mini bar (ARCH) | DUP of F-THIN for bars |
| Plum toast / disc | dark plum box or cream disc with plum ring | CSS | 4 | toast.hint, meadowHud.edgeArrow, meadowHud.miniIntro (ARCH), lobby.newVillageAsk (no frame) | OLD |
| Thumbstick | Ninja receptacle sphere | Ninja | 1 | meadowHud.stick | OLD, pixel art (stays as a world control) |

**Bottom line**
- **Buttons:** option A is in: B-PRIMARY (4 places) and B-SECONDARY (15 places) are one CSS family (orange / cream).
  Tabs, tiles and the build card belong to it too. Pixel frames left on buttons: home.playerCard (the F-PANEL card
  frame), the archived map cards and the dungeon `#dg-roll` (Code 2).
- **Leftovers (OLD):** the language pill, the map card (archived), the edge arrows, the hint toast, the "new village"
  confirm box, the build-goal row and the thumbstick.
- **Duplicates (DUP):** three different bar fills (Ninja image, flat CSS, loading orange), two bar frames (F-THIN and
  F-BG), and the green-bordered join row next to the build card.
