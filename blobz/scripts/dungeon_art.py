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


CREAM = ba.CREAM


def ring_pts(cx, cy, r0, r1, a0, a1, sy=1.0):
    """Pixels of a ring sector between radii r0..r1 and angles a0..a1 (degrees, screen space)."""
    out = set()
    for y in range(int(cy - r1 * sy) - 1, int(cy + r1 * sy) + 2):
        for x in range(int(cx - r1) - 1, int(cx + r1) + 2):
            dx, dy = x + 0.5 - cx, (y + 0.5 - cy) / sy
            d = math.hypot(dx, dy)
            a = math.degrees(math.atan2(dy, dx)) % 360
            span = (a - a0) % 360
            if r0 <= d <= r1 and span <= (a1 - a0) % 360:
                out.add((x, y))
    return out


def mono_icon(draw):
    c = Canvas(20, 20)
    draw(c)
    return c.image()


def special_sword():
    """Sword with a spin arrow around it."""
    def d(c):
        ba.comp(c, ring_pts(10, 10, 7.2, 8.8, 200, 150), CREAM)
        ba.comp(c, {(14, 16), (15, 16), (16, 16), (15, 17), (15, 15), (16, 15), (14, 17)}, CREAM)  # arrow head
    im = mono_icon(d)
    sw = ga.tool_frame(sword, -45, size=(20, 20), pivot=(6, 14), scale=0.5, mono=ga.MONO)
    im.alpha_composite(sw)
    return im


def special_hammer():
    """Hammer coming down with impact lines."""
    im = ga.tool_frame(hammer, -20, size=(20, 20), pivot=(3, 8), scale=0.75, mono=ga.MONO)
    c = Canvas(20, 20)
    for (x0, y0, x1, y1) in ((14, 15, 17, 17), (10, 16, 10, 19), (17, 11, 19, 11)):
        pts = {(x0 + round((x1 - x0) * t / 3), y0 + round((y1 - y0) * t / 3)) for t in range(4)}
        ba.comp(c, pts, CREAM)
    over = c.image()
    over.alpha_composite(im)
    return over


def special_spear():
    """Spear pointing right with speed lines behind (hand-placed: the rasterised shaft is too thin at 20 px)."""
    def d(c):
        for y, (x0, x1) in ((4, (1, 6)), (15, (1, 6))):
            ba.comp(c, ba.rect(x0, y, x1, y), CREAM)
        ba.comp(c, ba.rect(4, 9, 12, 10) | ba.poly([(12, 5.5), (19, 10), (12, 14.5)]), CREAM)
        ba.comp(c, ba.rect(11, 8, 12, 11), ba.rgb(226, 207, 178), outline=False)  # binding
    return mono_icon(d)


def sidestep_icon():
    """Blob silhouette with a sideways double arrow."""
    def d(c):
        ba.comp(c, ba.ellipse(7, 12, 5, 5) | ba.rect(2, 12, 12, 16), CREAM)
        ba.comp(c, ba.ellipse(7, 12, 5, 5) - ba.rect(0, 0, 20, 8), CREAM, outline=False)
        for x0 in (13, 16):
            ba.comp(c, {(x0, 7), (x0 + 1, 8), (x0 + 2, 9), (x0 + 1, 10), (x0, 11)}, CREAM)
    return mono_icon(d)


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


# ---------------------------------------------------------------- special-attack and sidestep fx
def spin_arc():
    """4 frames, 48x40: a white slash arc sweeping around the blob (centre 24,22)."""
    frames = []
    for i in range(4):
        c = Canvas(48, 40)
        a0 = -90 + i * 90
        ba.comp(c, ring_pts(24, 22, 15, 19, a0, a0 + 150, sy=0.8), ba.SMOKE[1])
        ba.comp(c, ring_pts(24, 22, 16.5, 18, a0 + 100, a0 + 150, sy=0.8), CREAM, outline=False)
        frames.append(c.image())
    return strip(frames)


def slam_ring():
    """4 frames, 56x28: ground shockwave with stone chips flying out."""
    frames = []
    for i, (rx, t) in enumerate(((8, 2.5), (14, 2.5), (20, 2), (25, 1.5))):
        c = Canvas(56, 28)
        ring = ba.ellipse(28, 15, rx, rx * 0.48) - ba.ellipse(28, 15, rx - t, rx * 0.48 - t)
        ba.comp(c, ring, ba.SMOKE[0] if i < 3 else ba.SMOKE[2])
        if i in (1, 2):
            for k in range(5):
                a = math.radians(-160 + k * 35)
                x, y = 28 + (rx + 3) * math.cos(a), 13 + (rx * 0.48 + 3 + i * 2) * math.sin(a)
                ba.comp(c, ba.rect(round(x), round(y), round(x) + 1, round(y) + 1), ba.shaded(ba.STONE))
        frames.append(c.image())
    return strip(frames)


def charge_streak():
    """3 frames, 48x16: speed streaks left behind a charging blob (blob on the right edge)."""
    frames = []
    for i in range(3):
        c = Canvas(48, 16)
        for k, y in enumerate((4, 8, 12)):
            length = (30, 40, 22)[k] - i * 8
            x1 = 46 - (k % 2) * 4
            ba.comp(c, ba.rect(max(1, x1 - length), y, x1, y), ba.SMOKE[1] if k != 1 else CREAM)
        frames.append(c.image())
    return strip(frames)


def sidestep_puff():
    """3 frames, 24x24: fading afterimage of the blob + a dust puff where it stood."""
    frames = []
    for i in range(3):
        c = Canvas(24, 24)
        if i < 2:  # ghost silhouette, dotted
            ghost = (ba.ellipse(12, 12, 9 - i, 8 - i) | ba.rect(3 + i, 12, 20 - i, 20 - i)) - (ba.ellipse(12, 12, 7 - i, 6 - i) | ba.rect(5 + i, 12, 18 - i, 18 - i))
            ba.comp(c, {(x, y) for (x, y) in ghost if (x + y + i) % 2 == 0}, ba.SMOKE[1], outline=False)
        for (cx, cy, r) in ((7, 20, 2.5 - i * 0.5), (12, 21, 3 - i * 0.6), (17, 20, 2.5 - i * 0.5)):
            if r > 1:
                ba.comp(c, ba.ellipse(cx - i, cy, r, r * 0.8), ba.shaded(ba.SMOKE))
        frames.append(c.image())
    return strip(frames)


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
        'btn-special-sword.png': special_sword(),
        'btn-special-hammer.png': special_hammer(),
        'btn-special-spear.png': special_spear(),
        'btn-sidestep.png': sidestep_icon(),
        'fx-spin.png': spin_arc(),
        'fx-slam.png': slam_ring(),
        'fx-charge.png': charge_streak(),
        'fx-sidestep.png': sidestep_puff(),
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
