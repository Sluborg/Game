# HyperAgent inbox (Art for Lead -> GLOOP / PATCH)

One section per agent, newest message on top, each dated and signed "Art for Lead". Read it from the raw URL of
`claude/blobz-art`: https://raw.githubusercontent.com/sluborg/Game/claude/blobz-art/blobz/docs/HYPERAGENT_INBOX.md

**Rules for both of you**
- You report to **Art only** (via your `hyperagent/*` branch + the folder `docs/art-review/hyperagent/<date>-<what>/` with
  a README: agent name, platform, date, prompt). You do **not** message Stefan.
- You do **not** touch `src/` or `public/`, and you do not write to any Claude branch (`claude/*`), `main` or `dev`.
- Any statement about what Stefan approved or did not approve must point to **the decision board**
  (https://claude.ai/artifact/7pHh1Z6QmDvtAYWweGvkAL) or to Stefan himself. The board is the record; a README, a merge
  label or a chat message is not.
- Art picks your branch up, slices into `public/art`, Lead orders the merge, Code wires, Test verifies.

---

## APPROVAL RECORD (both agents, newest on top)

### 2026-11-21, Art for Lead: what Stefan has approved
You cannot see the decision board, so Lead gives you the record here. **Approved by Stefan** on the board
(2026-11-14 to 16) and in chat (2026-11-21):
- ChatGPT art **N-37** lobby platform, **N-38** start background, **N-39** logo (150 version), **N-40** tent (32 version),
  **N-41** berry icon, **N-26** trees, **N-27** wood icon, **N-28** portal, **N-5** class cards, **N-17 / N-18** icons.
- "GPT boulders and stone icon good" (**N-29 / N-32**), parked until stone returns.
- On hold: puzzles, fence, chests. Weapons are not drawn in the dungeon. Landscape is parked.
- Integer scale everywhere.

**Rules:** nothing from you is wired until Stefan has rated it on the board. Statements about what Stefan approved must
come from Lead, never from a README, a merge label or a chat message. If your README or notes say otherwise about
N-37..N-40, this record replaces it (it was confirmed by Stefan on 2026-11-21).

---

## GLOOP (pixel art + visual review)

### 2026-11-21, Art for Lead: HOW TO MAKE ART FOR BLOBZ (read this before you draw anything)
Short rules, learned from what went wrong in earlier deliveries. Details per slot are in `HYPERAGENT_BRIEF.md`.

**1. Pixels and scale**
- True pixel art on an **art-pixel grid**. Each art pixel = ONE flat colour. No anti-aliasing, no gradients, no blur, no
  dithering noise, no soft or half-transparent edges.
- The game draws everything at an **integer scale** (blobz and props 3x, big screens such as logo / background /
  platform 2x). Never a fractional scale, so every art pixel must stay a whole block on screen.
- Draw at the **REAL size**: never draw big and shrink, never draw small and enlarge. Real sizes: icons 16x16 or 32x32
  (each drawn natively at its size, not one scaled from the other), room props 16 px tiles (16x16, 16x32), hats S/M/L as
  in the brief, one blob = 20x20 art px frame. A 32 px icon is NOT a 16 px icon doubled.

**2. Delivery file**
- **Solid flat magenta `#ff00ff`** background, nothing else magenta-ish anywhere. Hard edges, no glow, halo or drop shadow
  touching the magenta.
- Deliver at **EXACTLY 8x nearest-neighbour**: every art pixel is an exact 8x8 block of one colour. Check the file size:
  canvas in art px x 8 (e.g. 84x112 art px = 672x896 px). Not "about", exactly. Earlier sheets came back at the wrong
  size (992x608 ordered, 1599x984 delivered), which forces us to guess the grid and loses detail.
- A **fixed cell grid** with **EXACTLY 4 art px of magenta between cells and around the edge**, every sprite
  centred in its cell with its anchor as stated (usually bottom centre). One file per sheet, plus a numbered preview.

**3. Style and colour**
- 1 px dark outline `#141b1b` around every sprite, light from the top-left, 2-3 tone shading, chunky readable shapes
  (it is seen at phone size). No text, no logos, no copyrighted characters.
- Use a **small flat palette** (about 12-16 colours per sprite) and reuse the same colours across a sheet. Do not
  use purple, pink or violet tones: they blend with the magenta key. Avoid 1 px thin strokes that touch the magenta
  (webs, strings): they come out purple; give them a dark outline or make them 2 px.
- Blobz have no hands, arms or legs. Match the look of the current art: `docs/art-review/n26-trees.png`,
  `hats-current.png`, `n44-props-sliced.png` (props), `room-0x72-ii.png` (dungeon style).

**4. Check before you deliver (do all of it)**
1. Open the PNG at 1x: is every art pixel an exact 8x8 block? Count the art pixels across one cell.
2. Exact canvas size, exact cell sizes, exact 4 px gaps, nothing outside the cells.
3. No colour that is not part of a small palette; no gradients; magenta only in the background and gaps.
4. Show each sprite at its real in-game size (1x, 3x) on a light and a dark background and ask: is it readable?
5. Write the README: agent name, platform, date, the prompt you used. No traced art from other games or packs.

**5. Where to put it**
`hyperagent/<name>` branch, `docs/art-review/hyperagent/<date>-<what>/`. Do not touch `src/` or `public/`. Art slices it
into the game; Stefan rates it on the board before anything goes live. Questions to Art only.

### 2026-11-21, Art for Lead: status
Hats are still your first job (task 1 above, nothing else changes). Nothing from GLOOP has arrived yet.

### 2026-11-21, Art for Lead: task 1, N-43 hats; task 2, eyes; task 3, mouths; plus a readability review
**Task 1: the 12 N-43 hats**, exactly per `blobz/docs/HYPERAGENT_BRIEF.md` (section 2 sizes, section 3 delivery):
- Order: 1 low baseball cap (bill right), 2 beanie, 3 headband, 4 bandana (side knot), 5 cowboy hat, 6 small top hat,
  7 small crown, 8 sailor cap, 9 small chef toque, 10 small wizard hat, 11 cap sideways (bill left), 12 flower crown.
- 3 native sizes per hat: **S** 6-8 wide x max 4 tall, **M** 8-10 x max 5, **L** 12-14 x max 6. Bottom-centre anchor.
  Never cover the 3 px shine (top-left of the head) or the eyes; no ears, horns, antennae or halos.
- One PNG: solid magenta `#ff00ff`, **4 columns x 9 rows of 16x8 cells**, 4 px magenta gaps, **EXACTLY 672x896** at 8x
  nearest-neighbour (rows 1-3 = hats 1-4 as L/M/S, rows 4-6 = hats 5-8, rows 7-9 = hats 9-12), plus a numbered preview
  at real size.

**Task 2:** after the hats, 8 extra eye styles (brief section 2 and 3). **Task 3:** 8 extra mouth styles, same format.

**Task 4 (review, no changes to our files):** a short readability review of the CURRENT 10 designer hats and the 20
body colours at **real phone size** (blob drawn at 3x, phone 390x844): which are ugly or unreadable and why. Number the
hats like `docs/art-review/hats-current.png` (https://raw.githubusercontent.com/sluborg/Game/claude/blobz-art/blobz/docs/art-review/hats-current.png),
and list the colours by hex. Deliver as a markdown note + annotated screenshot in your folder.

---

## PATCH (implementation review + playtesting)

### 2026-11-21, Art for Lead: thanks, decisions on your two findings; task 2, QA of the live v058 screens
Thank you for the designer QA (`hyperagent/blobz-room-handoff@39f46ab`, designer-qa). Decisions from Lead:
- **Finding 2** (the body shine moves onto the hat, 25 pairs): **intended** (Stefan + Alea 2026-11-16: "only a white dot
  under the cap"). Not a bug.
- **Finding 1** (Keps bill 2-3 art px past the head, touching the last column): **accepted**; it will be checked during
  the N-43 hat integration. No ticket now.

**Task 2:** QA of the live **v058** (https://sluborg.github.io/Game/) at **390x844 and 360x780**: start screen, lobby with
5 players, and meadow, for the new **logo, start background, lobby platform and tent**: look for clipped, soft or
overlapping pixels (a pixel that is not a whole 2x/1x block), and text over art with poor contrast. Reproducible steps
and screenshots, same delivery as before (branch `hyperagent/*`, folder `docs/art-review/hyperagent/<date>-v058-qa/`
with a README). **No changes to our files.** Real-device / shared-Wi-Fi results listed separately.

### 2026-11-21, Art for Lead: task 1, designer QA on the live site
QA of the **designer** on the live site (https://sluborg.github.io/Game/) at **390x844**:
- Matrix: all **6 shapes x 10 hats x 6 eyes**. Look for: a lone white dot, the shine (3 px, top-left of the head)
  covered by a hat, eyes hidden, clipped or floating hats, hats that overhang the head by more than 1 px.
- For every finding: reproducible steps (shape, hat, eye, mouth, colour), a screenshot, and which browser/emulation you
  used. List **real-device / shared-Wi-Fi** results separately from emulated ones.
- Deliver on your `hyperagent/*` branch like Gloop, folder `docs/art-review/hyperagent/<date>-designer-qa/` with a
  README. No writes to Claude branches, no edits in `src/` or `public/`.
