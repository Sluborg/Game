#!/usr/bin/env python3
"""N-30b fence v2 from ChatGPT's 3-piece delivery (docs/art-review/n30b-fence-3pieces.png: post, 2 rails, vertical rail).
Replaces v1 (crops of the gate post + n30b-fence-chatgpt.png, commit 0ad91a1). Only crop, resample and align.

usage (from blobz/): python3 scripts/fence_pieces.py
  -> public/art/props/fence-post.png, fence-rail-h.png, fence-rail-v.png + docs/art-review/n30b-fence-pen-v3.png
North-south runs (Stefan): fence-rail-v is drawn ON TOP of the posts (higher depth than every post), one tile per
16 px from the upper post's top (tile y*16 - 11, the post's top row) down to the next post's top, so the run reads as
one connected fence.

Grid: ChatGPT drew one rivet + plank repeat every 120.2 px. The pitch 120.2 * 3 / 16 = 22.54 puts exactly 3 repeats in a
16 px tile, and makes the post 27 art px tall, the same as the N-30 gate post (26), so fence and gate share a scale.
The sampler keeps the 1 px outline: a cell that is 30%+ near-black outline takes the outline colour.
  fence-post   16x32: the post, centred, foot on row 31 (overhangs the tile above, like the gate and the trees)
  fence-rail-h 16x32: a 16-col window of each rail, picked where col w and col w+16 match (seamless left/right), at the
               rails' heights relative to the post in ChatGPT's picture (rows 10-15 and 20-25)
  fence-rail-v 16x16: 14 rows of the vertical rail (mid-plank to mid-plank, one band), 2 plank rows repeated -> 16,
               tiles top/bottom; 5 px wide, centred
"""
import os
import sys
import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from slice_grid_orders import load, ART, REV  # noqa: E402
from blobz_v2_final import render  # noqa: E402

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
PROPS = os.path.join(ART, 'props')
NA = os.path.join(ROOT, 'public', 'assets', 'ninja-adventure', 'Backgrounds', 'Tilesets')
SRC = 'n30b-fence-3pieces.png'
P = 120.2 * 3 / 16


