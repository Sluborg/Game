#!/usr/bin/env python3
"""Stefan 2026-11-21: "Visa som innan med blobs som kolumner med hatt i px bredd, samma size hatt pa alla blobs i raden. Hatt kan bli
bredare an blob om px ar bredare an blob. Kan se kul ut." Rows = ONE hat width W (8, 9, 10, 11, 12 px), columns = the six
ORIGINAL blob shapes (nothing cut or morphed). The same hat sprite sits on every blob in a row; it may be wider than the head.

The N-43 hats come in S / M / L only, so the exact widths are a MOCK: GLOOP's M hats (for W <= 10) or L hats (for 11, 12) with their
middle columns removed or doubled (a mechanical stretch, no redrawing) until the widest row is W. Cap (1) above, crown (7) below.

usage (from blobz/): python3 scripts/hat_widths.py <dir with info.json, hats.rows> -> docs/art-review/hat-widths.png
"""
import json
import os
import sys
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from blobz_v2_final import render  # noqa: E402

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
D = sys.argv[1]
info = json.load(open(os.path.join(D, 'info.json')))
PAL = info['pal']
LAY = {(l['s'], l['f']): l for l in info['layouts']}
HATS = {}
for line in open(os.path.join(D, 'hats.rows')):
    if line.startswith('#') or not line.strip():
        continue
    n, name, s, m, l = line.strip().split('|')
    HATS[int(n)] = (s.split('/'), m.split('/'), l.split('/'))
NAMES = ['Kupol', 'Boll', 'Lang', 'Platt', 'Paron', 'Kub']
COL = [0x5ec8ff, 0xff6b8b, 0x7ddc5a, 0xffc93c, 0xb18cff, 0xff9248]
S, CW = 3, 62


def trim(rows):
    xs = [x for r in rows for x, c in enumerate(r) if c != '.']
    return [r[min(xs):max(xs) + 1] for r in rows]


def to_width(rows, w):
    rows = trim(rows)
    while len(rows[0]) > w:  # remove the centre column
        m = len(rows[0]) // 2
        rows = [r[:m] + r[m + 1:] for r in rows]
    while len(rows[0]) < w:  # double the centre column
        m = len(rows[0]) // 2
        rows = [r[:m] + r[m] + r[m:] for r in rows]
    return rows


def put(im, rows, top):
    ax, ay = len(rows[0]) // 2, len(rows) - 1
    for y, r in enumerate(rows):
        for x, c in enumerate(r):
            if c != '.':
                X, Y = 10 - ax + x, top - 1 - ay + y
                if 0 <= X < 20 and 0 <= Y < 20:
                    im.putpixel((X, Y), (*[int(PAL[c][i:i + 2], 16) for i in (1, 3, 5)], 255))


def main():
    base = render([{'look': {'color': COL[s], 'shape': s, 'eyes': 0, 'mouth': 0, 'hat': 0}} for s in range(6)])
    widths = (8, 9, 10, 11, 12)
    W = 6 * CW + 12
    blockh = 2 * 20 * S + 30
    img = Image.new('RGBA', (W, 40 + 5 * blockh), (240, 240, 235, 255))
    d = ImageDraw.Draw(img)
    d.text((6, 4), 'En hattbredd per rad, samma hatt pa alla blobz (3x)', fill='black', font_size=14)
    d.text((6, 22), 'originalformer, ingen kapad; hatten kan bli bredare an huvudet (mock: N-43 strackt)', fill='#666', font_size=9)
    for wi, w in enumerate(widths):
        y0 = 40 + wi * blockh
        d.text((6, y0 + 2), f'hatt {w} px bred', fill='#a00', font_size=13)
        for s in range(6):
            for row, hat in enumerate((1, 7)):
                src = HATS[hat][1 if w <= 10 else 2]
                rows = to_width(src, w)
                im = base[s].copy()
                put(im, rows, LAY[(s, 0)]['top'])
                img.alpha_composite(im.resize((20 * S, 20 * S), Image.NEAREST), (6 + s * CW, y0 + 16 + row * 20 * S))
            d.text((6 + s * CW + 4, y0 + 16 + 2 * 20 * S - 2), f"{NAMES[s]} {LAY[(s, 0)]['headW']}", fill='#444', font_size=9)
    img.save(os.path.join(ROOT, 'docs', 'art-review', 'hat-widths.png'))
    print('hat-widths.png', img.size)


if __name__ == '__main__':
    main()
