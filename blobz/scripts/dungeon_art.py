#!/usr/bin/env python3
"""Generate the test-dungeon art set into public/art/dungeon/ (own art, CC0).

usage (from blobz/): python3 scripts/dungeon_art.py [--preview docs/art-review/dungeon-sheet.png]

Reuses the tool rasteriser from gather_art.py (same pivot convention as the gather tools) and the
part painter from base_art.py, so weapons, props and HUD match the rest of the art.
Sizes, pivots and frames: public/art/dungeon/README.md.
"""
import math
import os
import sys
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gather_art as ga  # noqa: E402
import base_art as ba  # noqa: E402
from fx_sheet import Canvas, strip  # noqa: E402

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT_DIR = os.path.join(ROOT, 'public', 'art', 'dungeon')
ENEMIES = os.path.join(ROOT, 'public', 'art', 'enemies')

PLUM = ba.PLUM
RED = (ba.rgb(230, 57, 70), ba.rgb(255, 120, 120), ba.rgb(160, 24, 40))
HEART = (ba.rgb(255, 77, 109), ba.rgb(255, 170, 186), ba.rgb(201, 24, 74))
EMPTY = (ba.rgb(90, 80, 96), ba.rgb(120, 110, 128), ba.rgb(62, 54, 68))
GOLD = ba.FLAG
PARCH = (ba.rgb(240, 222, 176), ba.rgb(255, 242, 206), ba.rgb(204, 176, 124))
DARK = (ba.rgb(43, 36, 52), ba.rgb(70, 60, 84), ba.rgb(26, 20, 32))
SAND = (ba.rgb(222, 160, 98), ba.rgb(240, 190, 130), ba.rgb(186, 118, 64))
GREEN = (ba.rgb(98, 196, 88), ba.rgb(190, 240, 160), ba.rgb(62, 140, 66))


# ---------------------------------------------------------------- weapons (tool space: u along, v across)
def sword(u, v):
    if -3.5 <= u < -2 and abs(v) <= 1.5:
        return 'Y'  # pommel
    if -2 <= u < 3 and abs(v) <= 1:
        return 'd' if v > 0.3 else 'h'  # grip
    if 3 <= u < 5 and abs(v) <= 4:
        return 'Y' if v < 1.5 else 'y'  # crossguard
    if 5 <= u <= 20:
        half = 1.7 * min(1.0, (20.5 - u) / 2.5)
        if abs(v) <= half:
            return 'M' if v < -0.6 else 'n' if v > 0.8 else 'm'
    return None


def hammer(u, v):
    if -2 <= u <= 14 and abs(v) <= 1:
        return 'H' if v < 0 else 'h' if v < 1 else 'd'
    if 12 <= u <= 19 and abs(v) <= 5:
        if u > 18:
            return 'M'
        return 'n' if u < 13.2 or abs(v) > 4.2 else 'm'
    return None


def spear(u, v):
    if -8 <= u <= 21 and abs(v) <= 1:
        return 'H' if v < 0 else 'h' if v < 0.6 else 'd'
    if 20 <= u <= 21.5 and abs(v) <= 1.8:
        return 'Y'  # binding
    if 21.5 < u <= 28:
        if abs(v) <= 3 * (28 - u) / 6.5:
            return 'M' if v < -0.3 else 'm'
    return None


SPEAR_FRAME = (68, 48)
SPEAR_POKE = [-5, 0, 7, 2]  # u offset per frame: pull back, ready, full thrust, recover


def weapon_strip(shape):
    return ga.tool_strip(shape)


def spear_strip():
    frames = [ga.tool_frame(lambda u, v, o=o: spear(u - o, v), 8, size=SPEAR_FRAME, pivot=ga.PIVOT, scale=1.15) for o in SPEAR_POKE]
    return strip(frames)


