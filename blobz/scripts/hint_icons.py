#!/usr/bin/env python3
"""Hint / quest icons for Code, fine resolution (own art, CC0) into public/art/fine/icons/.

usage (from blobz/): python3 scripts/hint_icons.py [--preview docs/art-review/hint-icons.png]

Icons/ style (1 px plum outline, flat fill + top-left highlight + bottom-right shade) at TWICE the pixels of
the 16 px icons: 32x32 unless noted, drawn at HALF the scale a 16 px icon would get. Sizes: public/art/fine/README.md.
"""
import os
import sys
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base_art as ba  # noqa: E402
from fx_sheet import Canvas  # noqa: E402

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'public', 'art', 'fine', 'icons')

PLUM = ba.PLUM
BLOB = (ba.rgb(242, 242, 246), ba.rgb(255, 255, 255), ba.rgb(196, 200, 214))
BERRY = (ba.rgb(230, 57, 70), ba.rgb(255, 150, 160), ba.rgb(160, 24, 40))
GREEN = (ba.rgb(98, 196, 88), ba.rgb(190, 240, 160), ba.rgb(62, 140, 66))
RED = (ba.rgb(230, 57, 70), ba.rgb(255, 120, 120), ba.rgb(160, 24, 40))
GOLD = ba.FLAG
LEAF = ba.LEAF
CREAM = ba.CREAM

FONT = {  # 3x5 digits and signs
    '1': ['.#.', '##.', '.#.', '.#.', '###'], '2': ['##.', '..#', '.#.', '#..', '###'], '4': ['#.#', '#.#', '###', '..#', '..#'],
    '+': ['...', '.#.', '###', '.#.', '...'], '-': ['...', '...', '###', '...', '...'], 'x': ['...', '#.#', '.#.', '#.#', '...'],
}


def text(c, x, y, s, col, px=2):
    """Pixel text, each font pixel px x px, with a plum outline around the whole word."""
    pts = set()
    for i, ch in enumerate(s):
        for ry, row in enumerate(FONT[ch]):
            for rx, v in enumerate(row):
                if v == '#':
                    pts |= ba.rect(x + (i * 4 + rx) * px, y + ry * px, x + (i * 4 + rx) * px + px - 1, y + ry * px + px - 1)
    ba.comp(c, pts, col)


def blob(c, cx, by, w=16, h=12):
    """Small neutral blob standing with its bottom on row `by`."""
    body = ba.ellipse(cx, by - h + w / 2.4, w / 2, w / 2.4) | ba.rect(int(cx - w / 2), int(by - h + w / 2.4), int(cx + w / 2) - 1, by - 2) \
        | ba.rect(int(cx - w / 2) + 1, by - 1, int(cx + w / 2) - 2, by - 1)
    ba.comp(c, body, ba.shaded(BLOB))
    ey = by - h // 2 - 1
    for ex in (int(cx) - 3, int(cx) + 2):
        ba.comp(c, ba.rect(ex, ey, ex, ey + 1), PLUM, outline=False)
    ba.comp(c, {(int(cx) - 1, ey + 3), (int(cx), ey + 3)}, PLUM, outline=False)


def log(c, x, y, w=12):
    ba.comp(c, ba.rect(x, y, x + w - 1, y + 4), ba.shaded(ba.WOOD))
    ba.comp(c, ba.ellipse(x + 1, y + 2.5, 2, 2.5), ba.shaded((ba.rgb(240, 200, 150), ba.rgb(255, 230, 190), ba.rgb(200, 150, 100))))


def stone(c, cx, cy, r=4):
    ba.comp(c, ba.ellipse(cx, cy, r * 1.3, r), ba.shaded(ba.STONE))


def berry(c, cx, cy, r=3.2):
    ba.comp(c, ba.ellipse(cx, cy, r, r), ba.shaded(BERRY))
    c.set(int(cx - r / 2), int(cy - r / 2), ba.rgb(255, 210, 215))


def plus(c, cx, cy, a=4, mat=GREEN):
    ba.comp(c, ba.rect(cx - 1, cy - a, cx + 1, cy + a) | ba.rect(cx - a, cy - 1, cx + a, cy + 1), ba.shaded(mat))


