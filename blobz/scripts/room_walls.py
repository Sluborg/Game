#!/usr/bin/env python3
"""N-34b dungeon room walls (ChatGPT, docs/art-review/n34b-room-walls.png) -> 16 px tiles + a 3x room test.

usage (from blobz/): python3 scripts/room_walls.py
  -> public/art/dungeon/wall-{tl,t,tr,l,r,bl,br}.png (16x16) + wall-{b,entrance-l,entrance-mid,entrance-r}.png + docs/art-review/n34-room-test.png

Every piece has a 1 art px outline all round; where a piece joins another wall piece (top edge left/right, top
corners towards the edge, sides top/bottom, bottom corners top) that outline is cut off before sampling, so the
tiles meet without a dark seam, and the joining span is sampled to exactly 16 px.
ChatGPT drew the 7 pieces at ~8 px per art pixel, but not as 16 px tiles (top pieces 203x190 px, sides 149x223,
bottom corners 203x161). Grid: x pitch = top piece width / 16 = 12.8 (bricks ~6 art px, same as the N-34 door's),
used for every piece; y pitch = 12.8 too, except the 3 top pieces, which are sampled at 190 / 16 = 11.9 so they fill
the 16 px row (7% squash). Outline-keeping sampler (a cell that is 30%+ near-black takes the outline colour).
  wall-tl / wall-t / wall-tr: 16x16, outline on row 0, bricks to the bottom row (meets the floor)
  wall-l / wall-r: the side pieces are 12 art px wide (stone column + 8 px of inner brick face), placed against the
                   outer edge of the 16 px cell (floor shows in the rest); 16 of their 17 rows, the window picked
                   where row k and row k+16 match best, so they tile vertically
  wall-bl / wall-br: 16 wide x 13 tall, top-aligned in the 16 px cell (bricks continue from the side above, stone
                   bottom edge on row 12, floor shows below)
N-34c (entrance strip) adds wall-b (plain bottom edge) and wall-entrance-{l,mid,r}, see entrance().
Still MISSING: inner corners.
"""
import os
import sys
import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from slice_grid_orders import load, opening, bands, objects, ART, REV  # noqa: E402

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
DUN = os.path.join(ART, 'dungeon')
SRC = 'n34b-room-walls.png'
PX = 205 / 16


