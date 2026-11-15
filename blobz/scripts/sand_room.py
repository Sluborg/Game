#!/usr/bin/env python3
"""N-35 sandstone room set (ChatGPT, 3 attempts docs/art-review/n35-sandstone-{1,2,3}.png): measure, pick, slice, test.

usage (from blobz/): python3 scripts/sand_room.py
  -> public/art/dungeon/sand-{tl,t,tr,l,r,bl,b,br}.png (16x16), sand-door-closed.png, sand-door-open.png,
     sand-entrance.png (32x32) + docs/art-review/n35-room-test.png

Set 3 is used: its door wall is 172 px tall next to a 179 px top edge (set 2: 215, set 1: 321 = the tall block).
Grid (like N-34d): x pitch = top edge width / 32 = 12.28 (top edge = 2 tiles), y pitch = top edge height / 16 = 11.19,
so the top wall is exactly one 16 px row. Outline-keeping sampler; the 1 art px outline (7 px) is cut off on sides
that join another wall piece.
  sand-t / sand-b: 16-col window of the top / bottom edge where col k == col k+16 (tiles left/right); b is 14 rows,
                   top-aligned (outside below)
  sand-tl / sand-tr: the corner's 16 cols on the outer side, rows 0-15 (its side stub continues as sand-l/r)
  sand-l / sand-r: the side piece (13 cols), 16-row window where row k == row k+16 (tiles top/bottom), against
                   the outer edge of the cell
  sand-bl / sand-br: the corner's outer 16 cols, its bottom 14 rows (level with sand-b), top-aligned
  sand-door-closed: the centre 391 px of the door block (same width as the open door) -> 32 x 27, bottom-aligned
  sand-door-open: 32 x 24, bottom-aligned; sand-entrance (the gap piece): 26 x 23, centred, bottom-aligned
"""
import os
import sys
import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from slice_grid_orders import load, ART, REV  # noqa: E402
from room_walls import grid  # noqa: E402

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
DUN = os.path.join(ART, 'dungeon')
SRC = 'n35-sandstone-3.png'
BOX = {'tl': (81, 329, 54, 269), 't': (412, 805, 54, 233), 'tr': (889, 1135, 54, 269),
       'l': (91, 245, 333, 655), 'door': (321, 897, 336, 635), 'r': (971, 1127, 333, 655),
       'bl': (81, 329, 720, 916), 'b': (413, 805, 758, 916), 'br': (890, 1135, 720, 916),
       'entrance': (52, 370, 1001, 1253), 'open': (414, 805, 989, 1253)}
PX, PY, OL = 393 / 32, 179 / 16, 7


def sample(rgb, m, box, open_='', nx=None, ny=None):
    x0, x1, y0, y1 = box
    x0 += OL if 'l' in open_ else 0
    x1 -= OL if 'r' in open_ else 0
    y0 += OL if 't' in open_ else 0
    y1 -= OL if 'b' in open_ else 0
    nx = nx or round((x1 - x0) / PX)
    ny = ny or round((y1 - y0) / PY)
    g, _ = grid(rgb[y0:y1, x0:x1], m[y0:y1, x0:x1], (x1 - x0) / nx, (y1 - y0) / ny, 0, 0)
    return g


def window(g, axis):
    """16-long window along axis (1 = cols, 0 = rows) whose first line matches the line after it."""
    n = g.shape[axis]
    d = {}
    for k in range(0, n - 16):
        a, b = (g[:, k], g[:, k + 16]) if axis else (g[k], g[k + 16])
        d[k] = int(np.abs(a.astype(int) - b).sum())
    k = min(d, key=d.get)
    return (g[:, k:k + 16] if axis else g[k:k + 16]), k


