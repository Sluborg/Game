#!/usr/bin/env python3
"""Stefan 2026-11-21: "Kapas menas att hitta den bredden pa huvudet och skar av. Sa satter vi hatt dar." Each head is CUT OFF
flat where it reaches the standard width W (8..12): rows narrower than W are removed from the top and the first row becomes
exactly W wide; the hat then sits on that flat cut. Mock body tables (a temp copy of src/blob.ts per call, the game is
unchanged); hats = GLOOP's N-43 (cap 1, crown 7) in M for W <= 10 and L from 11 (the size the game would pick).

usage (from blobz/): python3 scripts/head_cut.py <scratch dir with info.json, hats.rows>   (needs node + npx esbuild)
  -> docs/art-review/head-cut.png (5 widths x 6 shapes x cap + crown)
"""
import json
import os
import re
import subprocess
import sys
from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
D = sys.argv[1]
os.makedirs(os.path.join(D, 'mock'), exist_ok=True)
MOCK = os.path.join(D, 'mock')
PAL = json.load(open(os.path.join(D, 'info.json')))['pal']
HATS = {}
for line in open(os.path.join(D, 'hats.rows')):
    if line.startswith('#') or not line.strip():
        continue
    n, name, s, m, l = line.strip().split('|')
    HATS[int(n)] = (s.split('/'), m.split('/'), l.split('/'))
SRC = open(os.path.join(ROOT, 'src', 'blob.ts')).read()
ORIG = re.search(r"const BODY_ROWS: number\[\]\[\] = \[.*?\n\];", SRC, re.S).group(0)
ROWS = [[6, 8, 10, 12, 12, 14, 14, 14, 14, 14, 14, 12], [4, 8, 10, 12, 12, 12, 12, 12, 12, 10, 8],
        [4, 6, 8, 8, 10, 10, 10, 10, 10, 10, 10, 8], [8, 12, 14, 14, 14, 14, 14, 14, 12],
        [4, 6, 6, 8, 8, 10, 12, 12, 14, 14, 14, 12], [10, 12, 12, 12, 12, 12, 12, 12, 12, 12, 10]]
NAMES = ['Kupol', 'Boll', 'Lang', 'Platt', 'Paron', 'Kub']
WIDTHS = (8, 9, 10, 11, 12)
COL = [0x5ec8ff, 0xff6b8b, 0x7ddc5a, 0xffc93c, 0xb18cff, 0xff9248]
S, CW = 3, 62


def cut(rows, w):
    """Flat cut: drop the rows narrower than w; the first row left becomes exactly w wide. None if the shape never reaches w."""
    for i, r in enumerate(rows):
        if r >= w:
            return [w] + rows[i + 1:]
    return None


def build():
    tabs, index = [], []
    for w in WIDTHS:
        for s, rows in enumerate(ROWS):
            c = cut(rows, w)
            index.append((w, s, c is not None))
            tabs.append(c if c is not None else rows)
    open(f'{MOCK}/cut.ts', 'w').write(SRC.replace(ORIG, 'const BODY_ROWS: number[][] = ' + json.dumps(tabs) + ';'))
    subprocess.run(['npx', 'esbuild', f'{MOCK}/cut.ts', '--bundle', '--format=esm', f'--outfile={MOCK}/cut.mjs', '--log-level=error'], check=True, cwd=ROOT)
    cols = json.dumps(COL)
    js = (f"const B=await import('{MOCK}/cut.mjs');const C={cols};const lay=[],grids=[];for(let s=0;s<{len(tabs)};s++){{const L=B.bodyLayout(s,0);"
          "lay.push({top:L.top,h:L.rows.length});grids.push(B.blobGrid({color:C[s%6],shape:s,eyes:0,mouth:0,hat:0},undefined,undefined,0));}"
          "console.log(JSON.stringify({lay,grids}));")
    r = json.loads(subprocess.run(['node', '--input-type=module', '-e', js], capture_output=True, text=True, check=True).stdout)
    return r, index, tabs


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
    r, index, tabs = build()
    W = 6 * CW + 12
    blockh = 2 * 20 * S + 30
    img = Image.new('RGBA', (W, 40 + 5 * blockh), (240, 240, 235, 255))
    d = ImageDraw.Draw(img)
    d.text((6, 4), 'Huvudet kapas platt pa bredd W, hatten sitter dar (3x)', fill='black', font_size=14)
    d.text((6, 22), 'keps (ovan) och krona (under), GLOOP:s N-43', fill='#666', font_size=10)
    for wi, w in enumerate(WIDTHS):
        y0 = 40 + wi * blockh
        d.text((6, y0 + 2), f'bredd {w}', fill='#a00', font_size=13)
        for s in range(6):
            k = wi * 6 + s
            ok = index[k][2]
            size = 1 if w <= 10 else 2
            for row, hat in enumerate((1, 7)):
                im = to_img(r['grids'][k])
                if ok:
                    put(im, HATS[hat][size], r['lay'][k]['top'])
                img.alpha_composite(im.resize((20 * S, 20 * S), Image.NEAREST), (6 + s * CW, y0 + 16 + row * 20 * S))
            lab = NAMES[s] + ('' if ok else ' (nej)')
            d.text((6 + s * CW + 4, y0 + 16 + 2 * 20 * S - 2), lab, fill='#444' if ok else '#a00', font_size=9)
    img.save(os.path.join(ROOT, 'docs', 'art-review', 'head-cut.png'))
    print('head-cut.png', img.size, 'unreachable:', [(w, NAMES[s]) for w, s, ok in index if not ok])


if __name__ == '__main__':
    main()
