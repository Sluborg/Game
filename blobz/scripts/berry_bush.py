#!/usr/bin/env python3
"""Berry bush props: Ninja Adventure has no real berry bush, so red berries are drawn on Ninja's plain bushes.

usage (from blobz/): python3 scripts/berry_bush.py
public/art/props/berry-bush-ninja.png    32x32, from TilesetNature.png 256,0,32,32 (round bush-tree)
public/art/props/berry-bush-ninja-s.png  16x16, from TilesetNature.png 96,160,16,16 (small round bush)
Plain versions (picked clean) are the source rects themselves.
"""
import os
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
NAT = os.path.join(ROOT, 'public', 'assets', 'ninja-adventure', 'Backgrounds', 'Tilesets', 'TilesetNature.png')
OUT = os.path.join(ROOT, 'public', 'art', 'props')
RED, DARK, HI = (224, 57, 76, 255), (143, 62, 86, 255), (255, 255, 255, 255)


def berry(px, x, y):
    """Round 3x3 berry: white glint top-left, red body, dark rim lower-right."""
    for dx, dy, c in ((1, 0, RED), (0, 1, RED), (1, 1, HI), (2, 1, RED), (1, 2, DARK), (2, 2, DARK), (0, 2, RED), (2, 0, RED)):
        px[x + dx, y + dy] = c


def make(rect, spots, name):
    im = Image.open(NAT).convert('RGBA').crop((rect[0], rect[1], rect[0] + rect[2], rect[1] + rect[3]))
    px = im.load()
    for x, y in spots:
        assert px[x, y][3] and px[x + 2, y + 2][3], (name, x, y)
        berry(px, x, y)
    im.save(os.path.join(OUT, name))
    return im


def main():
    make((256, 0, 32, 32), [(7, 6), (17, 4), (23, 10), (12, 12), (4, 15), (19, 17)], 'berry-bush-ninja.png')
    make((96, 160, 16, 16), [(3, 5), (9, 4), (6, 9)], 'berry-bush-ninja-s.png')
    print('ok')


if __name__ == '__main__':
    main()
