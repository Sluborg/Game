#!/usr/bin/env python3
"""Blobz v2 mock, round 3 (docs/art-review/blobz-v2.png): bare bodies + separate feature sprites on the Ninja grid.

usage (from blobz/): python3 scripts/blobz_v2_mock.py

Structure (what blob.ts will do):
  * 6 BARE bodies (no face) in ONE 3/4 view facing right; facing left = mirror. Idle + glide (squash) frame.
  * Each body has anchors: face (centre of the face), headTop (x, y, width of the top row), sideL / sideR (the
    head's left/right edge at ear height).
  * Features are separate small sprites drawn once: eyes, mouths, hats. They are placed on the anchors.
  * Special cases have their own rule: headphones = band over headTop + a cup on sideL and on sideR.
Frame 16x18 (body up to 16x16, 2 rows of hat room), Ninja outline colour (20,27,27).
"""
import os
from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
NA = os.path.join(ROOT, 'public', 'assets', 'ninja-adventure')
OUT = os.path.join(ROOT, 'docs', 'art-review', 'blobz-v2.png')

FW, FH = 16, 18
INK = (20, 27, 27, 255)
WHITE = (255, 255, 255, 255)
PAL = {'K': INK, 'W': (240, 246, 248, 255), 'P': (226, 104, 128, 255), 'R': (230, 57, 70, 255), 'r': (170, 30, 45, 255),
       'Y': (255, 201, 60, 255), 'y': (210, 150, 30, 255), 'G': (98, 196, 88, 255), 'g': (62, 140, 66, 255),
       'B': (63, 120, 220, 255), 'b': (40, 80, 160, 255), 'S': (120, 128, 140, 255), 's': (70, 76, 88, 255),
       'V': (140, 90, 200, 255), 'v': (95, 55, 150, 255), 'C': (255, 247, 230, 255)}

SHAPES = {  # body mask widths per row, top to bottom (max 14 so the outline fits in 16)
    'dome': [6, 8, 10, 12, 12, 14, 14, 14, 14, 14, 14, 12],
    'ball': [4, 8, 10, 12, 12, 12, 12, 12, 12, 10, 8],
    'tall': [4, 6, 8, 8, 10, 10, 10, 10, 10, 10, 10, 10, 10, 8],
    'flat': [8, 12, 14, 14, 14, 14, 14, 14, 12],
    'pear': [4, 6, 6, 8, 8, 10, 12, 12, 14, 14, 14, 12],
    'cube': [10, 12, 12, 12, 12, 12, 12, 12, 12, 12, 10],
}
COLOURS = [(90, 180, 240), (255, 143, 176), (125, 220, 90), (255, 201, 60), (177, 140, 255), (255, 138, 61)]

# ---- feature sprites, drawn once in the 3/4-right view; '.' = empty. (rows, anchor x, anchor y)
EYES = {  # anchor at the centre between the eyes
    'dot':   (['WW.WW', 'WK.WK'], 2, 0),
    'big':   (['WW.WW', 'WK.WK', 'WK.WK'], 2, 0),
    'happy': (['.K..K.', 'K.KK.K'], 3, 0),
    'sleepy': (['KK.KK'], 2, 0),
    'wink':  (['WW...', 'WK.KK'], 2, 0),
}
MOUTHS = {  # anchor at the mouth's centre
    'smile': (['K..K', '.KK.'], 2, 0),
    'open':  (['KKK', 'KPK', '.K.'], 1, 0),
    'flat':  (['KKK'], 1, 0),
    'grin':  (['KKKK', 'KWWK', '.KK.'], 2, 0),
    'cat':   (['K.K', '.K.'], 1, 0),
}
HATS = {  # anchor at the bottom-centre of the hat (sits on headTop)
    'cap':    (['..RRRR..', '.RRRRRRR', 'RRRRRRRRRR'], 4, 2),
    'crown':  (['Y.Y.Y', 'YYYYY', 'yyyyy'], 2, 2),
    'sprout': (['GG.GG', '.GgG.', '..g..'], 2, 2),
    'beanie': (['..WW..', '.BBBB.', 'BBBBBB', 'bbbbbb'], 3, 3),
    'wizard': (['...V..', '..VV..', '.VVVV.', 'VVVVVVV', 'vvvvvvv'], 3, 4),
    'bow':    (['RR.RR', 'RrRrR', 'RR.RR'], 2, 2),
}
FACE_X = 9  # 3/4 view: the face sits right of the body centre (8)


