# Blobz progress

## 2026-11-14 - First playable (milestones 10 + 20)
- Branch: `claude/mobile-game-5-players-8qthjq`
- Files: `blobz/` (new: sim, net, game scene, controls, art, sfx, menu/lobby/HUD, tests, Kenney Tiny Town CC0),
  `.github/workflows/deploy.yml` (Blobz temporarily at Pages root, Asset Report main at `/asset-report/`).
- Built: host/join with 4-letter code (PeerJS), up to 5 blobz, glide physics + dash, tree bumps drop wood,
  items (wood/mushroom/coin) carried 3 at a time to base, big crystals need 2+ blobz, speed + magnet power-ups,
  3-minute round, team score with 1-3 stars, skins (8 colors x 5 hats), sound blips.
- Verified: `npm run build` green, 5 vitest tests, headless Chromium with 3 players (host + 2 joiners):
  lobby, sync, movement, pickup, end screen. Screenshots in `docs/screenshots/`.
- 2026-11-14: switched to Kenney pixel art: Tiny Dungeon slime recolored per skin + pixel hats, potions as power-ups, treasure chest as co-op carry, Tiny Farm decor, Tiny Battle flags at base. Packs added: Tiny Dungeon, Farm, Battle, Ski (CC0).
- Open: real-phone test on home Wi-Fi; tune star thresholds after first family session.

## 2026-11-14 - Kenney-only UI + pixel intro
- Removed every emoji and the custom SVG icon. Replacements, all Kenney CC0:
  stars -> Pixel Platformer diamonds, dash -> Tiny Battle arrow, hat picker -> pixel blob previews,
  chest helper label -> Tiny Dungeon slime icons, app icon -> recolored slime on Tiny Town grass (PNG).
- New intro: animated Kenney meadow with gliding blobz behind the menu, logo and room code in the
  Tiny Ski pixel font. Added pack: Pixel Platformer.
- `docs/ART_PROMPTS.md`: prompts for title art, logo and app icon in the Kenney Tiny style.
- Verified: build green, 5 tests, 3-player headless run, no page errors.

## 2026-11-14 - Clearer menu + Stefan's title art
- Menu split into 3 small panels: Home (your blob card, "Starta nytt spel", "Gå med i spel", one-line help),
  "Din blob" (name, color, hat; shown first on a first visit) and "Gå med" (one big code box, auto-joins on
  the 4th letter, `?room=ABCD` opens it prefilled). Two-column layout for phones held sideways.
- Backgrounds: `public/art/title.png`, logo: `public/art/logo.png` (ChatGPT-generated, listed under
  "Generated art" in LICENSES.md). Removed the canvas meadow intro (`src/intro.ts`).
- Verified in headless Chromium at 390x844 and 844x390 (screenshots 08-11), 3-player run green, 5 tests.

## 2026-11-14 - Blob designer + round blobz
- Blobz are now round dome "balls" like the title art, drawn in code (`src/blob.ts`) on an 18x24 pixel grid,
  rendered as crisp SVG in menus and canvas textures in Phaser. Replaced the Tiny Dungeon ghost-slime.
- Blob designer: tabs Färg (12) / Ögon (6) / Mun (6) / Hatt (8) with live previews of your own blob,
  plus "Slumpa". Looks sync over the network (`PlayerInfo` has eyes + mouth; host clamps values).
- Stefan's art: new app icon (`icon-192/512.png`) and victory background on the end screen.
- Removed the old canvas blob/slime code from `src/art.ts` (now only Kenney loader + pixel font).
- Verified: 9 tests (4 new blob tests), build green, designer at 390x844 and 844x390, 3-player run.

## 2026-11-14 - Pixel UI theme, body shapes, render fixes, art orders
- Fixed: black lines between ground tiles (ground is now one baked canvas) and dark slivers beside trees
  (every tile frame gets its own padded texture; camera rounds pixels). Removed decor tiles that read as dirt.
