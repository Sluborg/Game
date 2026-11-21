#!/usr/bin/env python3
"""ChatGPT N-42 ranger bow (docs/art-review/n42-bow.png: one sheet, 1774x887, two bows) -> bow candidates.

usage (from blobz/): python3 scripts/slice_n42.py [16|32 <source: left|right>]...   (no args: candidate sheet only)
Measured (outline run + least-spread search, scripts/slice_n42.py history): NEITHER bow is a native 16x16 / 32x32 icon.
  left bow : real art pixel ~17 src px -> ~30x36 art px picture, soft (spread has no clean minimum 15..19)
  right bow: real art pixel ~14 src px -> ~42x50 art px picture, also soft
So a 16 or 32 icon is a REDUCTION (nearest/median cell sampling over the bbox, hard alpha, flat palette), not a
native sampling. Candidates: A = left -> 16 tall (2.25x down), B = left -> 32 tall (1.1x down, almost native),
C = right -> 32 tall (1.6x down), D = right -> 16 tall (3.1x down).
"""
import os
import sys
import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from slice_grid_orders import load, opening, objects, sample_fixed, ART, REV  # noqa: E402
from slice_n37_n40 import clean  # noqa: E402


def cut(side, n):
    rgb, m = load('n42-bow.png')
    x0, x1, y0, y1 = objects(opening(m, 3))[0 if side == 'left' else 1]
    a, b = rgb[y0 - 6:y1 + 6, x0 - 6:x1 + 6], m[y0 - 6:y1 + 6, x0 - 6:x1 + 6]
    p = (y1 - y0) / n
    best = sample_fixed(a, b, p, (n, n))
    g = clean(best[1], 12)
    c = g[:, :, :3].astype(int)  # purple bleed on thin strokes -> the nearest non-purple opaque colour (the string's white)
    pur = (g[:, :, 3] > 0) & (c[:, :, 0] - c[:, :, 1] > 25) & (c[:, :, 2] - c[:, :, 1] > 25)
    if pur.any():
        ok = (g[:, :, 3] > 0) & ~pur & (c.sum(2) > 500)
        if ok.any():
            g[pur, :3] = np.median(c[ok], axis=0).astype(np.uint8)
    cell = np.zeros((n, n, 4), np.uint8)
    h, w = g.shape[:2]
    cell[(n - min(h, n)) // 2:(n - min(h, n)) // 2 + min(h, n), (n - min(w, n)) // 2:(n - min(w, n)) // 2 + min(w, n)] = g[:n, :n]
    return Image.fromarray(cell), (w, h), p


def main():
    cands = {'A left->16': cut('left', 16), 'B left->32': cut('left', 32), 'C right->32': cut('right', 32), 'D right->16': cut('right', 16)}
    ref = {n: Image.open(os.path.join(ART, 'dungeon', *p)).convert('RGBA') for n, p in (
        ('dagger-16', ('weapons', 'dagger-16.png')), ('shield-16', ('weapons', 'shield-16.png')),
        ('heal-mode-16', ('icons', 'heal-mode-16.png')), ('dagger-32', ('weapons', 'dagger-32.png')),
        ('shield-32', ('weapons', 'shield-32.png')), ('heal-mode-32', ('icons', 'heal-mode-32.png')))}
    S, W = 4, 480
    im = Image.new('RGBA', (W, 420), (40, 34, 52, 255))
    d = ImageDraw.Draw(im)
    d.text((8, 6), 'N-42 bow candidates next to the class icons (4x)', fill='white', font_size=14)
    d.text((8, 24), 'neither source is a native 16/32 grid: all candidates are reductions', fill='#ff9b8f', font_size=11)
    for row, (n, names) in enumerate(((16, ['A left->16', 'D right->16']), (32, ['B left->32', 'C right->32']))):
        y = 50 + row * 190
        x = 8
        for key in (f'dagger-{n}', f'shield-{n}', f'heal-mode-{n}'):
            im.alpha_composite(ref[key].resize((n * S // (1 if n == 16 else 2), n * S // (1 if n == 16 else 2)), Image.NEAREST), (x, y))
            d.text((x, y + n * S // (1 if n == 16 else 2) + 2), key, fill='#cfd8dc', font_size=10)
            x += n * S // (1 if n == 16 else 2) + 14
        for key in names:
            t, (w, h), p = cands[key]
            im.alpha_composite(t.resize((n * S // (1 if n == 16 else 2), n * S // (1 if n == 16 else 2)), Image.NEAREST), (x, y))
            d.text((x, y + n * S // (1 if n == 16 else 2) + 2), f'{key} {w}x{h}', fill='#ffe18d', font_size=10)
            x += n * S // (1 if n == 16 else 2) + 14
    im.save(os.path.join(REV, 'n42-bow-candidates.png'))
    for key, (t, size, p) in cands.items():
        t.save(os.path.join('/tmp', f'cand-{key[0]}.png'))
        print(key, size, 'pitch', round(p, 1))
    if len(sys.argv) > 1:  # python3 scripts/slice_n42.py 16 left 32 right
        a = sys.argv[1:]
        for n, side in zip(a[0::2], a[1::2]):
            t, _, _ = cut(side, int(n))
            t.save(os.path.join(ART, 'dungeon', 'icons', f'bow-{n}.png'))
            print('saved bow', n, 'from', side)


if __name__ == '__main__':
    main()
