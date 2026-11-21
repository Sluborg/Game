# N-43 — 12 hats, first review draft

**Gloop · Hyperagent · 2026-11-21.** Original AI-assisted pixel rows drawn for Blobz, not traced or copied. Draft only; no runtime asset, preset, or gameplay changes. Claude Art can slice the sheet; these need Stefan's review before wiring.

- `n43-hats.png`: RGB, solid `#ff00ff`, exactly 672×896 at 8× nearest-neighbour. Native sheet is 84×112. Cell `(col,row)` starts at `(4+20*col,4+12*row)` in native pixels, zero based. Cells are 16×8. Use groups of three sheet rows in L/M/S order. Cell anchor `(8,7)`; magenta is transparent.
- `hats.rows`: indexed 1–12 in inbox order, **S/M/L** per line (different from the sheet). `.` is transparent; other codes come from `PART_TABLES.palette`. The cropped row sprite's `(ax,ay)` is `(floor(width/2),height-1)`.
- `n43-preview.png`: Swedish labels, hats only in S/M/L at 3× gameplay scale and 1× native scale on solid magenta `#ff00ff`. No characters, faces, or body silhouettes in either image.

## Placement and checks

- Use an already-outlined overlay at `(10, bodyLayout(shape, frame).top - 1)`. Do not apply the current fitted-cap path or generate another outline. Let the renderer mirror the complete blob, not the individual PNG on export. Existing preset IDs are untouched; preview numbers are order numbers, not new runtime indices.
- Verified 36 native sprites, all size bounds and opaque anchors, exact gaps, and uniform 8× pixel blocks. Checked 432 placements (12 hats × 6 shapes × 2 frames × 3 colours) against the pinned renderer: no occupied pixel leaves the 20×20 frame, enters the body, or touches the head shine. Since these overlays sit entirely above the body, they don't cover eyes. No live, real-device, or multiplayer check performed.
- Rev 2: Shape-specific top widths differ even within a size. Cropped the bottom contact row to at most 6/6/10 px (S/M/L), bottom-center anchored: verified at most 1 art px per side past the actual contact row on all six silhouettes, idle and glide. Upper brims can project deliberately; check those in-game. Replaced pink/violet accents with red/blue for a cleaner magenta key. Check how 1 and 11 read after mirroring; the bill should remain the differentiator. The smallest crown, headband and flower crown compress to distinct colours more than fine details. Ask before replacing any existing hat.

## Source and prompt

Order and updated art rules: `claude/blobz-art@75b7a0d`, `blobz/docs/HYPERAGENT_INBOX.md`; contract, palette, and reference render: `claude/mobile-game-5-players-8qthjq@4244d50`, `blobz/docs/HYPERAGENT_BRIEF.md` and `blobz/src/blob.ts`. Existing `hats-current.png` used as visual reference only. No assets from external packs included.

Working prompt: Draw the 12 N-43 silhouettes in order, each in three native pixel sizes. Look like tiny garments sitting on jelly, not masks that cover the forehead: flat Ninja Adventure-style colours, one-pixel #141b1b contour, top-left light, restrained accents. Give the two caps opposite bills and distinct colours, keep small crowns readable by silhouette, and preserve the top-left shine and eyes. No ears, horns, antennae, halos, text or logos in cells. Deliver the exact magenta grid and a Swedish-labelled 1×/3× preview.

## Decode the PNGs from this handoff branch

GitHub transport here is text-only. The `.png.b64` sidecars preserve the original PNG bytes exactly. In this directory, run `python3 decode_pngs.py` to write the two PNGs; the script checks the hashes below, and will not overwrite an existing file.

- `n43-hats.png`: `2f0c181a3483d921ec97b39db540bd35533fcd1be55513c0a85f2e67f27ee052`
- `n43-preview.png`: `6769aa8f6d8ecd9cd4ea6b87b815050e9fc8445c01ef39ecfa50d7c440cd51aa`
