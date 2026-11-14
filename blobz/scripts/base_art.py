#!/usr/bin/env python3
"""Generate the base cottage (3 levels) and base-building art into public/art/base/ (own art, CC0).

usage (from blobz/): python3 scripts/base_art.py [--preview docs/art-review/base-sheet.png]

Buildings are composed from parts (walls, roofs, planks, stone, windows, doors), each part with its own
1 px plum outline and flat fill + top-left highlight + bottom-right shade, so everything matches the
Kenney Tiny look of public/art/props. Draw at scale 2 (one art pixel = one ground-tile pixel).
Sizes and anchors: public/art/base/README.md.
"""
import math
import os
import sys
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fx_sheet import Canvas  # noqa: E402

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT_DIR = os.path.join(ROOT, 'public', 'art', 'base')

PLUM = (63, 38, 49, 255)
N4 = ((1, 0), (-1, 0), (0, 1), (0, -1))


def rgb(*v):
    return (*v, 255)


# material: fill, highlight, shade
PLASTER = (rgb(255, 241, 214), rgb(255, 251, 240), rgb(222, 196, 160))
WOOD = (rgb(186, 118, 64), rgb(222, 160, 98), rgb(128, 74, 42))
DARKWOOD = (rgb(128, 74, 42), rgb(166, 102, 58), rgb(92, 52, 32))
ROOF = (rgb(214, 74, 66), rgb(242, 114, 92), rgb(160, 44, 48))
ROOF_BLUE = (rgb(70, 130, 210), rgb(110, 170, 240), rgb(44, 90, 160))
STONE = (rgb(163, 159, 168), rgb(212, 208, 214), rgb(112, 106, 118))
METAL = (rgb(96, 100, 114), rgb(150, 156, 170), rgb(58, 60, 72))
GLASS = (rgb(126, 196, 244), rgb(206, 238, 255), rgb(80, 140, 210))
SOIL = (rgb(140, 92, 58), rgb(170, 118, 76), rgb(104, 66, 42))
LEAF = (rgb(124, 192, 74), rgb(176, 224, 112), rgb(66, 138, 52))
WATER = (rgb(70, 140, 220), rgb(140, 200, 250), rgb(44, 96, 180))
SMOKE = (rgb(236, 236, 240), rgb(255, 255, 255), rgb(196, 198, 210))
FLAG = (rgb(255, 201, 60), rgb(255, 241, 168), rgb(224, 160, 30))
CARROT = rgb(255, 138, 61)
CREAM = rgb(255, 247, 230)


class Shifted(Canvas):
    """Canvas that draws everything `oy` px lower (headroom for smoke)."""
    def __init__(self, w, h, oy):
        super().__init__(w, h)
        self.oy = oy

    def set(self, x, y, c):
        super().set(x, y + self.oy, c)


def rect(x0, y0, x1, y1):
    return {(x, y) for x in range(x0, x1 + 1) for y in range(y0, y1 + 1)}


def poly(pts):
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    out = set()
    for y in range(int(min(ys)), int(max(ys)) + 1):
        for x in range(int(min(xs)), int(max(xs)) + 1):
            px, py, inside = x + 0.5, y + 0.5, False
            for i in range(len(pts)):
                (ax, ay), (bx, by) = pts[i], pts[i - 1]
                if (ay > py) != (by > py) and px < (bx - ax) * (py - ay) / (by - ay) + ax:
                    inside = not inside
            if inside:
                out.add((x, y))
    return out


def ellipse(cx, cy, rx, ry):
    return {(x, y) for y in range(int(cy - ry) - 1, int(cy + ry) + 2) for x in range(int(cx - rx) - 1, int(cx + rx) + 2)
            if ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1}


def shaded(mat, tex=None):
    fill, hi, lo = mat

    def f(x, y, m):
        if (x + 1, y) not in m or (x, y + 1) not in m:
            return lo
        if (x - 1, y) not in m or (x, y - 1) not in m:
            return hi
        if tex and tex(x, y):
            return lo
        return fill
    return f


