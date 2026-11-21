#!/usr/bin/env python3
"""Stefan: "Fyra blobz kan ju kapas. Visa exempel ... pa 8, 9, 10, 11, 12 bredd": the four extra shapes are cut and the two
that remain (Kupol, Boll) get ONE standard head width W = 8..12. Mock body tables (temp copy of blob.ts, the game is
unchanged): rows widened by W - 8, capped at 14. Hats: GLOOP's N-43 in the size the game picks (M up to 10, L from 11).

usage (from blobz/): python3 scripts/head_widths.py <dir with mock/ws.json, info.json, hats.rows> -> docs/art-review/head-widths.png
"""
import json
import os
import sys
from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
D = sys.argv[1]
M = json.load(open(os.path.join(D, 'mock', 'ws.json')))
PAL = json.load(open(os.path.join(D, 'info.json')))['pal']
HATS = {}
for line in open(os.path.join(D, 'hats.rows')):
    if line.startswith('#') or not line.strip():
        continue
    n, name, s, m, l = line.strip().split('|')
    HATS[int(n)] = (s.split('/'), m.split('/'), l.split('/'))
S, CW = 3, 62


def to_img(g):
    im = Image.new('RGBA', (20, 20))
    for y, row in enumerate(g):
        for x, c in enumerate(row):
            if c:
                v = tuple(int(c[i:i + 2], 16) for i in (1, 3, 5)) if c.startswith('#') else tuple(int(t) for t in c[4:-1].split(','))
                im.putpixel((x, y), (*v, 255))
    return im


def put(im, rows, top):
    ax, ay = len(rows[0]) // 2, len(rows) - 1
    for y, r in enumerate(rows):
        for x, c in enumerate(r):
            if c != '.':
                im.putpixel((10 - ax + x, top - 1 - ay + y), (*[int(PAL[c][i:i + 2], 16) for i in (1, 3, 5)], 255))


def main():
    W = 6 * CW + 16
    img = Image.new('RGBA', (W, 34 + 5 * (20 * S + 26)), (240, 240, 235, 255))
    d = ImageDraw.Draw(img)
    d.text((6, 4), 'Kupol + Boll med EN huvudbredd 8-12 (3x)', fill='black', font_size=14)
    d.text((6, 20), 'utan hatt, keps (1), krona (7); hattstorlek = den spelet valjer', fill='#666', font_size=10)
    for i, w in enumerate((8, 9, 10, 11, 12)):
        y = 34 + i * (20 * S + 26)
        for k in range(2):
            s = 2 * i + k
            lay = M['lay'][s]
            for j, hat in enumerate((0, 1, 7)):
                im = to_img(M['grids'][s])
                if hat:
                    put(im, HATS[hat][lay['hs']], lay['top'])
                img.alpha_composite(im.resize((20 * S, 20 * S), Image.NEAREST), (6 + (k * 3 + j) * CW, y))
        d.text((6, y + 20 * S + 2), f"bredd {w}   hatt {'SML'[M['lay'][2 * i]['hs']]}", fill='#a00', font_size=12)
    img.save(os.path.join(ROOT, 'docs', 'art-review', 'head-widths.png'))
    print('head-widths.png', img.size)


if __name__ == '__main__':
    main()
