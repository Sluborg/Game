#!/usr/bin/env python3
"""Integrate ChatGPT orders N-7 (app icon), N-8 (map picker), N-9 (Bärregn background) and N-10 (check + stars).

usage (from blobz/): python3 scripts/slice_n_orders.py --n7 icon.png --n8 maps.png --n9 bg.png --n10 icons.png
(any subset). Review copies go to docs/art-review/n7..n10-*.png.

N-7: square image -> public/art/app-icon/{icon-512,icon-192,icon-maskable-512,icon-maskable-192,apple-touch-icon}.png
     (smooth resize; the picture is full-bleed so the maskable copies are the same). Lead copies them to public/.
N-8: two framed squares on white -> public/art/map-meadow.png, map-snow.png (cropped, native resolution).
N-9: portrait 9:16 -> public/art/mini/bg.png as is.
N-10: three icons on white with dithered noise around them -> public/art/icons/check.png, public/art/gather/star.png,
     star-empty.png. The noise is removed by a morphological opening (it is made of isolated dots, the icons are solid),
     then each icon is sampled on its own art-pixel grid (pitch searched), hard alpha.
"""
import argparse
import os
import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
ART = os.path.join(ROOT, 'public', 'art')
REVIEW = os.path.join(ROOT, 'docs', 'art-review')


def review(src, name):
    Image.open(src).save(os.path.join(REVIEW, name), optimize=True)


def n7(src):
    im = Image.open(src).convert('RGB')
    out = os.path.join(ART, 'app-icon')
    os.makedirs(out, exist_ok=True)
    for name, s in (('icon-512', 512), ('icon-192', 192), ('icon-maskable-512', 512), ('icon-maskable-192', 192), ('apple-touch-icon', 180)):
        im.resize((s, s), Image.LANCZOS).save(os.path.join(out, name + '.png'), optimize=True)
    review(src, 'n7-app-icon.png')


def boxes(mask, axis_runs=1):
    """Column runs of a mask -> list of (x0, x1, y0, y1)."""
    cols = np.r_[0, mask.any(0).astype(int), 0]
    runs = np.where(np.diff(cols))[0].reshape(-1, 2)
    res = []
    for x0, x1 in runs:
        ys = np.where(mask[:, x0:x1].any(1))[0]
        res.append((x0, x1, ys.min(), ys.max() + 1))
    return res


def n8(src):
    a = np.array(Image.open(src).convert('RGB')).astype(int)
    mask = a.sum(2) < 720
    bs = [b for b in boxes(mask) if b[1] - b[0] > 200]
    assert len(bs) == 2, bs
    for name, (x0, x1, y0, y1) in zip(('map-meadow', 'map-snow'), bs):
        Image.fromarray(a[y0:y1, x0:x1].astype(np.uint8)).save(os.path.join(ART, name + '.png'), optimize=True)
    review(src, 'n8-map-picker.png')


def n9(src):
    out = os.path.join(ART, 'mini')
    os.makedirs(out, exist_ok=True)
    Image.open(src).convert('RGB').save(os.path.join(out, 'bg.png'), optimize=True)
    review(src, 'n9-barregn-bg.png')


def box_filter(m, r):
    """Count of True in a (2r+1)^2 window, via a summed-area table."""
    p = np.pad(m.astype(np.int32), r + 1)
    c = p.cumsum(0).cumsum(1)
    k = 2 * r + 1
    return c[k:, k:] - c[:-k, k:] - c[k:, :-k] + c[:-k, :-k]


def opening(m, r):
    k = (2 * r + 1) ** 2
    eroded = box_filter(m, r) == k
    return box_filter(eroded, r) > 0


