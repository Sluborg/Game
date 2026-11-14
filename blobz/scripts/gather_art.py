#!/usr/bin/env python3
"""Generate the "gathering with tools" art set into public/art/gather/ (own art, CC0).

usage (from blobz/): python3 scripts/gather_art.py [--preview docs/art-review/gather-sheet.png]

Style: Kenney Tiny look in fine pixels, 1 px plum outline, flat fill + top-left highlight +
bottom-right shade, native size (scale up with nearest neighbour). Frame sizes: public/art/gather/README.md.
Tools are rasterised per frame from a shape in tool space (u = along the handle from the grip,
v = across it, + towards the swing), so every swing angle keeps clean 1 px outlines.
"""
import math
import os
import sys
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fx_sheet import Canvas, ellipse, strip  # noqa: E402  (shared pixel helpers)

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT_DIR = os.path.join(ROOT, 'public', 'art', 'gather')

PAL = {
    'U': (63, 38, 49), 'W': (255, 255, 255), 'c': (255, 247, 230), 'C': (226, 207, 178),
    'h': (186, 118, 64), 'H': (222, 160, 98), 'd': (128, 74, 42),            # wood
    'm': (170, 178, 190), 'M': (232, 238, 244), 'n': (104, 110, 126),        # metal
    'S': (163, 159, 168), 's': (212, 208, 214), 'x': (112, 106, 118),        # stone
    'R': (230, 57, 70), 'r': (160, 24, 40), 'p': (255, 176, 186),            # berries
    'L': (124, 192, 74), 'l': (66, 138, 52), 'g': (176, 224, 112),           # leaves
    'Y': (255, 201, 60), 'y': (224, 160, 30), 'o': (255, 241, 168), 'O': (255, 138, 61),
    'B': (86, 170, 240), 'b': (52, 120, 200), 'P': (150, 96, 200), 'q': (88, 56, 140),
    'G': (98, 196, 88), 'k': (62, 140, 66), 'e': (90, 84, 96),
}
RGBA = {k: (*v, 255) for k, v in PAL.items()}
PLUM = RGBA['U']


def paint(c, x0, y0, rows):
    for ry, row in enumerate(rows):
        for rx, ch in enumerate(row):
            if ch != '.':
                c.set(x0 + rx, y0 + ry, RGBA[ch])


