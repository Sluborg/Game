# Review 1: Blobz look review (live build v047c)

Source: external AI, pasted by Stefan 2026-11-15. Played live at 390x844 and 844x390, ~70 screens, solo.
Not seen: lobby with 2-5 players, populated Join list, Snow map, floor 3 boss.
Note (Lead): already changed since v047c: day timer removed (v047d), home blob now small in a box (v047d),
dungeon classes/moves rework pending (v048).

**Verdict:** the meadow world and the big illustrations are charming, but the UI is three different skins and the
pixel sizes are mixed, so it reads as a good prototype, not a finished kids' game.

## 1 Loading (pretty 4 / intuitive 4 / consistent 3)
- Mood mismatch: dusk forest, then bright noon everywhere else -> sunrise/daytime repaint in the home palette. [consistency]
- Dead space: bottom 35-40% empty dark grass -> anchor art to the bottom, centre logo and bar. [art]
- Hidden cast: landscape logo covers two of five blobs -> move logo left or shrink 20%. [art]
- Plain bar: flat rectangle -> Theme Wood frame with a blob walking along it. [ui]

## 2 Home (4 / 3 / 3)
- Giant blob (~12 px per pixel vs art ~2 px) covers the cottage -> cap at 6x, stand on a wood plinth. [consistency]
- Sliced art: New game cuts the pink blob, name chip hides the blue one -> clear strip for buttons, cast above it. [art]
- Wordy buttons, Join looks disabled -> play and Wi-Fi icons, Join in brown wood. [ui]
- Floating text: version and SV/EN low contrast -> one small wood chip in a corner, with flags. [readability]

## 3 Blob designer (3 / 3 / 3)
- White fill clashes with pixel art (every panel) -> parchment or light wood fill. [consistency]
- Word tabs, 11 px -> 48 px icon tabs (silhouette, paint drop, eye, mouth, hat). [readability]
- Tiny options (~30 px), eye/mouth variants look identical -> 64 px tiles with the face zoomed. [ui]
- Hat hits title (tall shape + crown) -> headroom or drop the title. [ui]
- Clipped grid: hat rows cut by Done (portrait), under tabs (landscape) -> fixed panel height + paging arrows. [ui]

## 4 Lobby and Join (2 / 3 / 3)
- No party feel -> five slots with 64 px blobs and "waiting" silhouettes. [ui]
- Dead Join: grey 13 px text -> animated searching blob, games as big blob cards. [ui]
- Two back styles (chevron vs underlined link) -> chevron chip top-left everywhere. [consistency]
- New village right under Start -> move away, make it brown. [ui]

## 5 Meadow HUD (4 / 3 / 3)
- Tiny counters (12 px numbers, 16 px icons), grey stars read as disabled -> 48 px icons, 16 px numbers, gold-outline stars. [readability]
- Two readouts with the same icons (goal bar vs bank chip) -> one bar per resource filling toward its star. [ui]
- Invisible timer (now removed in v047d). [ui]
- Overlapping village: garden/storage on the cottage and player -> own dirt plot each, one-tile gap. [art]
- Stray styles: white "0/1" box, cream arrow circle, 8 px name tag -> wood chips, 12 px names on a dark pill. [consistency]
- Weak Build button (80x32 next to 80x80) -> same square family, hammer icon, bounce when affordable. [ui]

## 6 Build menu (3 / 4 / 3)
- Orange overload (affordable = button = frame colour) -> cream cards + green "can build" badge. [ui]
- Cut-off card (Cottage lvl 2) in portrait, no scroll hint -> three columns so all seven fit. [ui]
- Faint text 11 px, costs rely on red vs green -> 14 px, lock icon on what is missing. [readability]
- Uneven thumbnails -> fit every building to one 48 px box. [art]
- Landscape: goal panel pokes out above the menu -> hide HUD while the menu is open. [ui]

