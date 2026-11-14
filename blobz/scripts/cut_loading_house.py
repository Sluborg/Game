#!/usr/bin/env python3
"""Cut the cottage out of Stefan's ChatGPT loading-screen art into public/art/base/cottage-1.png.

usage (from blobz/): python3 scripts/cut_loading_house.py SOURCE.png
SOURCE is the full-size portrait loading image (941x1672; public/art/loading.png is a 2x-downscaled copy).
Steps: hand-traced house polygon (minus grass/sky colours) -> sample the ChatGPT pixel grid (9.6 x 10.35 px per art
pixel, it is stretched slightly differently per axis) at cell centres -> peel sun/bush leftovers off the edge ->
clean 1 px plum outline -> redraw the chimney cap -> remove isolated specks -> merge colour noise (clean_art.py).
The shipped file also had two olive specks (roof top-left corner, wall bottom-left corner) removed by hand.
"""
import os
import subprocess
import sys
from collections import Counter
import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'public', 'art', 'base', 'cottage-1.png')
X0, Y0 = 240, 700
POLY = [(28, 222), (30, 212), (60, 150), (110, 100), (165, 60), (320, 60), (320, 36), (398, 36), (398, 76), (386, 78),
        (392, 100), (430, 150), (452, 212), (452, 222), (418, 226), (418, 348), (52, 348), (52, 226)]
PX, PY, OX, OY = 9.6, 10.35, 249.5, 700.5
PLUM = (63, 38, 49, 255)
T = (0, 0, 0, 0)


def sample(src):
    mask = Image.new('L', src.size, 0)
    ImageDraw.Draw(mask).polygon([(x + X0, y + Y0) for x, y in POLY], fill=255)
    im = np.asarray(src).astype(int)
    m = np.asarray(mask) > 0
    r, g, b = im[:, :, 0], im[:, :, 1], im[:, :, 2]
    m &= ~((g > r + 15) & (g > b + 15)) & ~((b > r + 30) & (b > g))
    ys, xs = np.nonzero(m)
    gx0, gx1 = int((xs.min() - OX) // PX), int((xs.max() - OX) // PX) + 1
    gy0, gy1 = int((ys.min() - OY) // PY), int((ys.max() - OY) // PY) + 1
    out = Image.new('RGBA', (gx1 - gx0, gy1 - gy0))
    for gy in range(gy0, gy1):
        for gx in range(gx0, gx1):
            cx, cy = OX + (gx + 0.5) * PX, OY + (gy + 0.5) * PY
            sl = (slice(int(cy - 2), int(cy + 2)), slice(int(cx - 2), int(cx + 2)))
            mm = m[sl]
            if mm.mean() < 0.5:
                continue
            cols = im[sl][mm]
            key = Counter(tuple(c // 24) for c in cols).most_common(1)[0][0]
            grp = np.array([c for c in cols if tuple(c // 24) == key])
            out.putpixel((gx - gx0, gy - gy0), (*grp.mean(0).astype(int), 255))
    return out.crop(out.getbbox())


def plumish(p):
    return p[3] and p[0] < 150 and p[1] < 110 and p[2] < 125


def tidy(im):
    w, h = im.size
    px = im.load()
    border = lambda x, y: any(not (0 <= x + dx < w and 0 <= y + dy < h) or px[x + dx, y + dy][3] == 0 for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
    for _ in range(3):  # sun yellow/cream above the eaves and bush green/red specks on the edge
        kill = [(x, y) for y in range(h) for x in range(w) if px[x, y][3] and not plumish(px[x, y]) and border(x, y)
                and ((px[x, y][0] > 220 and px[x, y][1] > 170 and px[x, y][2] < 170 and y < h * 0.45)
                     or px[x, y][1] > px[x, y][0] + 15 or (y > h - 4 and px[x, y][0] > 200 and px[x, y][1] < 120))]
        for q in kill:
            px[q] = T
    out = Image.new('RGBA', (w + 2, h + 2))
    out.alpha_composite(im, (1, 1))
    return out


def outline(im):
    w, h = im.size
    px = im.load()
    solid = lambda x, y: 0 <= x < w and 0 <= y < h and px[x, y][3] and px[x, y][:3] != PLUM[:3]
    for _ in range(2):  # orphan outline pixels
        kill = [(x, y) for y in range(h) for x in range(w) if px[x, y][3] and px[x, y][:3] == PLUM[:3]
                and not any(solid(x + dx, y + dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1) if dx or dy)]
        for q in kill:
            px[q] = T
    add = [(x, y) for y in range(h) for x in range(w) if not px[x, y][3] and any(solid(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))]
    for q in add:
        px[q] = PLUM
    for y in range(h):
        for x in range(w):
            if plumish(px[x, y]) and sum(px[x, y][:3]) < 220:
                px[x, y] = PLUM


def chimney(im):
    px = im.load()
    w, h = im.size
    A, B, C, G = PLUM, (249, 106, 106, 255), (243, 78, 85, 255), (186, 46, 66, 255)
    E, F = (253, 240, 212, 255), (249, 229, 200, 255)
    for y in range(4):
        for x in range(30, w):
            px[x, y] = T
    for y, row in enumerate(['.AAAAA.', 'ABBCCCA', 'AGGGGGA', 'AAAAAAA']):
        for i, ch in enumerate(row):
            if ch != '.':
                px[32 + i, y] = {'A': A, 'B': B, 'C': C, 'G': G}[ch]
    for y in range(4, 8):
        for x, col in zip(range(33, 38), (A, E, E, F, A)):
            px[x, y] = col
    for y in range(4, 13):
        for x in range(38, w):
            if px[x, y][3] and px[x, y][0] > 200 and px[x, y][1] > 180:
                px[x, y] = T


def specks(im):
    px = im.load()
    w, h = im.size
    n4 = lambda x, y: sum(1 for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)) if 0 <= x + dx < w and 0 <= y + dy < h and px[x + dx, y + dy][3])
    for _ in range(3):
        for q in [(x, y) for y in range(h) for x in range(w) if px[x, y][3] and n4(x, y) <= 1]:
            px[q] = T
    border = lambda x, y: any(not (0 <= x + dx < w and 0 <= y + dy < h) or px[x + dx, y + dy][3] == 0 for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a and border(x, y) and (y < 5 or y > h - 3) and r > 140 and g > 110 and b < 120 and not (r > 200 and g < 130):
                px[x, y] = T


def main():
    src = Image.open(sys.argv[1]).convert('RGB')
    im = tidy(sample(src))
    outline(im)
    im = im.crop(im.getbbox())
    im.save(OUT)
    subprocess.run([sys.executable, os.path.join(ROOT, 'scripts', 'clean_art.py'), OUT], check=True)
    im = Image.open(OUT).convert('RGBA')
    chimney(im)
    outline(im)
    specks(im)
    im = im.crop(im.getbbox())
    specks(im)  # a second pass catches specks that only touch the edge after cropping
    outline(im)
    specks(im)
    im = im.crop(im.getbbox())
    im.save(OUT)
    print(OUT, im.size)


if __name__ == '__main__':
    main()
