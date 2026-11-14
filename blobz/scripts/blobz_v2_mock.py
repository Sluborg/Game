#!/usr/bin/env python3
"""Blobz v2 mock on Ninja Adventure's 16 px grid (docs/art-review/blobz-v2.png): a look test before blob.ts changes.

usage (from blobz/): python3 scripts/blobz_v2_mock.py

Frame 16x18 (body 16x16 + 2 rows of hat room), 4 facings like the Ninja characters (down, up, left, right),
Ninja outline colour (20,27,27). Shown with Ninja characters and monsters at the same scale.
"""
import os
from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
NA = os.path.join(ROOT, 'public', 'assets', 'ninja-adventure')
OUT = os.path.join(ROOT, 'docs', 'art-review', 'blobz-v2.png')

FW, FH = 16, 18
INK = (20, 27, 27, 255)
WHITE = (255, 255, 255, 255)
EYE = (227, 241, 245, 255)
PINK = (211, 110, 130, 255)

# body mask widths per row (bottom row last), max 14 so the outline fits in 16
SHAPES = {
    'dome': [6, 8, 10, 12, 12, 14, 14, 14, 14, 14, 14, 12],
    'ball': [4, 8, 10, 12, 12, 12, 12, 12, 12, 10, 8],
    'tall': [4, 6, 8, 8, 10, 10, 10, 10, 10, 10, 10, 10, 10, 8],
    'flat': [8, 12, 14, 14, 14, 14, 12],
    'pear': [4, 6, 6, 8, 8, 10, 12, 12, 14, 14, 14, 12],
    'cube': [10, 12, 12, 12, 12, 12, 12, 12, 12, 12, 10],
}
COLOURS = [(90, 180, 240), (255, 143, 176), (125, 220, 90), (255, 201, 60), (177, 140, 255), (255, 138, 61)]


def shade(c, f):
    return tuple(max(0, min(255, int(v * f))) for v in c) + (255,)