def house(c, x, y, w=14, mat=ba.ROOF):
    """Little house, top-left of the roof at (x, y); about w x w."""
    h = w - w // 3
    ba.comp(c, ba.rect(x + 1, y + w // 2, x + w - 2, y + w // 2 + h - 1), ba.shaded(ba.PLASTER))
    ba.comp(c, ba.poly([(x - 0.5, y + w / 2 + 0.5), (x + w / 2, y), (x + w + 0.5, y + w / 2 + 0.5)]), ba.shaded(mat))
    dx = x + w // 2 - 1
    ba.comp(c, ba.rect(dx, y + w // 2 + h - 4, dx + 2, y + w // 2 + h - 1), ba.DARKWOOD[0], outline=False)


def tree(c, cx, by, r=6):
    ba.comp(c, ba.rect(cx - 1, by - 4, cx + 1, by), ba.shaded(ba.WOOD))
    ba.comp(c, ba.ellipse(cx + 0.5, by - 4 - r, r, r), ba.shaded(LEAF))


def bush(c, cx, cy, berries=True):
    ba.comp(c, ba.ellipse(cx, cy, 9, 6.5) | ba.ellipse(cx - 4, cy - 3, 5, 4.5) | ba.ellipse(cx + 4, cy - 3, 5, 4.5), ba.shaded(LEAF))
    if berries:
        for (x, y) in ((cx - 5, cy - 3), (cx + 3, cy - 4), (cx - 1, cy + 1), (cx + 5, cy + 1)):
            berry(c, x, y, 1.8)


def arrow_right(c, x0, x1, cy, mat=GOLD):
    ba.comp(c, ba.rect(x0, cy - 2, x1 - 6, cy + 2) | ba.poly([(x1 - 7, cy - 6.5), (x1 + 0.5, cy + 0.5), (x1 - 7, cy + 7.5)]), ba.shaded(mat))


def arrow_down(c, cx, y0, y1, mat=GOLD):
    ba.comp(c, ba.rect(cx - 2, y0, cx + 2, y1 - 6) | ba.poly([(cx - 6.5, y1 - 7), (cx + 0.5, y1 + 0.5), (cx + 7.5, y1 - 7)]), ba.shaded(mat))


def badge(c, cx, cy, r=6):
    ba.comp(c, ba.ellipse(cx, cy, r, r), ba.shaded(GOLD))


# ---------------------------------------------------------------- the icons
def carry_4():
    c = Canvas(32, 32)
    blob(c, 16, 30, 18, 12)
    log(c, 10, 14)  # 4 different things stacked on the head: log, stone, log, berry
    stone(c, 16, 10, 3.2)
    log(c, 11, 3, 11)
    berry(c, 22, 4, 2.6)
    return c.image()


def hit_minus():
    c = Canvas(32, 32)
    tree(c, 10, 30, 7)
    ba.comp(c, {(17 + i, 15 + i) for i in range(13)} | {(18 + i, 15 + i) for i in range(12)}, ba.WOOD[0])  # axe handle
    ba.comp(c, ba.poly([(13, 12), (19, 9), (21, 16), (17, 21), (13, 19)]), ba.shaded(ba.METAL))  # blade biting the tree
    ba.comp(c, {(13, 13), (13, 14), (13, 15), (13, 16), (13, 17), (13, 18)}, ba.METAL[1], outline=False)  # edge
    for (x, y) in ((11, 10), (10, 22)):  # hit sparks
        ba.comp(c, {(x, y)}, CREAM)
    text(c, 18, 1, '-1', RED[0])
    return c.image()


def speed():
    c = Canvas(32, 32)
    blob(c, 21, 28, 18, 13)
    for (x0, x1, y) in ((1, 9, 12), (3, 10, 18), (0, 8, 24)):
        ba.comp(c, ba.rect(x0, y, x1, y + 1), CREAM)
    return c.image()


def berry_plus():
    c = Canvas(32, 32)
    bush(c, 13, 18)
    plus(c, 25, 24)
    return c.image()


def berry_x2_home():
    c = Canvas(32, 32)
    house(c, 13, 13, 17)
    berry(c, 6, 24, 4.5)
    ba.comp(c, ba.rect(6, 16, 6, 19), GREEN[2])  # stem
    text(c, 1, 1, 'x2', GOLD[0])
    return c.image()


def arrow_to_resource():
    c = Canvas(32, 32)
    tree(c, 25, 18, 5)
    stone(c, 25, 26, 3.5)
    arrow_right(c, 1, 16, 16)
    return c.image()


def new_corner():
    c = Canvas(32, 32)
    ba.comp(c, ba.rect(0, 22, 31, 29), ba.shaded((ba.rgb(117, 227, 255), ba.rgb(217, 247, 255), ba.rgb(70, 196, 228))))  # water
    ba.comp(c, ba.rect(2, 18, 18, 21), ba.shaded(ba.WOOD, ba.planks_v(3)))  # bridge deck
    for x in (3, 16):
        ba.comp(c, ba.rect(x, 22, x + 1, 27), ba.shaded(ba.DARKWOOD))
    ba.comp(c, ba.rect(18, 4, 29, 14), ba.shaded(ba.WOOD, ba.planks_h(4)))  # chest
    ba.comp(c, ba.rect(18, 7, 29, 8), ba.shaded(GOLD))
    ba.comp(c, ba.rect(22, 7, 25, 10), ba.shaded(GOLD))
    return c.image()


def carry_plus_1():
    c = Canvas(32, 32)
    blob(c, 12, 30, 18, 12)
    log(c, 6, 11)
    text(c, 18, 2, '+1', GREEN[0])
    return c.image()


def regrow_fast():
    c = Canvas(32, 32)
    bush(c, 12, 20)
    clock = ba.ellipse(24, 9, 7, 7)
    ba.comp(c, clock, ba.shaded((CREAM, ba.rgb(255, 255, 255), ba.rgb(226, 207, 178))))
    ba.comp(c, ba.rect(24, 4, 24, 9) | ba.rect(24, 9, 27, 9), PLUM, outline=False)  # hands
    for (x0, y) in ((11, 5), (13, 9)):  # speed lines trailing the clock
        ba.comp(c, ba.rect(x0, y, x0 + 4, y), CREAM)
    return c.image()


def quest_home():
    c = Canvas(40, 36)
    house(c, 10, 13, 20)
    arrow_down(c, 20, 0, 12)
    return c.image()


def base_marker():
    c = Canvas(32, 48)
    ba.comp(c, ba.rect(15, 18, 17, 46), ba.shaded(ba.DARKWOOD))  # post
    ba.comp(c, ba.rect(3, 2, 28, 20), ba.shaded(ba.WOOD, ba.planks_h(5)))  # sign board
    house(c, 9, 4, 14)
    return c.image()


def village_badge():
    c = Canvas(32, 32)
    shield = ba.poly([(2, 2), (30, 2), (30, 16), (16, 30.5), (2, 16)])
    ba.comp(c, shield, ba.shaded(GOLD))
    ba.comp(c, ba.poly([(5, 5), (27, 5), (27, 15), (16, 26.5), (5, 15)]), ba.shaded(ba.ROOF_BLUE), outline=False)
    house(c, 9, 6, 14, mat=ba.ROOF)
    return c.image()


ICONS = {
    'carry-4.png': carry_4, 'hit-minus.png': hit_minus, 'speed.png': speed, 'berry-plus.png': berry_plus,
    'berry-x2-home.png': berry_x2_home, 'arrow-to-resource.png': arrow_to_resource, 'new-corner.png': new_corner,
    'carry-plus-1.png': carry_plus_1, 'regrow-fast.png': regrow_fast, 'quest-home.png': quest_home,
    'base-marker.png': base_marker, 'village-badge.png': village_badge,
}


def main():
    os.makedirs(OUT, exist_ok=True)
    out = {}
    for name, fn in ICONS.items():
        im = fn()
        im.save(os.path.join(OUT, name))
        out[name] = im
        print(f'{name:24s} {im.size}')
    if '--preview' in sys.argv:
        path = sys.argv[sys.argv.index('--preview') + 1]
        s, pad = 5, 14
        w = sum(im.width * s + pad for im in out.values()) + pad
        sheet = Image.new('RGBA', (w, 48 * s + 2 * pad), (74, 60, 70, 255))
        x = pad
        for im in out.values():
            sheet.alpha_composite(im.resize((im.width * s, im.height * s), Image.NEAREST), (x, pad))
            x += im.width * s + pad
        sheet.save(path)
        print('preview', path)


if __name__ == '__main__':
    main()