# ---------------------------------------------------------------- picker cards 48x64
def card(shape, ribbon, scale, angle=-45, pivot=(9, 33)):
    c = Canvas(48, 64)
    body = ba.rect(1, 2, 46, 61) | ba.rect(2, 1, 45, 62)
    ba.comp(c, body, ba.shaded(PARCH))
    ba.comp(c, {(x, y) for x in range(4, 44) for y in (4, 59)} | {(x, y) for y in range(4, 60) for x in (4, 43)}, PARCH[2], outline=False)
    icon = ga.tool_frame(shape, angle, size=(40, 40), pivot=pivot, scale=scale)
    im = c.image()
    im.alpha_composite(icon, (4, 6))
    rb = Canvas(48, 64)
    ba.comp(rb, ba.rect(6, 48, 41, 54), ba.shaded(ribbon))
    ba.comp(rb, ba.poly([(2, 47), (7, 47), (7, 56), (4.5, 53.5), (2, 56)]), ribbon[2])
    ba.comp(rb, ba.poly([(41, 47), (46, 47), (46, 56), (43.5, 53.5), (41, 56)]), ribbon[2])
    im.alpha_composite(rb.image())
    return im


# ---------------------------------------------------------------- button icons
def attack_icon():
    a = ga.tool_frame(sword, -45, size=(20, 20), pivot=(4, 16), scale=0.72, mono=ga.MONO)
    b = a.transpose(Image.FLIP_LEFT_RIGHT)
    out = Image.new('RGBA', (20, 20))
    out.alpha_composite(b)
    out.alpha_composite(a)
    return out


DASH_SMALL = ['UU..UU..', 'UcU.UcU.', '.UcU.UcU', 'UcU.UcU.', 'UU..UU..']


# ---------------------------------------------------------------- entrance and stairs
def steps(c, x0, x1, y0, n, h=3, shrink=1, light=True):
    """Stone steps going down into the dark (each lower step darker and narrower)."""
    for i in range(n):
        f = 1 - i / (n + 1)
        mat = tuple(ba.rgb(*(int(ch * f) for ch in col[:3])) for col in ba.STONE) if light else ba.STONE
        ba.comp(c, ba.rect(x0 + i * shrink, y0 + i * h, x1 - i * shrink, y0 + i * h + h - 1), ba.shaded(mat))


def entrance():
    c = Canvas(48, 40)
    mound = ba.ellipse(24, 26, 23, 13) | ba.ellipse(14, 20, 11, 9) | ba.ellipse(33, 19, 12, 10)
    ba.comp(c, mound, ba.shaded(ba.STONE, ba.blocks))
    for (x, y) in ((9, 12), (36, 11), (24, 9)):  # grass tufts on top
        ba.comp(c, ba.ellipse(x, y, 3, 2), ba.shaded(ba.LEAF))
    mouth = ba.ellipse(24, 28, 12, 10) & {(x, y) for x in range(48) for y in range(0, 40)}
    ba.comp(c, mouth, DARK[0])
    steps(c, 15, 33, 26, 4, h=3, shrink=2)
    return c.image()


def stairs(up):
    c = Canvas(32, 32)
    ba.comp(c, ba.rect(1, 1, 30, 30), ba.shaded(SAND))  # floor tile like Tiny Dungeon
    ba.comp(c, ba.rect(4, 3, 27, 28), DARK[0])
    if up:  # steps rising towards a bright top
        for i in range(6):  # nearest step at the bottom, steps narrow and brighten towards the exit
            f = 0.6 + i * 0.08
            mat = tuple(ba.rgb(*(min(255, int(ch * f)) for ch in col[:3])) for col in ba.STONE)
            ba.comp(c, ba.rect(5 + i, 24 - i * 4, 26 - i, 27 - i * 4), ba.shaded(mat))
        ba.comp(c, ba.rect(8, 1, 23, 2), ba.rgb(255, 241, 168), outline=False)  # daylight
    else:
        steps(c, 5, 26, 4, 7, h=3, shrink=1)
    return c.image()


