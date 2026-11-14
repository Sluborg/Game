#!/usr/bin/env python3
"""Fine-resolution redraws of simple world sprites into public/art/fine/ (own art, CC0).

usage (from blobz/): python3 scripts/fine_art.py [--preview docs/art-review/fine-sheet.png]

The world art was drawn at 2-4 world px per art pixel, but the blobz use ~1.45 (BLOB_SCALE). These versions have
twice the pixels at the same world size and a 1 px outline, so drawn at HALF the old setScale they match the blobz.
Same file names as the old ones under public/art/fine/<old folder>/; sizes in public/art/fine/README.md.
"""
import math
import os
import sys
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fx_sheet as fx  # noqa: E402
import base_art as ba  # noqa: E402
import dungeon_art as da  # noqa: E402

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'public', 'art', 'fine')
Z = 2


# ---------------------------------------------------------------- 2x geometry for the fx generators
class ZCanvas(fx.Canvas):
    def __init__(self, w, h):
        super().__init__(w * Z, h * Z)

    def rows(self, x0, y0, rows):
        super().rows(x0 * Z, y0 * Z, [r for r in rows])  # little spark sprites stay 1:1, placed on the 2x grid


def zellipse(cx, cy, rx, ry):
    return _ellipse(cx * Z, cy * Z, rx * Z, ry * Z)


_ellipse = fx.ellipse


def zring(cx, cy, rx, ry, t):
    return zellipse(cx, cy, rx, ry) - zellipse(cx, cy, max(0.1, rx - t), max(0.1, ry - t))


def zoomed(fn):
    """Run an fx_sheet generator with 2x geometry (1 px outline at the fine size)."""
    saved = fx.Canvas, fx.ellipse, fx.ring
    fx.Canvas, fx.ellipse, fx.ring = ZCanvas, zellipse, zring
    try:
        return fn()
    finally:
        fx.Canvas, fx.ellipse, fx.ring = saved


# ---------------------------------------------------------------- items (fine, drawn by hand with primitives)
STONE = ba.STONE
WOOD = ba.WOOD
BERRY = (ba.rgb(230, 57, 70), ba.rgb(255, 150, 160), ba.rgb(160, 24, 40))
LEAF = ba.LEAF


