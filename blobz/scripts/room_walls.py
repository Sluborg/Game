#!/usr/bin/env python3
"""N-34b dungeon room walls (ChatGPT, docs/art-review/n34b-room-walls.png) -> 16 px tiles + a 3x room test.

usage (from blobz/): python3 scripts/room_walls.py
  -> public/art/dungeon/wall-{tl,t,tr,l,r,bl,br}.png (16x16) + docs/art-review/n34-room-test.png

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
MISSING from the delivery: a plain bottom edge (between wall-bl and wall-br) and inner corners.
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


def room(w):
    S, TW, TH = 3, 9, 7
    na = os.path.join(ROOT, 'public', 'assets', 'ninja-adventure', 'Backgrounds', 'Tilesets', 'Interior', 'TilesetInteriorFloor.png')
    fl = Image.open(na).convert('RGBA').crop((192, 208, 208, 224))
    im = Image.new('RGBA', (TW * 16, TH * 16 + 16), (20, 27, 27, 255))
    for y in range(1, TH):
        for x in range(TW):
            im.alpha_composite(fl, (x * 16, y * 16 + 16))
    T = {k: Image.fromarray(a) for k, a in w.items()}
    oy = 16  # one spare row above for the door's overhang
    dx = TW // 2 - 1  # door covers tiles dx, dx+1 of the top row
    for x in range(TW):
        key = 'tl' if x == 0 else 'tr' if x == TW - 1 else 't'
        if key == 't' and x in (dx, dx + 1):
            continue
        im.alpha_composite(T[key], (x * 16, oy))
    for y in range(1, TH - 1):
        im.alpha_composite(T['l'], (0, oy + y * 16))
        im.alpha_composite(T['r'], ((TW - 1) * 16, oy + y * 16))
    im.alpha_composite(T['bl'], (0, oy + (TH - 1) * 16))
    im.alpha_composite(T['br'], ((TW - 1) * 16, oy + (TH - 1) * 16))
    door = Image.open(os.path.join(DUN, 'door-closed-32.png')).convert('RGBA')
    im.alpha_composite(door, (dx * 16, oy + 16 - 32))  # door's floor line on the top wall's bottom row
    big = im.resize((im.width * S, im.height * S), Image.NEAREST)
    d = ImageDraw.Draw(big)
    d.text((70, (oy + (TH - 1) * 16 + 4) * S), 'MISSING: plain bottom edge piece', fill='#ffe18d', font_size=16)
    bar = Image.new('RGBA', (big.width, 50), (20, 27, 27, 255))
    ImageDraw.Draw(bar).text((10, 6), 'N-34b room walls + N-34 door (3x)', fill='white', font_size=18)
    ImageDraw.Draw(bar).text((10, 28), '16 px tiles, Ninja floor', fill='#ffe18d', font_size=14)
    out = Image.new('RGBA', (big.width, big.height + 50))
    out.paste(bar, (0, 0))
    out.paste(big, (0, 50))
    out.save(os.path.join(REV, 'n34-room-test.png'))
    print('docs/art-review/n34-room-test.png', out.size)


if __name__ == '__main__':
    room(slice_all())
