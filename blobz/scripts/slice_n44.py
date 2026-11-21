#!/usr/bin/env python3
"""ChatGPT N-44 dungeon room props (docs/art-review/n44-props.png, delivered 1599x984, NOT the ordered 992x608) ->
public/art/dungeon/props/*.png in 16x32 cells (bottom-centre anchor; the cobweb hangs from the top-left corner),
true native pixels, flat palette, + docs/art-review/n44-props-sliced.png (props on 0x72 floor_1 at 3x).

usage (from blobz/): python3 scripts/slice_n44.py
Measured: real art pixel ~12 src px (outline run), so 16 art px = ~192 src px: the props are native 16 px props
(barrel 14x18, standing torch 9x30, wall torch 12x17-20, bones 14x10, skull decal 14x14, cobweb 17x15, puddle 16x8).
Every prop is sampled at the SAME pitch, 12.0 src px (only the grid offset is searched per prop; free pitches gave the
two flame frames of one torch different pitches 13.4 / 10.8), then merged to a small flat palette.
"""
import os
import sys
import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from slice_grid_orders import load, opening, objects, bands, sample_fixed, ART, REV  # noqa: E402
from slice_n37_n40 import clean  # noqa: E402

NAMES = ['barrel-a', 'barrel-b', 'torch-stand-0', 'torch-stand-1', 'torch-wall-0', 'torch-wall-1',
         'bones-a', 'bones-b', 'skull-decal', 'cobweb', 'puddle']
DUN = os.path.join(ART, 'dungeon', 'props')


def main():
    rgb, m = load('n44-props.png')
    m2 = opening(m, 3)
    boxes = []
    for y0, y1 in bands(m2, min_h=8):
        boxes += [(int(a), int(b), y0 + int(c), y0 + int(d)) for a, b, c, d in objects(m2[y0:y1], min_w=8)]
    boxes = [b for b in boxes if (b[1] - b[0]) * (b[3] - b[2]) > 3000]
    # reading order: row 1 (y < 520) left to right, then row 2
    boxes.sort(key=lambda b: (b[2] > 520, b[0]))
    assert len(boxes) == len(NAMES), (len(boxes), boxes)
    os.makedirs(DUN, exist_ok=True)
    tiles = {}
    for name, (x0, x1, y0, y1) in zip(NAMES, boxes):
        a, b = rgb[y0 - 8:y1 + 8, x0 - 8:x1 + 8], m[y0 - 8:y1 + 8, x0 - 8:x1 + 8]
        best = sample_fixed(a, b, 12.0, (20, 36))  # one pitch for every prop (the flame frames must match)
        if best is None:
            raise SystemExit(f'{name}: no grid fits')
        g = clean(best[1], 14)
        c = g[:, :, :3].astype(int)  # thin strands blend with the magenta: purple cells -> the prop's own strand colour
        pur = (g[:, :, 3] > 0) & (c[:, :, 0] - c[:, :, 1] > 25) & (c[:, :, 2] - c[:, :, 1] > 25)
        if pur.any():
            ok = (g[:, :, 3] > 0) & ~pur & (c.sum(2) > 330)
            g[pur, :3] = np.median(c[ok], axis=0).astype(np.uint8)
        h, w = g.shape[:2]
        cell = np.zeros((32, 16, 4), np.uint8)
        if name == 'cobweb':
            cell[:h, :w] = g[:32, :16]
        else:
            x = max(0, (16 - w) // 2)
            cell[32 - min(h, 32):, x:x + min(w, 16)] = g[-32:, :16]  # (a taller flame frame loses its top row(s) here: reported)
        Image.fromarray(cell).save(os.path.join(DUN, f'{name}.png'))
        tiles[name] = Image.fromarray(cell)
        print(name, f'{w}x{h}', 'pitch', round(best[2], 2))
    # preview: each prop on floor_1 at 3x, numbered
    sh = Image.open(os.path.join(ART, '..', 'assets', '0x72-dungeon-ii', '0x72_DungeonTilesetII_v1.7.png')).convert('RGBA')
    floor = sh.crop((16, 64, 32, 80))
    S, COLS, CW = 3, 4, 120
    rows = (len(NAMES) + COLS - 1) // COLS
    im = Image.new('RGBA', (COLS * CW, 40 + rows * (48 * S + 24)), (14, 18, 18, 255))
    d = ImageDraw.Draw(im)
    d.text((8, 6), 'N-44 props sliced to native 16x32 cells (3x on 0x72 floor_1)', fill='white', font_size=14)
    for i, name in enumerate(NAMES):
        c, r = i % COLS, i // COLS
        cell = Image.new('RGBA', (CW // S, 32 + 16))
        for yy in range(0, 48, 16):
            for xx in range(0, CW // S, 16):
                cell.alpha_composite(floor, (xx, yy))
        cell.alpha_composite(tiles[name], ((CW // S - 16) // 2, 8))
        x, y = c * CW, 40 + r * (48 * S + 24)
        im.paste(cell.resize((CW, 48 * S), Image.NEAREST), (x, y))
        d.text((x + 4, y + 48 * S + 2), f'{i + 1}. {name}', fill='#ffe18d', font_size=12)
    im.save(os.path.join(REV, 'n44-props-sliced.png'))
    print('docs/art-review/n44-props-sliced.png', im.size)


if __name__ == '__main__':
    main()