def item_stone():
    c = fx.Canvas(20, 16)
    ba.comp(c, ba.ellipse(10, 9.5, 8.5, 5.5) | ba.ellipse(8, 7, 5.5, 4.5), ba.shaded(STONE))
    ba.comp(c, {(6, 6), (7, 5), (8, 5)}, STONE[1], outline=False)  # glint
    ba.comp(c, {(12 + i, 9 + i // 2) for i in range(4)}, STONE[2], outline=False)  # crack
    return c.image()


def item_berries():
    c = fx.Canvas(20, 18)
    ba.comp(c, {(10, 1), (10, 2), (10, 3), (11, 4), (9, 4)}, ba.rgb(62, 140, 66))  # stem
    ba.comp(c, ba.ellipse(14, 3.5, 3, 1.8), ba.shaded(LEAF))  # leaf
    for (x, y) in ((6.5, 9.5), (13.5, 9.5), (10, 13)):
        ba.comp(c, ba.ellipse(x, y, 4, 4), ba.shaded(BERRY))
        c.set(int(x) - 2, int(y) - 2, (255, 210, 215, 255))
    return c.image()


def item_log():
    c = fx.Canvas(34, 20)
    ba.comp(c, ba.rect(7, 4, 31, 15) | ba.ellipse(31, 9.5, 2.5, 6), ba.shaded(WOOD, lambda x, y: y in (7, 11) and x % 5 != 0))
    ba.comp(c, ba.ellipse(7, 9.5, 5.5, 6.5), ba.shaded((ba.rgb(240, 200, 150), ba.rgb(255, 230, 190), ba.rgb(200, 150, 100))))
    ring = ba.ellipse(7, 9.5, 3.4, 4) - ba.ellipse(7, 9.5, 2.2, 2.8)
    ba.comp(c, ring, ba.rgb(200, 150, 100), outline=False)
    c.set(7, 9, ba.rgb(170, 110, 70))
    return c.image()


def chips(material):
    """2 frames, 32x24: flying chips (fine version of gather/chips-*.png)."""
    mat = WOOD if material == 'wood' else STONE
    frames = []
    for spots in ([(12, 13, 2.2), (18, 9, 1.8), (22, 14, 2), (16, 17, 1.6)], [(5, 7, 1.8), (16, 3, 1.6), (26, 6, 1.8), (8, 16, 1.6), (24, 16, 1.6)]):
        c = fx.Canvas(32, 24)
        for (x, y, r) in spots:
            pts = ba.ellipse(x, y, r * 1.3, r) if material == 'wood' else ba.poly([(x - r, y), (x, y - r), (x + r, y + 0.5), (x, y + r)])
            ba.comp(c, pts, ba.shaded(mat))
        frames.append(c.image())
    return fx.strip(frames)


# ---------------------------------------------------------------- batch 2: coins, power-ups, dungeon, build sign, tiles
GOLD = ba.FLAG
CREAM = ba.CREAM
ORANGE = (ba.rgb(255, 138, 61), ba.rgb(255, 192, 138), ba.rgb(200, 96, 40))
RED = (ba.rgb(230, 57, 70), ba.rgb(255, 120, 120), ba.rgb(160, 24, 40))
SILVER = (ba.rgb(206, 226, 240), ba.rgb(255, 255, 255), ba.rgb(150, 170, 192))
GREEN = da.GREEN
SMOKE = ba.SMOKE
DARK = da.DARK


def plus(x, y, a=2):
    return {(x + i, y) for i in range(-a, a + 1)} | {(x, y + i) for i in range(-a, a + 1)}


def coin(c, x, y):
    """One coin, 13x13 incl. outline (top-left at x, y)."""
    ba.comp(c, ba.ellipse(x + 6.5, y + 6.5, 5.6, 5.6), ba.shaded(GOLD))
    ba.comp(c, ba.ellipse(x + 6.5, y + 6.5, 3.4, 3.4) - ba.ellipse(x + 6.5, y + 6.5, 2.3, 2.3), GOLD[2], outline=False)
    c.set(x + 4, y + 3, GOLD[1])


def coin_sparkle():
    """3 frames, 22x22: plus, star, star with glints (fine coin-sparkle)."""
    frames = []
    for i in range(3):
        c = fx.Canvas(22, 22)
        if i == 0:
            ba.comp(c, plus(11, 11, 2), GOLD[1])
            c.set(11, 11, CREAM)
        else:
            ba.comp(c, da.star_pts(11, 11, 6 + 3 * (i == 1)) | plus(11, 11, 9 if i == 1 else 7), GOLD[1])
            ba.comp(c, plus(11, 11, 1), CREAM, outline=False)
            if i == 2:
                for (x, y) in ((3, 3), (18, 3), (3, 18), (18, 18)):
                    ba.comp(c, {(x, y)}, GOLD[0])
        frames.append(c.image())
    return fx.strip(frames)


def coin_pile(size):
    spots, w, h = {
        's': ([(0, 8), (10, 8), (5, 0)], 24, 22),
        'm': ([(0, 16), (10, 16), (20, 16), (5, 8), (15, 8), (10, 0)], 34, 30),
        'l': ([(0, 24), (11, 24), (22, 24), (33, 24), (5, 16), (16, 16), (27, 16), (11, 8), (22, 8), (16, 0)], 46, 38),
    }[size]
    c = fx.Canvas(w, h)
    for (x, y) in spots:
        coin(c, x, y)
    if size == 'l':
        ba.comp(c, plus(38, 6, 3), GOLD[1])
        c.set(38, 6, CREAM)
    return c.image()


def boot():
    """Winged boot (speed power-up), 34x34."""
    c = fx.Canvas(34, 34)
    wing = ba.poly([(18, 9), (27, 1), (32, 1), (29, 6), (33, 7), (28, 12), (32, 14), (24, 18), (19, 16)])
    ba.comp(c, wing, ba.shaded(SMOKE))
    for k in range(4):  # feather lines
        ba.comp(c, {(21 + k, 11 - k), (21 + k, 15 - k // 2)}, SMOKE[2], outline=False)
    ba.comp(c, ba.rect(10, 8, 20, 22) | ba.poly([(4, 21), (21, 19), (24, 24), (24, 27), (4, 27)]) | ba.ellipse(6, 24, 4, 3.5), ba.shaded(ORANGE))
    ba.comp(c, ba.rect(9, 6, 21, 9), ba.shaded(ba.DARKWOOD))  # cuff
    ba.comp(c, ba.rect(3, 28, 24, 29), ba.shaded(ba.DARKWOOD))  # sole
    ba.comp(c, ba.rect(12, 13, 18, 13) | ba.rect(12, 16, 18, 16), ORANGE[2], outline=False)  # laces
    return c.image()


def magnet():
    """Horseshoe magnet (magnet power-up), 30x30."""
    c = fx.Canvas(30, 30)
    u = (ba.ellipse(15, 15, 13, 12.5) - ba.ellipse(15, 15, 6, 5.5)) & ba.rect(0, 14, 29, 29)
    legs = ba.rect(2, 4, 8, 15) | ba.rect(21, 4, 27, 15)
    ba.comp(c, u | legs, ba.shaded(RED))
    for x0 in (2, 21):
        ba.comp(c, ba.rect(x0, 1, x0 + 6, 5), ba.shaded(SILVER))
    return c.image()


def chest(open_, h=32):
    c = fx.Canvas(36, h)
    ba.comp(c, ba.rect(2, 14, 33, 29), ba.shaded(ba.WOOD, ba.planks_h(5)))
    if open_:
        ba.comp(c, ba.rect(5, 11, 30, 16), DARK[0])
        ba.comp(c, ba.ellipse(17.5, 13, 10, 3.6), ba.shaded(GOLD))
        for (x, y) in ((12, 11), (20, 10), (25, 13)):
            c.set(x, y, CREAM)
        ba.comp(c, ba.rect(2, 1, 33, 8), ba.shaded(ba.WOOD, ba.planks_h(5)))  # lid flipped back
        ba.comp(c, ba.rect(2, 6, 33, 8), ba.shaded(GOLD), outline=False)
    else:
        ba.comp(c, ba.rect(2, 7, 33, 14) | (ba.ellipse(17.5, 8, 15.5, 4) & ba.rect(0, 0, 35, 8)), ba.shaded(ba.WOOD, ba.planks_h(5)))
        ba.comp(c, ba.rect(2, 12, 33, 14), ba.shaded(GOLD))
        ba.comp(c, ba.rect(14, 12, 21, 19), ba.shaded(GOLD))  # lock
        ba.comp(c, ba.rect(17, 15, 18, 17), DARK[0], outline=False)
    for x in (6, 29):
        ba.comp(c, ba.rect(x, 16, x + 1, 29), GOLD[2], outline=False)
    return c.image()


def potion():
    c = fx.Canvas(32, 32)
    ba.comp(c, ba.ellipse(16, 21, 10, 9.5), ba.shaded(RED))
    ba.comp(c, ba.ellipse(16, 21, 10, 9.5) & ba.rect(0, 12, 31, 15), RED[0], outline=False)
    ba.comp(c, ba.rect(12, 6, 19, 12), ba.shaded(SILVER))
    ba.comp(c, ba.rect(11, 2, 20, 5), ba.shaded(ba.WOOD))  # cork
    ba.comp(c, {(9, 18), (9, 19), (9, 20), (10, 17), (11, 16)}, ba.rgb(255, 200, 206), outline=False)  # glint
    for (x, y) in ((19, 22), (14, 26), (21, 18)):
        c.set(x, y, RED[1])
    return c.image()


def stairs(up):
    c = fx.Canvas(64, 64)
    ba.comp(c, ba.rect(2, 2, 61, 61), ba.shaded(da.SAND))
    ba.comp(c, ba.rect(8, 6, 55, 57), DARK[0])
    if up:
        for i in range(6):
            f = 0.6 + i * 0.08
            mat = tuple(ba.rgb(*(min(255, int(ch * f)) for ch in col[:3])) for col in ba.STONE)
            ba.comp(c, ba.rect(10 + 2 * i, 49 - i * 8, 53 - 2 * i, 55 - i * 8), ba.shaded(mat))
        ba.comp(c, ba.rect(16, 2, 47, 4), ba.rgb(255, 241, 168), outline=False)
    else:
        da.steps(c, 10, 53, 8, 7, h=6, shrink=2)
    return c.image()


def spin_arc():
    frames = []
    for i in range(4):
        c = fx.Canvas(96, 80)
        a0 = -90 + i * 90
        ba.comp(c, da.ring_pts(48, 44, 31, 38, a0, a0 + 150, sy=0.8), SMOKE[1])
        ba.comp(c, da.ring_pts(48, 44, 33.5, 36, a0 + 95, a0 + 150, sy=0.8), CREAM, outline=False)
        frames.append(c.image())
    return fx.strip(frames)


def ground_ring(cx, cy, rx, k, t):
    return ba.ellipse(cx, cy, rx, rx * k) - ba.ellipse(cx, cy, rx - t, rx * k - t)


def slam_ring():
    frames = []
    for i, (rx, t) in enumerate(((16, 4), (28, 4), (40, 3), (50, 2.5))):
        c = fx.Canvas(112, 56)
        ba.comp(c, ground_ring(56, 30, rx, 0.48, t), SMOKE[0] if i < 3 else SMOKE[2])
        if i in (1, 2):
            for k in range(5):
                a = math.radians(-160 + k * 35)
                x, y = 56 + (rx + 6) * math.cos(a), 29 + (rx * 0.48 + 2 + i * 2) * math.sin(a)
                ba.comp(c, ba.ellipse(x, y, 2.6, 2.2), ba.shaded(ba.STONE))
        frames.append(c.image())
    return fx.strip(frames)


def charge_streak():
    frames = []
    for i in range(3):
        c = fx.Canvas(96, 32)
        for k, y in enumerate((8, 16, 24)):
            length = (60, 80, 44)[k] - i * 16
            x1 = 92 - (k % 2) * 8
            ba.comp(c, ba.rect(max(2, x1 - length), y, x1, y + 1), SMOKE[1] if k != 1 else CREAM)
        frames.append(c.image())
    return fx.strip(frames)


def sidestep_puff():
    frames = []
    for i in range(3):
        c = fx.Canvas(48, 48)
        if i < 2:
            o = 2 * i
            outer = ba.ellipse(24, 24, 18 - o, 16 - o) | ba.rect(6 + o, 24, 41 - o, 41 - o)
            inner = ba.ellipse(24, 24, 15 - o, 13 - o) | ba.rect(9 + o, 24, 38 - o, 38 - o)
            ba.comp(c, {(x, y) for (x, y) in outer - inner if (x + y + i) % 2 == 0}, SMOKE[1], outline=False)
        for (cx, cy, r) in ((14, 40, 5 - i), (24, 42, 6 - 1.2 * i), (34, 40, 5 - i)):
            if r > 2:
                ba.comp(c, ba.ellipse(cx - 2 * i, cy, r, r * 0.8), ba.shaded(SMOKE))
        frames.append(c.image())
    return fx.strip(frames)


def heal_ring():
    frames = []
    for i, rx in enumerate((12, 22, 30, 36)):
        c = fx.Canvas(80, 48)
        ba.comp(c, ground_ring(40, 30, rx, 0.45, 2.4), GREEN[1] if i % 2 else GOLD[1])
        if i >= 1:
            for (x, y0) in ((20, 24), (56, 22), (40, 16)):
                ba.comp(c, plus(x, y0 - i * 4, 2), GREEN[1] if (x + i) % 2 else GOLD[0])
        frames.append(c.image())
    return fx.strip(frames)


def wall_dome():
    frames = []
    for i, h in enumerate((20, 36, 36)):
        c = fx.Canvas(96, 80)
        dome = {(x, y) for (x, y) in ba.ellipse(48, 72, 44, h * 1.6) if y <= 72}
        rim = dome - {(x, y) for (x, y) in ba.ellipse(48, 72, 41.5, h * 1.6 - 2.5) if y <= 72}
        ba.comp(c, {(x, y) for (x, y) in dome - rim if (x + 2 * (y % 4 == 2) + i) % 4 == 0 and y % 2 == 0}, ba.rgb(140, 190, 250), outline=False)
        ba.comp(c, rim, ba.rgb(120, 170, 244))
        if i == 2:
            ba.comp(c, {(28 + k, int(72 - h * 1.6) + 8 + k // 2) for k in range(10)}, CREAM, outline=False)
        frames.append(c.image())
    return fx.strip(frames)


def block_spark():
    frames = []
    for r in (3, 6, 4):
        c = fx.Canvas(32, 32)
        ba.comp(c, da.star_pts(16, 16, 2 * r + 2), CREAM if r != 6 else GOLD[1])
        if r == 6:
            for (x, y) in ((4, 4), (27, 5), (5, 27), (27, 27)):
                ba.comp(c, plus(x, y, 1), CREAM)
        frames.append(c.image())
    return fx.strip(frames)


def ko_stars():
    frames = []
    for phase in (0, 1):
        c = fx.Canvas(40, 18)
        for i in range(3):
            a = (i / 3 + phase / 6) * 2 * math.pi
            ba.comp(c, da.star_pts(20 + 14 * math.cos(a), 9 + 4.5 * math.sin(a), 4.4), ba.shaded(GOLD))
        frames.append(c.image())
    return fx.strip(frames)


def revive():
    frames = []
    for i in range(3):
        c = fx.Canvas(32, 40)
        for (x, y0) in ((8, 30), (22, 26), (16, 36)):
            y = y0 - i * 8
            if y > 3:
                ba.comp(c, plus(x, y, 2), GREEN[1] if (x + i) % 2 else GREEN[0])
        frames.append(c.image())
    return fx.strip(frames)


def shockwave():
    frames = []
    for i, (rx, t) in enumerate(((20, 3.5), (34, 3), (46, 2.5))):
        c = fx.Canvas(96, 48)
        ba.comp(c, ground_ring(48, 24, rx, 0.47, t), SMOKE[0] if i < 2 else SMOKE[2])
        frames.append(c.image())
    return fx.strip(frames)


def slam_warning():
    c = fx.Canvas(96, 48)
    ring = ba.ellipse(48, 24, 46, 22) - ba.ellipse(48, 24, 43, 19.5)
    ba.comp(c, {(x, y) for (x, y) in ring if (math.atan2((y + 0.5 - 24) * 2, x + 0.5 - 48) * 8 / math.pi) % 1 < 0.6}, RED[0])
    return c.image()


def build_spot():
    c = fx.Canvas(80, 60)
    ring = ba.ellipse(40, 38, 36, 18) - ba.ellipse(40, 38, 33.5, 15.8)
    ba.comp(c, {(x, y) for (x, y) in ring if (math.atan2((y + 0.5 - 38) * 2, x + 0.5 - 40) * 6 / math.pi) % 1 < 0.55}, CREAM)
    ba.comp(c, ba.rect(38, 18, 41, 41), ba.shaded(ba.DARKWOOD))  # post
    ba.comp(c, ba.rect(26, 4, 53, 20), ba.shaded(ba.WOOD, ba.planks_h(5)))  # board
    ba.comp(c, ba.rect(33, 8, 46, 11) | ba.rect(33, 12, 35, 13), ba.shaded(ba.METAL))  # hammer head
    ba.comp(c, ba.rect(40, 12, 41, 18), ba.shaded(ba.DARKWOOD))  # handle
    return c.image()


# ---- ground tiles, 32x32, seamless (no detail touches the tile edge)
GRASS = ba.rgb(132, 198, 105)
GRASS_HI, GRASS_LO = ba.rgb(139, 216, 125), ba.rgb(101, 165, 86)
DIRT, DIRT_HI, DIRT_LO = ba.rgb(226, 178, 122), ba.rgb(240, 200, 150), ba.rgb(196, 140, 90)
FLOOR, FLOOR_HI, FLOOR_LO = ba.rgb(234, 165, 108), ba.rgb(254, 201, 156), ba.rgb(207, 130, 84)
BRICK, BRICK_HI, BRICK_LO = ba.rgb(139, 155, 180), ba.rgb(192, 203, 220), ba.rgb(82, 96, 124)


def tile(bg):
    c = fx.Canvas(32, 32)
    for y in range(32):
        for x in range(32):
            c.set(x, y, bg)
    return c


def tuft(c, x, y):
    for (dx, dy) in ((0, 0), (1, 1), (2, 0), (3, 1), (4, 0)):
        c.set(x + dx, y + dy, GRASS_LO)
    c.set(x + 2, y - 1, GRASS_HI)


def flower(c, x, y, col, shade):
    for dy in range(-2, 3):
        for dx in range(-2, 3):
            if 0 < dx * dx + dy * dy <= 4 and abs(dx) + abs(dy) < 4:
                c.set(x + dx, y + dy, shade if dx + dy >= 2 else col)
    c.set(x, y, ba.rgb(255, 214, 90))
    c.set(x + 1, y + 3, GRASS_LO)


def grass_tiles():
    a = tile(GRASS)
    b = tile(GRASS)
    for (x, y) in ((4, 6), (19, 4), (11, 17), (22, 24), (5, 26)):
        tuft(b, x, y)
    for (x, y) in ((25, 13), (13, 9)):
        b.set(x, y, GRASS_HI)
    f = tile(GRASS)
    flower(f, 9, 9, ba.rgb(255, 255, 255), ba.rgb(214, 220, 236))
    flower(f, 22, 21, ba.rgb(253, 190, 83), ba.rgb(227, 134, 40))
    flower(f, 25, 7, ba.rgb(255, 150, 190), ba.rgb(222, 100, 150))
    tuft(f, 5, 24)
    return fx.strip([a.image(), b.image(), f.image()])


def pebble(c, x, y, w, hi, mid, lo):
    for dx in range(w):
        c.set(x + dx, y, hi)
        c.set(x + dx, y + 1, mid)
        c.set(x + dx, y + 2, lo)


def dirt_tiles():
    a = tile(DIRT)
    for (x, y) in ((6, 7), (23, 11), (14, 24), (27, 27), (4, 19)):
        a.set(x, y, DIRT_LO)
        a.set(x - 1, y - 1, DIRT_HI)
    b = tile(DIRT)
    for (x, y, w) in ((6, 6, 3), (20, 18, 4), (10, 24, 2)):
        pebble(b, x, y, w, ba.STONE[1], ba.STONE[0], DIRT_LO)
    return fx.strip([a.image(), b.image()])


def floor_tiles():
    a = tile(FLOOR)
    b = tile(FLOOR)
    for (x, y) in ((5, 8), (20, 5), (12, 20), (26, 25), (7, 27)):
        b.set(x, y, FLOOR_LO)
        b.set(x + 1, y - 1, FLOOR_HI)
    s = tile(FLOOR)
    for (x0, y0, w, h) in ((4, 5, 10, 8), (18, 3, 9, 7), (8, 18, 7, 6), (19, 15, 9, 10)):
        ba.comp(s, ba.rect(x0, y0, x0 + w - 1, y0 + h - 1), ba.shaded((ba.rgb(192, 203, 220), ba.rgb(220, 228, 240), ba.rgb(160, 172, 192))), outline=False)
        for x in range(x0, x0 + w):
            s.set(x, y0 + h, FLOOR_LO)
    return fx.strip([a.image(), b.image(), s.image()])


def bricks(c):
    for y in range(32):
        for x in range(32):
            row = y // 8
            off = 0 if row % 2 == 0 else 8
            yy, xx = y % 8, (x + off) % 16
            if yy == 7 or xx == 15:
                col = BRICK_LO
            elif yy == 0 or xx == 0:
                col = BRICK_HI
            else:
                col = BRICK
            c.set(x, y, col)


def wall_tiles():
    a = fx.Canvas(32, 32)
    bricks(a)
    b = fx.Canvas(32, 32)
    bricks(b)
    ban = ba.rect(9, 0, 22, 18) | ba.poly([(9, 18), (23, 18), (16, 26)])
    ba.comp(b, ban, ba.shaded((ba.rgb(232, 69, 55), ba.rgb(255, 112, 109), ba.rgb(180, 40, 40))))
    ba.comp(b, ba.poly([(13, 6), (19, 6), (19, 13), (16, 17), (13, 13)]), ba.shaded((ba.rgb(254, 174, 52), ba.rgb(255, 220, 140), ba.rgb(214, 130, 30))))
    return fx.strip([a.image(), b.image()])


BATCH2 = {
    'fx/coin-sparkle.png': coin_sparkle,
    'fx/coin-pile-s.png': lambda: coin_pile('s'),
    'fx/coin-pile-m.png': lambda: coin_pile('m'),
    'fx/coin-pile-l.png': lambda: coin_pile('l'),
    'icons/boot.png': boot,
    'icons/magnet.png': magnet,
    'icons/chest.png': lambda: chest(False, h=30).crop((0, 2, 36, 30)),
    'dungeon/chest-closed.png': lambda: chest(False),
    'dungeon/chest-open.png': lambda: chest(True),
    'dungeon/potion.png': potion,
    'dungeon/stairs-up.png': lambda: stairs(True),
    'dungeon/stairs-down.png': lambda: stairs(False),
    'dungeon/fx-spin.png': spin_arc,
    'dungeon/fx-slam.png': slam_ring,
    'dungeon/fx-charge.png': charge_streak,
    'dungeon/fx-sidestep.png': sidestep_puff,
    'dungeon/fx-heal.png': heal_ring,
    'dungeon/fx-wall.png': wall_dome,
    'dungeon/fx-block.png': block_spark,
    'dungeon/ko-stars.png': ko_stars,
    'dungeon/revive.png': revive,
    'dungeon/shockwave.png': shockwave,
    'dungeon/slam-warning.png': slam_warning,
    'base/build-spot.png': build_spot,
    'tiles/grass.png': grass_tiles,
    'tiles/dirt.png': dirt_tiles,
    'tiles/dungeon-floor.png': floor_tiles,
    'tiles/dungeon-wall.png': wall_tiles,
}


def main():
    out = {
        'gather/item-stone.png': item_stone(),
        'gather/item-berries.png': item_berries(),
        'icons/log.png': item_log(),
        'gather/chips-wood.png': chips('wood'),
        'gather/chips-stone.png': chips('stone'),
        'fx/dust.png': zoomed(fx.dust),
        'fx/levelup.png': zoomed(fx.levelup),
        'fx/plate-glow.png': zoomed(fx.plate_glow),
        'fx/splat.png': zoomed(fx.splat),
        **{k: f() for k, f in BATCH2.items()},
    }
    for name, im in out.items():
        path = os.path.join(OUT, name)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        im.save(path)
        print(f'{name:26s} {im.size}')
    if '--preview' in sys.argv:
        preview(out, sys.argv[sys.argv.index('--preview') + 1])


OLD_SRC = {}  # fine name -> old file when names differ; tiles have no old file (Kenney tilemap), so they are skipped


def preview(out, path, pad=12):
    """Old (left, at its game scale) vs fine (right, at half that scale) next to a blob-sized ruler."""
    old_dir = os.path.join(ROOT, 'public', 'art')
    rows = []
    for name, im in out.items():
        src = os.path.join(old_dir, OLD_SRC.get(name, name))
        if not os.path.exists(src):
            continue
        old = Image.open(src).convert('RGBA')
        rows.append((old.resize((old.width * 6, old.height * 6), Image.NEAREST), im.resize((im.width * 3, im.height * 3), Image.NEAREST)))
    w = max(a.width + b.width for a, b in rows) + 3 * pad
    h = sum(max(a.height, b.height) + pad for a, b in rows) + pad
    sheet = Image.new('RGBA', (w, h), (108, 191, 69, 255))
    y = pad
    for a, b in rows:
        sheet.alpha_composite(a, (pad, y))
        sheet.alpha_composite(b, (2 * pad + a.width, y))
        y += max(a.height, b.height) + pad
    sheet.save(path)
    print('preview', path)


if __name__ == '__main__':
    main()
