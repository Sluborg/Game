#!/usr/bin/env python3
"""Three icon-family tests on the same buttons (fine grid), for Stefan's art-direction pick.

usage (from blobz/): python3 scripts/icon_families.py <kenney_dir>
  <kenney_dir> holds the unzipped Kenney CC0 packs from opengameart.org: Kenney_gameIcons/, kenney_board-game-icons/,
  1bitpack_kenney_1.1/ (not vendored: only these review sheets use them until a family is picked).
  -> docs/art-review/icons-A.png, icons-B.png, icons-C.png

Same set in every family: back, home, close, check, settings, play | dash, attack, special, sidestep, build |
skills heal, crit, block, spin. Same buttons (cream nav tiles, orange round action buttons, dark skill tiles);
only the glyph family changes:
  A  Kenney "Game Icons" + "Board Game Icons": flat rounded silhouettes, rasterised crisp at the fine size.
  B  Kenney "1-Bit Pack": 16 px pixel glyphs (shown 2x, chunky).
  C  Own fine pixel icons: small coloured objects with highlight/shade and a 1 px plum outline (Tiny Town look).
"""
import math
import os
import sys
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base_art as ba  # noqa: E402
import dungeon_art as da  # noqa: E402
import hint_icons as hi  # noqa: E402
from fx_sheet import Canvas  # noqa: E402

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'docs', 'art-review')
KD = sys.argv[1] if len(sys.argv) > 1 else '.'

PLUM = ba.PLUM
CREAM = ba.CREAM
NAV = (ba.rgb(255, 247, 230), ba.rgb(255, 255, 255), ba.rgb(226, 207, 178))
ACT = (ba.rgb(255, 138, 61), ba.rgb(255, 180, 120), ba.rgb(200, 96, 40))
SKL = (ba.rgb(92, 64, 112), ba.rgb(130, 98, 152), ba.rgb(62, 42, 78))
GOLD = ba.FLAG
RED = (ba.rgb(230, 57, 70), ba.rgb(255, 120, 120), ba.rgb(160, 24, 40))
GREEN = (ba.rgb(98, 196, 88), ba.rgb(190, 240, 160), ba.rgb(62, 140, 66))
BLUE = ba.ROOF_BLUE
STEEL = (ba.rgb(206, 216, 228), ba.rgb(255, 255, 255), ba.rgb(140, 150, 170))

NAMES = [['back', 'home', 'close', 'check', 'settings', 'play'], ['dash', 'attack', 'special', 'sidestep', 'build'],
         ['heal', 'crit', 'block', 'spin']]
KIND = {**{n: 'nav' for n in NAMES[0]}, **{n: 'act' for n in NAMES[1]}, **{n: 'skl' for n in NAMES[2]}}
SKILL_COL = {'heal': RED[0], 'crit': GOLD[0], 'block': ba.rgb(110, 170, 240), 'spin': CREAM}
B = 44  # button size (fine px)


def button(kind):
    c = Canvas(B, B)
    if kind == 'act':
        ba.comp(c, ba.ellipse(22, 23, 20.5, 20.5), ACT[2])
        ba.comp(c, ba.ellipse(22, 21, 20.5, 19.5), ba.shaded(ACT), outline=False)
    else:
        mat = NAV if kind == 'nav' else SKL
        body = ba.rect(3, 2, 40, 41) | ba.rect(2, 3, 41, 40)
        ba.comp(c, body, mat[2])
        ba.comp(c, ba.rect(3, 2, 40, 37) | ba.rect(2, 3, 41, 37), ba.shaded(mat), outline=False)
        if kind == 'skl':
            ba.comp(c, {(x, y) for x in (4, 39) for y in range(4, 37)} | {(x, y) for y in (4, 36) for x in range(4, 40)}, GOLD[2], outline=False)
    return c.image()


def glyph_colour(name):
    k = KIND[name]
    return PLUM if k == 'nav' else CREAM if k == 'act' else SKILL_COL[name]


# ---------------------------------------------------------------- A / B: silhouettes from Kenney packs
A_SRC = {
    'back': 'G:arrowLeft', 'home': 'G:home', 'close': 'G:cross', 'check': 'G:checkmark', 'settings': 'G:gear',
    'play': 'G:right', 'dash': 'G:fastForward', 'attack': 'B:sword', 'special': 'B:fire', 'sidestep': 'B:arrow_horizontal',
    'build': 'G:wrench', 'heal': 'B:suit_hearts', 'crit': 'G:target', 'block': 'B:shield', 'spin': 'B:arrow_clockwise',
}
B_SRC = {  # (col, row) in 1bitpack monochrome_packed.png; 'check' is hand-made in the same 2 px stroke
    'back': (26, 20), 'home': (41, 16), 'close': (40, 13), 'check': None, 'settings': (45, 16), 'play': (24, 20),
    'dash': (29, 21), 'attack': (33, 8), 'special': (36, 11), 'sidestep': (22, 21), 'build': (38, 7),
    'heal': (39, 10), 'crit': (43, 12), 'block': (38, 3), 'spin': (20, 20),
}


