#!/usr/bin/env python3
"""The 6 head shapes with their head widths, and ONE standard (M) hat on all of them: shows why 3 hat sizes exist and what
standardizing the hat width looks like on today's shapes.

usage (from blobz/): python3 scripts/head_shapes.py <dir with info.json from the N-43 review> -> docs/art-review/head-shapes.png
"""
import json
import os
import sys
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from blobz_v2_final import render  # noqa: E402

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
info = json.load(open(os.path.join(sys.argv[1], 'info.json')))
PAL = info['pal']
L = {(l['s'], l['f']): l for l in info['layouts']}
NAMES = ['Kupol', 'Boll', 'Lang', 'Platt', 'Paron', 'Kub']
CAP_M = ['..KKKK...', '.KRRrrK..', 'KRRRRrKKK', 'KrKKKKrrK', '.KKKKKK..']  # N-43 hat 1, M size (GLOOP)
BEAN_M = ['...KK...', '..KGGK..', '.KGBGgK.', 'KBGbGBgK', '.KKKKKK.']  # N-43 hat 2, M size
S = 3


def put(im, rows, top):
    ax, ay = len(rows[0]) // 2, len(rows) - 1
    for y, r in enumerate(rows):
        for x, c in enumerate(r):
            if c != '.':
                im.putpixel((10 - ax + x, top - 1 - ay + y), (*[int(PAL[c][i:i + 2], 16) for i in (1, 3, 5)], 255))


def main():
    cols = [0x5ec8ff, 0xff6b8b, 0x7ddc5a, 0xffc93c, 0xb18cff, 0xff9248]
    base = render([{'look': {'color': cols[s], 'shape': s, 'eyes': 0, 'mouth': 0, 'hat': 0}} for s in range(6)])
    W = 6 * 64 + 10
    img = Image.new('RGBA', (W, 400), (240, 240, 235, 255))
    d = ImageDraw.Draw(img)
    d.text((6, 4), 'Head shapes today: head width -> hat size', fill='black', font_size=13)
    for s in range(6):
        l = L[(s, 0)]
        x = 8 + s * 64
        d.text((x, 24), NAMES[s], fill='black', font_size=11)
        d.text((x, 38), f"head {l['headW']} px", fill='#a00', font_size=11)
        d.text((x, 52), 'hat ' + 'SML'[l['hatSize']], fill='#444', font_size=11)
        a = base[s].copy()
        img.alpha_composite(a.resize((60, 60), Image.NEAREST), (x, 70))
    d.text((6, 140), 'ONE standard hat (M, 9 px wide) on every shape:', fill='black', font_size=12)
    for row, rows in enumerate((CAP_M, BEAN_M)):
        for s in range(6):
            a = base[s].copy()
            put(a, rows, L[(s, 0)]['top'])
            img.alpha_composite(a.resize((60, 60), Image.NEAREST), (8 + s * 64, 160 + row * 70))
    d.text((6, 305), 'Kupol/Boll (8 wide): hat fits. Lang/Paron (6): hat overhangs 1-2 px each side.', fill='#444', font_size=10)
    d.text((6, 320), 'Platt/Kub (12): hat looks small on a wide head.', fill='#444', font_size=10)
    img = img.crop((0, 0, W, 340))
    img.save(os.path.join(ROOT, 'docs', 'art-review', 'head-shapes.png'))
    print('head-shapes.png', img.size)


if __name__ == '__main__':
    main()
