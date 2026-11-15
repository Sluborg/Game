#!/usr/bin/env python3
"""Board option sheets: every Ninja Adventure tree (+ chopped stump options) and depleted-stone options.

usage (from blobz/): python3 scripts/res_trees.py -> docs/art-review/res-trees.png, res-stone-depleted.png
Each candidate is numbered, drawn at 3x on the game's Ninja grass next to a 3x blob for scale, with file + rect.
"""
import os
import sys
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from blobz_v2_final import render  # noqa: E402

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
NA = os.path.join(ROOT, 'public', 'assets', 'ninja-adventure', 'Backgrounds', 'Tilesets')
OUT = os.path.join(ROOT, 'docs', 'art-review')
N, V, F = 'TilesetNature.png', 'TilesetVillageAbandoned.png', 'TilesetFloorDetail.png'
S = 3

TREES = [
    (N, (0, 0, 32, 32), 'round, orange trunk (forbidden: mega trunk)'), (N, (32, 0, 32, 32), 'pine'),
    (N, (64, 0, 32, 32), 'dead tree'), (N, (96, 0, 32, 32), 'tree with roots'), (N, (96, 128, 32, 32), 'small round tree'),
    (N, (224, 0, 32, 32), 'pink blossom'), (N, (256, 0, 32, 32), 'round, green'), (N, (288, 0, 32, 32), 'round, lime'),
    (N, (128, 0, 32, 32), 'snowy pine'), (N, (160, 0, 32, 32), 'white pine'), (N, (192, 0, 32, 32), 'snowy round'),
    (N, (200, 256, 24, 48), 'tall thin tree'),
    (N, (0, 288, 48, 48), 'big, pink'), (N, (48, 288, 48, 48), 'big, green'), (N, (96, 288, 48, 48), 'big, white'),
    (N, (144, 288, 48, 48), 'big, autumn'),
    (V, (64, 96, 32, 32), 'round, mossy (village)'), (V, (64, 144, 32, 32), 'round, dark (village)'),
    (N, (0, 32, 64, 48), 'grove: pines'), (N, (64, 32, 64, 48), 'grove: round'), (N, (256, 32, 64, 48), 'grove: green'),
    (N, (320, 32, 64, 48), 'grove: lime'), (V, (0, 96, 64, 48), 'grove: mossy (village)'), (V, (0, 144, 64, 48), 'grove: dark (village)'),
]
STUMPS = [
    (N, (0, 128, 32, 32), 'stump, dark + roots'), (N, (32, 128, 32, 32), 'stump, orange'), (N, (64, 128, 16, 16), 'stump, small'),
    (N, (64, 208, 16, 16), 'stump top a'), (N, (80, 208, 16, 16), 'stump top b'), (N, (96, 208, 16, 16), 'stump top c'),
    (N, (224, 288, 16, 16), 'stump, tiny'), (V, (96, 128, 16, 16), 'stump top (village)'),
    (V, (112, 112, 16, 16), 'stump a (village)'), (V, (128, 112, 16, 16), 'stump b (village)'), (V, (96, 176, 16, 16), 'stump c (village)'),
    (V, (112, 128, 32, 64), 'hollow trunk, ENORMOUS (village)'), (V, (64, 128, 32, 16), 'roots only (village)'),
]
STONE_DONE = [(N, (240 + 16 * i, 288, 16, 16), f'pebbles {i + 1}') for i in range(4)] + [
    (N, (240, 144, 16, 16), 'small rock, brown'), (N, (288, 144, 16, 16), 'small rock, grey'),
    (N, (80, 192, 16, 16), 'snowball / round pebble'),
] + [(F, (16 * i, 0, 16, 16), f'stone bits {k + 1}') for k, i in enumerate((3, 4))] + [  # the other row-0 bits are leaves/twigs
    (V, (96, 48, 32, 32), 'flat rocks (village)'), (V, (128, 48, 32, 32), 'flat rocks b (village)'), (V, (160, 48, 16, 16), 'flat rock (village)'),
]


def crop(f, r):
    im = Image.open(os.path.join(NA, f)).convert('RGBA').crop((r[0], r[1], r[0] + r[2], r[1] + r[3]))
    bb = im.getbbox()
    return im.crop(bb) if bb else im


def sheet(title, sections, blob, out, cols=6):
    grass = Image.open(os.path.join(NA, 'TilesetFloor.png')).convert('RGBA').crop((0, 192, 16, 208)).resize((16 * S, 16 * S), Image.NEAREST)
    cw, ch = 240, 260
    rows = sum((len(items) + cols - 1) // cols for _, items in sections)
    W, H = cols * cw + 20, rows * ch + 60 + 40 * len(sections)
    im = Image.new('RGBA', (W, H))
    for y in range(0, H, 16 * S):
        for x in range(0, W, 16 * S):
            im.alpha_composite(grass, (x, y))
    d = ImageDraw.Draw(im)
    d.rectangle((0, 0, W, 44), fill=(20, 27, 27, 230))
    d.text((12, 10), title, fill='white', font_size=22)
    y, k = 54, 0
    bl = blob.resize((blob.width * S, blob.height * S), Image.NEAREST)
    for head, items in sections:
        d.rectangle((0, y, W, y + 32), fill=(20, 27, 27, 200))
        d.text((12, y + 6), head, fill='#ffe18d', font_size=18)
        y += 40
        for i, (f, r, label) in enumerate(items):
            k += 1
            x, yy = 10 + (i % cols) * cw, y + (i // cols) * ch
            spr = crop(f, r)
            big = spr.resize((spr.width * S, spr.height * S), Image.NEAREST)
            base = yy + 190
            im.alpha_composite(bl, (x + 6, base - bl.height))
            im.alpha_composite(big, (x + 6 + bl.width + 6, base - big.height))
            d.rounded_rectangle((x + 4, yy + 196, x + cw - 12, yy + 250), 6, fill=(20, 27, 27, 200))
            d.text((x + 10, yy + 198), f'{k}. {label}', fill='#ffe18d', font_size=14)
            d.text((x + 10, yy + 222), f'{f} {r[0]},{r[1]},{r[2]},{r[3]}', fill='white', font_size=11)
        y += ((len(items) + cols - 1) // cols) * ch
    im.crop((0, 0, W, y + 10)).save(os.path.join(OUT, out))
    print(out, k)


def main():
    blob = render([{'look': {'color': 0x5ec8ff, 'shape': 0, 'eyes': 0, 'mouth': 0, 'hat': 0}}])[0]
    blob = blob.crop(blob.getbbox())
    sheet('TREES: Ninja Adventure candidates (3x, blob for scale), pick a tree + its chopped stump',
          [('Trees (wood node)', TREES), ('Chopped state (stump options)', STUMPS)], blob, 'res-trees.png')
    sheet('STONE NODE, MINED OUT: Ninja candidates (3x, blob for scale), pick one (rubble, not a stump)',
          [('Depleted stone options', STONE_DONE)], blob, 'res-stone-depleted.png')


if __name__ == '__main__':
    main()