def kenney_mask(name, box=24):
    src, n = A_SRC[name].split(':')
    path = os.path.join(KD, 'Kenney_gameIcons', 'PNG', 'White', '2x', n + '.png') if src == 'G' else \
        os.path.join(KD, 'kenney_board-game-icons', 'PNG', 'Double (128px)', n + '.png')
    im = Image.open(path).convert('RGBA')
    im = im.crop(im.getbbox())
    s = box / max(im.size)
    a = im.getchannel('A').resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
    return {(x, y) for y in range(a.height) for x in range(a.width) if a.getpixel((x, y)) >= 120}, a.size


ONEBIT = None


def onebit_mask(name):
    global ONEBIT
    if ONEBIT is None:
        ONEBIT = Image.open(os.path.join(KD, '1bitpack_kenney_1.1', 'Tilesheet', 'monochrome_packed.png')).convert('RGBA')
    pos = B_SRC[name]
    if pos is None:  # check mark, 2 px stroke like the pack
        rows = ['................', '..............##', '.............##.', '............##..', '...........##...',
                '..........##....', '.........##.....', '##......##......', '.##....##.......', '..##..##........',
                '...####.........', '....##..........']
        pts = {(x, y) for y, r in enumerate(rows) for x, ch in enumerate(r) if ch == '#'}
    else:
        t = ONEBIT.crop((pos[0] * 16, pos[1] * 16, pos[0] * 16 + 16, pos[1] * 16 + 16))
        pts = {(x, y) for y in range(16) for x in range(16) if sum(t.getpixel((x, y))[:3]) > 300}
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    pts = {(x - min(xs), y - min(ys)) for (x, y) in pts}
    big = {(2 * x + dx, 2 * y + dy) for (x, y) in pts for dx in (0, 1) for dy in (0, 1)}
    return big, (2 * (max(xs) - min(xs) + 1), 2 * (max(ys) - min(ys) + 1))


def silhouette_icon(name, mask_fn):
    im = button(KIND[name])
    pts, (w, h) = mask_fn(name)
    c = Canvas(B, B)
    ox, oy = (B - w) // 2, (B - h) // 2 - (1 if KIND[name] == 'act' else 2)
    col = glyph_colour(name)
    ba.comp(c, {(x + ox, y + oy) for (x, y) in pts}, col, outline=col != PLUM)
    im.alpha_composite(c.image())
    return im