def grid(a, b, p, ox, oy):
    H, W = b.shape
    ny, nx = int((H - oy) // p), int((W - ox) // p)
    out = np.zeros((ny, nx, 4), np.uint8)
    sp = 0.0
    for j in range(ny):
        for i in range(nx):
            y0, x0 = oy + j * p, ox + i * p
            full = (slice(int(y0), int(y0 + p)), slice(int(x0), int(x0 + p)))
            if b[full].mean() < 0.5:
                continue
            c = a[full][b[full]]
            dark = c.sum(1) < 170
            if dark.mean() > 0.3:
                c = c[dark]
            else:
                ctr = (slice(int(y0 + p * .25), int(y0 + p * .75) + 1), slice(int(x0 + p * .25), int(x0 + p * .75) + 1))
                if b[ctr].any():
                    c = a[ctr][b[ctr]]
            out[j, i] = (*np.median(c, 0).astype(np.uint8), 255)
            sp += c.std(0).sum()
    return out, sp


def cut(rgb, m, x0, x1, y0, y1):
    a, b = rgb[y0:y1, x0:x1], m[y0:y1, x0:x1]
    best = None
    for ox in np.arange(0, P, P / 8):
        for oy in np.arange(0, P, P / 8):
            g, sp = grid(a, b, P, ox, oy)
            n = (g[:, :, 3] > 0).sum()
            if n and (best is None or sp / n < best[0]):
                best = (sp / n, g)
    g = best[1]
    ys, xs = np.where(g[:, :, 3] > 0)
    return g[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


def pieces():
    rgb, m = load(SRC)
    post = cut(rgb, m, 250, 480, 80, 724)
    r1, r2 = cut(rgb, m, 700, 1470, 205, 400), cut(rgb, m, 700, 1470, 420, 610)
    v = cut(rgb, m, 1730, 1890, 0, 724)
    p = np.zeros((32, 16, 4), np.uint8)
    h, w = post.shape[:2]
    p[32 - h:, (16 - w) // 2:(16 - w) // 2 + w] = post
    diff = [int(np.abs(r1[:, k].astype(int) - r1[:, k + 16]).sum() + np.abs(r2[:, k].astype(int) - r2[:, k + 16]).sum())
            for k in range(1, r1.shape[1] - 16)]  # col 0 is the rail's end outline
    k = 1 + int(np.argmin(diff))
    rh = np.zeros((32, 16, 4), np.uint8)
    rh[16 - r1.shape[0]:16] = r1[:, k:k + 16]  # bottom outline on row 15 / row 25: as high on the post as in the picture
    rh[26 - r2.shape[0]:26] = r2[:, k:k + 16]
    bands = [r for r in range(v.shape[0]) if abs(int(v[r, 2, 0]) - int(v[r, 2, 2])) < 30 and v[r, 2].sum() > 120]
    b0 = bands[len(bands) // 2]  # a row inside the second band
    rows = [r for r in range(b0 - 10, b0 + 4)]  # 14 rows: mid plank, band, plank (band period is 14)
    rows = rows[:3] + rows[3:5] + rows[3:]  # repeat 2 plank rows -> 16
    rv = np.zeros((16, 16, 4), np.uint8)
    rv[:, (16 - v.shape[1]) // 2:(16 - v.shape[1]) // 2 + v.shape[1]] = v[rows]
    return p, rh, rv, k


def pen(p, rh, rv):
    S = 3
    gate = Image.open(os.path.join(PROPS, 'gate-closed.png')).convert('RGBA')
    gb = gate.getbbox()
    blob = render([{'look': {'color': 0x5ec8ff, 'shape': 0, 'eyes': 0, 'mouth': 0, 'hat': 0}}])[0]
    blob = blob.crop(blob.getbbox())
    TW, TH = 11, 9
    im = Image.new('RGBA', (TW * 16, TH * 16 + 16))
    grass = Image.open(os.path.join(NA, 'TilesetFloor.png')).convert('RGBA').crop((0, 192, 16, 208))
    for y in range(0, im.height, 16):
        for x in range(0, im.width, 16):
            im.alpha_composite(grass, (x, y))
    P, RH, RV = (Image.fromarray(a) for a in (p, rh, rv))
    x0, x1, y0, y1, tx, gx = 1, 9, 2, 8, 5, 4  # rectangle, T divider column (from the top side), gate at tiles gx, gx+1
    items = []  # (foot row, order, image, x, y)
    for x in range(x0, x1 + 1):
        for y in (y0, y1):
            if y == y1 and x in (gx, gx + 1):
                continue
            if x < x1 and not (y == y1 and x + 1 in (gx, gx + 1) and x + 1 == gx):
                items.append((y, 0, RH, x * 16 + 8, y * 16 - 16))  # rail from this post's centre to the next
            if (x - x0) % 2 == 0 or x in (x1, tx) or (y == y1 and x in (gx - 1, gx + 2)):
                items.append((y, 2, P, x * 16, y * 16 - 16))
    for x in (x0, x1, tx):
        yb = y1 if x != tx else y0 + 4  # the T divider runs 4 tiles down from the top side
        for y in range(y0, yb):
            items.append((99, y, RV, x * 16, y * 16 - 11))  # on top of the posts: post top-centre to the next post's top
        for y in range(y0 + 1, yb + 1):
            if (y - y0) % 2 == 0 or y == yb:
                items.append((y, 2, P, x * 16, y * 16 - 16))
    items.append((y1, 1, gate.crop(gb), gx * 16 + gb[0], y1 * 16 + 16 - (gb[3] - gb[1])))
    items.append((y1 - 2, 3, blob, 7 * 16, (y1 - 2) * 16 + 16 - blob.height))
    for _, _, spr, x, y in sorted(items, key=lambda t: (t[0], t[1])):
        im.alpha_composite(spr, (x, y))
    big = im.resize((im.width * S, im.height * S), Image.NEAREST)
    bar = Image.new('RGBA', (big.width, 60), (20, 27, 27, 255))
    ImageDraw.Draw(bar).text((10, 8), 'N-30b fence pen v3 (3x), from ChatGPT 3-piece set', fill='white', font_size=18)
    ImageDraw.Draw(bar).text((10, 34), '4 corners, a T, N-30 gate, blob; N-S rail on top of posts', fill='#ffe18d', font_size=16)
    out = Image.new('RGBA', (big.width, big.height + 60))
    out.paste(bar, (0, 0))
    out.paste(big, (0, 60))
    out.save(os.path.join(REV, 'n30b-fence-pen-v3.png'))


def main():
    p, rh, rv, k = pieces()
    print('rail window starts at col', k)
    for name, a in (('fence-post', p), ('fence-rail-h', rh), ('fence-rail-v', rv)):
        Image.fromarray(a).save(os.path.join(PROPS, name + '.png'))
        print(name, a.shape[1], 'x', a.shape[0])
    pen(p, rh, rv)
    print('docs/art-review/n30b-fence-pen-v3.png')


if __name__ == '__main__':
    main()
