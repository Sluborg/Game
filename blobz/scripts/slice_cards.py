#!/usr/bin/env python3
"""Slice ChatGPT order N-5 (4 class cards on one sheet) into public/art/dungeon/card-class-<class>.png.

usage (from blobz/): python3 scripts/slice_cards.py <sheet.png>
Cards are found by alpha (left to right: healer, rogue, tank, marksman). Each card is AI pixel art at ~8-9 image px per
art pixel: the pitch and grid offset are searched per card (least colour spread per cell), each cell takes the median
of its centre, alpha is hard. Output = the card on its own art-pixel grid (about 50-60 px), drawn pixelated by the game.
"""
import os
import sys
import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'public', 'art', 'dungeon')
NAMES = ['healer', 'rogue', 'tank', 'marksman']


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
            out[j, i] = (*np.median(c[:, :, :3].reshape(-1, 3), axis=0).astype(np.uint8), 255)
            spread += c[:, :, :3].std(axis=(0, 1)).sum()
    return out, spread


def main(src):
    a = np.array(Image.open(src).convert('RGBA')).astype(float)
    al = a[:, :, 3] > 128
    cols = np.r_[0, al.any(0).astype(int), 0]
    runs = np.where(np.diff(cols))[0].reshape(-1, 2)
    assert len(runs) == 4, runs
    for name, (x0, x1) in zip(NAMES, runs):
        ys = np.where(al[:, x0:x1].any(1))[0]
        reg = a[ys.min() - 2:ys.max() + 3, x0 - 2:x1 + 2]
        best = None
        for p in np.arange(8.0, 9.61, 0.1):
            for ox in np.arange(0, p, 1.0):
                for oy in np.arange(0, p, 1.0):
                    s, sp = sample(reg, p, ox, oy)
                    n = (s[:, :, 3] > 0).sum()
                    if n and (best is None or sp / n < best[0]):
                        best = (sp / n, s, p)
        s = best[1]
        ys2, xs2 = np.where(s[:, :, 3] > 0)
        s = s[ys2.min():ys2.max() + 1, xs2.min():xs2.max() + 1]
        Image.fromarray(s).save(os.path.join(OUT, f'card-class-{name}.png'))
        print(name, s.shape[1], 'x', s.shape[0], 'pitch', round(best[2], 1))


if __name__ == '__main__':
    main(sys.argv[1])
