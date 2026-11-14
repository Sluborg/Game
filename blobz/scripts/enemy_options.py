#!/usr/bin/env python3
"""Enemy candidates sheet for the board (docs/art-review/enemy-options.png), shown at game scale next to a blob.

usage (from blobz/): python3 scripts/enemy_options.py <kenney_dir>
  <kenney_dir> holds the unzipped Kenney "Tiny Creatures" pack (CC0, opengameart.org) as tiny-creatures/.
  Tiny Dungeon (CC0) is already vendored in public/assets/.
Each enemy is a 16 px Kenney sprite drawn at scale 2 (as the dungeon tiles are today); the blob is drawn at
BLOB_SCALE 1.45. The whole sheet is enlarged 2x so it reads on a phone. Numbered 1..N for a multi-pick.
"""
import os
import sys
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import class_cards as cc  # noqa: E402

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
KD = sys.argv[1] if len(sys.argv) > 1 else '.'
TD = Image.open(os.path.join(ROOT, 'public', 'assets', 'kenney-tiny-dungeon', 'tilemap_packed.png')).convert('RGBA')

CANDIDATES = [  # (label, source, id)
    ('Slime cube', 'tc', 81), ('Mushroom', 'tc', 14), ('Bee', 'tc', 141), ('Bat', 'td', 120), ('Ghost', 'td', 121),
    ('Spider', 'td', 122), ('Rat', 'td', 123), ('Fire wisp', 'tc', 46), ('Rock golem', 'tc', 48), ('Mimic chest', 'td', 92),
    ('Snake', 'tc', 41), ('Beetle', 'tc', 144),
]


def sprite(src, i):
    if src == 'td':
        return TD.crop(((i % 12) * 16, (i // 12) * 16, (i % 12) * 16 + 16, (i // 12) * 16 + 16))
    im = Image.open(os.path.join(KD, 'tiny-creatures', 'tiny-creatures', 'Tiles', f'tile_{i:04d}.png')).convert('RGBA')
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            if px[x, y][:3] == (0, 0, 0):
                px[x, y] = (0, 0, 0, 0)  # the pack's tiles sit on solid black
    return im


def main():
    v = 2  # view enlargement
    blob = cc.blobs()['healer']
    blob = blob.resize((round(blob.width * 1.45 * v), round(blob.height * 1.45 * v)), Image.NEAREST)
    goo = Image.open(os.path.join(ROOT, 'public', 'art', 'enemies', 'goo-small.png')).convert('RGBA')
    cell_w, cell_h, cols = 200, 150, 4
    items = [('today: goo', goo, 2)] + [(f'{n + 1}  {lab}', sprite(s, i), 2) for n, (lab, s, i) in enumerate(CANDIDATES)]
    rows = (len(items) + cols - 1) // cols
    out = Image.new('RGBA', (cols * cell_w + 20, rows * cell_h + 60), (108, 191, 69, 255))
    d = ImageDraw.Draw(out)
    d.text((12, 10), 'Enemy candidates (Kenney CC0, 16 px at scale 2) next to a blob: pick numbers', fill=(255, 247, 230, 255), font_size=18)
    for k, (label, im, sc) in enumerate(items):
        x0, y0 = 10 + (k % cols) * cell_w, 44 + (k // cols) * cell_h
        d.rounded_rectangle((x0 + 2, y0 + 2, x0 + cell_w - 4, y0 + cell_h - 4), 10, fill=(98, 176, 62, 255))
        big = im.resize((im.width * sc * v, im.height * sc * v), Image.NEAREST)
        base = y0 + cell_h - 34
        out.alpha_composite(blob, (x0 + 10, base - blob.height))
        out.alpha_composite(big, (x0 + cell_w - 14 - big.width, base - big.height))
        d.text((x0 + 10, base + 6), label, fill=(63, 38, 49, 255), font_size=16)
    path = os.path.join(ROOT, 'docs', 'art-review', 'enemy-options.png')
    out.save(path)
    print(path, out.size)


if __name__ == '__main__':
    main()