def grid(a, b, px, py, ox, oy):
    H, W = b.shape
    ny, nx = int((H - oy) // py), int((W - ox) // px)
    out = np.zeros((ny, nx, 4), np.uint8)
    sp = 0.0
    for j in range(ny):
        for i in range(nx):
            y0, x0 = oy + j * py, ox + i * px
            full = (slice(int(y0), int(y0 + py)), slice(int(x0), int(x0 + px)))
            if b[full].mean() < 0.5:
                continue
            c = a[full][b[full]]
            dark = c.sum(1) < 170
            if dark.mean() > 0.3:
                c = c[dark]
            else:
                ctr = (slice(int(y0 + py * .25), int(y0 + py * .75) + 1), slice(int(x0 + px * .25), int(x0 + px * .75) + 1))
                if b[ctr].any():
                    c = a[ctr][b[ctr]]
            out[j, i] = (*np.median(c, 0).astype(np.uint8), 255)
            sp += c.std(0).sum()
    return out, sp


OL = 8  # the 1 art px outline every piece has all round, in source px: cut it off where a piece joins a neighbour


def cut(rgb, m, box, px, py, open_=''):
    """open_: sides (l r t b) that join another wall piece: their outline is cut off so the pieces meet without a line."""
    x0, x1, y0, y1 = box
    x0 += OL if 'l' in open_ else -4
    x1 -= OL if 'r' in open_ else -4
    y0 += OL if 't' in open_ else -4
    y1 -= OL if 'b' in open_ else -4
    a, b = rgb[y0:y1, x0:x1], m[y0:y1, x0:x1]
    best = None
    for ox in np.arange(0, px, px / 8):
        for oy in np.arange(0, py, py / 8):
            g, sp = grid(a, b, px, py, ox, oy)
            n = (g[:, :, 3] > 0).sum()
            if n and (best is None or sp / n < best[0]):
                best = (sp / n, g)
    g = best[1]
    ys, xs = np.where(g[:, :, 3] > 0)
    return g[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


def cell(g, ax='left', ay='top'):
    out = np.zeros((16, 16, 4), np.uint8)
    h, w = min(16, g.shape[0]), min(16, g.shape[1])
    y = 0 if ay == 'top' else 16 - h
    x = 0 if ax == 'left' else 16 - w
    out[y:y + h, x:x + w] = g[:h, :w]
    return out


def vtile(g):
    """16 rows of a side piece that repeat cleanly: start where row k matches row k+16."""
    if g.shape[0] <= 16:
        return g, 0
    d = [int(np.abs(g[k].astype(int) - g[k + 16]).sum()) for k in range(g.shape[0] - 16)]
    k = int(np.argmin(d))
    return g[k:k + 16], k


def slice_all():
    rgb, m = load(SRC)
    m2 = opening(m, 3)
    rows = []
    for y0, y1 in bands(m2):
        rows.append([(int(a), int(b), y0 + int(c), y0 + int(d)) for a, b, c, d in objects(m2[y0:y1])])
    (tl, t, tr), (l, r), (bl, br) = rows
    PYT = (t[3] - t[2]) / 16
    out = {}
    out['tl'] = cell(cut(rgb, m, tl, (tl[1] - tl[0] - OL) / 16, PYT, 'r'))
    out['t'] = cell(cut(rgb, m, t, (t[1] - t[0] - 2 * OL) / 16, PYT, 'lr'))
    out['tr'] = cell(cut(rgb, m, tr, (tr[1] - tr[0] - OL) / 16, PYT, 'l'), ax='right')
    gl, kl = vtile(cut(rgb, m, l, PX, PX, 'tb'))
    gr, kr = vtile(cut(rgb, m, r, PX, PX, 'tb'))
    out['l'], out['r'] = cell(gl), cell(gr, ax='right')
    out['bl'] = cell(cut(rgb, m, bl, PX, PX, 't'))
    out['br'] = cell(cut(rgb, m, br, PX, PX, 't'), ax='right')
    for k, a in out.items():
        Image.fromarray(a).save(os.path.join(DUN, f'wall-{k}.png'))
    seam_t = int(np.abs(out['t'][:, 0].astype(int) - out['t'][:, 15]).sum())
    print('pitch x', round(PX, 2), 'top y', round(PYT, 2), 'side rows from', kl, kr, 'top-edge seam diff', seam_t)
    return out


def slice_v2():
    """N-34d wall set v2 (docs/art-review/n34d-room-walls-v2.png), replaces the N-34b pieces (slice_all).
    Every piece sampled on a fixed 16-col grid over its box (outline cut off on the sides that join another piece):
      tl / t / tr: 16x16; b / bl / br: 16 x 13 (same pitch as the corners), top-aligned (bottom rows = outside)
    Side walls (Stefan): NOT the delivered side pieces. Built from crops only:
      outer edge = a continuous column of evenly spaced light grey edge stones (Stefan: one wall, not stacked corner
                   chunks): 3 stones per 16 px (5, 5, 6 rows), each = joint row (outline colour) + the corner edge
                   stone's highlight row + its body row repeated (tl cols 0-3, tr cols 12-15); no chamfers
      mortar col = tl col 4 / tr col 11
      inner bricks = horizontal courses from wall-t (course X = rows 5-7 + one repeated row, course Y = rows 8-11),
                     stacked X, Y, X, Y = 16 rows, cols 0-9 of wall-t
      inner edge = the corner's outline column (floor side)
    The 1 px outline rows where a side meets a corner (tl/tr bottom row, bl/br top row) are filled with the stone
    colours of the row next to them in the stone column, so the light border runs through without a line."""
    rgb, m = load('n34d-room-walls-v2.png')
    m2 = opening(m, 3)
    rows = [[(int(a), int(b), y0 + int(c), y0 + int(d)) for a, b, c, d in objects(m2[y0:y1])] for y0, y1 in bands(m2)]
    (tl, t, tr), _, (bl, b, br) = rows

    def fx(box, nx, ny):
        x0, x1, y0, y1 = box
        g, _ = grid(rgb[y0:y1, x0:x1], m[y0:y1, x0:x1], (x1 - x0) / nx, (y1 - y0) / ny, 0, 0)
        return g

    w = {}
    w['tl'] = fx((tl[0], tl[1] - OL, tl[2], tl[3]), 16, 16)
    w['t'] = fx((t[0] + OL, t[1] - OL, t[2], t[3]), 16, 16)
    w['tr'] = fx((tr[0] + OL, tr[1], tr[2], tr[3]), 16, 16)
    nb = round((b[3] - b[2]) / ((tl[1] - tl[0] - OL) / 16))  # 13 rows at the corners' pitch
    for k, box in (('b', (b[0] + OL, b[1] - OL, b[2], b[3])), ('bl', (bl[0], bl[1] - OL, bl[2], bl[3])),
                   ('br', (br[0] + OL, br[1], br[2], br[3]))):
        c = np.zeros((16, 16, 4), np.uint8)
        c[:nb] = fx(box, 16, nb)
        w[k] = c
    t_ = w['t']
    bricks = np.concatenate([t_[5:8], t_[7:8], t_[8:12], t_[5:8], t_[7:8], t_[8:12]])  # 16 rows, horizontal courses

    def stones(src, c0, c1, joint):
        """A continuous column of evenly spaced edge stones, 3 per 16 px (5, 5, 6 rows): each stone = one joint row
        (outline colour), the corner stone's highlight row (row 11), then its body row (row 12) repeated.
        No corner shapes; tiles every 16 px."""
        out = []
        for h in (5, 5, 6):
            j = src[11, c0:c1].copy()
            j[:] = joint
            out += [j[None], src[11:12, c0:c1]] + [src[12:13, c0:c1]] * (h - 2)
        return np.concatenate(out)

    tlg, trg = w['tl'], w['tr']
    l = np.zeros((16, 16, 4), np.uint8)
    l[:, 0:4] = stones(tlg, 0, 4, tlg[8, 0])
    l[:, 0] = tlg[8, 0]  # outer outline stays one line
    l[:, 4] = tlg[6, 4]  # mortar column
    l[:, 5:15] = bricks[:, 0:10]
    l[:, 15] = tlg[8, 0]  # outline on the floor side
    r = np.zeros((16, 16, 4), np.uint8)
    r[:, 12:16] = stones(trg, 12, 16, trg[8, 15])
    r[:, 15] = trg[8, 15]
    r[:, 11] = trg[6, 11]
    r[:, 1:11] = bricks[:, 6:16]
    r[:, 0] = trg[8, 15]
    w['l'], w['r'] = l, r
    w['tl'][15, 1:4] = w['tl'][14, 1:4]
    w['tr'][15, 12:15] = w['tr'][14, 12:15]
    w['bl'][0, 1:4] = w['bl'][1, 1:4]
    w['br'][0, 12:15] = w['br'][1, 12:15]
    for k, a in w.items():
        Image.fromarray(a).save(os.path.join(DUN, f'wall-{k}.png'))
    print('N-34d: corners/top 16x16, bottom 16x%d top-aligned, sides built from edge stones + wall-t courses' % nb)
    return w


def best_window(g, lo, hi):
    """16-col window starting in [lo, hi] whose first col matches the col after it (tiles left/right)."""
    d = {k: int(np.abs(g[:, k].astype(int) - g[:, k + 16]).sum()) for k in range(lo, hi + 1) if k + 16 < g.shape[1]}
    k = min(d, key=d.get)
    return g[:, k:k + 16], k


def entrance():
    """N-34c (docs/art-review/n34c-room-entrance.png): bottom wall | pillar | low threshold | pillar | bottom wall.
    Sampled whole at pitch 248 / 16 = 15.5 (16 rows; bricks ~6 art px like the rest) -> a 16 x 69 strip: left wall
    cols 0-19, left pillar 20-24, threshold 25-43 (rows 12-15 only: the opening), right pillar 44-48, right wall 49-68.
      (wall-b now comes from N-34d, slice_v2; N-34c's plain wall segments are no longer cut)
      wall-entrance-l     cols 9-24: wall bricks + the left pillar (its outline faces the opening)
      wall-entrance-mid   16 cols of the threshold, window where col k == col k+16 (repeat it for a wider opening)
      wall-entrance-r     cols 44-59: the right pillar + wall bricks"""
    rgb, m = load('n34c-room-entrance.png')
    x0, x1, y0, y1 = 233, 1303, 446, 695
    p = (y1 - y0) / 16
    a, b = rgb[y0 - 8:y1 + 8, x0 - 8:x1 + 8], m[y0 - 8:y1 + 8, x0 - 8:x1 + 8]
    best = None
    for ox in np.arange(0, p, p / 8):
        for oy in np.arange(0, p, p / 8):
            g, sp = grid(a, b, p, p, ox, oy)
            n = (g[:, :, 3] > 0).sum()
            if n and (best is None or sp / n < best[0]):
                best = (sp / n, g)
    g = best[1]
    ys, xs = np.where(g[:, :, 3] > 0)
    g = g[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    assert g.shape[:2] == (16, 69), g.shape
    out = {}
    out['entrance-l'] = g[:, 9:25]
    out['entrance-mid'], km = best_window(g, 25, 27)
    out['entrance-r'] = g[:, 44:60]
    for k, arr in out.items():
        Image.fromarray(np.ascontiguousarray(arr)).save(os.path.join(DUN, f'wall-{k}.png'))
    print('N-34c pitch', round(p, 2), 'threshold from col', km)
    return out


def room(w):
    S, TW, TH = 3, 10, 7
    na = os.path.join(ROOT, 'public', 'assets', 'ninja-adventure', 'Backgrounds', 'Tilesets', 'Interior', 'TilesetInteriorFloor.png')
    fl = Image.open(na).convert('RGBA').crop((192, 208, 208, 224))
    im = Image.new('RGBA', (TW * 16, TH * 16 + 16), (20, 27, 27, 255))
    for y in range(1, TH):
        for x in range(TW):
            im.alpha_composite(fl, (x * 16, y * 16 + 16))
    T = {k: Image.fromarray(a) for k, a in w.items()}
    oy = 16  # one spare row above for the door's overhang
    dx = TW // 2 - 1  # door covers tiles dx, dx+1 of the top row (above the entrance's 2 threshold tiles)
    for x in range(TW):
        key = 'tl' if x == 0 else 'tr' if x == TW - 1 else 't'
        if key == 't' and x in (dx, dx + 1):
            continue
        im.alpha_composite(T[key], (x * 16, oy))
    for y in range(1, TH - 1):
        im.alpha_composite(T['l'], (0, oy + y * 16))
        im.alpha_composite(T['r'], ((TW - 1) * 16, oy + y * 16))
    yb = oy + (TH - 1) * 16
    bottom = ['b'] * TW  # wall-b = the N-34d bottom edge (matches bl/br)
    bottom[3:7] = ['entrance-l', 'entrance-mid', 'entrance-mid', 'entrance-r']  # opening under the door
    for x in range(1, TW - 1):
        im.alpha_composite(T[bottom[x]], (x * 16, yb))
    im.alpha_composite(T['bl'], (0, yb))
    im.alpha_composite(T['br'], ((TW - 1) * 16, yb))
    door = Image.open(os.path.join(DUN, 'door-closed-32.png')).convert('RGBA')
    im.alpha_composite(door, (dx * 16, oy + 16 - 32))  # door's floor line on the top wall's bottom row
    big = im.resize((im.width * S, im.height * S), Image.NEAREST)
    bar = Image.new('RGBA', (big.width, 50), (20, 27, 27, 255))
    ImageDraw.Draw(bar).text((10, 6), 'v3: N-34d walls + N-34 door + N-34c entrance (3x)', fill='white', font_size=18)
    ImageDraw.Draw(bar).text((10, 28), '16 px tiles, Ninja floor', fill='#ffe18d', font_size=14)
    out = Image.new('RGBA', (big.width, big.height + 50))
    out.paste(bar, (0, 0))
    out.paste(big, (0, 50))
    out.save(os.path.join(REV, 'n34-room-test.png'))
    print('docs/art-review/n34-room-test.png', out.size)


if __name__ == '__main__':
    w = slice_v2()  # N-34d set (slice_all() = the replaced N-34b set)
    w.update(entrance())
    room(w)
