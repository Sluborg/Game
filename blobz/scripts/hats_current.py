#!/usr/bin/env python3
"""Overview of the CURRENT skin hats (src/blob.ts HATS), numbered, at the game's blob scale (3x), each on three head
shapes (Kupol / Boll / Lång -> hat sizes M / L / S as the game picks them), for Stefan to point out the ugly ones.

usage (from blobz/): python3 scripts/hats_current.py -> docs/art-review/hats-current.png
"""
import os
import re
import sys
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from blobz_v2_final import render  # noqa: E402

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
S = 3
src = open(os.path.join(ROOT, 'src', 'blob.ts')).read()
HATS = re.findall(r"'([^']+)'", re.search(r"export const HATS = \[(.*?)\];", src, re.S).group(1))
SHAPES = (0, 1, 2)  # Kupol, Boll, Lång


def main():
    reqs = [{'look': {'color': 0x5ec8ff, 'shape': sh, 'eyes': 0, 'mouth': 0, 'hat': h}} for h in range(1, len(HATS)) for sh in SHAPES]
    imgs = render(reqs)
    COLS, CW = 2, 195
    n = len(HATS) - 1
    rows = (n + COLS - 1) // COLS
    RH = 20 * S + 26
    sheet = Image.new('RGBA', (COLS * CW, 44 + rows * RH), (58, 120, 64, 255))
    d = ImageDraw.Draw(sheet)
    d.rectangle((0, 0, sheet.width, 38), fill=(14, 18, 18, 255))
    d.text((8, 4), f'Current hats 1-{n} (game scale 3x)', fill='white', font_size=15)
    d.text((8, 22), 'each on 3 head shapes: Kupol, Boll, Lang', fill='#9fd3ff', font_size=12)
    for i in range(n):
        c, r = i % COLS, i // COLS
        x, y = c * CW + 4, 44 + r * RH
        for j in range(len(SHAPES)):
            im = imgs[i * len(SHAPES) + j]
            sheet.alpha_composite(im.resize((im.width * S, im.height * S), Image.NEAREST), (x + j * 62, y))
        d.rectangle((x, y + 20 * S + 2, x + CW - 10, y + 20 * S + 22), fill=(14, 18, 18, 220))
        d.text((x + 4, y + 20 * S + 4), f'{i + 1}. ' + HATS[i + 1].translate(str.maketrans('åäöÅÄÖ', 'aaoAAO')), fill='#ffe18d', font_size=14)
    sheet.save(os.path.join(ROOT, 'docs', 'art-review', 'hats-current.png'))
    print('hats-current.png', sheet.size, n, 'hats')


if __name__ == '__main__':
    main()