## 7 Bärregn (2 / 2 / 2), weakest screen
- Empty arena, 28 px blob, 14 px berries -> smaller arena with grass tiles, flowers, strong shadows. [art]
- Unreadable intro -> 48 px berry beside a happy blob, 48 px bomb beside a dizzy one. [readability]
- Bomb looks like berry -> black bomb with spark, bright berry with leaf. [art]
- Broken header: title on the border, third star off the bar -> title inside, stars on the track. [ui]
- Off-style rounded cream intro card (a fourth panel style) -> wood panel. [consistency]

## 8 Dungeon (3 / 3 / 2)
- Second UI skin: olive translucent HUD, round ring buttons vs wood/square above ground -> dark-wood variant of the same frame/button. [consistency]
- Muddy palette hides enemies -> lighter floor, warm torch pools, goo in green/pink/purple. [art]
- Class cards need reading (11 px, art ~55 px in landscape) -> bigger art, weapon icon, three stat pips. [readability]
- Timer reads as error ("Tap a class · 19 s" in red) -> draining bar. [ui]
- Text-heavy skill/loot cards; loot card covers a button in portrait -> icon + arrow pips, docked above the buttons. [ui]
- Weak ending: text list over the zoomed home picture -> own treasure illustration with icon rows. [art]
- Green flash before the dungeon draws -> fade through black. [art]

## 9 End screen (3 / 3 / 3)
- Landscape broken: panel cut, "To the menu" off screen, letterboxed picture -> side-by-side layout + landscape crop. [ui]
- Gloomy empties (dark purple stars, near-black bars) -> cream tracks, outline stars, gold fill with a pop. [art]
- Too many star systems -> three big stars and one row per resource. [ui]
- Soft header: blurry sun icon -> crisp 3x sprite. [art]

## Five biggest wins
1. One panel skin: parchment fill + one wood frame on every panel, incl. dungeon HUD and world labels. [0.9]
2. One pixel ladder: world 3x, framed portraits 6x, nothing else; illustrations never zoomed per screen. [0.85]
3. Icons over words: tabs, home buttons, class/skill/loot cards; no text under 14 px. [0.85]
4. Rebuild the meadow HUD: merged resource bars, a proper Build button. [0.8]
5. Fix broken layouts: landscape end screen, Bärregn, clipped hat grid, cut-off build card, hat over title. [0.8]

## Where the style breaks
- Pixel sizes: home blob ~12 px, designer preview ~6 px, world 3 px, illustrations ~2 px, HUD icons 1-2 px.
- Zoomed backdrop: dungeon end reuses the home picture at a larger scale.
- Off-style pieces: white panel fills, olive dungeon HUD, round ring buttons, cream intro card, white "0/1" box, flat loading bar.
- Colour clashes: dusk loading vs noon home; bright meadow vs muddy dungeon; orange = frame + primary + affordable.
- Soft edges: end-screen sun icon, drop shadows under panels.

## Proposed UI system
- Panel: Theme Wood frame, parchment fill; dark-wood variant underground.
- Buttons: primary orange (one per screen), secondary brown wood, square icon chip; >= 56 px tall; no text links.
- Selection: dark outline + green tick badge top-right, reused for class, skill and build cards.
- States: can afford = green badge; locked = desaturated + lock; done = green tick stamp.
- Tabs: icon only; selected tab lifts and takes the panel fill.
- Icons: Ninja Adventure 16 px at 3x everywhere; stars gold-filled or cream-outlined.
- Text: Fredoka, 14 px minimum, dark brown on parchment, white with dark outline over the world.
- Navigation: back chevron chip top-left, close X chip top-right, always.

## Polish and charm
- Living blobs: idle squash and blink, reactions on home, lobby, end.
- Juice: stars pop in one by one, resources fly to the bank, buildings land with bounce and dust.
- One day arc: morning on loading/home, noon in the meadow, sunset for Bärregn and the end.
- Transitions: blob-shaped wipe between screens.
- Friendly empty states: searching blob on Join, waving silhouettes in the lobby, a "try again" blob at zero stars.
