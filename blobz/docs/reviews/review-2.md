# Review 2: Blobz look review (live v047e + repo screenshots)

Source: external AI, pasted by Stefan 2026-11-15. Live menus + meadow, all designer tabs; dungeon, mini game and end
screen from repo captures (some older). Screenshot-based (no phone emulation). Sizes are proposed targets.

**Verdict:** charming identity, but the presentation feels assembled from several visual systems. Biggest gains:
clearer hierarchy, quieter framing, and making the playable blobz as appealing as the illustrated ones.

## Scores (pretty / intuitive / consistent)
Loading 4/4/2 · Home 4/4/3 · Designer 3/3/3 · Lobby+Join 3/2/3 · Meadow 3/3/3 · Build menu 3/2/3 · Bärregn 3/2/2 ·
Dungeon 3/2/2 · End 4/3/3

## 1 Loading
- [consistency] Illustration lighting/detail differs from simple gameplay sprites -> simplify shading, use gameplay blob proportions/faces.
- [ui] Logo + progress feel small and detached -> group in one calm area; ~260x16 px bar at 390 px width.
- [art] Entrance and characters compete with the logo -> dedicated clear area; compose portrait and landscape separately.

## 2 Home
- [ui] Illustrated blobz more exciting than the player's own -> cream pedestal/card, 96-120 px preview, clear edit symbol.
- [readability] Buttons over busy scenery -> one quiet menu zone, scenery outside it.
- [ui] New game / Join text only -> house-plus icon and two-blob icon, keep labels.
- [consistency] Portrait = poster, landscape spreads apart -> logo above preview, actions beside/below that group.

## 3 Blob designer
- [ui] Frames overpower the choices -> thin quiet option tiles; strong wood frame only for the outer panel + primary button.
- [readability] Eyes/Mouth: full-body thumbnails hide tiny differences -> enlarged face crops; full blob only in the main preview.
- [ui] Shape: hats/expressions distract -> every shape with the same neutral face, no hat.
- [consistency] Colour: nested orange frames alter swatches; Hat: crowded -> plain swatches, larger hat previews, same head placement.
- [ui] Tabs depend on reading, small in landscape -> icons; 48 px tabs; landscape: preview left, options right.

## 4 Lobby + Join
- [ui] Name list undersells 5 players -> five party slots with larger blobz, joining silhouettes.
- [readability] Wi-Fi states are sentences -> animated search symbol; visual states searching / available / connected.
- [ui] "New village" near Start -> subdued secondary, spatially separated.
- [art] Large white panels feel administrative -> party on a small wooden platform; names/status on a compact cream panel.

## 5 Meadow
- [readability] Player disappeared behind a tree -> fade foreground foliage over players or show a silhouette through it.
- [ui] Quest vs storage repeat icons -> "bring home" = cottage+arrow symbol, storage = chest.
- [art] Flowers, berries, rocks and player compete -> reduce decorative contrast; small consistent highlight on interactive resources.
- [readability] Tiny names + indicators clutter -> one compact nameplate, a clear "you" marker, fewer persistent labels.
- [art] Buildings look placed on grass -> foundations, short connecting paths, clear entrances.

## 6 Build menu
- [readability] Unaffordable cards too faded -> full-strength art; mute only the action area; mark missing costs individually.
- [ui] Everything competes in a card -> order: large building -> name -> one benefit -> cost strip.
- [art] Buildings at different proportions -> ~72x72 px illustration area, comparable weight.
- [ui] Bottom card clipped, weak scroll cue -> visible scroll track, fixed 48x48 close.

## 7 Bärregn (archived by Stefan; kept for reference)
- Enlarge berries/hazards/players; berry count + star track and a separate clock; one big tutorial sequence; wood panel.

## 8 Dungeon
- [ui] Class select: equipment louder than character/role -> blob portrait first, one role symbol, one short benefit.
- [consistency] Round buttons: square art inside orange rings = competing borders -> one circular wooden rim, plain backing, free symbol.
- [readability] Combat: weapons, white effects, names, health bars merge -> smaller routine effects, consistent name/health positions; strong flashes only for big actions.
- [ui] Loot: Roll/Pass before the reward -> bigger item, benefit prominent, dice+Roll / arrow+Pass, party-choice indicators.
- [readability] Boss warnings hidden -> bold patterned danger boundary, quieter interior; boss name/health in a top strip.

## 9 End screen
- [art] Celebration image has more personality than the team -> show the participating blobz prominently.
- [readability] Empty stars and zero bars dominate -> lead with the outcome and what was achieved; unearned stars secondary.
- [ui] Big white panel hides the art -> compact results board, three resource totals, one primary Play again.
- [ui] Home is a small text link -> secondary button with a home icon.

## Five biggest wins
1. Protect player visibility (silhouettes, foliage fade, faces, restrained combat effects).
2. Quiet the UI frames (keep wood, drop repeated heavy borders).
3. Unify the blob identity (same eyes, silhouette, hats, proportions, floating weapons everywhere).
4. Make choices visual (bigger previews, symbols, consistent selection, one dominant action per panel).
5. Recompose per orientation (portrait stacks; landscape = preview/status beside choices).

## Where the style breaks
- Pixel scale differs between illustrations, previews, world sprites, UI symbols.
- Edges: hard gameplay pixels vs soft illustration lighting.
- Colour: orange UI borders compete with orange roofs and accents; white interiors harsh.
- Asset language: wood frames, dark HUD blocks, rounded tutorial cards, circular rings around square icons.
- Typography: keep Fredoka; fix inconsistent sizes and heavy outlining.

## Proposed UI system: "warm wooden toys"
- Panels: Theme Wood outer frame, warm cream interior, one border thickness.
- Primary: saturated orange, cream label, small hard shadow; one per panel.
- Secondary: cream fill, dark plum text, quiet wooden edge.
- Selection: gold inset border + check mark, no glow.
- Tabs: same frame family; selected tab joins the content panel.
- Icons: Ninja-style pixel symbols on one grid; no emoji.
- Combat controls: circular wooden rim; 64-72 px primary, 48-56 px secondary.
- Text: Fredoka ~18 px body, 24 px headings, dark plum on cream.
- Spacing: 8 px rhythm, 12-16 px padding, >= 48 px tap targets.
- Colour meaning: gold = selected/reward; green = ready/positive; red = danger/missing.

## Polish
- The actual party in lobby and celebration; expressive blobz (blink, anticipation, squash, reactions);
  chimney smoke/flags; resource-to-storage animation; quiet decorative motion while choosing.
- Strongest recommendation: next pass on visibility and visual hierarchy.