- Blob designer: new "Form" tab with 6 body shapes (Kupol, Boll, Lång, Platt, Päron, Kub); hats follow the head.
- Pixel UI theme everywhere: stepped-corner plum outlines, bevelled buttons, tabs, inputs, HUD boxes,
  square dash button, Pixelify Sans font (OFL, `@fontsource/pixelify-sans`) in menus and in-game labels.
  Chest helper marker is now a mini blob instead of the old slime tile.
- `docs/ART_ORDERS.md`: 7 art orders + one self-contained ChatGPT prompt ("go" / "next").
- Verified: 9 tests, build, 390x844 + 844x390 screenshots, 3-player run, seams checked at 2x zoom.

## 2026-11-14 - UI kit from ChatGPT (order 10)
- `scripts/slice_sheet.py`: cuts a transparent art sheet into sprites in reading order and snaps them to
  their pixel grid (`--native`). Reusable for orders 20-70.
- 12 UI sprites in `public/art/ui/` wired as CSS 9-slice (`border-image`, pixelated): panels/cards, HUD boxes,
  orange/blue/yellow buttons with pressed states, tabs, inputs, option tiles, lobby rows, room code, dash
  button, thumbstick. Old outline recipe stays as fallback.
- Verified: build, 390x844 + 844x390 screenshots, 3-player run with HUD/lobby/end screens.

## 2026-11-14 - Readable faces
- Eyes and mouths drawn in near-black #1b1018 (was plum, read as grey on darker bodies); every eye type
  has white around the pupil, bigger mouths, "Pärlor" became "Runda". Brown/grey body colors lightened.
  In-game blob scale 2.6 -> 2.9.

## 2026-11-14 - Crisp faces in game + icon sheet (order 20)
- Root cause of "grey" faces: Phaser smoothed the blob texture. Game now runs with `pixelArt: true`
  (no texture smoothing, rounded pixels), so eyes and mouths render pure black.
- 16 icons sliced (`slice_sheet.py` gained `--grid=CxR` and `--px=N`) into `public/art/icons/`: HUD (coin by
  score, clock by timer, diamonds for stars), button icons (house, team, dice, check, back), dash button,
  and in-game items (log, mushroom, coin), treasure chest and power-ups (winged boot, magnet).
- ChatGPT prompt now ends each reply with a progress line ("Order 30 done - 3/7 complete. Next: ...").

## 2026-11-14 - Opt out of Android auto dark mode
- Stefan's phone (Chrome "auto dark mode for web contents") inverted the UI and blob faces. Added
  `<meta name="color-scheme" content="only light">` + `color-scheme: only light` on :root.
- Not reproducible in headless Chromium (forced dark is ignored there); verify on the phone.

## 2026-11-14 - Version on start screen + map props (order 30)
- Start card shows `v<package> · <git sha> · <build time Stockholm>` (vite `define`), to confirm the phone runs the latest build.
- Order 30 sliced into `public/art/props/` (slicer gained `--merge=N` for multi-part objects).
  World obstacles are now ChatGPT trees (green/orange/pine, drop wood when bumped) plus rocks and boulders
  (solid, no wood; sim `OBSTACLE_R` per kind). Decor: bushes, flowers, stumps, 2 ponds. Plates, gate, sign
  and fence are installed for the co-op milestone.

## 2026-11-14 - Orders 40, 50, 60
- Lobby background (`art/lobby.png`): card on top in portrait, card left / picnic right in landscape.
- Totems (4 kinds x 3 levels, sliced at 9 px/art-pixel to keep the symbols) in `art/totems/`, goo enemies
  (small, medium, boss, splat) in `art/enemies/`. Installed only; they need milestone 40/50 gameplay.
- Remaining art order: 70 (hat/face ideas).

## 2026-11-14 - v017b: dark-mode fix, take 2
- `only light` did not stop Samsung Internet / Chrome force-dark on Stefan's phone (still grey/inverted).
  Now the page declares `color-scheme: light dark` (meta + :root): force-dark skips pages that support
  dark, and all colors are explicit so it renders the same. Checked with a dark preference in Chromium;
  the real force-dark path cannot be reproduced headless, verify on the phone.

