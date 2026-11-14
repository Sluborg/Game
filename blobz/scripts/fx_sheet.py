#!/usr/bin/env python3
"""Generate Blobz gameplay effects as native-size pixel PNGs (own art, CC0) in public/art/fx/.

usage (from blobz/): python3 scripts/fx_sheet.py [--preview docs/art-review/fx-sheet.png]

Animations are horizontal strips of equal frames (Phaser: load.spritesheet with the frame size
listed in public/art/fx/README.md). Style: Kenney Tiny look, 1 px plum outline, flat fill with a
top-left highlight and a bottom-right shade, crisp pixels (scale up with nearest neighbour only).
"""
import math
import os
import sys
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT_DIR = os.path.join(ROOT, 'public', 'art', 'fx')

PLUM = (63, 38, 49, 255)
# (fill, highlight, shade) per material
DUST = ((246, 236, 214, 255), (255, 255, 255, 255), (214, 196, 166, 255))
GOO = ((115, 68, 148, 255), (164, 116, 204, 255), (80, 44, 106, 255))
GOLD = ((255, 201, 60, 255), (255, 241, 168, 255), (224, 168, 30, 255))
WHITE = (255, 255, 255, 255)
CHAR = {'U': PLUM, 'Y': GOLD[0], 'o': GOLD[1], 'y': GOLD[2], 'W': WHITE}


