#!/usr/bin/env python3
"""Slice the ChatGPT hovering-weapons sheet (docs/art-review/n4-weapons.png) into public/art/dungeon/weapons/.

usage (from blobz/): python3 scripts/slice_weapons.py

The sheet is AI pixel art at ~9 image px per art pixel (measured from the 1-art-px outline). Each object is sampled
on its own 9 px grid (offset chosen for the least colour spread per cell), cell colour = median of the cell centre,
hard alpha, near-duplicate colours merged. Output: one PNG per weapon, pointing right, transparent background.
"""
import os
import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SRC = os.path.join(ROOT, 'docs', 'art-review', 'n4-weapons.png')
OUT = os.path.join(ROOT, 'public', 'art', 'dungeon', 'weapons')
P = 9.0
BOXES = {'sword': (73, 313, 313, 414), 'daggers': (395, 539, 297, 428), 'hammer': (621, 805, 304, 422),
         'spear': (878, 1219, 331, 404), 'staff': (1287, 1548, 324, 407), 'shield': (1923, 2092, 281, 449)}


def sample(reg, p, ox, oy):
    H, W, _ = reg.shape
    ny, nx = int((H - oy) // p), int((W - ox) // p)
    out = np.zeros((ny, nx, 4), dtype=np.uint8)
    spread = 0.0
    for j in range(ny):
        for i in range(nx):
            y0, x0 = oy + j * p, ox + i * p
            c = reg[int(y0 + p * 0.3):int(y0 + p * 0.7) + 1, int(x0 + p * 0.3):int(x0 + p * 0.7) + 1]
            if c[:, :, 3].mean() < 128:
                continue
            col = np.median(c[:, :, :3].reshape(-1, 3), axis=0)
            spread += c[:, :, :3].std(axis=(0, 1)).sum()
            out[j, i] = (*col.astype(np.uint8), 255)
    return out, spread


def merge_colours(a, tol=28):
    cols = []
    for p in a.reshape(-1, 4):
        if p[3] and not any(np.abs(c - p[:3].astype(int)).sum() < tol for c in cols):
            cols.append(p[:3].astype(int))
    for y in range(a.shape[0]):
        for x in range(a.shape[1]):
            if a[y, x, 3]:
                d = [np.abs(c - a[y, x, :3].astype(int)).sum() for c in cols]
                a[y, x, :3] = cols[int(np.argmin(d))]
    return a


def crop(a):
    ys, xs = np.where(a[:, :, 3] > 0)
    return a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


def main():
    im = np.array(Image.open(SRC).convert('RGBA')).astype(float)
    os.makedirs(OUT, exist_ok=True)
    for name, (x0, x1, y0, y1) in BOXES.items():
        reg = im[y0 - 6:y1 + 7, x0 - 6:x1 + 7]
        best = None
        for ox in np.arange(0, P, 0.5):
            for oy in np.arange(0, P, 0.5):
                a, s = sample(reg, P, ox, oy)
                n = (a[:, :, 3] > 0).sum()
                if n and (best is None or s / n < best[0]):
                    best = (s / n, a)
        a = crop(merge_colours(best[1]))
        if name == 'daggers':  # the pair, and each dagger on its own (Code 2 uses two separate daggers)
            Image.fromarray(a).save(os.path.join(OUT, 'daggers.png'))
            rows = np.where(a[:, :, 3].any(1))[0]
            gap = [r for r in range(rows.min(), rows.max()) if not a[r, :, 3].any()]
            cut = gap[len(gap) // 2] if gap else a.shape[0] // 2
            Image.fromarray(crop(a[:cut].copy())).save(os.path.join(OUT, 'dagger-1.png'))
            Image.fromarray(crop(a[cut:].copy())).save(os.path.join(OUT, 'dagger-2.png'))
        else:
            Image.fromarray(a).save(os.path.join(OUT, f'{name}.png'))
    for f in sorted(os.listdir(OUT)):
        if f.endswith('.png'):
            print(f, Image.open(os.path.join(OUT, f)).size)


if __name__ == '__main__':
    main()
