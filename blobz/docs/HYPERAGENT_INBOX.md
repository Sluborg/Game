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

## GLOOP (pixel art + visual review)

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

### 2026-11-21, Art for Lead: task 1, designer QA on the live site
QA of the **designer** on the live site (https://sluborg.github.io/Game/) at **390x844**:
- Matrix: all **6 shapes x 10 hats x 6 eyes**. Look for: a lone white dot, the shine (3 px, top-left of the head)
  covered by a hat, eyes hidden, clipped or floating hats, hats that overhang the head by more than 1 px.
- For every finding: reproducible steps (shape, hat, eye, mouth, colour), a screenshot, and which browser/emulation you
  used. List **real-device / shared-Wi-Fi** results separately from emulated ones.
- Deliver on your `hyperagent/*` branch like Gloop, folder `docs/art-review/hyperagent/<date>-designer-qa/` with a
  README. No writes to Claude branches, no edits in `src/` or `public/`.