# ---------------------------------------------------------------- HUD
HEART_ROWS = ['.UU.UU.', 'UHhUHHU', 'UHHHHHU', 'UHHHHrU', '.UHHrU.', '..UrU..', '...U...']


def heart(kind):
    pal = {'U': PLUM, 'H': HEART[0], 'h': HEART[1], 'r': HEART[2]}
    epal = {'U': PLUM, 'H': EMPTY[0], 'h': EMPTY[1], 'r': EMPTY[2]}
    c = Canvas(7, 7)
    for y, row in enumerate(HEART_ROWS):
        for x, ch in enumerate(row):
            if ch == '.':
                continue
            full = kind == 'full' or (kind == 'half' and x <= 3)
            c.set(x, y, (pal if full else epal)[ch])
    return c.image()


def xp_fill():
    return ga.bar_fill(k='B', hi='M', lo='b')


def level_badge():
    c = Canvas(15, 16)
    shield = ba.poly([(1, 1), (14, 1), (14, 9), (7.5, 15), (1, 9)])
    ba.comp(c, shield, ba.shaded(GOLD))
    ba.comp(c, ba.poly([(3.5, 3.5), (11.5, 3.5), (11.5, 8.5), (7.5, 12.5), (3.5, 8.5)]), GOLD[1], outline=False)
    return c.image()


def ko_marker():
    """2 frames, 20x9: little stars circling (place above a knocked-out blob)."""
    frames = []
    for phase in (0, 1):
        c = Canvas(20, 9)
        for i in range(3):
            a = (i / 3 + phase / 6) * 2 * math.pi
            x, y = 10 + 7 * math.cos(a), 4 + 2.5 * math.sin(a)
            ba.comp(c, {(round(x), round(y) - 1), (round(x) - 1, round(y)), (round(x), round(y)), (round(x) + 1, round(y)), (round(x), round(y) + 1)}, GOLD[0])
        frames.append(c.image())
    return strip(frames)


def revive_sparkle():
    """3 frames, 16x20: green-white sparkles rising."""
    frames = []
    for i in range(3):
        c = Canvas(16, 20)
        for (x, y0) in ((4, 15), (11, 13), (8, 18)):
            y = y0 - i * 4
            if y > 1:
                ba.comp(c, {(x, y - 1), (x - 1, y), (x, y), (x + 1, y), (x, y + 1)}, GREEN[1] if (x + i) % 2 else GREEN[0])
        frames.append(c.image())
    return strip(frames)


# ---------------------------------------------------------------- enemy feedback
def hit_flash(name):
    """White version of an enemy sprite (outline kept) for a one-frame hit flash."""
    im = Image.open(os.path.join(ENEMIES, f'{name}.png')).convert('RGBA')
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            p = px[x, y]
            if p[3] and not (p[0] < 90 and p[1] < 70 and p[2] < 80):
                px[x, y] = (255, 255, 255, 255)
    return im


def slam_warning():
    c = Canvas(48, 24)
    ring = ba.ellipse(24, 12, 23, 11) - ba.ellipse(24, 12, 21, 9.4)
    dashes = {(x, y) for (x, y) in ring if (math.atan2((y + 0.5 - 12) * 2, x + 0.5 - 24) * 8 / math.pi) % 1 < 0.6}
    ba.comp(c, dashes, RED[0])
    return c.image()


def shockwave():
    frames = []
    for i, (rx, t) in enumerate(((10, 2), (17, 2), (23, 1.5))):
        c = Canvas(48, 24)
        ring = ba.ellipse(24, 12, rx, rx * 0.47) - ba.ellipse(24, 12, rx - t, rx * 0.47 - t)
        ba.comp(c, ring, ba.SMOKE[0] if i < 2 else ba.SMOKE[2])
        frames.append(c.image())
    return strip(frames)