class Canvas:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.px = [[None] * w for _ in range(h)]

    def set(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h and c:
            self.px[y][x] = c

    def blob(self, mask, mat, outline=True, shade=True):
        """Paint a filled shape (set of (x, y)) with highlight/shade bands and a plum outline."""
        fill, hi, lo = mat
        if outline:
            for (x, y) in mask:
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    if (x + dx, y + dy) not in mask:
                        self.set(x + dx, y + dy, PLUM)
        for (x, y) in mask:
            c = fill
            if shade and len(mask) > 6:
                if (x + 1, y) not in mask or (x, y + 1) not in mask:
                    c = lo
                if (x - 1, y) not in mask or (x, y - 1) not in mask:
                    c = hi
                if (x - 1, y) not in mask and (x, y + 1) not in mask:
                    c = fill  # bottom-left corner: neither lit nor shaded
            self.set(x, y, c)

    def rows(self, x0, y0, rows):
        for ry, row in enumerate(rows):
            for rx, ch in enumerate(row):
                if ch != '.':
                    self.set(x0 + rx, y0 + ry, CHAR[ch])

    def image(self):
        im = Image.new('RGBA', (self.w, self.h), (0, 0, 0, 0))
        for y in range(self.h):
            for x in range(self.w):
                if self.px[y][x]:
                    im.putpixel((x, y), self.px[y][x])
        return im


def ellipse(cx, cy, rx, ry):
    """Pixels whose centre lies inside the ellipse."""
    out = set()
    for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
        for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
            if ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1:
                out.add((x, y))
    return out


def ring(cx, cy, rx, ry, t):
    """Elliptical band of thickness t (pixels) seen in 3/4 top-down view."""
    return ellipse(cx, cy, rx, ry) - ellipse(cx, cy, max(0.1, rx - t), max(0.1, ry - t))


def strip(frames):
    w, h = frames[0].size
    im = Image.new('RGBA', (w * len(frames), h), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        im.paste(f, (i * w, 0))
    return im


# ---------- dust puff: 4 frames, 14x12 ----------
def dust():
    frames = []
    specs = [
        [(7, 8, 3, 2.5)],
        [(5, 7.5, 3, 2.6), (9.5, 7, 3.2, 3), (7, 5, 2.5, 2.2)],
        [(3.5, 7.5, 2.6, 2.2), (10.5, 7, 2.6, 2.4), (7, 4, 2.2, 2)],
        [(2.5, 8, 1.6, 1.4), (11.5, 7.5, 1.6, 1.4), (7, 3, 1.4, 1.3)],
    ]
    for spec in specs:
        c = Canvas(14, 12)
        mask = set()
        for e in spec:
            mask |= ellipse(*e)
        c.blob(mask, DUST)
        frames.append(c.image())
    return strip(frames)


# ---------- goo splat burst: 4 frames, 20x16 ----------
def splat():
    frames = []
    for i in range(4):
        c = Canvas(20, 16)
        if i == 0:  # squash
            c.blob(ellipse(10, 9.5, 5.5, 3.5), GOO)
        elif i == 1:  # burst: puddle + flying drops
            c.blob(ellipse(10, 10, 6.5, 3) | ellipse(10, 8, 3.5, 2.5), GOO)
            for (x, y, r) in ((3, 4, 1.6), (17, 4.5, 1.6), (10, 2, 1.4)):
                c.blob(ellipse(x, y, r, r), GOO)
        elif i == 2:  # flat puddle, drops further out and falling
            c.blob(ellipse(10, 11, 7.5, 2.6), GOO)
            for (x, y, r) in ((2, 6, 1.4), (18, 6.5, 1.4), (6, 3, 1.1), (14.5, 3, 1.1)):
                c.blob(ellipse(x, y, r, r), GOO)
        else:  # thin puddle with splats around, matches enemies/goo-splat.png
            c.blob(ellipse(10, 11.5, 7, 2), GOO)
            for (x, y, r) in ((2, 11, 1.1), (18, 11.5, 1.1), (5, 7.5, 1), (15, 7.5, 1)):
                c.blob(ellipse(x, y, r, r), GOO, shade=False)
        frames.append(c.image())
    return strip(frames)


# ---------- coin sparkle: 3 frames, 11x11 ----------
SPARKLE = [
    ['...........', '...........', '...........', '.....U.....', '....UoU....', '...UoWoU...',
     '....UoU....', '.....U.....', '...........', '...........', '...........'],
    ['...........', '.....U.....', '....UYU....', '....UoU....', '.UUUoWoUUU.', 'UYooWWWooYU',
     '.UUUoWoUUU.', '....UoU....', '....UyU....', '.....U.....', '...........'],
    ['.....U.....', '.U...U...U.', 'UoU.UoU.UoU', '.U..UoU..U.', '...UoWoU...', 'UUUoWWWoUUU',
     '...UoWoU...', '.U..UoU..U.', 'UoU.UyU.UoU', '.U...U...U.', '.....U.....'],
]


def sparkle():
    frames = []
    for rows in SPARKLE:
        c = Canvas(11, 11)
        c.rows(0, 0, rows)
        frames.append(c.image())
    return strip(frames)


# ---------- level-up ring for totems: 4 frames, 32x22 (ring on the ground + rising stars) ----------
def levelup():
    frames = []
    for i in range(4):
        c = Canvas(32, 22)
        rx = [7, 10.5, 13.5, 15.5][i]
        ry = rx * 0.42
        t = [2, 2, 1.6, 1.2][i]
        c.blob(ring(16, 16, rx, ry, t), GOLD, shade=False)
        # rising sparks: small plus signs climbing with each frame
        for (x, y0) in ((6, 12), (26, 11), (16, 9)):
            y = y0 - i * 3
            if i >= 1 and y >= 1:
                c.rows(x - 1, y - 1, ['.U.', 'UoU', '.U.'] if i < 3 else ['.U.', 'UWU', '.U.'])
        frames.append(c.image())
    return strip(frames)


# ---------- team-bank coin pile: 3 sizes ----------
def coin(c, x, y):
    """One round coin (7x7 with outline), like icons/coin.png in miniature."""
    c.rows(x, y, ['..UUU..', '.UYoYU.', 'UYoYYYU', 'UYYYYyU', 'UYYYyyU', '.UyyyU.', '..UUU..'])


def pile(size):
    if size == 's':
        c = Canvas(12, 11)
        for (x, y) in ((0, 4), (5, 4), (3, 0)):
            coin(c, x, y)
    elif size == 'm':
        c = Canvas(17, 15)
        for (x, y) in ((0, 8), (5, 8), (10, 8), (2, 4), (8, 4), (5, 0)):
            coin(c, x, y)
    else:
        c = Canvas(23, 19)
        for (x, y) in ((0, 12), (5, 12), (11, 12), (16, 12), (2, 8), (8, 8), (14, 8), (5, 4), (11, 4), (8, 0)):
            coin(c, x, y)
        c.rows(17, 1, ['..U..', '.UoU.', 'UoWoU', '.UoU.', '..U..'])  # glint on top of the big pile
    return c.image()


# ---------- pressure plate glow ring: 21x16 (centred on props/plate.png, 13x12) ----------
def plate_glow():
    c = Canvas(21, 16)
    c.blob(ring(10.5, 8, 10, 7.5, 2), GOLD, shade=False)
    for (x, y) in ((10, 0), (0, 7), (20, 7), (10, 15)):  # bright glints on the ring
        c.set(x, y, GOLD[1])
    return c.image()


OUTPUTS = {
    'dust.png': dust,
    'splat.png': splat,
    'coin-sparkle.png': sparkle,
    'levelup.png': levelup,
    'coin-pile-s.png': lambda: pile('s'),
    'coin-pile-m.png': lambda: pile('m'),
    'coin-pile-l.png': lambda: pile('l'),
    'plate-glow.png': plate_glow,
}


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    images = {}
    for name, fn in OUTPUTS.items():
        im = fn()
        im.save(os.path.join(OUT_DIR, name))
        images[name] = im
        print(name, im.size)
    if '--preview' in sys.argv:
        path = sys.argv[sys.argv.index('--preview') + 1]
        scale, pad = 8, 16
        w = max(im.width for im in images.values()) * scale + 2 * pad
        h = sum(im.height * scale + pad for im in images.values()) + pad
        sheet = Image.new('RGBA', (w, h), (108, 191, 69, 255))
        y = pad
        for im in images.values():
            big = im.resize((im.width * scale, im.height * scale), Image.NEAREST)
            sheet.alpha_composite(big, (pad, y))
            y += big.height + pad
        sheet.save(path)
        print('preview', path)


if __name__ == '__main__':
    main()