## 2026-11-14 - v018: 12 new hats + 4 new eye styles (order 70)
- Redrawn from ChatGPT's idea sheet on the 18x24 blob grid (so they fit all 6 body shapes):
  hats Pirat, Trollkarl, Viking, Kock, Lurar, Kanin, Katt (body-colored ears), Gloria, Cylinder, Bandana,
  Antenn, Grodd; eyes Kär (hearts), Stjärnor, Arga (brows), Rosiga (cheeks). 20 hats, 10 eyes in total.
- Option grid scrolls inside the designer card; 4 columns portrait / 8 landscape.
- All 7 art orders delivered.

## 2026-11-14 - v018c: harder dark-mode lock
- Still grey on Stefan's phone (in-app browser with "Open in Samsung Browser"). Added: a full
  `@media (prefers-color-scheme: dark)` theme with identical colors (Samsung Internet skips forced dark on
  sites with their own dark theme), `darkreader-lock` + `supported-color-schemes` metas, menu blobz as PNG
  `<img>` instead of inline SVG. Version line shows " D" when the browser reports dark mode (diagnostics).
- Cannot reproduce the phone's forced dark headless; verify on the phone.

## 2026-11-14 - v018d/e: picture-only designer, proper app icon
- v018d: designer option tiles show only the blob picture (names kept as aria-label/title).
- v018e: home-screen icon. Manifest now has `any` icons (ChatGPT app icon) + `maskable` icons (art at 72% on
  full-bleed grass, so Android's circle/squircle crop doesn't shrink it into a white disc),
  `apple-touch-icon.png` (180), id/scope, grass theme color, and a pass-through service worker (`sw.js`,
  caches nothing) so Android installs it as an app instead of a browser shortcut.
- Stefan must remove the old home-screen app and add it again (Android caches the icon).

## 2026-11-14 - v018f: clean dice icon
- Replaced the blurry sliced dice with a hand-placed 12x12 pixel die (5 pips) in `public/art/icons/dice.png`.

## 2026-11-14 - v018g: neutral selection marker
- Designer selection no longer uses yellow (a pickable body color): white tile, thick plum frame, green check badge.
- Star eyes get dark corners so they read on yellow blobz.

## 2026-11-14 - v018i: lobby cleanup
- "Starta" (no !), back arrow top-left replaces "Lämna", compact code chip with "Kod" label, player list first.
- Landscape: compact rows so Starta stays on screen with 3+ players (checked in the 3-player run).
- Proposed next (v019, awaiting go): code-free join list ("Joina Stefan") via public-IP-scoped PeerJS slots.

## 2026-11-14 - v019: readable world + HUD
- Base: round dirt yard with the ChatGPT cottage centred, no flags, no square dirt tiles.
- Readability: pickups bob on a pulsing white ring with a shadow (= "take me"); decor halved and stumps
  removed; trees/rocks remain the only solid things.
- Smoke puffs on sharp turns and dashes.
- HUD: score box left, timer right, room code under the timer (no overlap at 390 px), bigger numbers;
  star diamonds are outlines until reached, then filled. New white ">>" dash icon; hint sits left of it.

## 2026-11-14 - v019b: calmer world
- Pickups: bob only, ring is static. Flower grass tiles ~1%, flower patches rarer. Base glow ring removed (dirt yard marks the zone).
- Slime trail ~2x longer (distance-based points, slower fade). Puffs spawn behind the blob and drift straight back, also on starts.

## 2026-11-14 - v020: 2x blob body
- Blob grid 18x24 -> 36x48 (`S = 2` fine pixels per design unit). Shapes are continuous functions sampled
  at 2x: smoother outline, rounded cube corners, soft upper-left shine + sparkle, 2-px shade band.
- Existing eyes/mouths/hats are 2x-upscaled design-unit maps (placeholders) until the ChatGPT part sheets
  (orders 80-110, `docs/chatgpt-parts-prompt.txt`) arrive; then parts are sliced to native pixels and
  anchored per shape. In-game scale 2.9 -> 1.45 (same on-screen size).