def grid(reg, mask, p, ox, oy):
    H, W, _ = reg.shape
    ny, nx = int((H - oy) // p), int((W - ox) // p)
    out = np.zeros((ny, nx, 4), dtype=np.uint8)
    spread = 0.0
    for j in range(ny):
        for i in range(nx):
            y0, x0 = oy + j * p, ox + i * p
            sl = (slice(int(y0 + p * 0.3), int(y0 + p * 0.7) + 1), slice(int(x0 + p * 0.3), int(x0 + p * 0.7) + 1))
            if mask[sl].mean() < 0.3:
                continue
            c = reg[sl]
            out[j, i] = (*np.median(c.reshape(-1, 3), axis=0).astype(np.uint8), 255)
            spread += c.std(axis=(0, 1)).sum()
    return out, spread


def fill_holes(g):
    """Transparent cells not reachable from the border are holes: the white glint the ink mask left out."""
    h, w = g.shape[:2]
    seen = np.zeros((h, w), bool)
    stack = [(y, x) for y in range(h) for x in (0, w - 1)] + [(y, x) for x in range(w) for y in (0, h - 1)]
    while stack:
        y, x = stack.pop()
        if 0 <= y < h and 0 <= x < w and not seen[y, x] and g[y, x, 3] == 0:
            seen[y, x] = True
            stack += [(y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)]
    g[(g[:, :, 3] == 0) & ~seen] = (255, 255, 255, 255)  # holes inside the icons are the white glint
    return g


def n10(src):
    im = Image.open(src).convert('RGBA')
    a = np.array(im).astype(float)
    rgb = a[:, :, :3]
    ink = (a[:, :, 3] > 128) & (rgb.sum(2) < 690)
    solid = opening(ink, 7)
    bs = [b for b in boxes(solid) if b[1] - b[0] > 100]
    assert len(bs) == 3, bs
    targets = [os.path.join(ART, 'icons', 'check.png'), os.path.join(ART, 'gather', 'star.png'), os.path.join(ART, 'gather', 'star-empty.png')]
    regs = [(rgb[y0:y1, x0:x1], solid[y0:y1, x0:x1]) for x0, x1, y0, y1 in bs]
    # one pitch for all three (they were drawn at the same size): least total spread; offsets per icon
    best = None
    for p in np.arange(16.0, 24.01, 0.25):
        tot, gs = 0.0, []
        for reg, m in regs:
            b2 = None
            for ox in np.arange(0, p, 2.0):
                for oy in np.arange(0, p, 2.0):
                    g, sp = grid(reg, m, p, ox, oy)
                    n = (g[:, :, 3] > 0).sum()
                    if n and (b2 is None or sp / n < b2[0]):
                        b2 = (sp / n, g)
            tot += b2[0]
            gs.append(b2[1])
        if best is None or tot < best[0]:
            best = (tot, gs, p)
    for path, g, (reg, m) in zip(targets, best[1], regs):
        g = fill_holes(g)
        ys, xs = np.where(g[:, :, 3] > 0)
        g = g[ys.min():ys.max() + 1, xs.min():xs.max() + 1].copy()
        Image.fromarray(g).save(path)
        print(os.path.relpath(path, ROOT), g.shape[1], 'x', g.shape[0], 'pitch', round(best[2], 2))
    review(src, 'n10-icons.png')


def n5b(src):
    """One rogue card (N-5b) -> public/art/dungeon/card-class-rogue.png on its art-pixel grid, like the other 3 cards."""
    a = np.array(Image.open(src).convert('RGBA')).astype(float)
    al = a[:, :, 3] > 128
    ys, xs = np.where(al)
    reg, m = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1, :3], al[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    target = 54  # the other cards are 53-55 art px wide
    p0 = reg.shape[1] / target
    best = None
    for p in np.arange(p0 * 0.92, p0 * 1.08, 0.25):
        for ox in np.arange(0, p, 3.0):
            for oy in np.arange(0, p, 3.0):
                g, sp = grid(reg, m, p, ox, oy)
                n = (g[:, :, 3] > 0).sum()
                if n and (best is None or sp / n < best[0]):
                    best = (sp / n, g, p)
    g = best[1]
    ys, xs = np.where(g[:, :, 3] > 0)
    g = g[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    Image.fromarray(g).save(os.path.join(ART, 'dungeon', 'card-class-rogue.png'))
    print('card-class-rogue', g.shape[1], 'x', g.shape[0], 'pitch', round(best[2], 2))


def n7b(src, bg=(255, 207, 107)):
    """App icon without background (N-7b): clear the faint haze left by background removal (alpha < 100 -> 0, the rest
    opaque), crop to the icon with a small margin; plain icons stay transparent, maskable ones sit at 72% on a warm colour."""
    im = Image.open(src).convert('RGBA')
    a = np.array(im)
    keep = a[:, :, 3] >= 100
    a[~keep] = 0
    a[keep, 3] = 255
    ys, xs = np.where(keep)
    icon = Image.fromarray(a[ys.min():ys.max() + 1, xs.min():xs.max() + 1])
    side = int(max(icon.size) * 1.06)
    sq = Image.new('RGBA', (side, side))
    sq.alpha_composite(icon, ((side - icon.width) // 2, (side - icon.height) // 2))
    out = os.path.join(ART, 'app-icon')
    os.makedirs(out, exist_ok=True)
    for name, s in (('icon-512', 512), ('icon-192', 192), ('apple-touch-icon', 180)):
        sq.resize((s, s), Image.LANCZOS).save(os.path.join(out, name + '.png'), optimize=True)
    for name, s in (('icon-maskable-512', 512), ('icon-maskable-192', 192)):
        m = Image.new('RGBA', (s, s), (*bg, 255))
        k = int(s * 0.72)
        m.alpha_composite(sq.resize((k, k), Image.LANCZOS), ((s - k) // 2, (s - k) // 2))
        m.convert('RGB').save(os.path.join(out, name + '.png'), optimize=True)
    print('app icons: plain transparent, maskable on', bg)


def main():
    ap = argparse.ArgumentParser()
    for k in ('n5b', 'n7b'):
        ap.add_argument('--' + k)
    for k in ('n7', 'n8', 'n9', 'n10'):
        ap.add_argument('--' + k)
    args = ap.parse_args()
    for k in ('n5b', 'n7b', 'n7', 'n8', 'n9', 'n10'):
        if getattr(args, k):
            globals()[k](getattr(args, k))
            print(k, 'ok')


if __name__ == '__main__':
    main()
