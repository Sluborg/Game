#!/usr/bin/env python3
"""ChatGPT N-37..N-40 (integer-scaling art) -> exact native grids, plus a display-scale review sheet.

usage (from blobz/): python3 scripts/slice_n37_n40.py
ChatGPT did not deliver the exact 8x sizes, so each picture is measured (content bbox + outline run length = real art
pixel) and sampled on a fixed grid over its bbox (outline-keeping median sampler, magenta keyed out):
  N-37 platform: real pixel ~10 px -> native ~214x29; ordered 140x28 -> sampled 140x28 (x pitch 15.3, y 10.3: the deck
       is squeezed horizontally, planks keep their rows)            -> art/lobby/party-platform-140.png
  N-38 background: real pixel ~3.9 px = 937/240 -> 240x430 fits      -> art/bg/start-240.png
  N-39 logo: real pixel ~23 px -> native 64x42. Ordered 150x104 = 2.3 output px per art px (uneven): both are saved,
       art/logo-150.png (ordered size) and art/logo-64.png (native, clean at 5x = 320x210)
  All are then merged to a small flat palette (clean(): 16-48 colours, no dithering), the source's noise removed.
  N-40 tent: real pixel ~37 px -> native 30x29 (a 32x32 icon, not 16): art/icons/cottage-1-32.png (native, clean) and
       art/icons/cottage-1.png (16x16, every 2nd art px merged: lossy)
"""
import os
import sys
import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from slice_grid_orders import load, opening, ART, REV  # noqa: E402
from room_walls import grid  # noqa: E402


def bbox(m):
    ys, xs = np.where(opening(m, 3))
    return xs.min(), xs.max() + 1, ys.min(), ys.max() + 1


def fixed(rgb, m, box, nx, ny):
    x0, x1, y0, y1 = box
    g, _ = grid(rgb[y0:y1, x0:x1], m[y0:y1, x0:x1], (x1 - x0) / nx - 1e-6, (y1 - y0) / ny - 1e-6, 0, 0)
    return g[:ny, :nx]


def clean(g, k):
    """One flat colour per art pixel family: the source's JPEG-like noise gives every sampled cell its own colour, so
    the colours are merged to a k-colour palette (median cut, no dithering); alpha stays hard."""
    a = g[:, :, 3] > 0
    q = Image.fromarray(g[:, :, :3]).quantize(colors=k, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB')
    out = np.dstack([np.array(q), np.where(a, 255, 0).astype(np.uint8)])
    return out


def save(g, *p):
    path = os.path.join(ART, *p)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    Image.fromarray(np.ascontiguousarray(g)).save(path)
    print(os.path.relpath(path, ART), g.shape[1], 'x', g.shape[0], 'colours', len(np.unique(g.reshape(-1, 4), axis=0)))
    return Image.fromarray(g)


def main():
    out = {}
    rgb, m = load('n37-platform.png')
    out['platform 140x28 (2x)'] = (save(clean(fixed(rgb, m, bbox(m), 140, 28), 24), 'lobby', 'party-platform-140.png'), 2)
    a = np.array(Image.open(os.path.join(REV, 'n38-background.png')).convert('RGBA')).astype(float)
    full = np.ones(a.shape[:2], bool)
    out['background 240x430 (1x here)'] = (save(clean(fixed(a[:, :, :3], full, (0, a.shape[1], 0, a.shape[0]), 240, 430), 48), 'bg', 'start-240.png'), 1)
    rgb, m = load('n39-logo.png')
    b = bbox(m)
    out['logo 150x104 (2x)'] = (save(clean(fixed(rgb, m, b, 150, 104), 32), 'logo-150.png'), 2)
    out['logo native 64x42 (5x)'] = (save(clean(fixed(rgb, m, b, 64, 42), 32), 'logo-64.png'), 5)
    rgb, m = load('n40-tent.png')
    b = bbox(m)
    t = clean(fixed(rgb, m, b, 30, 29), 16)
    c32 = np.zeros((32, 32, 4), np.uint8)
    c32[32 - 29 - 1:32 - 1, 1:31] = t
    out['tent native 32x32 (2x)'] = (save(c32, 'icons', 'cottage-1-32.png'), 2)
    c16 = np.zeros((16, 16, 4), np.uint8)
    c16[1:16, 1:16] = clean(fixed(rgb, m, b, 15, 15), 16)
    out['tent 16x16 (1x, 2x)'] = (save(c16, 'icons', 'cottage-1.png'), 2)
    # review sheet at display scale (background shown 1x to keep the sheet small; it displays 2x in game)
    W = 560
    tiles = [(k, im.resize((im.width * s, im.height * s), Image.NEAREST)) for k, (im, s) in out.items()]
    H = sum(t.height + 26 for _, t in tiles) + 40
    sheet = Image.new('RGBA', (W, H), (58, 120, 64, 255))
    d = ImageDraw.Draw(sheet)
    d.rectangle((0, 0, W, 34), fill=(14, 18, 18, 255))
    d.text((8, 8), 'N-37..N-40 sliced to native grids, shown at display scale', fill='white', font_size=15)
    y = 40
    for k, t in tiles:
        d.text((8, y), k, fill='#ffe18d', font_size=13)
        sheet.alpha_composite(t, (8, y + 20))
        y += t.height + 26
    sheet.save(os.path.join(REV, 'n37-n40-sliced.png'))
    print('docs/art-review/n37-n40-sliced.png', sheet.size)


if __name__ == '__main__':
    main()