def planks_h(period=3):
    return lambda x, y: y % period == 0


def planks_v(period=3):
    return lambda x, y: x % period == 0


def shingles(x, y):
    return y % 3 == 0 or (y % 3 == 1 and (x + (y // 3) * 2) % 5 == 0)


def blocks(x, y):
    return y % 4 == 0 or (x + (y // 4) * 3) % 6 == 0


def comp(c, pts, colfn, outline=True):
    """Paint one part: plum outline around it (over whatever is below), then its fill."""
    pts = set(pts)
    if outline:
        for (x, y) in pts:
            for dx, dy in N4:
                if (x + dx, y + dy) not in pts:
                    c.set(x + dx, y + dy, PLUM)
    for (x, y) in pts:
        c.set(x, y, colfn(x, y, pts) if callable(colfn) else colfn)


def window(c, x0, y0, w=5, h=5):
    comp(c, rect(x0, y0, x0 + w - 1, y0 + h - 1), shaded(GLASS))
    for x in range(x0, x0 + w):
        c.set(x, y0 + h // 2, CREAM)
    for y in range(y0, y0 + h):
        c.set(x0 + w // 2, y, CREAM)
    comp(c, rect(x0 - 1, y0 + h + 1, x0 + w, y0 + h + 1), WOOD[0])  # sill


def door(c, x0, y0, w, h):
    pts = rect(x0, y0 + 2, x0 + w - 1, y0 + h - 1) | rect(x0 + 1, y0, x0 + w - 2, y0 + 1)
    comp(c, pts, shaded(DARKWOOD, planks_v(2)))
    c.set(x0 + w - 2, y0 + h // 2 + 1, FLAG[0])  # knob


def roof(c, x0, x1, y_eave, y_ridge, inset, mat=ROOF):
    pts = poly([(x0, y_eave + 1), (x1 + 1, y_eave + 1), (x1 + 1 - inset, y_ridge), (x0 + inset, y_ridge)])
    comp(c, pts, shaded(mat, shingles))
    comp(c, rect(x0 + inset, y_ridge - 1, x1 - inset, y_ridge), mat[2])  # ridge


def smoke(c, x, y):
    for (cx, cy, r) in ((x, y, 2.2), (x - 2, y - 4, 2.8), (x + 1, y - 9, 3.2)):
        comp(c, ellipse(cx, cy, r, r * 0.9), shaded(SMOKE))


# ---------------------------------------------------------------- cottage
def cottage(level):
    if level == 1:
        c = Canvas(44, 40)
        comp(c, rect(7, 20, 36, 38), shaded(PLASTER))
        for x0 in (7, 35):
            comp(c, rect(x0, 20, x0 + 1, 38), shaded(WOOD))
        roof(c, 3, 40, 20, 5, 5)
        door(c, 19, 27, 6, 12)
        window(c, 11, 25)
        window(c, 28, 25)
        return c.image()
    if level == 2:
        c = Shifted(52, 62, 10)
        comp(c, rect(36, 6, 40, 18), shaded(STONE, blocks))  # chimney behind the roof ridge
        smoke(c, 38, 3)
        comp(c, rect(5, 28, 46, 50), shaded(PLASTER))
        for x0 in (5, 25, 45):
            comp(c, rect(x0, 28, x0 + 1, 50), shaded(WOOD))
        comp(c, rect(5, 28, 46, 29), shaded(WOOD))  # beam under the eave
        roof(c, 1, 50, 28, 11, 6)
        comp(c, rect(36, 8, 40, 16), shaded(STONE, blocks))  # chimney in front of the roof
        comp(c, rect(35, 7, 41, 8), STONE[2])
        door(c, 13, 37, 7, 14)
        window(c, 8, 33, 4, 5)
        window(c, 30, 33)
        window(c, 38, 33)
        return c.image()
    # level 3: level 2 cottage + stone tower with a flag on the right
    c = Canvas(64, 64)
    comp(c, rect(36, 18, 40, 30), shaded(STONE, blocks))
    smoke(c, 38, 15)
    comp(c, rect(3, 40, 44, 62), shaded(PLASTER))
    for x0 in (3, 23, 43):
        comp(c, rect(x0, 40, x0 + 1, 62), shaded(WOOD))
    comp(c, rect(3, 40, 44, 41), shaded(WOOD))
    roof(c, 0, 47, 40, 23, 6)
    comp(c, rect(34, 20, 38, 28), shaded(STONE, blocks))
    comp(c, rect(33, 19, 39, 20), STONE[2])
    door(c, 11, 49, 7, 14)
    window(c, 6, 45, 4, 5)
    window(c, 28, 45)
    # tower
    comp(c, rect(46, 22, 59, 62), shaded(STONE, blocks))
    comp(c, rect(45, 20, 60, 22), shaded(STONE))  # battlement ledge
    comp(c, poly([(44, 21), (61, 21), (52.5, 7)]), shaded(ROOF_BLUE, shingles))
    comp(c, rect(52, 0, 52, 8), WOOD[2])  # flag pole
    comp(c, poly([(53, 0), (60, 2.5), (53, 5)]), shaded(FLAG))
    window(c, 50, 30, 5, 6)
    window(c, 50, 44, 5, 6)
    comp(c, rect(50, 55, 54, 62), shaded(DARKWOOD, planks_v(2)))
    return c.image()


# ---------------------------------------------------------------- buildings (finished)
def bridge():
    c = Canvas(48, 24)
    arch = lambda x: round(3 * math.sin(math.pi * (x - 2) / 44))
    deck = {(x, y) for x in range(2, 46) for y in range(11 - arch(x), 17 - arch(x))}
    for x in (4, 16, 31, 43):  # posts down into the water
        comp(c, rect(x, 15 - arch(x), x + 1, 22), shaded(DARKWOOD))
    comp(c, deck, shaded(WOOD, planks_v(3)))
    rail = {(x, 6 - arch(x)) for x in range(3, 45)} | {(x, 7 - arch(x)) for x in range(3, 45)}
    for x in (3, 13, 23, 34, 44):
        rail |= {(x, y) for y in range(6 - arch(x), 12 - arch(x))}
    comp(c, rail, shaded(WOOD))
    return c.image()


def watchtower():
    c = Canvas(30, 52)
    for x in (5, 22):  # legs
        comp(c, rect(x, 18, x + 2, 50), shaded(DARKWOOD))
    brace = {(5 + i * 17 // 26, 22 + i) for i in range(27)} | {(24 - i * 17 // 26, 22 + i) for i in range(27)}
    comp(c, brace, WOOD[0])
    comp(c, rect(12, 20, 16, 50), shaded(WOOD, lambda x, y: y % 4 == 0))  # ladder
    comp(c, rect(2, 16, 27, 21), shaded(WOOD, planks_h(3)))  # platform
    comp(c, rect(3, 10, 26, 11), shaded(WOOD))  # rail
    for x in (3, 10, 18, 25):
        comp(c, rect(x, 10, x + 1, 16), shaded(WOOD))
    comp(c, rect(4, 6, 5, 10), shaded(DARKWOOD))
    comp(c, rect(24, 6, 25, 10), shaded(DARKWOOD))
    comp(c, poly([(0, 8), (30, 8), (15, 0)]), shaded(ROOF, shingles))
    return c.image()


def garden(crops=True):
    c = Canvas(40, 30)
    comp(c, rect(3, 6, 36, 27), shaded(SOIL, lambda x, y: (y - 6) % 5 == 4))
    fence = rect(1, 4, 38, 5) | rect(1, 27, 38, 28) | rect(1, 4, 2, 28) | rect(37, 4, 38, 28)
    comp(c, fence, shaded(WOOD))
    for x in (1, 13, 26, 37):
        comp(c, rect(x, 1, x + 1, 5), shaded(DARKWOOD))
    if crops:
        for row, y in enumerate((9, 14, 19, 24)):
            for x in range(6, 35, 6):
                if row % 2 == 0:  # carrots
                    comp(c, rect(x, y, x + 1, y + 1), CARROT)
                    comp(c, {(x - 1, y - 2), (x, y - 1), (x + 2, y - 2), (x + 1, y - 1)}, LEAF[2], outline=False)
                else:  # cabbages
                    comp(c, ellipse(x + 1, y, 2.2, 1.8), shaded(LEAF))
    return c.image()


def workshop():
    c = Canvas(44, 38)
    comp(c, rect(4, 12, 39, 36), shaded(WOOD, planks_h(3)))  # back wall
    comp(c, rect(3, 12, 5, 36), shaded(DARKWOOD))
    comp(c, rect(38, 12, 40, 36), shaded(DARKWOOD))
    comp(c, poly([(0, 14), (44, 14), (40, 3), (4, 3)]), shaded(ROOF, shingles))
    comp(c, rect(8, 24, 26, 26), shaded(WOOD))  # bench
    for x in (9, 24):
        comp(c, rect(x, 27, x + 1, 33), shaded(DARKWOOD))
    saw = rect(12, 19, 21, 21) | {(x, 22) for x in range(12, 22, 2)}
    comp(c, saw, shaded(STONE))
    comp(c, rect(21, 19, 23, 21), shaded(WOOD))  # saw handle
    anvil = rect(28, 27, 37, 29) | rect(31, 30, 34, 32) | rect(29, 33, 36, 35) | rect(26, 27, 27, 28)
    comp(c, anvil, shaded(METAL))
    return c.image()


def storage():
    c = Canvas(36, 34)
    comp(c, rect(4, 14, 27, 32), shaded(WOOD, planks_h(3)))
    comp(c, poly([(1, 16), (31, 16), (27, 4), (5, 4)]), shaded(DARKWOOD, shingles))
    comp(c, rect(5, 3, 26, 4), DARKWOOD[2])
    door(c, 12, 21, 8, 12)
    comp(c, rect(28, 25, 34, 32), shaded(WOOD, planks_h(2)))  # crate
    comp(c, {(28 + i, 25 + i) for i in range(7)} & rect(28, 25, 34, 32), WOOD[2], outline=False)
    comp(c, ellipse(31, 20, 3.2, 4.4), shaded(WOOD, lambda x, y: y in (18, 22)))  # barrel
    return c.image()


def well():
    c = Canvas(28, 36)
    for x in (4, 22):  # posts
        comp(c, rect(x, 6, x + 1, 26), shaded(DARKWOOD))
    comp(c, rect(5, 9, 22, 9), WOOD[2])  # crossbar with rope
    comp(c, rect(13, 10, 13, 17), CREAM)
    comp(c, rect(11, 17, 15, 20), shaded(WOOD))  # bucket
    comp(c, poly([(0, 8), (28, 8), (14, 0)]), shaded(ROOF, shingles))
    comp(c, rect(2, 25, 25, 34), shaded(STONE, blocks))  # front wall of the well
    comp(c, ellipse(13.5, 24.5, 11.5, 3.6), shaded(STONE))  # rim
    comp(c, ellipse(13.5, 24.5, 8, 2), shaded(WATER), outline=True)
    return c.image()


def build_spot():
    """Dotted outline on the ground + a small sign with a hammer."""
    c = Canvas(40, 30)
    ring = ellipse(20, 19, 18, 9) - ellipse(20, 19, 16.5, 7.6)
    dashes = {(x, y) for (x, y) in ring if (math.atan2((y + 0.5 - 19) * 2, x + 0.5 - 20) * 6 / math.pi) % 1 < 0.55}
    comp(c, dashes, CREAM)
    comp(c, rect(19, 9, 20, 20), shaded(DARKWOOD))  # post
    comp(c, rect(13, 2, 26, 10), shaded(WOOD, planks_h(4)))  # board
    comp(c, rect(17, 4, 22, 5), METAL[1], outline=False)  # hammer head
    comp(c, rect(17, 6, 18, 6), METAL[1], outline=False)
    comp(c, rect(20, 6, 20, 9), DARKWOOD[2], outline=False)  # handle
    return c.image()


# ---------------------------------------------------------------- construction sites
def site(finished, keep=0.3, flat=False):
    """Same canvas as the finished frame: dirt patch, the bottom of the building, scaffold and a plank pile."""
    w, h = finished.size
    box = finished.getbbox()
    c = Canvas(w, h)
    x0, y0, x1, y1 = box[0] + 1, box[1], box[2] - 2, box[3] - 1
    comp(c, ellipse((x0 + x1) / 2, y1 - 2, (x1 - x0) / 2 + 1, 3.2), shaded(SOIL))
    cut = y1 - int((y1 - y0) * keep)
    fin = finished.load()
    for y in range(cut + (0 if flat else 0), h):
        for x in range(w):
            jag = (x * 7) % 3
            if y >= cut + jag and fin[x, y][3]:
                c.set(x, y, fin[x, y])
    if not flat:
        top = y0 + 3
        for x in (x0 + 1, (x0 + x1) // 2, x1 - 2):
            comp(c, rect(x, top, x + 1, y1 - 1), shaded(WOOD))
        for y in (top + 2, (top + y1) // 2):
            comp(c, rect(x0, y, x1, y + 1), shaded(WOOD))
        comp(c, {(x0 + 2 + i, top + 3 + i) for i in range(min(x1 - x0 - 4, y1 - top - 6))}, WOOD[2])
    # plank pile + stones
    px, py = x1 - 9, y1 - 3
    comp(c, rect(px, py, px + 8, py + 1), shaded(WOOD))
    comp(c, rect(px + 1, py - 2, px + 7, py - 1), shaded(WOOD))
    comp(c, ellipse(x0 + 3, y1 - 2, 2.2, 1.8), shaded(STONE))
    return c.image()


def main():
    finished = {
        'bridge': bridge(), 'watchtower': watchtower(), 'garden': garden(), 'workshop': workshop(),
        'storage': storage(), 'well': well(),
    }
    out = {f'cottage-{i}.png': cottage(i) for i in (1, 2, 3)}
    for name, im in finished.items():
        if name == 'garden':
            out[f'{name}-site.png'] = site(garden(crops=False), keep=1.0, flat=True)
        elif name == 'bridge':
            out[f'{name}-site.png'] = site(im, keep=0.55, flat=True)
        else:
            out[f'{name}-site.png'] = site(im)
        out[f'{name}.png'] = im
    out['build-spot.png'] = build_spot()
    os.makedirs(OUT_DIR, exist_ok=True)
    for name, im in out.items():
        im.save(os.path.join(OUT_DIR, name))
        print(f'{name:22s} {im.size}')
    if '--preview' in sys.argv:
        preview(out, sys.argv[sys.argv.index('--preview') + 1])


def preview(out, path, scale=5, pad=16):
    rows = [['cottage-1.png', 'cottage-2.png', 'cottage-3.png', 'build-spot.png']]
    names = [n for n in out if not n.startswith('cottage') and n != 'build-spot.png']
    rows += [names[i:i + 6] for i in range(0, len(names), 6)]
    width = max(sum(out[n].width * scale + pad for n in r) for r in rows) + pad
    height = sum(max(out[n].height for n in r) * scale + pad for r in rows) + pad
    sheet = Image.new('RGBA', (width, height), (108, 191, 69, 255))
    yard = (226, 178, 122, 255)
    y = pad
    for r in rows:
        x, rh = pad, max(out[n].height for n in r) * scale
        for n in r:
            im = out[n]
            if n.startswith('cottage'):
                sheet.alpha_composite(Image.new('RGBA', (im.width * scale, im.height * scale), yard), (x, y + rh - im.height * scale))
            sheet.alpha_composite(im.resize((im.width * scale, im.height * scale), Image.NEAREST), (x, y + rh - im.height * scale))
            x += im.width * scale + pad
        y += rh + pad
    sheet.save(path)
    print('preview', path)


if __name__ == '__main__':
    main()