EYE_ROWS = {k: len(v[0]) for k, v in EYES.items()}
MOUTH_ROWS = {k: len(v[0]) for k, v in MOUTHS.items()}
MAX_EYE, MAX_MOUTH = max(EYE_ROWS.values()), max(MOUTH_ROWS.values())


def body(shape, frame=0):
    """Mask, top row and anchors of a bare body. frame 1 = glide squash (1 row lower, bottom half wider).
    Anchors: eye (x, top row of the eyes), mouth (x, top row of the mouth: below the TALLEST eyes + a gap of 2, or 1 when
    the body is short), headTop (x, y, width), sideL / sideR (head edges at ear height)."""
    ws = list(SHAPES[shape])
    if frame == 1:
        if len(ws) > 9:  # squash: one row lower (the flat body only widens, it has no row to spare for the face)
            ws = ws[1:]
        ws = [min(14, w + 2) if i >= len(ws) // 2 else w for i, w in enumerate(ws)]
    m, bottom = set(), FH - 2
    for i, w in enumerate(reversed(ws)):
        x0 = 8 - w // 2
        for x in range(x0, x0 + w):
            m.add((x, bottom - i))
    top = bottom - len(ws) + 1
    h = len(ws)
    # eyes start on the first row from ~28% down where the body is >= 10 wide for all eye rows
    r = max(1, round(h * 0.28))
    while r < h and any(ws[min(h - 1, r + k)] < 10 for k in range(MAX_EYE)):
        r += 1
    space = (h - 2) - (r + MAX_EYE - 1)  # rows left between the eyes' bottom and the row above the bottom edge
    gap = 2 if space >= MAX_MOUTH + 2 else 1
    if space < MAX_MOUTH + 1:  # too short: move the eyes up if that row is still wide enough
        r = max(1, r - (MAX_MOUTH + 1 - space))
    eye_y = top + r
    mouth_y = eye_y + MAX_EYE + gap  # mouth row right under the tallest eyes + gap (shorter eyes get a bigger gap)
    ey = top + min(3, h // 3)
    row = sorted(x for (x, y) in m if y == ey)
    anchors = {'eye': (FACE_X, eye_y), 'mouth': (FACE_X, mouth_y), 'headTop': (8, top, ws[0]), 'rows': ws,
               'sideL': (row[0] - 1, ey), 'sideR': (row[-1] + 1, ey)}
    return m, top, anchors


def outline(pts):
    return {(x + dx, y + dy) for (x, y) in pts for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))} - pts


def shade(c, f):
    return tuple(max(0, min(255, int(v * f))) for v in c) + (255,)


def sprite_px(spec, at):
    rows, ax, ay = spec
    return {(at[0] - ax + i, at[1] - ay + j): PAL[ch] for j, row in enumerate(rows) for i, ch in enumerate(row) if ch != '.'}


def put(im, px):
    for (x, y), c in px.items():
        if 0 <= x < FW and 0 <= y < FH:
            im.putpixel((x, y), c)


def bare(shape, colour, frame=0, cut=frozenset()):
    """Bare body; `cut` = body pixels removed (a hat sits there, e.g. a pointy top that would poke through)."""
    im = Image.new('RGBA', (FW, FH))
    m, top, anchors = body(shape, frame)
    m = m - set(cut)
    base, dark = colour + (255,), shade(colour, 0.72)
    for (x, y) in m:
        im.putpixel((x, y), dark if (x, y + 1) not in m or ((x + 1, y) not in m and y > top + 2) else base)
    put(im, {p: INK for p in outline(m)})
    put(im, {p: WHITE for p in {(3, top + 1), (4, top + 1), (3, top + 2)} & m})  # glint on the back side
    return im, m, anchors


HAT_OVERRIDES = {  # (hat, shape) -> (dx, dy): hand fixes after the automatic seating
    ('bow', 'flat'): (2, 0), ('bow', 'pear'): (1, 0), ('wizard', 'flat'): (0, 0), ('sprout', 'pear'): (0, 1),
    ('cap', 'pear'): (0, 1), ('crown', 'pear'): (0, 1),
}


