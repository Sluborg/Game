#!/usr/bin/env python3
"""End-screen picture without coins: public/art/victory-ninja.png (portrait, 117x208 art px drawn x8).

usage (from blobz/): python3 scripts/victory_art.py
Ninja Adventure grass, a wood pile, rocks and a berry bush in the middle, five cheering blobz (rendered by
src/blob.ts) hopping around it, confetti. The top ~half is plain grass for the title / stars / score text
(style.css shows it with `center 85% / cover`).
"""
import os
import random
import sys
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from blobz_v2_final import render  # noqa: E402

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
NA = os.path.join(ROOT, 'public', 'assets', 'ninja-adventure')
OUT = os.path.join(ROOT, 'public', 'art', 'victory-ninja.png')
W, H, S = 117, 208, 8


def sheet(path, rect=None):
    im = Image.open(os.path.join(NA, path)).convert('RGBA')
    return im.crop((rect[0], rect[1], rect[0] + rect[2], rect[1] + rect[3])) if rect else im


def shadow(w):
    sh = Image.new('RGBA', (w, 2))
    for x in range(1, w - 1):
        sh.putpixel((x, 0), (40, 80, 40, 90))
        sh.putpixel((x, 1), (40, 80, 40, 90))
    return sh


def main():
    rnd = random.Random(7)
    floor = 'Backgrounds/Tilesets/TilesetFloor.png'
    grass = [sheet(floor, (0, 192, 16, 16))] * 20 + [sheet(floor, r + (16, 16)) for r in ((16, 192), (32, 192), (48, 192), (64, 192))]
    im = Image.new('RGBA', (W, H))
    for ty in range(0, H, 16):
        for tx in range(0, W, 16):
            im.alpha_composite(rnd.choice(grass) if ty > 80 else grass[0], (tx, ty))
    cx, cy = W // 2, 150
    # centre: stacked logs left, rocks right, a bush with berries in front (no coins)
    nat = 'Backgrounds/Tilesets/TilesetNature.png'
    camp = 'Backgrounds/Tilesets/tileset_camp.png'
    log = sheet(camp, (0, 0, 32, 16))
    im.alpha_composite(log, (cx - 38, cy - 6))
    im.alpha_composite(log, (cx - 34, cy - 16))
    rock = sheet('Items/Resource/Rock.png')
    for dx, dy in ((14, -16), (22, -6), (8, -6)):
        im.alpha_composite(rock, (cx + dx, cy + dy))
    im.alpha_composite(sheet(nat, (96, 160, 16, 16)), (cx - 9, cy - 4))
    berry = sheet('Items/Food/Nut2.png')
    for dx, dy in ((-14, 6), (-3, 9), (8, 6)):
        im.alpha_composite(berry, (cx + dx, cy + dy))
    # five cheering blobz: happy eyes, open mouth, glide frame, some mirrored to face the pile
    cols = [0x5ec8ff, 0xff6b8b, 0x7ddc5a, 0xffc93c, 0xb18cff]
    spots = [(-36, -40, 2, 1), (34, -40, 8, -1), (-46, 2, 4, 1), (46, 2, 13, -1), (2, 34, 1, 1)]
    reqs = [{'look': {'color': c, 'shape': i % 6, 'eyes': 2, 'mouth': 1, 'hat': h},
             'face': {'dx': f, 'dy': 0}, 'frame': 1} for i, (c, (_, _, h, f)) in enumerate(zip(cols, spots))]
    for (dx, dy, _, _), b in zip(spots, render(reqs)):
        x, y = cx + dx - 10, cy + dy - 10
        im.alpha_composite(shadow(12), (x + 4, y + 18))
        im.alpha_composite(b, (x, y - 3))  # hop: lifted 3 px above its shadow
    # confetti
    conf = [(255, 107, 139), (94, 200, 255), (255, 201, 60), (177, 140, 255), (125, 220, 90), (255, 255, 255)]
    for _ in range(46):
        x, y = rnd.randrange(2, W - 3), rnd.randrange(96, H - 4)
        if abs(x - cx) < 42 and cy - 22 < y < cy + 26:
            continue
        c = (*rnd.choice(conf), 255)
        im.putpixel((x, y), c)
        if rnd.random() < 0.5:
            im.putpixel((x + 1, y), c)
    im.resize((W * S, H * S), Image.NEAREST).save(OUT)
    print(OUT)


if __name__ == '__main__':
    main()
