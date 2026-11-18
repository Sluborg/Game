# Priest hood fitting test

![Looping priest hood preview on six Blobz bodies](class-hat-fit.gif)

Read left to right. Top row: Kupol, Boll, Lång. Bottom row: Platt, Päron, Kub.

The preview composites the four priest hood cells in the second row of [the supplied class sheet](class-frames.png) onto the actual bare body renders from [the game](../../../../src/blob.ts). The same attachment rule places the centre of the hood opening on each pose’s top outline. The preview uses idle, glide, glide and idle body poses. The middle two compositions are identical and share one GIF frame. Source pixels are preserved at 5× nearest-neighbour against solid magenta.

| Body | Observed fit |
| --- | --- |
| Kupol | The hood follows the dome. Its sides sit close to the body during glide. |
| Boll | Clear face and readable hood. The sides sit farther in as the silhouette widens during glide. |
| Lång and Päron | The shared anchor follows each body, with visible overhang on the narrower heads. |
| Platt and Kub | The hood wraps deepest around the sides and covers one of the three shine pixels throughout the loop. |

All 24 source-frame placements keep the eyes and mouth clear and fit within the 20×20 sprite. The hood is a wrapped class item, so other brim shapes may fit differently. Test width variants if the overhang on narrow heads matters. A shared attachment point supports all six silhouettes in this test.