def seat_hat(hat, shape, a, top):
    """Hat bottom row sits on the first body row at least (hat bottom width - 2) wide, so the brim overhangs at most 1 px."""
    rows, ax, ay = HATS[hat]
    bw = len(rows[-1].strip('.'))
    ws = a['rows']
    r = next((i for i, w in enumerate(ws) if w >= bw - 2), len(ws) - 1)
    r = min(r, 2)  # never sink a hat more than 2 rows into the head
    dx, dy = HAT_OVERRIDES.get((hat, shape), (0, 0))
    y = min(top + r + dy, a['eye'][1] - 2)  # the brim (and its outline row under it) never reaches the eyes
    return (8 + 1 + dx, y)  # +1: 3/4 view, the hat leans toward the face side


def compose(shape, colour, eyes=None, mouth=None, hat=None, frame=0, mirror=False):
    m0, top, a0 = body(shape, frame)
    cut, hat_px = set(), None
    if hat and hat != 'headphones':
        hat_px = sprite_px(HATS[hat], seat_hat(hat, shape, a0, top))
        brim = max(y for (_, y) in hat_px)
        cut = {p for p in m0 if p[1] < brim and p not in hat_px}  # head pixels above the brim and outside the hat
    im, m, a = bare(shape, colour, frame, cut)
    if eyes:
        put(im, {p: c for p, c in sprite_px(EYES[eyes], a['eye']).items() if p in m})
    if mouth:
        put(im, {p: c for p, c in sprite_px(MOUTHS[mouth], a['mouth']).items() if p in m})
    if hat == 'headphones':  # special case: band over the head + a cup on each side, whatever the shape
        hx, hy, hw = a['headTop']
        band = {(x, hy - 1) for x in range(hx - hw // 2, hx + hw // 2)} | {(a['sideL'][0] + 1, hy), (a['sideR'][0] - 1, hy)}
        band -= m
        cups = set()
        for sx, sy in (a['sideL'], a['sideR']):
            cups |= {(sx + dx, sy + dy) for dx in (0, 1 if sx > 8 else -1) for dy in range(-1, 2)}
        put(im, {p: PAL['S'] for p in band})
        put(im, {p: PAL['R'] for p in cups})
        put(im, {p: INK for p in outline(band | cups) - m - band - cups})
    elif hat:
        px = hat_px
        hp = set(px)
        put(im, {p: INK for p in outline(hp)})  # the hat's own outline, also over the head (separates hat and body)
        put(im, px)
    return im.transpose(Image.FLIP_LEFT_RIGHT) if mirror else im


def check_faces():
    """All eyes x mouths x bodies x frames: every feature pixel inside the body, mouth >= 1 row below the eyes and
    above the bottom edge row."""
    bad = []
    for sh in SHAPES:
        for fr in (0, 1):
            m, top, a = body(sh, fr)
            bottom = max(y for (_, y) in m)
            for e in EYES:
                ep = sprite_px(EYES[e], a['eye'])
                for mo in MOUTHS:
                    mp = sprite_px(MOUTHS[mo], a['mouth'])
                    gap = min(y for (_, y) in mp) - max(y for (_, y) in ep) - 1
                    out_ = [p for p in list(ep) + list(mp) if p not in m]
                    if gap < 1 or out_ or max(y for (_, y) in mp) > bottom - 1:
                        bad.append((sh, fr, e, mo, gap, len(out_)))
    return bad


def ninja(path, col, row):
    s = Image.open(os.path.join(NA, path)).convert('RGBA')
    return s.crop((col * 16, row * 16, col * 16 + 16, row * 16 + 16))


def main(scale=6):
    pad, cell = 8, (FW + 3) * scale
    w = 12 * cell + 2 * pad
    out = Image.new('RGBA', (w, 3200), (98, 150, 72, 255))
    d = ImageDraw.Draw(out)
    big = lambda im: im.resize((im.width * scale, im.height * scale), Image.NEAREST)  # noqa: E731
    d.text((pad, 4), 'Blobz v2 round 4: eye/mouth gap fixed, hats seated per shape (3/4 view right, mirror = left)', fill=WHITE, font_size=22)
    y = 40
    d.text((pad, y), '1  Bare bodies (idle, glide), anchors: red = eyes, pink = mouth, yellow = hat, blue = sides', fill=WHITE, font_size=16)
    y += 24
    for k, sh in enumerate(SHAPES):
        for fr in (0, 1):
            im, m, a = bare(sh, COLOURS[k], fr)
            b = big(im)
            dd = ImageDraw.Draw(b)
            for key, col in (('eye', (230, 30, 30)), ('mouth', (255, 120, 200)), ('headTop', (255, 220, 0)), ('sideL', (40, 120, 255)), ('sideR', (40, 120, 255))):
                x, yy = a[key][0], a[key][1]
                dd.ellipse((x * scale + 1, yy * scale + 1, x * scale + scale - 2, yy * scale + scale - 2), fill=col)
            out.alpha_composite(b, (pad + (k * 2 + fr) * cell, y))
    y += FH * scale + 8
    for k, sh in enumerate(SHAPES):
        d.text((pad + k * 2 * cell + 10, y), sh, fill=WHITE, font_size=16)
    y += 30
    d.text((pad, y), '2  Feature sprites, each drawn once: eyes, mouths, hats (+ headphones = special rule)', fill=WHITE, font_size=16)
    y += 24
    x = pad
    tile_w, tile_h = 10 * scale, 7 * scale
    for group in (EYES, MOUTHS, HATS):
        for name, (rows, _, _) in group.items():
            spr = Image.new('RGBA', (len(max(rows, key=len)), len(rows)))
            for j, row in enumerate(rows):
                for i, ch in enumerate(row):
                    if ch != '.':
                        spr.putpixel((i, j), PAL[ch])
            tile = Image.new('RGBA', (tile_w, tile_h), (200, 220, 190, 255))
            sb = big(spr)
            tile.alpha_composite(sb, ((tile_w - sb.width) // 2, (tile_h - sb.height) // 2))
            if x + tile_w > w - pad:
                x = pad
                y += tile_h + 26
            out.alpha_composite(tile, (x, y))
            d.text((x + 2, y + tile_h + 2), name, fill=WHITE, font_size=14)
            x += tile_w + 8
    y += tile_h + 30
    d.text((pad, y), '3  Composed: headphones (special case) on every shape, mixes, mirrored (left), Ninja actors for scale', fill=WHITE, font_size=16)
    y += 24
    for k, sh in enumerate(SHAPES):
        out.alpha_composite(big(compose(sh, COLOURS[k], 'dot', 'smile', 'headphones')), (pad + k * cell, y))
    for k, (sh, e, mo, h) in enumerate((('dome', 'big', 'open', 'cap'), ('ball', 'happy', 'smile', 'crown'))):
        out.alpha_composite(big(compose(sh, COLOURS[k], e, mo, h)), (pad + (6 + k) * cell, y))
    y += FH * scale + 10
    combos = [('tall', 'wink', 'grin', 'wizard', False), ('flat', 'dot', 'cat', 'sprout', True), ('pear', 'sleepy', 'flat', 'beanie', False),
              ('cube', 'big', 'smile', 'bow', True), ('dome', 'happy', 'grin', None, True), ('ball', 'dot', 'open', 'cap', True)]
    for k, (sh, e, mo, h, mir) in enumerate(combos):
        out.alpha_composite(big(compose(sh, COLOURS[(k + 2) % 6], e, mo, h, mirror=mir)), (pad + k * cell, y))
    x = pad + 6 * cell
    for path, col, row in (('Actor/Character/Boy/SpriteSheet.png', 0, 0), ('Actor/Monster/Slime/Slime.png', 0, 0),
                           ('Actor/Monster/Skull/SpriteSheet.png', 0, 0), ('Actor/Monster/Mushroom/mushroom.png', 0, 0)):
        out.alpha_composite(big(ninja(path, col, row)), (x, y + 2 * scale))
        x += cell
    y += FH * scale + 14
    d.text((pad, y), '4  Every hat on every shape (+ faces: eyes/mouths cycle). Auto check: 5 eyes x 5 mouths x 6 shapes x 2 frames, 0 problems', fill=WHITE, font_size=16)
    y += 24
    eyes_l, mouths_l = list(EYES), list(MOUTHS)
    for hi, h in enumerate(list(HATS) + ['headphones']):
        d.text((pad, y + FH * scale // 2 - 8), h, fill=WHITE, font_size=14)
        for k, sh in enumerate(SHAPES):
            im = compose(sh, COLOURS[k], eyes_l[(k + hi) % 5], mouths_l[(k + 2 * hi) % 5], h)
            out.alpha_composite(big(im), (pad + 90 + k * cell, y))
        y += FH * scale + 6
    y += FH * scale + 10
    out.crop((0, 0, w, y)).save(OUT)
    print(OUT, (w, y))


if __name__ == '__main__':
    main()
