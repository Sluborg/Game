#!/usr/bin/env python3
"""ChatGPT N-41 berry food icon -> art/icons/res-berry-16.png + res-berry-32.png (true native grids, flat palette),
plus a HUD-row look next to the N-27 wood icons: docs/art-review/n41-berry-sliced.png.

usage (from blobz/): python3 scripts/slice_n41.py
Measured: small icon ~16.2 src px per art px -> 15x16 (fits 16x16); big icon ~15.25 src px -> 30x32 (fits 32x32; a
coarser ~21 px reading gives 22x23, rejected: more colour spread). Pitch + offset by least colour spread (sample()),
then merged to a 12-colour flat palette (no dithering), bottom-centred in the cell.
"""
import os
import sys
import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from slice_grid_orders import load, opening, objects, sample, ART, REV  # noqa: E402
from slice_n37_n40 import clean  # noqa: E402


def main():
    rgb, m = load('n41-berry.png')
    objs = objects(opening(m, 3))
    out = {}
    for (x0, x1, y0, y1), n, p0 in zip(objs, (16, 32), (16.0, 15.0)):
        a, b = rgb[y0 - 6:y1 + 6, x0 - 6:x1 + 6], m[y0 - 6:y1 + 6, x0 - 6:x1 + 6]
        _, g, p = sample(a, b, p0, (n, n))
        g = clean(g, 12)
        c = np.zeros((n, n, 4), np.uint8)
        h, w = g.shape[:2]
        c[n - h:, (n - w) // 2:(n - w) // 2 + w] = g
        Image.fromarray(c).save(os.path.join(ART, 'icons', f'res-berry-{n}.png'))
        out[n] = Image.fromarray(c)
        print(f'res-berry-{n}.png', w, 'x', h, 'pitch', round(p, 2))
    wood = {n: Image.open(os.path.join(ART, 'icons', f'res-wood-{n}.png')).convert('RGBA') for n in (16, 32)}
    W = 400
    sheet = Image.new('RGBA', (W, 600), (14, 18, 18, 255))
    d = ImageDraw.Draw(sheet)
    d.text((8, 6), 'N-41 berry icon next to the wood icon (HUD row look)', fill='white', font_size=14)
    y = 34
    for n, sc in ((16, 2), (16, 3), (32, 1), (32, 2)):
        d.text((8, y), f'{n}x{n} at {sc}x', fill='#ffe18d', font_size=12)
        bar = Image.new('RGBA', (W - 16, n * sc + 12), (40, 34, 52, 255))
        x = 8
        for icon, cnt in ((wood[n], '12'), (out[n], '7')):
            bar.alpha_composite(icon.resize((n * sc, n * sc), Image.NEAREST), (x, 6))
            ImageDraw.Draw(bar).text((x + n * sc + 6, 6 + n * sc // 2 - 10), cnt, fill='white', font_size=18)
            x += n * sc + 60
        sheet.alpha_composite(bar, (8, y + 16))
        y += n * sc + 36
    sheet = sheet.crop((0, 0, W, y))
    sheet.save(os.path.join(REV, 'n41-berry-sliced.png'))
    print('docs/art-review/n41-berry-sliced.png', sheet.size)


if __name__ == '__main__':
    main()
