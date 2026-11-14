#!/usr/bin/env python3
"""Hand-drawn Ninja-style weapons that Ninja Adventure lacks: public/art/dungeon/weapons/ninja-shield.png (12x12)
and ninja-crossbow.png (16x10, pointing right, bolt nocked). Palette sampled from Ninja Items/Weapons sprites,
1 px outline (20,27,27) around all filled pixels (4-neighbour), flat fills with one shade.

usage (from blobz/): python3 scripts/ninja_weapons.py   (also writes docs/art-review/ninja-weapons.png)
"""
import os
import sys
from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'public', 'art', 'dungeon', 'weapons')
NA = os.path.join(ROOT, 'public', 'assets', 'ninja-adventure', 'Items', 'Weapons')
O = (20, 27, 27, 255)
PAL = {
    'w': (163, 117, 78, 255),   # wood
    'W': (150, 83, 64, 255),    # wood shade
    's': (171, 194, 188, 255),  # steel
    'S': (84, 135, 137, 255),   # steel shade
    'h': (242, 234, 241, 255),  # highlight / string
    'y': (255, 225, 141, 255),  # bolt shaft
    'r': (209, 75, 52, 255),    # fletching
}


def outline(im, skip=()):
    w, h = im.size
    px = im.load()
    filled = {(x, y) for y in range(h) for x in range(w) if px[x, y][3] and (x, y) not in skip}
    for y in range(h):
        for x in range(w):
            if not px[x, y][3] and any((x + dx, y + dy) in filled for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                px[x, y] = O


def shield():
    im = Image.new('RGBA', (12, 12))
    px = im.load()
    inside = lambda x, y: (x - 5.5) ** 2 + (y - 5.5) ** 2 <= 5.9 ** 2
    cells = [(x, y) for y in range(12) for x in range(12) if inside(x, y)]
    edge = {(x, y) for x, y in cells if any(not inside(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))}
    for x, y in cells:
        if (x, y) in edge:
            px[x, y] = O
        elif any((x + dx, y + dy) in edge for dx in (-1, 0, 1) for dy in (-1, 0, 1)):
            px[x, y] = PAL['S'] if x + y >= 12 else PAL['s']
        else:
            px[x, y] = PAL['W'] if x in (3, 8) or (x + y >= 13 and x in (4, 7)) else PAL['w']
    for x, y in ((5, 5), (6, 5), (5, 6), (6, 6)):  # steel boss
        px[x, y] = PAL['s'] if (x, y) != (6, 6) else PAL['S']
    for x, y in ((5, 4), (6, 4), (4, 5), (4, 6), (7, 5), (7, 6), (5, 7), (6, 7)):  # boss ring
        px[x, y] = O
    px[5, 5] = PAL['h']
    px[3, 2] = PAL['h']  # rim glint
    return im


CROSSBOW = [  # 16x10, fill only; outline is added around it, the string is drawn after (not outlined)
    '................',
    '........sS......',
    '.........sS.....',
    '.rryyyyyyysSsh..',
    '..........sS....',
    '.wwwwwwwwwsSw...',
    '.WWW..S...sS....',
    '.........sS.....',
    '........sS......',
    '................',
]
STRING = [(7, 1), (6, 1), (5, 2), (4, 2), (7, 8), (6, 8), (5, 7), (4, 7)]


def crossbow():
    im = Image.new('RGBA', (16, 10))
    px = im.load()
    for y, row in enumerate(CROSSBOW):
        for x, c in enumerate(row):
            if c != '.':
                px[x, y] = PAL[c]
    outline(im)
    for x, y in STRING:
        px[x, y] = PAL['h']
    return im


def preview(ims, path, scale=8):
    refs = [Image.open(os.path.join(NA, n, 'Sprite.png')).convert('RGBA') for n in ('Sword', 'Bow', 'Hammer')]
    items = refs + ims
    cell = 20 * scale
    out = Image.new('RGBA', (cell * len(items) + 20, cell + 40), (98, 150, 72, 255))
    d = ImageDraw.Draw(out)
    d.text((10, 6), 'Ninja Sword, Bow, Hammer (refs) | hand-drawn shield 12x12, crossbow 16x10', fill=(255, 255, 255, 255), font_size=18)
    for i, im in enumerate(items):
        big = im.resize((im.width * scale, im.height * scale), Image.NEAREST)
        out.alpha_composite(big, (10 + i * cell + (cell - big.width) // 2, 36 + (cell - big.height) // 2))
    out.save(path)


def main():
    os.makedirs(OUT, exist_ok=True)
    s, c = shield(), crossbow()
    s.save(os.path.join(OUT, 'ninja-shield.png'))
    c.save(os.path.join(OUT, 'ninja-crossbow.png'))
    if '--no-preview' not in sys.argv:
        preview([s, c], os.path.join(ROOT, 'docs', 'art-review', 'ninja-weapons.png'))
    print('ok')


if __name__ == '__main__':
    main()
