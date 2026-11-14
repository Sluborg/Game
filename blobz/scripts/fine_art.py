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
    }
    for name, im in out.items():
        path = os.path.join(OUT, name)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        im.save(path)
        print(f'{name:26s} {im.size}')
    if '--preview' in sys.argv:
        preview(out, sys.argv[sys.argv.index('--preview') + 1])


def preview(out, path, pad=12):
    """Old (left, at its game scale) vs fine (right, at half that scale) next to a blob-sized ruler."""
    old_dir = os.path.join(ROOT, 'public', 'art')
    rows = []
    for name, im in out.items():
        old = Image.open(os.path.join(old_dir, name)).convert('RGBA')
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