## 2026-11-14 - v020b: gem row
- HUD stars: hand-drawn 11x9 pixel gems (`gem.png`, `gem-empty.png` = translucent slot) in a row beside the score, thin progress bar below (no icons sitting on the bar). End screen uses the same gems.
- Team: Art (parts set) and Code (code-free join) running; queued next: milestone 30, 40, 50.

## 2026-11-14 - v021: code-free join (Code batch merged)
- Merged `claude/blobz-code` (c543ad8..4b02a2d): Wi-Fi discovery via hashed public IP (STUN srflx, SHA-256, 10 hex) and PeerJS slots `blobz-v2-<hash>-<1..8>`; Joina screen lists "Joina <name> n/5" (full = grey, started = "pågår"); no codes anywhere; "Hittar inga spel. Är ni på samma Wi-Fi?" + "Leta igen".
- Lead review: conflicts with v020b gem row resolved (kept gem row, dropped HUD code box). 13 tests, build, Code e2e `node e2e/lan-join.cjs <url>` ALL PASSED (uses `?lan=` because the sandbox has no STUN/UDP); screenshots checked.
- Risk: real STUN path only verifiable on two phones on the same Wi-Fi.

## 2026-11-14 - v022: fine-pixel parts set (Art batch merged)
- Merged `claude/blobz-art` (baa44b2, 28bc966): 16 eyes, 12 mouths, 21 hats hand-drawn in fine pixels; old indices stable, new appended; headphones/bandana procedural per shape. Review sheet `docs/art-review/parts-sheet.png`.
- Lead review: 19 tests, build, designer portrait/landscape, in-game close-up, Code e2e ALL PASSED. Open: designer grid cramped in landscape (Code), blush weak on red/pink bodies (Art).

## 2026-11-14 - v022b: fx sprites (Art batch merged, not wired yet)
- `public/art/fx/`: dust, splat, coin sparkle, level-up ring, coin piles s/m/l, plate glow (own CC0, `scripts/fx_sheet.py`). For Code to use in milestones 30-50.

## 2026-11-14 - v023: milestone 30 co-op puzzles (Code batch merged)
- Two fenced pens per map (seeded corners, gate facing the base). Pressure plates 2 and 3 (capped by player count), all held at once opens the gate (stays open); bonus chest +25 once. "n/need" bubbles, plate/plate-down and gate/gate-open art. Host-authoritative, snapshot field `z`.
- Lead review: 25 tests, build, e2e puzzles.cjs + lan-join.cjs ALL PASSED, screenshots checked (portrait + landscape).

## 2026-11-14 - v023b: art cleanup (Art batch merged)
- `scripts/clean_art.py`: hard alpha + merged generation-noise colors on all sliced ChatGPT sprites (props, icons, enemies, totems); before/after in `docs/art-review/clean-before-after.png`. Review notes for Code in `docs/ART_REVIEW.md` (unify prop scales, integer scales, rock vs boulder, wire fx).

## 2026-11-14 - v023c: blush fix (Art)
- "Rosiga" cheeks: dark-rose edge + light-pink core, readable on all 12 body colors.

## 2026-11-14 - v024: 6 new hats + winter props (Art batch merged)
- Hats 21-26: Ninja, Dino, Astronaut, Blomkrans, Propeller, Enhörning (27 hat choices). Winter props in `public/art/props-winter/` (not wired). 25 tests, build, lan-join e2e passed.

## 2026-11-14 - v025: milestone 40 base totems (Code batch merged)
- Team bank (HUD + growing pile at the cottage); 4 totem plates around the cottage (speed, magnet, shield, double), stand 1 s to buy the next level, price tags green/red, level dots, level-up fx. Still coin-based: the gathering batch converts bank and prices to wood/stone/berries.
- Lead review: 31 tests, build, e2e totems + puzzles + lan-join ALL PASSED, screenshots checked.

## 2026-11-14 - v025b: gather art (Art batch merged, not wired)
- `public/art/gather/`: tool swing strips (axe/pickaxe/rake), button icons, berry bush full/empty, rubble, chips, stone/berries items, HUD resource icons, sun + day bar, star, quest card. Review sheet `docs/art-review/gather-sheet.png`.