# ---------------------------------------------------------------- chest
def chest(open_):
    c = Canvas(18, 16)
    ba.comp(c, ba.rect(1, 7, 16, 14), ba.shaded(ba.WOOD, ba.planks_h(3)))
    if open_:
        ba.comp(c, ba.rect(3, 6, 14, 8), DARK[0])
        ba.comp(c, ba.ellipse(8.5, 6.5, 4, 1.6), ba.shaded(GOLD))  # gold inside
        ba.comp(c, ba.rect(1, 1, 16, 4), ba.shaded(ba.WOOD, ba.planks_h(3)))  # lid flipped back
        ba.comp(c, ba.rect(1, 3, 16, 4), ba.shaded(GOLD), outline=False)
    else:
        ba.comp(c, ba.rect(1, 3, 16, 7), ba.shaded(ba.WOOD, ba.planks_h(3)))
        ba.comp(c, ba.rect(1, 6, 16, 7), ba.shaded(GOLD))
        ba.comp(c, ba.rect(7, 6, 10, 9), ba.shaded(GOLD))  # lock
        c.set(8, 8, DARK[0])
    for x in (3, 14):
        ba.comp(c, ba.rect(x, 8, x, 14), GOLD[2], outline=False)
    return c.image()


def main():
    out = {
        'weapon-sword.png': weapon_strip(sword),
        'weapon-hammer.png': weapon_strip(hammer),
        'weapon-spear.png': spear_strip(),
        'card-sword.png': card(sword, RED, 1.25),
        'card-hammer.png': card(hammer, (ba.rgb(255, 138, 61), ba.rgb(255, 192, 138), ba.rgb(200, 96, 40)), 1.35),
        'card-spear.png': card(spear, ba.ROOF_BLUE, 0.95, pivot=(13, 29)),
        'btn-attack.png': attack_icon(),
        'btn-dash-small.png': ga.from_rows(DASH_SMALL),
        'entrance.png': entrance(),
        'stairs-up.png': stairs(True),
        'stairs-down.png': stairs(False),
        'heart-full.png': heart('full'),
        'heart-half.png': heart('half'),
        'heart-empty.png': heart('empty'),
        'xp-frame.png': ga.bar_frame(),
        'xp-fill.png': xp_fill(),
        'level-badge.png': level_badge(),
        'ko-stars.png': ko_marker(),
        'revive.png': revive_sparkle(),
        'flash-goo-small.png': hit_flash('goo-small'),
        'flash-goo-medium.png': hit_flash('goo-medium'),
        'flash-goo-boss.png': hit_flash('goo-boss'),
        'slam-warning.png': slam_warning(),
        'shockwave.png': shockwave(),
        'chest-closed.png': chest(False),
        'chest-open.png': chest(True),
    }
    os.makedirs(OUT_DIR, exist_ok=True)
    for name, im in out.items():
        im.save(os.path.join(OUT_DIR, name))
        print(f'{name:22s} {im.size}')
    if '--preview' in sys.argv:
        preview(out, sys.argv[sys.argv.index('--preview') + 1])


def preview(out, path, scale=5, pad=14, maxw=1600):
    rows, cur, cw = [], [], 0
    for name, im in out.items():
        tw = im.width * scale + pad
        if cw + tw > maxw:
            rows.append(cur)
            cur, cw = [], 0
        cur.append(name)
        cw += tw
    rows.append(cur)
    height = sum(max(out[n].height for n in r) * scale + pad for r in rows) + pad
    sheet = Image.new('RGBA', (maxw + pad, height), (74, 60, 70, 255))
    y = pad
    for r in rows:
        x, rh = pad, max(out[n].height for n in r) * scale
        for n in r:
            im = out[n]
            if n.startswith('btn-'):
                sheet.alpha_composite(Image.new('RGBA', (im.width * scale, im.height * scale), (253, 127, 52, 255)), (x, y))
            sheet.alpha_composite(im.resize((im.width * scale, im.height * scale), Image.NEAREST), (x, y))
            x += im.width * scale + pad
        y += rh + pad
    sheet.save(path)
    print('preview', path)


if __name__ == '__main__':
    main()