def body_mask(widths, squash=0):
    """Pixels of the body standing on row FH-2 (one row left for the outline). squash: +1 wider/lower, -1 taller."""
    ws = list(widths)
    if squash == 1:
        ws = ws[1:]
        ws = [min(14, w + 2) if i >= len(ws) // 2 else w for i, w in enumerate(ws)]
    elif squash == -1:
        ws = [ws[0]] + ws
        ws = [max(4, w - 2) if i >= len(ws) - 3 else w for i, w in enumerate(ws)]
    pts = set()
    bottom = FH - 2
    for i, w in enumerate(reversed(ws)):
        y = bottom - i
        x0 = 8 - w // 2
        for x in range(x0, x0 + w):
            pts.add((x, y))
    return pts


def paint(im, pts, col):
    for (x, y) in pts:
        if 0 <= x < FW and 0 <= y < FH:
            im.putpixel((x, y), col)


def outline(pts):
    out = set()
    for (x, y) in pts:
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            if (x + dx, y + dy) not in pts:
                out.add((x + dx, y + dy))
    return out


def eyes(face, top, bottom, kind):
    """Eye and mouth pixels for a facing. top/bottom: body rows."""
    h = bottom - top + 1
    ey = top + max(2, int(h * 0.35))
    px = {}
    if face == 'up':
        return px
    if face == 'q':
        xs = [7, 11]
    elif face == 'down':
        xs = [5, 10]
    elif face == 'right':
        xs = [11]
    else:
        xs = [3]
    for ex in xs:
        if kind == 'happy':
            for (dx, dy) in ((0, 1), (1, 0)):
                px[(ex + dx - (0 if face != 'left' else 0), ey + dy)] = INK
        else:
            for dy in range(3 if kind == 'big' else 2):
                px[(ex, ey + dy)] = EYE
                px[(ex + 1, ey + dy)] = EYE
            pdx = 1 if face in ('right', 'q') else 0 if face == 'left' else (1 if ex < 8 else 0)
            px[(ex + pdx, ey + (2 if kind == 'big' else 1))] = INK
            if kind == 'big':
                px[(ex + pdx, ey + 1)] = INK
    my = ey + (3 if kind == 'big' else 2) + 1
    if face == 'q':
        for x in (9, 10):
            px[(x, my)] = INK
        px[(8, my - 1)] = INK
        px[(11, my - 1)] = INK
    elif face == 'down':
        for x in (7, 8):
            px[(x, my)] = INK
        px[(6, my - 1)] = INK
        px[(9, my - 1)] = INK
    else:
        mx = 12 if face == 'right' else 3
        px[(mx, my)] = INK
        px[(mx - 1 if face == 'right' else mx + 1, my - 1)] = INK
    return px


HATS = {
    'none': [],
    'cap': ['.....RRRRRR.....', '....RRRRRRRRR...'],
    'crown': ['.....Y.YY.Y.....', '.....YYYYYY.....'],
    'sprout': ['......GG.GG.....', '.......GG.......'],
    'ears': ['....K......K....', '....KK....KK....'],
    'beanie': ['.......WW.......', '.....BBBBBB.....', '....BBBBBBBB....'],
}
HAT_COL = {'R': (230, 57, 70, 255), 'Y': (255, 201, 60, 255), 'G': (98, 196, 88, 255), 'K': None, 'B': (63, 120, 220, 255), 'W': WHITE}


def blob(shape, colour, face='down', frame=0, eye='normal', hat='none'):
    im = Image.new('RGBA', (FW, FH))
    squash = [0, 1, 0, -1][frame % 4]
    m = body_mask(SHAPES[shape], squash)
    ys = [p[1] for p in m]
    top, bottom = min(ys), max(ys)
    base = colour + (255,)
    dark = shade(colour, 0.72)
    light = shade(colour, 1.18)
    for (x, y) in m:
        c = base
        if (x, y + 1) not in m or (x + 1, y) not in m and y > top + 2:
            c = dark
        im.putpixel((x, y), c)
    paint(im, outline(m), INK)
    # highlight like the Ninja slime: a 2 px white glint top-left (top-right when facing right)
    hx = {'right': 5, 'left': 9, 'q': 3}.get(face, 4)  # glint on the back side when seen from the side
    if face != 'up':
        paint(im, {(hx, top + 1), (hx + 1, top + 1), (hx, top + 2)} & m, WHITE)
    else:
        paint(im, {(hx + 1, top + 1), (hx + 2, top + 1)} & m, light)
    for p, c in eyes(face, top, bottom, eye).items():
        if p in m:
            im.putpixel(p, c)
    rows = HATS[hat]
    if rows:
        ears = hat == 'ears'
        for i, row in enumerate(rows):
            y = top - len(rows) + i + (1 if ears else 0)
            for x, ch in enumerate(row):
                if ch != '.' and 0 <= y < FH:
                    im.putpixel((x, y), base if ch == 'K' else HAT_COL[ch])
        hat_px = {(x, top - len(rows) + i + (1 if ears else 0)) for i, row in enumerate(rows) for x, ch in enumerate(row) if ch != '.'}
        hat_px = {p for p in hat_px if p not in m}
        paint(im, outline(hat_px | m) - m - hat_px, INK)
    return im


def ninja(path, col, row, cols=4):
    s = Image.open(os.path.join(NA, path)).convert('RGBA')
    return s.crop((col * 16, row * 16, col * 16 + 16, row * 16 + 16))


def main(scale=6):
    shapes = list(SHAPES)
    pad = 6
    cell = (FW + 4) * scale
    w = 9 * cell + 2 * pad
    out = Image.new('RGBA', (w, 1400), (98, 150, 72, 255))
    d = ImageDraw.Draw(out)
    d.text((pad, 4), 'Blobz v2 round 2: ONE 3/4 view (facing right), left = mirrored. Idle + glide frame.', fill=(255, 255, 255, 255), font_size=22)
    y = 40
    eyes_ = ['normal', 'big', 'normal', 'normal', 'big', 'normal']
    for r, sh in enumerate(shapes):
        d.text((pad, y + cell // 2 - 10), sh, fill=(255, 255, 255, 255), font_size=18)
        frames = [blob(sh, COLOURS[r], 'q', fr, eyes_[r]) for fr in (0, 1)]
        for k, im in enumerate(frames + [f.transpose(Image.FLIP_LEFT_RIGHT) for f in frames]):
            out.alpha_composite(im.resize((FW * scale, FH * scale), Image.NEAREST), (pad + cell + k * cell + (cell // 2 if k >= 2 else 0), y))
        y += FH * scale + 10
    d.text((pad + cell, y), 'right: idle, glide            left (mirrored): idle, glide', fill=(255, 255, 255, 255), font_size=16)
    y += 30
    d.text((pad, y), 'hats (same 3/4 view) + Ninja actors at the same scale', fill=(255, 255, 255, 255), font_size=18)
    y += 26
    x = pad
    for k, h in enumerate(h for h in HATS if h != 'none'):
        im = blob(['dome', 'ball', 'tall', 'pear', 'cube'][k], COLOURS[k], 'q', 0, 'normal', h)
        out.alpha_composite(im.resize((FW * scale, FH * scale), Image.NEAREST), (x, y))
        x += cell
    y += FH * scale + 16
    x = pad
    for path, col, row in (('Actor/Character/Boy/SpriteSheet.png', 0, 0), ('Actor/Character/Boy/SpriteSheet.png', 3, 0),
                           ('Actor/Monster/Slime/Slime.png', 0, 0), ('Actor/Monster/Skull/SpriteSheet.png', 0, 0),
                           ('Actor/Monster/Mushroom/mushroom.png', 0, 0)):
        out.alpha_composite(ninja(path, col, row).resize((16 * scale, 16 * scale), Image.NEAREST), (x, y + 2 * scale))
        x += cell
    for k, sh in enumerate(('dome', 'ball', 'tall')):
        im = blob(sh, COLOURS[k], 'q', 0, 'normal', ['cap', 'none', 'sprout'][k])
        if k == 1:
            im = im.transpose(Image.FLIP_LEFT_RIGHT)
        out.alpha_composite(im.resize((FW * scale, FH * scale), Image.NEAREST), (x, y))
        x += cell
    y += FH * scale + 10
    out.crop((0, 0, w, y)).save(OUT)
    print(OUT, (w, y))


if __name__ == '__main__':
    main()
