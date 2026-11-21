#!/usr/bin/env python3
"""Examples of the 3 ways to get ONE hat width (Stefan: "cut heads and standardize hat width"), drawn with mock body
tables (temp copies of src/blob.ts, nothing changed in the game) and GLOOP's N-43 hats in size M:
  1 cut to Kupol + Boll (heads already 8 px)
  2 Kupol + Boll + Lang and Paron redrawn with an 8 px head (body below keeps its shape)
  3 all 6 shapes, every head top made 8 px (Platt and Kub get a narrower top)

usage (from blobz/): python3 scripts/head_options.py <dir with mock/mock.json, info.json, hats.rows>
  -> docs/art-review/head-options.png
mock.json = {optN: {lay: [{top, headW, hs}], grids: [20x20 colour grids]}} made by bundling a copy of blob.ts per option.
"""
import json
import os
import sys
from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
D = sys.argv[1]
mock = json.load(open(os.path.join(D, 'mock', 'mock.json')))
PAL = json.load(open(os.path.join(D, 'info.json')))['pal']
HATS = {}
for line in open(os.path.join(D, 'hats.rows')):
    if line.startswith('#') or not line.strip():
        continue
    n, name, s, m, l = line.strip().split('|')
    HATS[int(n)] = m.split('/')
NAMES = {'opt1': ('1. Bara Kupol + Boll', 'Lang, Paron, Platt, Kub tas bort'),
         'opt2': ('2. Fyra former', 'Lang och Paron far 8 px topp'),
         'opt3': ('3. Alla sex, 8 px topp', 'Platt och Kub far smalare topp')}
SHAPE = ['Kupol', 'Boll', 'Lang', 'Paron', 'Platt', 'Kub']  # placeholder order per option below
ORDER = {'opt1': ['Kupol', 'Boll'], 'opt2': ['Kupol', 'Boll', 'Lang', 'Paron'], 'opt3': ['Kupol', 'Boll', 'Lang', 'Platt', 'Paron', 'Kub']}
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
    parts = []
    for opt, (title, sub) in NAMES.items():
        m = mock[opt]
        n = len(m['grids'])
        img = Image.new('RGBA', (W, 24 + 3 * (20 * S + 4) + 20), (240, 240, 235, 255))
        d = ImageDraw.Draw(img)
        d.text((6, 3), title, fill='black', font_size=14)
        d.text((150, 6), sub, fill='#666', font_size=10)
        for row, hat in enumerate((0, 1, 7)):
            for s in range(n):
                im = to_img(m['grids'][s])
                if hat:
                    put(im, HATS[hat], m['lay'][s]['top'])
                img.alpha_composite(im.resize((20 * S, 20 * S), Image.NEAREST), (6 + s * CW, 24 + row * (20 * S + 4)))
        for s in range(n):
            d.text((6 + s * CW + 8, 24 + 3 * (20 * S + 4)), ORDER[opt][s], fill='#444', font_size=10)
        parts.append(img)
    out = Image.new('RGBA', (W, sum(p.height + 6 for p in parts) + 30), (225, 225, 220, 255))
    ImageDraw.Draw(out).text((6, 6), 'Tre satt att fa EN hattbredd (hatt M, 3x)', fill='black', font_size=14)
    y = 30
    for p in parts:
        out.alpha_composite(p, (0, y))
        y += p.height + 6
    out.save(os.path.join(ROOT, 'docs', 'art-review', 'head-options.png'))
    print('head-options.png', out.size)


if __name__ == '__main__':
    main()
