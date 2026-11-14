#!/usr/bin/env python3
"""Board mock for the meadow water corner (docs/art-review/variants-water.png): three 390x844 phone views.

usage (from blobz/): python3 scripts/water_variants.py

  A  Kenney Tiny Battle shore autotiles (CC0, already vendored) as-is, 16 px tiles at scale 2.
  B  The same tiles redrawn 2x finer (Scale2x/EPX pass, 32 px tiles at scale 1) + fine grass tiles.
  C  Own fine water: a free-form shoreline (no tile grid) in the Tiny Battle palette, scale 1.
All three use the same L of water (top-left corner layout of makeWater, channel widened to 64 px = 2 tiles)
and the bridge, with a blob for size.
"""
import math
import os
import random
import sys
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import class_cards as cc  # noqa: E402  (blob renderer)

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
ASSETS = os.path.join(ROOT, 'public', 'assets')
ART = os.path.join(ROOT, 'public', 'art')
OUT = os.path.join(ROOT, 'docs', 'art-review', 'variants-water.png')

VW, VH, VX = 390, 844, 96  # view size and world x offset (view shows world x 96..486, y 0..844)
T = 32  # world px per tile
VERT = (9, 10)  # water tile columns (world x 288..352)
HORIZ = (8, 9)  # water tile rows (world y 256..320)
BRIDGE = (320, 125)

BATTLE = Image.open(os.path.join(ASSETS, 'kenney-tiny-battle', 'tilemap_packed.png')).convert('RGBA')
TOWN = Image.open(os.path.join(ASSETS, 'kenney-tiny-town', 'tilemap_packed.png')).convert('RGBA')