def cell(g, W=16, H=16, ax='left', ay='top'):
    out = np.zeros((H, W, 4), np.uint8)
    h, w = min(H, g.shape[0]), min(W, g.shape[1])
    y = 0 if ay == 'top' else H - h
    x = 0 if ax == 'left' else (W - w if ax == 'right' else (W - w) // 2)
    out[y:y + h, x:x + w] = g[:h, :w]
    return out


def slice_set():
    rgb, m = load(SRC)
    S = {}
    t, kt = window(sample(rgb, m, BOX['t'], 'lr'), 1)
    S['t'] = cell(t)
    b, kb = window(sample(rgb, m, BOX['b'], 'lr'), 1)
    S['b'] = cell(b)
    tl = sample(rgb, m, BOX['tl'], 'r')
    S['tl'] = cell(tl[:16, :16])
    tr = sample(rgb, m, BOX['tr'], 'l')
    S['tr'] = cell(tr[:16, -16:], ax='right')
    l, kl = window(sample(rgb, m, BOX['l'], 'tb'), 0)
    r, kr = window(sample(rgb, m, BOX['r'], 'tb'), 0)
    S['l'], S['r'] = cell(l), cell(r, ax='right')
    nb = b.shape[0]
    bl = sample(rgb, m, BOX['bl'], 'r')
    S['bl'] = cell(bl[-nb:, :16])
    br = sample(rgb, m, BOX['br'], 'l')
    S['br'] = cell(br[-nb:, -16:], ax='right')
    x0, x1, y0, y1 = BOX['door']
    c = (x0 + x1) / 2
    S['door-closed'] = cell(sample(rgb, m, (int(c - 195.5), int(c + 195.5), y0, y1), 'lr', nx=32), 32, 32, 'centre', 'bottom')
    S['door-open'] = cell(sample(rgb, m, BOX['open'], 'lr', nx=32), 32, 32, 'centre', 'bottom')
    S['entrance'] = cell(sample(rgb, m, BOX['entrance']), 32, 32, 'centre', 'bottom')
    for k, a in S.items():
        Image.fromarray(a).save(os.path.join(DUN, f'sand-{k}.png'))
    print('pitch', round(PX, 2), round(PY, 2), 'windows t', kt, 'b', kb, 'l', kl, 'r', kr,
          'sizes', {k: (a[:, :, 3].any(0).sum(), a[:, :, 3].any(1).sum()) for k, a in S.items()})
    return S


def room(S):
    sc, TW, TH = 3, 10, 8
    fl = Image.open(os.path.join(ROOT, 'public', 'assets', 'ninja-adventure', 'Backgrounds', 'Tilesets', 'TilesetFloor.png')).convert('RGBA').crop((128, 16, 144, 32))
    oy = 16
    im = Image.new('RGBA', (TW * 16, TH * 16 + oy), (20, 27, 27, 255))
    for y in range(1, TH - 1):
        for x in range(TW):
            im.alpha_composite(fl, (x * 16, oy + y * 16))
    T = {k: Image.fromarray(a) for k, a in S.items()}
    dx = TW // 2 - 1
    for x in range(TW):
        key = 'tl' if x == 0 else 'tr' if x == TW - 1 else 't'
        if key == 't' and x in (dx, dx + 1):
            continue
        im.alpha_composite(T[key], (x * 16, oy))
    for y in range(1, TH - 1):
        im.alpha_composite(T['l'], (0, oy + y * 16))
        im.alpha_composite(T['r'], ((TW - 1) * 16, oy + y * 16))
    yb = oy + (TH - 1) * 16
    for x in range(TW):
        key = 'bl' if x == 0 else 'br' if x == TW - 1 else 'b'
        if key == 'b' and x in (dx, dx + 1):
            continue
        im.alpha_composite(T[key], (x * 16, yb))
    nb = int(S['b'][:, :, 3].any(1).sum())
    im.alpha_composite(T['entrance'], (dx * 16, yb + nb - 32))  # gap piece bottom level with the bottom edge
    im.alpha_composite(T['door-closed'], (dx * 16, oy + 16 - 32))
    big = im.resize((im.width * sc, im.height * sc), Image.NEAREST)
    bar = Image.new('RGBA', (big.width, 50), (20, 27, 27, 255))
    ImageDraw.Draw(bar).text((10, 6), 'N-35 sandstone room, set 3 (3x)', fill='white', font_size=18)
    ImageDraw.Draw(bar).text((10, 28), 'door top, entrance gap bottom, Ninja sand floor (TilesetFloor 128,16)', fill='#ffe18d', font_size=14)
    out = Image.new('RGBA', (big.width, big.height + 50))
    out.paste(bar, (0, 0))
    out.paste(big, (0, 50))
    out.save(os.path.join(REV, 'n35-room-test.png'))
    print('docs/art-review/n35-room-test.png', out.size)


if __name__ == '__main__':
    room(slice_set())
