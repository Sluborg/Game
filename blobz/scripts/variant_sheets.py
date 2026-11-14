#!/usr/bin/env python3
"""Quick direction mockups for the decision board (order A-8): 3 variants (A/B/C) per item.

usage (from blobz/): python3 scripts/variant_sheets.py
  -> docs/art-review/variants-buttons.png, variants-goo.png, variants-skills.png, variants-back.png
Rough on purpose: they show a direction, the final art comes from ChatGPT after Stefan picks.
"""
import math
import os
import sys
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base_art as ba  # noqa: E402
import dungeon_art as da  # noqa: E402
from fx_sheet import Canvas  # noqa: E402

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'docs', 'art-review')
DUN = os.path.join(ROOT, 'public', 'art', 'dungeon')
ART = os.path.join(ROOT, 'public', 'art')
BG = (74, 60, 70, 255)
PLUM = ba.PLUM
WHITE = ba.rgb(255, 255, 255)


def load(path):
    return Image.open(path).convert('RGBA')


def recolor(im, col):
    """Every non-outline pixel of a mono icon -> col."""
    im = im.copy()
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            p = px[x, y]
            if p[3] and not (p[0] < 90 and p[1] < 70):
                px[x, y] = col
    return im


def label(img, text, x, y, scale=3):
    small = Image.new('RGBA', (len(text) * 7 + 2, 12), (0, 0, 0, 0))
    ImageDraw.Draw(small).text((1, 0), text, fill=(255, 247, 230, 255))
    img.alpha_composite(small.resize((small.width * scale, small.height * scale), Image.NEAREST), (x, y))


def sheet(rows, path, scale=5, pad=16, names=('A', 'B', 'C')):
    """rows: list of (variant title, [images])."""
    lab = 40
    w = max(max(sum(im.width * scale + pad for im in imgs) for _, imgs in rows) + pad + lab,
            max(len(t) + 3 for t, _ in rows) * 21 + 2 * pad)
    h = sum(max(im.height for im in imgs) * scale + pad + 30 for _, imgs in rows) + pad
    out = Image.new('RGBA', (w, h), BG)
    y = pad
    for (title, imgs), n in zip(rows, names):
        label(out, f'{n}  {title}', pad, y)
        y += 30
        x = pad + lab
        for im in imgs:
            out.alpha_composite(im.resize((im.width * scale, im.height * scale), Image.NEAREST), (x, y))
            x += im.width * scale + pad
        y += max(im.height for im in imgs) * scale + pad
    out.save(path)
    print(path, out.size)


# ---------------------------------------------------------------- (a) dungeon buttons
ICONS = ['btn-attack.png', 'btn-special-sword.png', 'btn-sidestep.png']


