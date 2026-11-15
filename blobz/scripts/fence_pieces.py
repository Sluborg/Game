#!/usr/bin/env python3
"""N-30b fence, assembled from ChatGPT crops only (no new drawing): crop, resample on the N-30 gate's art grid, align.

usage (from blobz/): python3 scripts/fence_pieces.py
  -> public/art/props/fence-post.png, fence-rail-h.png, fence-rail-v.png + docs/art-review/n30b-fence-pen.png

Sizes: the N-30 gate post is 26 art px tall (pitch 10.28 in n30-puzzle.png), taller than one 16 px tile, so post and
horizontal rail are 16 x 32 cells (one tile wide, foot on the bottom row, the top overhangs the tile above, like the
gate and the trees). The vertical rail is a 16 x 16 tile, seamless top/bottom.
  fence-post   = gate-post-l.png body (its bracket stubs cropped off), centred, foot on row 31
  fence-rail-h = the 2-rail span between the posts of n30b-fence-chatgpt.png piece 1, resampled at the pitch that makes
                 that picture's post 27 art px tall (same grid as the gate post), 3 planks (one plank column repeated
                 to make 16 px), so it tiles left/right; its iron bands land on the gate post's bracket rows
  fence-rail-v = the top rail of the same crop, turned on its side (edge-on), 6 px wide, 3 planks + one repeated
                 column = 16 px, tiles top/bottom
"""
import os
import sys
import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from slice_grid_orders import load, sample_fixed, ART, REV  # noqa: E402
from blobz_v2_final import render  # noqa: E402

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
PROPS = os.path.join(ART, 'props')
NA = os.path.join(ROOT, 'public', 'assets', 'ninja-adventure', 'Backgrounds', 'Tilesets')
PITCH = 15.0  # least colour spread for piece 1 between 14.6 and 16.1 (post = 27 art px, gate post = 26)


def rail_grid():
    rgb, m = load('n30b-fence-chatgpt.png')
    best = sample_fixed(rgb[150:640, 100:810], m[150:640, 100:810], PITCH, (60, 28))  # piece 1 only
    return best[1]  # 27 x 41: posts at cols 0-11 and 30-40, rails between; plank seams every 5 cols (15, 20, 25)


def post():
    p = np.array(Image.open(os.path.join(PROPS, 'gate-post-l.png')).convert('RGBA'))
    body = p[:, 11:20].copy()  # cols 11-19: the post; 20 is the bracket stubs
    ys = np.where(body[:, :, 3].any(1))[0]
    body = body[ys.min():ys.max() + 1]
    out = np.zeros((32, 16, 4), np.uint8)
    h, w = body.shape[:2]
    x = (16 - w) // 2
    out[32 - h:, x:x + w] = body
    return out


def rail_h(g):
    span = g[:, 15:30]  # seam, plank, seam, plank, seam, plank (5-col period) -> tiles seamlessly
    span = np.concatenate([span[:, :3], span[:, 2:3], span[:, 3:]], axis=1)  # repeat one plank column: 16 wide
    out = np.zeros((32, 16, 4), np.uint8)
    out[32 - g.shape[0]:] = span  # grid row 26 (post foot) -> row 31
    out[:, :, 3] = np.where(out[:, :, 3] > 0, 255, 0)
    return out


def rail_v(g):
    top = g[5:13, 15:30]  # top rail: outline, plank top, iron band, outline (rows 5-12)
    ys = [r for r in range(top.shape[0]) if top[r, :, 3].all()]
    top = top[ys[0]:ys[-1] + 1]
    top = np.concatenate([top[:, :3], top[:, 2:3], top[:, 3:]], axis=1)  # 16 long
    keep = [0, 1, 2, 4, 6, top.shape[0] - 1] if top.shape[0] > 6 else list(range(top.shape[0]))
    strip = top[keep]  # 6 rows: outline, plank, plank, iron, rivet row, outline (thin, edge-on)
    strip = np.rot90(strip, -1)  # 16 tall x 6 wide
    out = np.zeros((16, 16, 4), np.uint8)
    out[:, 5:11] = strip
    return out


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
            items.append((y, -1, RV, x * 16, y * 16 + 8 - 16 + 12))  # strip at rail height between post feet
        for y in range(y0 + 1, yb + 1):
            if (y - y0) % 2 == 0 or y == yb:
                items.append((y, 2, P, x * 16, y * 16 - 16))
    items.append((y1, 1, gate.crop(gb), gx * 16 + gb[0], y1 * 16 + 16 - (gb[3] - gb[1])))
    items.append((y1 - 2, 3, blob, 7 * 16, (y1 - 2) * 16 + 16 - blob.height))
    for _, _, spr, x, y in sorted(items, key=lambda t: (t[0], t[1])):
        im.alpha_composite(spr, (x, y))
    big = im.resize((im.width * S, im.height * S), Image.NEAREST)
    bar = Image.new('RGBA', (big.width, 60), (20, 27, 27, 255))
    ImageDraw.Draw(bar).text((10, 8), 'N-30b fence pen (3x), ChatGPT crops only', fill='white', font_size=18)
    ImageDraw.Draw(bar).text((10, 34), '4 corners, a T, N-30 gate, blob', fill='#ffe18d', font_size=16)
    out = Image.new('RGBA', (big.width, big.height + 60))
    out.paste(bar, (0, 0))
    out.paste(big, (0, 60))
    out.save(os.path.join(REV, 'n30b-fence-pen.png'))


def main():
    g = rail_grid()
    p, rh, rv = post(), rail_h(g), rail_v(g)
    for name, a in (('fence-post', p), ('fence-rail-h', rh), ('fence-rail-v', rv)):
        Image.fromarray(a).save(os.path.join(PROPS, name + '.png'))
        print(name, a.shape[1], 'x', a.shape[0])
    pen(p, rh, rv)
    print('docs/art-review/n30b-fence-pen.png')


if __name__ == '__main__':
    main()
