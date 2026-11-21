#!/usr/bin/env python3
"""Review of HyperAgent's N-43 hats (docs/art-review/hyperagent/2026-11-21-n43-hats on hyperagent/blobz-n43-hats):
checks the sheet + hats.rows against the pinned renderer and draws every hat on every head shape.

usage (from blobz/): python3 scripts/n43_review.py <dir with n43-hats.png, hats.rows, info.json>
  info.json = bodyLayout(shape, frame) for the 6 shapes x 2 frames (top, headW, glint keys, mask) + PART_TABLES.palette
Checks: (1) the PNG cells (16x8 at (4+20c, 4+12r) native, 8x blocks, magenta gaps) decode to the same sprites as the
rows; (2) sprite size bounds per size; (3) placement (x = 10 - ax, bottom row at top - 1): no pixel outside the 20x20
frame, in the body mask or on the shine; (4) 8x block uniformity and the exact 672x896 canvas.
Writes docs/art-review/n43-on-blobs.png (12 hats x 6 shapes, the size the game picks, 3x, both frames).
"""
import json
import os
import sys
import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from blobz_v2_final import render  # noqa: E402

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
D = sys.argv[1]
info = json.load(open(os.path.join(D, 'info.json')))
PAL = info['pal']
LAY = {(l['s'], l['f']): l for l in info['layouts']}
W = info['W']
INV = {tuple(int(PAL[k][i:i + 2], 16) for i in (1, 3, 5)): k for k in PAL}
BOUNDS = {0: (8, 4), 1: (10, 5), 2: (14, 6)}  # S, M, L: max width, max height
NAMES = []
HATS = []  # [name] -> {size: rows}
for line in open(os.path.join(D, 'hats.rows')):
    if line.startswith('#') or not line.strip():
        continue
    n, name, s, m, l = line.strip().split('|')
    NAMES.append(name)
    HATS.append({0: s.split('/'), 1: m.split('/'), 2: l.split('/')})


def crop(rows):
    """Rows may carry transparent padding columns (their anchor is floor(width / 2) of the PADDED rows): crop to the
    occupied box for the comparison with the PNG cell and for the size bounds."""
    xs = [x for r in rows for x, c in enumerate(r) if c != '.']
    return [r[min(xs):max(xs) + 1] for r in rows]


def main():
    ok = True
    sheet = np.array(Image.open(os.path.join(D, 'n43-hats.png')).convert('RGB'))
    print('sheet', sheet.shape)
    if sheet.shape != (896, 672, 3):
        print('FAIL canvas')
        ok = False
    blocks = sheet.reshape(112, 8, 84, 8, 3)
    if not (blocks == blocks[:, :1, :, :1, :]).all():
        print('FAIL: not uniform 8x8 blocks')
        ok = False
    nat = blocks[:, 0, :, 0, :]  # 112 x 84 native
    mag = (nat == (255, 0, 255)).all(2)
    for h in range(12):
        col, g = h % 4, h // 4
        for size, row in ((2, 0), (1, 1), (0, 2)):
            cx, cy = 4 + 20 * col, 4 + 12 * (g * 3 + row)
            cell = nat[cy:cy + 8, cx:cx + 16]
            cm = mag[cy:cy + 8, cx:cx + 16]
            ys, xs = np.where(~cm)
            if not len(ys):
                print('FAIL empty cell', h + 1, size)
                ok = False
                continue
            sub = cell[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
            subm = cm[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
            rows = crop(HATS[h][size])
            w, hh = len(rows[0]), len(rows)
            got = [''.join('.' if subm[y, x] else INV.get(tuple(int(v) for v in sub[y, x]), '?') for x in range(sub.shape[1])) for y in range(sub.shape[0])]
            if got != rows:
                print(f'DIFF hat {h + 1} {NAMES[h]} size {"SML"[size]}: png {sub.shape[1]}x{sub.shape[0]} vs rows {w}x{hh}')
                ok = False
            mw, mh = BOUNDS[size]
            if w > mw + 0 or hh > mh:
                print(f'SIZE hat {h + 1} {NAMES[h]} {"SML"[size]}: {w}x{hh} > {mw}x{mh}')
                ok = False
            if any('?' in r for r in got):
                print(f'COLOUR hat {h + 1} {"SML"[size]}: colour not in the palette')
                ok = False
    # placement against the pinned layouts
    bad = 0
    for h in range(12):
        for s in range(6):
            for f in range(2):
                L = LAY[(s, f)]
                rows = HATS[h][L['hatSize']]
                ax, ay = len(rows[0]) // 2, len(rows) - 1
                mask = set(L['mask'])
                glint = set(L['glint'])
                for y, r in enumerate(rows):
                    for x, c in enumerate(r):
                        if c == '.':
                            continue
                        X, Y = 10 - ax + x, L['top'] - 1 - ay + y
                        k = Y * W + X
                        if not (0 <= X < W and 0 <= Y < W) or k in mask or k in glint:
                            bad += 1
                            print('PLACE', NAMES[h], 'shape', s, 'frame', f, (X, Y), 'mask' if k in mask else 'glint' if k in glint else 'outside')
    print('placement problems:', bad)
    ok = ok and bad == 0
    # picture: each hat on each shape (the size the game picks), 3x, idle frame, plus glide frame
    reqs = [{'look': {'color': [0x5ec8ff, 0xff6b8b, 0x7ddc5a, 0xffc93c, 0xb18cff, 0xff9248][s], 'shape': s, 'eyes': 0, 'mouth': 0, 'hat': 0}, 'frame': 0} for s in range(6)]
    base = render(reqs)
    S = 3
    img = Image.new('RGBA', (12 * 0 + 6 * 62 + 140, 12 * 66 + 40), (240, 240, 235, 255))
    d = ImageDraw.Draw(img)
    d.text((6, 4), 'N-43 hats on the 6 head shapes (3x, size by head width)', fill='black', font_size=13)
    for h in range(12):
        y = 30 + h * 66
        d.text((6, y + 18), f'{h + 1:02d}', fill='black', font_size=14)
        d.text((6, y + 36), NAMES[h][:11].translate(str.maketrans('åäöÅÄÖ', 'aaoAAO')), fill='#444', font_size=9)
        for s in range(6):
            L = LAY[(s, 0)]
            im = base[s].copy()
            rows = HATS[h][L['hatSize']]
            ax, ay = len(rows[0]) // 2, len(rows) - 1
            for yy, r in enumerate(rows):
                for xx, c in enumerate(r):
                    if c != '.':
                        im.putpixel((10 - ax + xx, L['top'] - 1 - ay + yy), (*[int(PAL[c][i:i + 2], 16) for i in (1, 3, 5)], 255))
            img.alpha_composite(im.resize((20 * S, 20 * S), Image.NEAREST), (70 + s * 62, y))
    img.save(os.path.join(ROOT, 'docs', 'art-review', 'n43-on-blobs.png'))
    print('RESULT', 'ALL CHECKS PASS' if ok else 'PROBLEMS FOUND', img.size)


if __name__ == '__main__':
    main()