def frame(sheet, f, cols):
    return sheet.crop(((f % cols) * 16, (f // cols) * 16, (f % cols) * 16 + 16, (f // cols) * 16 + 16))


def bt(f):
    return frame(BATTLE, f, 18)


def half(left, right):
    """Tile from the left half of one and the right half of another."""
    im = left.copy()
    im.paste(right.crop((8, 0, 16, 16)), (8, 0))
    return im


def is_water(tx, ty):
    return (tx in VERT and ty <= HORIZ[1]) or (ty in HORIZ and tx <= VERT[1])


def shore_tile(tx, ty):
    """Tiny Battle autotile for a water cell from its 8 neighbours (inner SW/SE built from halves of 39)."""
    land = {k: not is_water(tx + dx, ty + dy) for k, (dx, dy) in
            {'n': (0, -1), 's': (0, 1), 'w': (-1, 0), 'e': (1, 0), 'nw': (-1, -1), 'ne': (1, -1), 'sw': (-1, 1), 'se': (1, 1)}.items()}
    n, s, w, e = land['n'], land['s'], land['w'], land['e']
    if n and w: return bt(18)
    if n and e: return bt(20)
    if s and w: return bt(54)
    if s and e: return bt(56)
    if n: return bt(19)
    if s: return bt(55)
    if w: return bt(36)
    if e: return bt(38)
    if land['nw']: return bt(90)
    if land['ne']: return bt(91)
    if land['sw']: return half(bt(39), bt(37))
    if land['se']: return half(bt(37), bt(39))
    return bt(37 if (tx * 7 + ty * 3) % 4 else 92)


def scale2x(im):
    """EPX / Scale2x: doubles the pixels and rounds diagonal steps (keeps the palette, no blur)."""
    w, h = im.size
    src = im.load()
    out = Image.new('RGBA', (w * 2, h * 2))
    dst = out.load()
    for y in range(h):
        for x in range(w):
            p = src[x, y]
            a = src[x, max(0, y - 1)]
            b = src[min(w - 1, x + 1), y]
            c = src[max(0, x - 1), y]
            d = src[x, min(h - 1, y + 1)]
            e0 = a if (c == a and c != d and a != b) else p
            e1 = b if (a == b and a != c and b != d) else p
            e2 = c if (d == c and d != b and c != a) else p
            e3 = d if (b == d and b != a and d != c) else p
            dst[2 * x, 2 * y], dst[2 * x + 1, 2 * y], dst[2 * x, 2 * y + 1], dst[2 * x + 1, 2 * y + 1] = e0, e1, e2, e3
    return out


def grass_world(fine):
    """Meadow ground for the view: tiny-town grass at 2x (A) or the fine grass tiles at 1x (B, C)."""
    im = Image.new('RGBA', (VW, VH))
    rnd = random.Random(7)
    fine_tiles = Image.open(os.path.join(ART, 'fine', 'tiles', 'grass.png')).convert('RGBA')
    for ty in range(VH // T + 1):
        for tx in range(-1, VW // T + 2):
            v = rnd.random()
            k = 0 if v < 0.8 else 1 if v < 0.97 else 2
            tile = fine_tiles.crop((k * 32, 0, k * 32 + 32, 32)) if fine else frame(TOWN, k, 12).resize((32, 32), Image.NEAREST)
            im.alpha_composite(tile, (tx * T - VX % T, ty * T))
    return im


def tiles_view(fine):
    im = grass_world(fine)
    for ty in range(VH // T + 1):
        for tx in range(VX // T, (VX + VW) // T + 1):
            if is_water(tx, ty):
                t = shore_tile(tx, ty)
                t = scale2x(t) if fine else t.resize((32, 32), Image.NEAREST)
                im.alpha_composite(t, (tx * T - VX, ty * T))
    return im


# ---------------------------------------------------------------- C: free-form fine shoreline
GRASS_HI, GRASS_LO = (139, 216, 125, 255), (101, 165, 86, 255)
DIRT, DIRT_LO = (234, 165, 108, 255), (207, 130, 84, 255)
FOAM, SHADOW, WATER, STREAK = (217, 247, 255, 255), (70, 196, 228, 255), (117, 227, 255, 255), (159, 235, 255, 255)


def water_mask():
    """World-space water test: the same L with a wobbly edge, a rounded outer bend and a filleted inner bend."""
    def inside(x, y):
        wx = 3 * math.sin(y / 23) + 2 * math.sin(y / 9 + 1)
        wy = 3 * math.sin(x / 27 + 2) + 2 * math.sin(x / 11)
        vert = 288 + wx <= x < 352 + wx * 0.7 and y < 320 + wy
        hor = 256 + wy <= y < 320 + wy * 0.7 and x < 352 + wx
        if (vert or hor) and x > 330 and y > 298 and math.hypot(x - 330, y - 298) > 22:
            return False  # rounded outer bend
        if 266 <= x < 288 and 234 <= y < 256 and math.hypot(x - 266, y - 234) > 22:
            return True  # fillet at the inner bend
        return vert or hor
    return inside


def free_view():
    im = grass_world(True)
    px = im.load()
    inside = water_mask()
    W = [[inside(x + VX, y) for x in range(-6, VW + 6)] for y in range(-6, VH + 6)]

    def w(x, y):
        return W[y + 6][x + 6]
    rnd = random.Random(3)
    for y in range(VH):
        for x in range(VW):
            if w(x, y):
                near = lambda d: any(not w(x + dx, y + dy) for dx in range(-d, d + 1) for dy in range(-d, d + 1) if abs(dx) + abs(dy) <= d)
                if not w(x, y - 1) or near(1):
                    px[x, y] = FOAM
                elif not w(x, y - 2) or not w(x, y - 3):
                    px[x, y] = SHADOW
                else:
                    px[x, y] = WATER
            else:
                # 3/4 view: a dirt bank where water lies just below, light green rim on the other sides
                if w(x, y + 1) or w(x, y + 2):
                    px[x, y] = DIRT if w(x, y + 1) else DIRT_LO if not w(x, y + 2) else DIRT
                elif w(x, y + 3) or w(x, y + 4):
                    px[x, y] = GRASS_LO
                elif w(x, y + 5) or w(x - 1, y) or w(x + 1, y) or w(x, y - 1):
                    px[x, y] = GRASS_HI
    for _ in range(140):  # ripples
        x, y, n = rnd.randrange(VW), rnd.randrange(VH), rnd.randint(3, 6)
        if all(w(x + i, y) and px[x + i, y] == WATER for i in range(-2, n + 2)):
            for i in range(n):
                px[x + i, y] = STREAK if i % 3 else FOAM
    return im


# ---------------------------------------------------------------- overlays and sheet
def overlays(im, fine, blob):
    br = Image.open(os.path.join(ART, 'base', 'bridge.png')).convert('RGBA')
    br = scale2x(br) if fine else br.resize((br.width * 2, br.height * 2), Image.NEAREST)
    im.alpha_composite(br, (BRIDGE[0] - VX - br.width // 2, BRIDGE[1] + 24 - br.height))
    bs = blob.resize((round(blob.width * 1.45), round(blob.height * 1.45)), Image.NEAREST)
    im.alpha_composite(bs, (BRIDGE[0] - VX - bs.width // 2 - 4, BRIDGE[1] - bs.height + 4))
    im.alpha_composite(bs, (150 - VX, 470))
    return im


def main():
    blob = cc.blobs()['healer']
    views = [('A  Kenney 16 px, scale 2', overlays(tiles_view(False), False, blob)),
             ('B  Kenney redrawn 2x finer', overlays(tiles_view(True), True, blob)),
             ('C  own fine free-form shore', overlays(free_view(), True, blob))]
    pad, top = 16, 44
    sheet = Image.new('RGBA', (3 * VW + 4 * pad, VH + top + pad), (74, 60, 70, 255))
    d = ImageDraw.Draw(sheet)
    for i, (label, v) in enumerate(views):
        x = pad + i * (VW + pad)
        sheet.alpha_composite(v, (x, top))
        d.text((x + 4, 12), label, fill=(255, 241, 214, 255), font_size=22)
    sheet.save(OUT)
    print(OUT, sheet.size)


if __name__ == '__main__':
    main()