# ---------------------------------------------------------------- C: own coloured fine icons (drawn at 44x44)
def c_glyph(name, c):
    if name == 'back':
        ba.comp(c, ba.rect(17, 17, 32, 24) | ba.poly([(18, 9.5), (6.5, 20.5), (18, 31.5)]), ba.shaded(ACT))
    elif name == 'home':
        hi.house(c, 10, 6, 24)
    elif name == 'close':
        pts = {(x + d, y) for x in range(11, 32) for y in (x - 1,) for d in range(-2, 3)} | {(x + d, 41 - x) for x in range(11, 32) for d in range(-2, 3)}
        ba.comp(c, {(x, y - 1) for (x, y) in pts}, ba.shaded(RED))
    elif name == 'check':
        pts = {(x + d, 19 + (x - 9)) for x in range(9, 18) for d in range(-2, 3)} | {(x + d, 27 - (x - 17)) for x in range(17, 35) for d in range(-2, 3)}
        ba.comp(c, {p for p in pts if p[1] >= 6}, ba.shaded(GREEN))
    elif name == 'settings':
        teeth = set()
        for k in range(8):
            a = k * math.pi / 4
            cx, cy = 22 + 10 * math.cos(a), 19 + 10 * math.sin(a)
            teeth |= ba.ellipse(cx, cy, 3.2, 3.2)
        ba.comp(c, (ba.ellipse(22, 19, 10, 10) | teeth) - ba.ellipse(22, 19, 4, 4), ba.shaded(STEEL))
    elif name == 'play':
        ba.comp(c, ba.poly([(13, 7), (33.5, 19.5), (13, 32)]), ba.shaded(GREEN))
    elif name == 'dash':
        for x0 in (8, 20):
            ba.comp(c, ba.poly([(x0, 8), (x0 + 6, 8), (x0 + 15, 19.5), (x0 + 6, 31), (x0, 31), (x0 + 9, 19.5)]), ba.shaded((CREAM, ba.rgb(255, 255, 255), ba.rgb(226, 207, 178))))
    elif name == 'attack':
        ba.comp(c, {(x + d, 41 - x) for x in range(17, 32) for d in (-2, -1, 0, 1)}, ba.shaded(STEEL))  # blade
        ba.comp(c, {(x + d, 41 - x) for x in range(11, 15) for d in (-1, 0)}, ba.shaded(ba.WOOD))  # grip
        ba.comp(c, {(15 + k + d, 26 + k) for k in range(-4, 5) for d in (0, 1)}, ba.shaded(GOLD))  # guard
    elif name == 'special':
        ba.comp(c, da.star_pts(22, 20, 15), ba.shaded(GOLD))
        ba.comp(c, da.star_pts(22, 21, 6), ba.rgb(255, 255, 255), outline=False)
    elif name == 'sidestep':
        hi.blob(c, 22, 30, 14, 11)
        for sgn in (-1, 1):
            x = 22 + sgn * 11
            ba.comp(c, ba.poly([(x, 17.5), (x + sgn * 6, 22.5), (x, 27.5)]), ba.shaded((CREAM, ba.rgb(255, 255, 255), ba.rgb(226, 207, 178))))
    elif name == 'build':
        ba.comp(c, {(x + d, 46 - x) for x in range(12, 27) for d in (-1, 0, 1)}, ba.shaded(ba.WOOD))  # handle
        ba.comp(c, ba.poly([(36.5, 15.9), (30.9, 21.5), (19.5, 10.1), (25.1, 4.5)]), ba.shaded(STEEL))  # head
    elif name == 'heal':
        ba.comp(c, da.heart_pts(22, 18, 7.5), ba.shaded(RED))
        ba.comp(c, ba.rect(20, 13, 23, 24) | ba.rect(16, 17, 27, 20), CREAM)
    elif name == 'crit':
        ring = ba.ellipse(22, 19, 13, 13) - ba.ellipse(22, 19, 9, 9)
        ba.comp(c, ring | ba.ellipse(22, 19, 4.5, 4.5), ba.shaded(RED))
        ba.comp(c, ba.rect(21, 3, 22, 10) | ba.rect(21, 28, 22, 35) | ba.rect(6, 18, 13, 19) | ba.rect(31, 18, 38, 19), CREAM)
    elif name == 'block':
        ba.comp(c, da.shield_pts(cx=22, top=5, w=12, h=29), ba.shaded(BLUE))
        ba.comp(c, da.shield_pts(cx=22, top=9, w=8, h=21), ba.shaded(GOLD))
        ba.comp(c, ba.rect(21, 11, 23, 26), BLUE[0], outline=False)
    elif name == 'spin':
        cr = (CREAM, ba.rgb(255, 255, 255), ba.rgb(226, 207, 178))
        ba.comp(c, da.ring_pts(22, 19, 9.5, 14.5, 40, 320), ba.shaded(cr))
        a = math.radians(322)
        px_, py_ = 22 + 12 * math.cos(a), 19 + 12 * math.sin(a)
        tx, ty = -math.sin(a), math.cos(a)
        nx, ny = math.cos(a), math.sin(a)
        ba.comp(c, ba.poly([(px_ + nx * 7, py_ + ny * 7), (px_ - nx * 7, py_ - ny * 7), (px_ - tx * 7, py_ - ty * 7)]), ba.shaded(cr))


def own_icon(name):
    im = button(KIND[name])
    c = Canvas(B, B)
    c_glyph(name, c)
    im.alpha_composite(c.image())
    return im


# ---------------------------------------------------------------- sheet
def sheet(title, make, path, s=3, pad=8):
    rows = [[make(n) for n in row] for row in NAMES]
    cell = B + pad
    w = 6 * cell + pad
    h = 3 * (cell + 8) + pad + 16
    out = Image.new('RGBA', (w * s, h * s), (74, 60, 70, 255))
    d = ImageDraw.Draw(out)
    d.text((pad * s, 4 * s), title, fill=(255, 241, 214, 255), font_size=8 * s)
    for r, row in enumerate(rows):
        for i, im in enumerate(row):
            x, y = pad + i * cell, 16 + pad + r * (cell + 8)
            out.alpha_composite(im.resize((B * s, B * s), Image.NEAREST), (x * s, y * s))
            d.text((x * s, (y + B + 1) * s), NAMES[r][i], fill=(214, 196, 166, 255), font_size=4 * s)
    out.save(path)
    print(path, out.size)


def main():
    sheet('A  Kenney Game Icons + Board Game Icons (flat, rounded)', lambda n: silhouette_icon(n, kenney_mask), os.path.join(OUT, 'icons-A.png'))
    sheet('B  Kenney 1-Bit Pack (16 px pixel glyphs, chunky)', lambda n: silhouette_icon(n, onebit_mask), os.path.join(OUT, 'icons-B.png'))
    sheet('C  Own fine pixel icons (coloured, shaded, plum outline)', own_icon, os.path.join(OUT, 'icons-C.png'))


if __name__ == '__main__':
    main()