def round_button(icon, fill, ring, size=32):
    c = Canvas(size, size)
    r = size / 2 - 1.5
    ba.comp(c, ba.ellipse(size / 2, size / 2 + 1, r, r), ring, outline=False)
    ba.comp(c, ba.ellipse(size / 2, size / 2, r, r), ba.shaded(fill))
    im = c.image()
    im.alpha_composite(icon, ((size - icon.width) // 2, (size - icon.height) // 2))
    return im


def stone_button(icon, size=32):
    c = Canvas(size, size)
    ba.comp(c, ba.rect(2, 3, size - 3, size - 2), ba.shaded(ba.STONE, ba.blocks))
    ba.comp(c, ba.rect(6, 7, size - 7, size - 6), ba.STONE[1], outline=False)
    im = c.image()
    im.alpha_composite(icon, ((size - icon.width) // 2, (size - icon.height) // 2))
    return im


def bubble_button(icon, fill, size=32):
    c = Canvas(size, size)
    r = size / 2 - 1.5
    ba.comp(c, ba.ellipse(size / 2, size / 2, r, r), ba.shaded(fill))
    arc = {(x, y) for (x, y) in ba.ellipse(size / 2, size / 2, r - 3, r - 3) - ba.ellipse(size / 2 + 1.5, size / 2 + 1.5, r - 3, r - 3)
           if y < size / 2 and x < size / 2 + 4}
    ba.comp(c, arc, WHITE, outline=False)
    im = c.image()
    im.alpha_composite(icon, ((size - icon.width) // 2, (size - icon.height) // 2 + 1))
    return im


def buttons():
    icons = [load(os.path.join(DUN, n)) for n in ICONS]
    orange = (ba.rgb(255, 138, 61), ba.rgb(255, 192, 138), ba.rgb(200, 96, 40))
    a = [round_button(i, orange, PLUM) for i in icons]
    b = [stone_button(recolor(i, c)) for i, c in zip(icons, (ba.rgb(230, 57, 70), ba.rgb(255, 201, 60), ba.rgb(66, 118, 210)))]
    fills = [(ba.rgb(230, 57, 70), ba.rgb(255, 130, 130), ba.rgb(160, 24, 40)),
             (ba.rgb(150, 96, 200), ba.rgb(200, 160, 245), ba.rgb(100, 60, 150)),
             (ba.rgb(70, 190, 180), ba.rgb(150, 235, 225), ba.rgb(40, 130, 125))]
    c = [bubble_button(recolor(i, WHITE), f) for i, f in zip(icons, fills)]
    sheet([('Rund orange (som idag)', a), ('Stenplatta, fargad ikon', b), ('Blank bubbla per knapp', c)],
          os.path.join(OUT, 'variants-buttons.png'))


# ---------------------------------------------------------------- (b) goo enemies
def goo(size, body, style, boss=False):
    w, h = size, int(size * 0.8) + (6 if boss else 0)
    c = Canvas(w + 2, h + 2)
    top = 6 if boss else 1
    if style == 'jelly':
        mask = ba.ellipse(w / 2 + 1, h - size * 0.32, size / 2, size * 0.36) | ba.rect(2, int(h - size * 0.32), w - 1, h - 1)
    elif style == 'spiky':
        mask = ba.ellipse(w / 2 + 1, h - size * 0.3, size / 2, size * 0.34)
        for k in range(3):  # horns
            hx = w / 2 + 1 + (k - 1) * size * 0.28
            mask |= ba.poly([(hx - 2, h - size * 0.55), (hx + 2, h - size * 0.55), (hx, h - size * 0.55 - 4)])
    else:
        mask = ba.ellipse(w / 2 + 1, h - size * 0.36, size / 2, size * 0.4)
    ba.comp(c, mask, ba.shaded(body))
    if style == 'jelly':  # bubbles inside
        for (bx, by) in ((0.3, 0.75), (0.7, 0.6), (0.55, 0.85)):
            ba.comp(c, ba.ellipse(w * bx, h * by, 1.2, 1.2), body[1], outline=False)
    ey = h - size * 0.42
    for sgn in (-1, 1):  # angry eyes
        ex = w / 2 + 1 + sgn * size * 0.17
        ba.comp(c, ba.ellipse(ex, ey, size * 0.09 + 0.6, size * 0.1 + 0.6), WHITE)
        c.set(int(ex), int(ey), PLUM)
        c.set(int(ex) - sgn, int(ey - size * 0.15), PLUM)
        c.set(int(ex), int(ey - size * 0.13), PLUM)
    ba.comp(c, ba.rect(int(w / 2 - size * 0.08), int(ey + size * 0.17), int(w / 2 + size * 0.12), int(ey + size * 0.17)), PLUM, outline=False)
    if boss:
        crown = ba.poly([(w / 2 - 6, top + 5), (w / 2 - 6, top), (w / 2 - 3, top + 3), (w / 2 + 1, top - 1),
                         (w / 2 + 5, top + 3), (w / 2 + 8, top), (w / 2 + 8, top + 5)])
        ba.comp(c, crown, ba.shaded(ba.FLAG))
    return c.image()


def goos():
    cur = [load(os.path.join(ART, 'enemies', f'goo-{k}.png')) for k in ('small', 'medium', 'boss')]
    green = (ba.rgb(110, 210, 90), ba.rgb(180, 245, 150), ba.rgb(60, 150, 60))
    red = (ba.rgb(200, 60, 90), ba.rgb(250, 120, 140), ba.rgb(130, 30, 60))
    b = [goo(14, green, 'jelly'), goo(22, green, 'jelly'), goo(30, green, 'jelly', boss=True)]
    c = [goo(14, red, 'spiky'), goo(22, red, 'spiky'), goo(30, red, 'spiky', boss=True)]
    sheet([('Lila goo (som idag)', cur), ('Gron gele med bubblor', b), ('Rod taggig goo', c)],
          os.path.join(OUT, 'variants-goo.png'))


# ---------------------------------------------------------------- (c) skill icon style
EXAMPLES = [('prast', 'heal'), ('bagskytt', 'crit'), ('riddare', 'block'), ('krigare', 'whirlwind')]


def skill_tile(cls, name):
    """Variant B: rounded dark tile, symbol in the class colour."""
    c = Canvas(24, 24)
    ba.comp(c, ba.rect(1, 2, 22, 21) | ba.rect(2, 1, 21, 22), ba.shaded((ba.rgb(70, 56, 72), ba.rgb(100, 84, 104), ba.rgb(46, 34, 50))))
    for pts, _col in da.SKILLS[cls][name]():
        ba.comp(c, {(x, y) for (x, y) in pts if 0 <= x < 24 and 0 <= y < 24}, da.CLASS_COLORS[cls][1])
    return c.image()


def skill_bare(cls, name):
    """Variant C: no badge, a big symbol in the class colour with a cream halo."""
    c = Canvas(24, 24)
    pts_all = set()
    for pts, _col in da.SKILLS[cls][name]():
        pts_all |= {(x, y) for (x, y) in pts if 0 <= x < 24 and 0 <= y < 24}
    halo = {(x + dx, y + dy) for (x, y) in pts_all for dx in (-2, -1, 0, 1, 2) for dy in (-2, -1, 0, 1, 2) if abs(dx) + abs(dy) <= 2}
    ba.comp(c, halo - pts_all, da.CREAM, outline=False)
    for pts, _col in da.SKILLS[cls][name]():
        ba.comp(c, {(x, y) for (x, y) in pts if 0 <= x < 24 and 0 <= y < 24}, ba.shaded(da.CLASS_COLORS[cls]))
    return c.image()


def skills():
    a = [load(os.path.join(DUN, 'skills', f'{c}-{n}.png')) for c, n in EXAMPLES]
    b = [skill_tile(c, n) for c, n in EXAMPLES]
    c = [skill_bare(c, n) for c, n in EXAMPLES]
    sheet([('Rund bricka i klassfarg (som idag)', a), ('Mork platta, symbol i klassfarg', b), ('Bara symbol, ljus kant', c)],
          os.path.join(OUT, 'variants-skills.png'))


# ---------------------------------------------------------------- (d) back arrow
def back_variants():
    cur = load(os.path.join(ART, 'icons', 'back.png'))
    b = Canvas(22, 22)
    ba.comp(b, ba.ellipse(11, 11, 9.5, 9.5), ba.shaded((ba.rgb(255, 138, 61), ba.rgb(255, 192, 138), ba.rgb(200, 96, 40))))
    ba.comp(b, {(13 - abs(k), 11 + k) for k in range(-5, 6)} | {(14 - abs(k), 11 + k) for k in range(-5, 6)} | {(15 - abs(k), 11 + k) for k in range(-5, 6)}, WHITE)
    c = Canvas(22, 22)
    ba.comp(c, ba.poly([(3, 10), (11, 3), (19, 10)]) | ba.rect(5, 10, 17, 18), ba.shaded(ba.PLASTER))
    ba.comp(c, ba.poly([(2, 10.5), (11, 2.5), (20, 10.5)]) - ba.poly([(5, 10.5), (11, 5.5), (17, 10.5)]), ba.shaded(ba.ROOF))
    ba.comp(c, ba.rect(9, 13, 12, 18), ba.shaded(ba.DARKWOOD))
    sheet([('Cream pil (som idag)', [cur]), ('Rund orange knapp med vit pil', [b.image()]), ('Litet hus = hem', [c.image()])],
          os.path.join(OUT, 'variants-back.png'), scale=6)


if __name__ == '__main__':
    buttons()
    goos()
    skills()
    back_variants()