def outline(c):
    """Plum 1 px outline (4-neighbour) around everything painted so far."""
    add = []
    for y in range(c.h):
        for x in range(c.w):
            if c.px[y][x] is None and any(
                    0 <= x + dx < c.w and 0 <= y + dy < c.h and c.px[y + dy][x + dx] not in (None, PLUM)
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                add.append((x, y))
    for x, y in add:
        c.px[y][x] = PLUM


def from_rows(rows):
    assert all(len(r) == len(rows[0]) for r in rows), rows
    c = Canvas(len(rows[0]), len(rows))
    paint(c, 0, 0, rows)
    return c.image()


# ---------------------------------------------------------------- tools
def axe(u, v):
    if -2 <= u <= 15 and abs(v) <= 1:
        return 'H' if v < 0 else 'h' if v < 1 else 'd'
    if 11.5 <= u <= 16 and -1.5 <= v <= 1.5:
        return 'n'  # socket
    flare = 2 + max(0, v - 1.5) * 0.55
    if 1.5 < v <= 8 and abs(u - 13.5) <= flare:
        return 'M' if v > 6.6 else 'm' if u < 14 else 'n'
    return None


def pickaxe(u, v):
    if -2 <= u <= 16 and abs(v) <= 1:
        return 'H' if v < 0 else 'h' if v < 1 else 'd'
    if abs(v) <= 7.6:
        cu = 15.5 - (v * v) / 12
        half = 1.7 - abs(v) * 0.13
        if abs(u - cu) <= half:
            return 'M' if abs(v) > 5.8 else 'm' if u < cu + 0.3 else 'n'
    return None


def rake(u, v):
    if -2 <= u <= 15.5 and abs(v) <= 1:
        return 'H' if v < 0 else 'h' if v < 1 else 'd'
    if 14.5 <= u <= 16.5 and abs(v) <= 6.5:
        return 'm' if u < 15.5 else 'n'
    if 16.5 < u <= 19.5 and abs(v) <= 6.5 and ((v + 6.5) % 3.25) < 1.3:
        return 'M' if u > 21 else 'm'
    return None


SWING = [-100, -55, -10, 22]  # degrees, screen space (0 = right, -90 = up); swing turns clockwise
PIVOT = (16, 28)
HAND = (33, 33)  # blob grid pixel the pivot goes on (right side of the body, at hand height)
FRAME = (44, 48)
TOOL_SCALE = 1.25  # tool space -> pixels (handle ~3 px thick, axe ~24 px long)


def tool_frame(shape, angle, size=FRAME, pivot=PIVOT, scale=1.0, mono=None):
    w, h = size
    c = Canvas(w, h)
    a = math.radians(angle)
    du = (math.cos(a), math.sin(a))
    dv = (-math.sin(a), math.cos(a))
    for y in range(h):
        for x in range(w):
            px, py = (x + 0.5 - pivot[0]) / scale, (y + 0.5 - pivot[1]) / scale
            u, v = px * du[0] + py * du[1], px * dv[0] + py * dv[1]
            ch = shape(u, v)
            if ch:
                if mono:
                    ch = mono.get(ch, 'c')
                c.set(x, y, RGBA[ch])
    outline(c)
    return c.image()


def tool_strip(shape):
    return strip([tool_frame(shape, a, scale=TOOL_SCALE) for a in SWING])


MONO = {'H': 'W', 'h': 'c', 'd': 'C', 'n': 'C', 'm': 'c', 'M': 'W'}


def tool_icon(shape, scale):
    """Cream/white tool silhouette for the orange action button, 16x16."""
    return tool_frame(shape, -45, size=(16, 16), pivot=(3.5, 13), scale=scale, mono=MONO)


DASH_ICON = ['UUU..UUU...', 'UcCU.UcCU..', '.UcCU.UcCU.', '..UcCU.UcCU', '.UcCU.UcCU.', 'UcCU.UcCU..', 'UUU..UUU...']


# ---------------------------------------------------------------- nodes
LEAF = ((RGBA['L']), RGBA['g'], RGBA['l'])
STONE = (RGBA['S'], RGBA['s'], RGBA['x'])


def bush_mask():
    return ellipse(9, 9.5, 7.5, 5) | ellipse(6, 7, 4.5, 4) | ellipse(12, 6.5, 4.5, 4) | ellipse(9, 5, 3.5, 3)


BERRY_SPOTS = [(5, 7), (9, 5), (13, 8), (7, 11), (11, 11), (14, 5)]


def berry_bush(full):
    c = Canvas(18, 16)
    c.blob(bush_mask(), LEAF)
    if full:
        for x, y in BERRY_SPOTS:
            paint(c, x - 1, y - 1, ['.UU.', 'UpRU', 'URrU', '.UU.'])
    else:
        for x, y in BERRY_SPOTS[:3]:  # a few leaf veins so the empty bush is not just a blob
            c.set(x, y, RGBA['l'])
            c.set(x + 1, y, RGBA['l'])
    return c.image()


def rubble():
    c = Canvas(15, 10)
    for e in [(4, 6.5, 3.5, 2.5), (10.5, 6.5, 3.5, 2.8), (7.5, 4, 2.6, 2.2)]:
        c.blob(ellipse(*e), STONE)
    return c.image()


def chips(material):
    """2 frames, 16x12: small chips flying up and out from a hit point (bottom centre)."""
    cols = ('H', 'h', 'd') if material == 'wood' else ('s', 'S', 'x')
    frames = []
    for i, spots in enumerate([[(6, 6), (9, 4), (11, 7), (8, 8)], [(2, 3), (8, 1), (13, 3), (4, 8), (12, 8)]]):
        c = Canvas(16, 12)
        for j, (x, y) in enumerate(spots):
            if material == 'wood':
                piece = [cols[0] + cols[1], cols[1] + cols[2]] if j % 2 == 0 else [cols[0] + cols[1] + cols[2]]
            else:
                piece = [cols[0] + cols[1], cols[1] + cols[2]]
            paint(c, x, y, piece)
        outline(c)
        frames.append(c.image())
    return strip(frames)


# ---------------------------------------------------------------- items
STONE_ITEM = ['...UUUU...', '..UssSSU..', '.UsssSSSU.', 'UsssSSSSxU', 'UsSSSSSxxU', 'USSSSSxxxU', '.UxxxxxxU.', '..UUUUUU..']
BERRIES_ITEM = ['....UU....', '...UlLU...', '..UUlUUU..', '.UpRUUpRU.', 'UpRRrUpRrU', 'URRrUpRRrU', '.UrUURRrU.', '..U..UrU..', '......U...']

# ---------------------------------------------------------------- HUD
HUD_WOOD = ['...UUUUUU.', '..UHHhhhhU', '.UcCUhhhdU', 'UcCdCUhhdU', 'UCdcCUdddU', '.UcCUddddU', '..UUUUUUU.']
HUD_STONE = ['..UUUU..', '.UssSSU.', 'UssSSSxU', 'USSSSxxU', 'USSSxxxU', '.UUUUUU.']
HUD_BERRY = ['...UU...', '..UlLU..', '.UUlUUU.', 'UpRUpRRU', 'URrUURrU', '.UU..UU.']
def sun():
    c = Canvas(13, 13)
    rays = [(6, 0), (6, 1), (6, 11), (6, 12), (0, 6), (1, 6), (11, 6), (12, 6), (2, 2), (10, 2), (2, 10), (10, 10)]
    for x, y in rays:
        c.set(x, y, RGBA['O'])
    c.blob(ellipse(6.5, 6.5, 3.6, 3.6), (RGBA['Y'], RGBA['o'], RGBA['y']))
    return c.image()


STAR = ['.....U.....', '....UYU....', '....UoU....', 'UUUUUYUUUUU', 'UYoYYYYYYyU', '.UYYYYYYyU.', '..UYYYYyU..',
        '.UYYyUyyYU.', '.UYyU.UyyU.', 'UyyU...UyyU', 'UUU.....UUU']


def star(empty=False):
    rows = STAR if not empty else [r.replace('Y', 'C').replace('o', 'c').replace('y', 'C') for r in STAR]
    return from_rows(rows)


DUSK = ['B', 'B', 'b', 'Y', 'Y', 'O', 'O', 'R', 'P', 'q']


def daybar_fill():
    """Day progress fill, 40x6: sky blue (morning) -> yellow (noon) -> orange -> purple (dusk). Crop to show progress."""
    w, h = 40, 6
    c = Canvas(w, h)
    for x in range(w):
        k = DUSK[min(len(DUSK) - 1, x * len(DUSK) // w)]
        for y in range(h):
            col = RGBA[k]
            if y == 0:
                col = tuple(min(255, int(v * 1.18)) for v in col[:3]) + (255,)
            elif y == h - 1:
                col = tuple(int(v * 0.8) for v in col[:3]) + (255,)
            c.set(x, y, col)
    return c.image()


def bar_frame(w=42, h=8):
    """Empty bar: plum outline, rounded ends, dark inner track (9-slice friendly: 3 px caps)."""
    rows = []
    for y in range(h):
        if y in (0, h - 1):
            rows.append('.' + 'U' * (w - 2) + '.')
        else:
            rows.append('U' + ('e' if y < h - 2 else 'x') * (w - 2) + 'U')
    return from_rows(rows)


def bar_fill(w=40, h=6, k='G', hi='g', lo='k'):
    rows = [hi * w] + [k * w] * (h - 2) + [lo * w]
    return from_rows(rows)


def quest_card():
    """Quest card, 24x18, 9-slice with 5 px borders: cream panel like ui/panel.png with an orange header strip."""
    w, h = 24, 18
    rows = []
    for y in range(h):
        row = []
        for x in range(w):
            corner = (x in (0, w - 1) and y in (0, 1, h - 2, h - 1)) or (y in (0, h - 1) and x in (0, 1, w - 2, w - 1))
            if corner:
                row.append('.')
            elif x in (0, w - 1) or y in (0, h - 1) or (x in (1, w - 2) and y in (1, h - 2)):
                row.append('U')
            elif y <= 4:
                row.append('W' if y == 1 else 'O' if y < 4 else 'y')
            elif y == 5:
                row.append('U')
            elif y == h - 2:
                row.append('C')
            else:
                row.append('c')
        rows.append(''.join(row))
    return from_rows(rows)


def main():
    out = {
        'tool-axe.png': tool_strip(axe),
        'tool-pickaxe.png': tool_strip(pickaxe),
        'tool-rake.png': tool_strip(rake),
        'btn-axe.png': tool_icon(axe, 0.72),
        'btn-pickaxe.png': tool_icon(pickaxe, 0.66),
        'btn-rake.png': tool_icon(rake, 0.6),
        'btn-dash.png': from_rows(DASH_ICON),
        'bush-berries.png': berry_bush(True),
        'bush-empty.png': berry_bush(False),
        'rubble.png': rubble(),
        'chips-wood.png': chips('wood'),
        'chips-stone.png': chips('stone'),
        'item-stone.png': from_rows(STONE_ITEM),
        'item-berries.png': from_rows(BERRIES_ITEM),
        'hud-wood.png': from_rows(HUD_WOOD),
        'hud-stone.png': from_rows(HUD_STONE),
        'hud-berries.png': from_rows(HUD_BERRY),
        'sun.png': sun(),
        'star.png': star(),
        'star-empty.png': star(True),
        'daybar-frame.png': bar_frame(),
        'daybar-fill.png': daybar_fill(),
        'bar-fill-green.png': bar_fill(),
        'quest-card.png': quest_card(),
    }
    os.makedirs(OUT_DIR, exist_ok=True)
    for name, im in out.items():
        im.save(os.path.join(OUT_DIR, name))
        print(f'{name:22s} {im.size}')
    if '--preview' in sys.argv:
        preview(out, sys.argv[sys.argv.index('--preview') + 1])


def preview(out, path):
    """Review sheet: every image at 6x on grass and on the orange button colour, plus a blob holding each tool."""
    scale, pad = 6, 14
    items = list(out.items())
    rows, cur, cw, maxw = [], [], 0, 1500
    for name, im in items:
        tw = im.width * scale + pad
        if cw + tw > maxw:
            rows.append(cur)
            cur, cw = [], 0
        cur.append((name, im))
        cw += tw
    rows.append(cur)
    hgt = sum(max(im.height for _, im in r) * scale + pad * 2 for r in rows) + pad
    sheet = Image.new('RGBA', (maxw + pad, hgt), (108, 191, 69, 255))
    y = pad
    for r in rows:
        x = pad
        rh = max(im.height for _, im in r) * scale
        for name, im in r:
            if name.startswith('btn-'):
                bg = Image.new('RGBA', (im.width * scale, im.height * scale), (253, 127, 52, 255))
                sheet.alpha_composite(bg, (x, y))
            sheet.alpha_composite(im.resize((im.width * scale, im.height * scale), Image.NEAREST), (x, y))
            x += im.width * scale + pad
        y += rh + pad * 2
    blob_png = os.environ.get('BLOB_PNG')  # optional: a 36x48 blob render to show the tools in hand
    if blob_png and os.path.exists(blob_png):
        blob = Image.open(blob_png).convert('RGBA')
        demo = Image.new('RGBA', (4 * 3 * 72 + 4 * 3 * 4, 56), (0, 0, 0, 0))
        x = 0
        for tool in ('tool-axe.png', 'tool-pickaxe.png', 'tool-rake.png'):
            frames = out[tool]
            for f in range(4):
                fr = frames.crop((f * FRAME[0], 0, (f + 1) * FRAME[0], FRAME[1]))
                cell = Image.new('RGBA', (72, 56), (0, 0, 0, 0))
                cell.alpha_composite(blob, (6, 0))
                hx, hy = 6 + HAND[0] - PIVOT[0], HAND[1] - PIVOT[1]
                cell.alpha_composite(fr, (hx, hy))
                demo.alpha_composite(cell, (x, 0))
                x += 76
        big = demo.resize((demo.width * 2, demo.height * 2), Image.NEAREST)
        ext = Image.new('RGBA', (max(sheet.width, big.width + 2 * pad), sheet.height + big.height + 2 * pad), (108, 191, 69, 255))
        ext.alpha_composite(sheet, (0, 0))
        ext.alpha_composite(big, (pad, sheet.height + pad))
        sheet = ext
    sheet.save(path)
    print('preview', path)


if __name__ == '__main__':
    main()
