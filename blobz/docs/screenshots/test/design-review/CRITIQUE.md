# Blobz static-screen design critique (v046b, 8656d7e)

Method: headless Chromium, `vite preview` of the v046b build (same code as live), deviceScaleFactor 2, 390x844 / 360x780 / 844x390.
Screenshots: `<screen>-<size>.png` in this folder. Touch targets measured from the DOM (CSS px).
Caveats: the loading screenshots were taken with art requests throttled by 400 ms, so they show a slow-network state (art not yet loaded). There is no "join by code" input in the build by design (no room code in the UI), so the Joina screen is the Wi-Fi list only.
Tags: [visual] [usability] [consistency]. Scores 1-5.

## 1. Home / main screen (`home-*`)
First impression: charming and instantly "a game", but the giant chunky blob and the flat orange slabs fight the finer meadow art.

Issues, ranked:
1. **[consistency] Buttons are flat orange slabs, not Ninja Wood UI.** Nytt spel / Joina (358x60 at 390w) have no wood grain, bevel or pixel corner. Fix: use the same 9-slice wood plank as the Lobby panel border for both, plum outline kept, label in Fredoka 24 px.
2. **[visual] Mixed pixel densities.** The player blob is drawn with ~11x11 px "fine pixels" (20x20 grid) while the meadow, logo and house are ~3-4 px pixels, so the blob looks pasted on. Fix: render the home blob at 4x (about 80 px) with the Ninja-scale pixel size, or give it the same outline weight and shading as the Ninja blobs in the scene.
3. **[visual] Logo scaled with smoothing** (`.logo-img` is `image-rendering: auto`), so its pixel edges are soft next to crisp art. Fix: `image-rendering: pixelated` and pick an integer scale (e.g. 3x of source), not 90% width.
4. **[usability] The buttons cover the scene.** They sit on the house and hide the pink blob (portrait); in landscape they cover the house roof and doorway. Fix: reserve a wood sign area (plank panel behind both buttons) or shift the scene up so the buttons sit on plain grass.
5. **[usability] Name chip "Ada + feather" is not recognisable as editable.** It is ~100x40 CSS px, overlaps the blue blob's head and has a tiny feather icon. Fix: bigger wood tag with a pencil icon, 44 px high, placed under the blob, not over the scene.
6. **[usability] SV | EN toggle is 36x32 px (< 44) and the version label is 12 px over grass.** Fix: 44x44 hit area (padding), version in a small plum plate or moved to a corner with an outline.
7. **[visual] Dead sky band** between logo and blob in portrait (about 150 px of flat blue). Fix: move the blob and name tag up or scale the logo up 1 integer step.
8. **[visual] Landscape:** logo is small (about 190 CSS px wide) and the blob is cut by the name tag. Fix: logo left-top at 2x integer scale, blob right-aligned above the buttons.

Kid test (8+): pass. Big buttons, one obvious primary; "Nytt spel" vs "Joina" needs reading, so add icons (plus / door) to both.
Score: pretty 4 / intuitive 4 / consistent 3.

## 2. Loading / start screen (`loading-*`)
First impression: functional but bare; the flat dark green fill makes it feel unfinished compared with the home screen.

1. **[visual] Flat #243d24 background** with a thin strip of dusk art at the top (landscape) and no art at all in portrait until the images arrive. Fix: ship the loading background as inline CSS or a tiny first-paint PNG so there is never a flat fill; use the same meadow as home so there is no jump.
2. **[consistency] Progress bar is a cream box with a plain orange rectangle**, no Ninja frame. Fix: wood bar frame (9-slice), orange fill in 4 px steps.
3. **[visual] Logo and bar are small and high** (portrait: bar at about 120 CSS px from the top, lower 65 percent empty). Fix: centre the group vertically, logo at integer 3x.
4. **[usability] "Laddar..." text has a thick outline but is only about 17 px**; fine, but add a blob bounce so a kid sees it is alive.
5. **[consistency] Dusk/skull-cave art in landscape does not match the sunny home meadow.** Fix: pick one tone for the menu flow.

Score: pretty 2 / intuitive 4 / consistent 2.

## 3. Lobby after "Nytt spel" (`lobby-*`)
First impression: clean and readable, but a nearly empty white board on top of a pretty scene.

1. **[consistency] The panel is a plain white box with an orange frame**, the "Starta" button is the same flat slab. Fix: Ninja Wood panel + plank button, parchment (not white) fill.
2. **[usability] Players are a tiny list row** (about 28 px blob + name). A lobby for 1-5 friends should show them. Fix: five blob slots in a row (80 px, empty slots as dashed silhouettes), joiners pop in with a bounce.
3. **[usability] "Ny by" chip is 94x40 px (< 44)**, a house icon plus 2 words, and a destructive action ("riv") sits one tap away. Fix: 44 px min, move it away from Starta, keep the confirm.
4. **[visual] Landscape: the panel spans about 75 percent of the width** with the list far left and Starta far right, leaving a hole in the middle. Fix: two columns (blob slots left, Starta + Ny by right) with a max panel width of 640 CSS px.
5. **[usability] Back arrow (44x44) is OK but looks like decoration**: cream arrow without a plate. Fix: put it on a small wood button.
6. **[visual] Waiting state is not visible for joiners** ("Väntar på att värden startar..." is a 16 px grey line). Fix: animated dots and a blob waiting icon.
7. **[visual] Big empty meadow below the panel in portrait.** Fix: let the real blobs of the joined players walk around there (also shows who is in).

Kid test: pass for Starta; the empty list gives no hint that friends should join.
Score: pretty 3 / intuitive 3 / consistent 3.

## 4. Joina (`join-scanning-*`, `join-list-*`)
First impression: simple and clear, but visually the weakest screen: a small box in the top of an empty sky.

1. **[usability] "Tillbaka" is a 23 px high underlined text link** (touch target < 44) and not Ninja-styled. Fix: wood button 44+ px with the back arrow, same as the Lobby back.
2. **[usability] Scanning state is only grey text** ("Letar efter spel på ditt Wi-Fi...", about 16 px, low contrast #9a9a9a on white). Fix: spinner or bouncing blob plus darker text; a kid should see "searching".
3. **[consistency] Game row "Joina Stefan 1/5" is a grey UI box** with a thin plum border, unlike the wood panel around it. Fix: parchment plank row with the host blob at 44 px and a 5-dot player counter instead of "1/5".
4. **[visual] Row label "Joina Stefan" repeats the screen title.** Fix: show "Stefan" and a play-arrow icon.
5. **[visual] Panel height jumps** (174 px both states) and sits at the top in portrait with 60 percent empty sky below; in landscape it is centred. Fix: same position in both orientations, vertically centred.
6. **[usability] No empty/error state visible** when nothing is found after a while (the "Leta igen" button is hidden until then). Fix: after 5 s show a big rescan button plus a "same Wi-Fi?" icon hint.
7. **[visual] No code entry**, so the "friend is not listed" case has no fallback. Decision for Stefan, not a bug.

Score: pretty 2 / intuitive 4 / consistent 2.

## Cross-screen top issues
1. Buttons and panels are flat orange/white, not Ninja Wood UI (Home, Lobby, Join).
2. Mixed pixel densities and smoothing: chunky home blob, smoothed logo vs crisp meadow.
3. Touch targets below 44 px: Tillbaka 23, SV/EN 36x32, Ny by 40, name chip 40.
4. Lobby and Join feel empty: no player slots, no scanning animation, big dead sky.
5. Loading screen is flat green with no art on first paint, and a different mood (dusk cave) from the menu.
