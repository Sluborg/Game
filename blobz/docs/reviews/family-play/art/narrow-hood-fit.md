# Narrow healer hood

![Narrow healer hood on Lång and Päron through the idle and glide poses](narrow-hood-fit.gif)

Lång is on the left and Päron is on the right. The loop runs idle, glide, glide, idle. The identical glide frames share one hold. The preview uses the game's 20×20 blue body renders at 5× nearest-neighbour.

[The native hood strip](narrow-hood-frames.png) has four 16×8 cells, in the same order as the healer row of [the supplied class sheet](class-frames.png). Each hood fits within 12×7 pixels and uses flat cream, shadow, red and plum on solid `#ff00ff`. To reproduce the preview, place the cell at `(2, bodyTop - 5)` on the body grid. Mirror the finished composite for left-facing characters.

| Body | Idle overhang | Glide overhang |
| --- | ---: | ---: |
| Lång | 25 → 14 px | 20 → 8 px |
| Päron | 25 → 14 px | 21 → 10 px |

The count covers the lower three hood rows and compares both widths at the same attachment height. All eight placements fit inside the body grid and clear every supported eye and mouth style. This is a review asset.
