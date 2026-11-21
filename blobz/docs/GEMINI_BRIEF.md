# Gemini prompts for Blobz art (exact sizes)

Why: the first Gemini sheets had clean pixels but the wrong sizes (trees 44x54, logs 60x56, bushes 46x44 art px, our game needs
30x34, 16x13, 16x14). Gemini chooses its own art-pixel size unless it is told the grid. These prompts fix the grid: the image is
**2528 x 1696 px** and **one art pixel = exactly 16 x 16 output px**, so the canvas is **158 x 106 art pixels**; every object gets an exact size in
art pixels. Paste one prompt per reply. Ask for **PNG** (the first sheets were JPEG).

Sizes (art px, from our current art): tree round 30x34, apple tree 32x34, pine 24x38, stumps 16x10 / 14x10 / 12x10,
bush with berries 16x14, bush without berries 16x14, log pile icon 16x13 and 32x26. Berries (16x14 / 31x27) and rocks
(17x16 / 30x27) from the first round already fit and need no redo.

## Common block (put at the start of every prompt)

```
PIXEL GRID. Draw TRUE pixel art on a strict grid. The final image is 2528 x 1696 pixels. One art pixel is EXACTLY a 16 x 16
pixel square of one flat colour, so the picture is a grid of 158 x 106 art pixels. Do not draw any detail smaller than one
art pixel. Every object below has an EXACT size in art pixels (width x height, counted in those squares, outline included):
if an object is not exactly that many squares wide and tall, redraw it. Crisp hard edges only: no anti-aliasing, no
gradients, no blur, no soft shading, no dithering, no glow, no drop shadow. Export as PNG.
BACKGROUND. Solid flat magenta #ff00ff everywhere outside the objects. No magenta, pink or purple inside the objects.
STYLE. Same look as the sheet you made before (clean, chunky, readable), but at the small sizes below. 1 art pixel dark outline
#141b1b around every object, light from the top-left, 3 to 4 tones per colour, at most 16 colours per object. Slightly
top-down 3/4 view. No text, no labels, no ground.
LAYOUT. Objects stand in a row with at least 8 art pixels (128 px) of magenta between them and around the edges; each object
is centred in its column and, in a row, all objects stand on the same baseline.
```

## Prompt A: trees and stumps (one image)

```
[common block]
Row 1, left to right, three trees: (1) round green leafy tree, EXACTLY 30 x 34 art pixels; (2) a tall pine tree, EXACTLY 24 x 38
art pixels; (3) round green leafy tree with 5 to 6 small red apples, EXACTLY 32 x 34 art pixels.
Row 2, left to right, the three cut stumps of those trees (light wood top with growth rings, dark bark sides, a few root
tips): (1) EXACTLY 16 x 10 art pixels; (2) EXACTLY 12 x 10 art pixels; (3) EXACTLY 14 x 10 art pixels.
```

## Prompt B: bushes (one image)

```
[common block]
Two round bushes, left to right: (1) a leafy green bush with 6 to 8 small red berries (each berry 1 art pixel, a lighter
pixel as shine is not needed), EXACTLY 16 x 14 art pixels; (2) the same bush without berries, EXACTLY 16 x 14 art pixels.
Same silhouette in both so they can be swapped.
```

## Prompt C: logs (one image)

```
[common block]
Two small piles of three cut logs (pale round end grain with rings, brown bark, stacked as a triangle), left to right:
(1) EXACTLY 16 x 13 art pixels; (2) the same pile redrawn bigger, EXACTLY 32 x 26 art pixels (draw it again at that size,
do not just enlarge the first).
```

## After delivery
Send the images to Art; Art measures the real pixel size, slices to the exact sizes, flattens the palette and compares with
the current art at game scale. Nothing is added to the game before Stefan has seen it.
