#!/usr/bin/env python3
"""Review of Stefan's Gemini art (docs/art-review/gemini/*.jpg: trees+stumps, berries, bushes, rocks, logs; all JPEG).
Each object is sampled on its real art-pixel grid (pitch measured by outline run + least colour spread), the JPEG noise is merged
to a small flat palette, saved to docs/art-review/gemini/native/<name>.png (NOT in public/), and compared at game scale (3x)
with our current art next to a blob.

usage (from blobz/): python3 scripts/gemini_review.py -> docs/art-review/gemini-vs-ours.png (+ prints the native sizes)
"""
import os
import sys
import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from slice_grid_orders import opening, objects, bands, sample_fixed, ART  # noqa: E402
from slice_n37_n40 import clean  # noqa: E402
from blobz_v2_final import render  # noqa: E402

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
G = os.path.join(ROOT, 'docs', 'art-review', 'gemini')
os.makedirs(os.path.join(G, 'native'), exist_ok=True)
# (sheet, pitch in src px, object index in reading order, name, our counterpart)
ITEMS = [('trees-stumps', 17.0, 0, 'tree-round', ('props', 'tree-round.png')), ('trees-stumps', 17.0, 1, 'tree-pine', ('props', 'tree-pine.png')),
         ('trees-stumps', 17.0, 3, 'stump', ('props', 'stump-round.png')),
         ('berries', 34.0, 0, 'berry-16', ('icons', 'res-berry-16.png')), ('berries', 34.0, 1, 'berry-32', ('icons', 'res-berry-32.png')),
         ('rocks', 33.0, 0, 'rock-16', ('icons', 'res-stone-16.png')), ('rocks', 34.0, 1, 'rock-32', ('props', 'boulder-1.png')),
         ('logs', 17.0, 0, 'log-small', ('icons', 'res-wood-16.png')), ('logs', 17.0, 1, 'log-big', ('icons', 'res-wood-16.png')),
         ('bushes', 20.0, 2, 'bush-small', ('props', 'berry-bush-16.png')), ('bushes', 20.5, 0, 'bush-big', ('props', 'berry-bush-16.png'))]


def key(a):
    r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    return ~((r > 140) & (b > 140) & (g < np.minimum(r, b) - 70))


def slice_all():
    out, cache = {}, {}
    for sheet, p, idx, name, ours in ITEMS:
        if sheet not in cache:
            a = np.array(Image.open(os.path.join(G, sheet + '.jpg')).convert('RGB')).astype(float)
            m = key(a)
            m2 = opening(m, 3)
            objs = []
            for y0, y1 in bands(m2, min_h=20):
                objs += [(x0, x1, y0 + c, y0 + d) for x0, x1, c, d in objects(m2[y0:y1], min_w=20)]
            cache[sheet] = (a, m, objs)
        a, m, objs = cache[sheet]
        x0, x1, y0, y1 = objs[idx]
        r = sample_fixed(a[y0 - 6:y1 + 6, x0 - 6:x1 + 6], m[y0 - 6:y1 + 6, x0 - 6:x1 + 6], p, (300, 300))
        g = clean(r[1], 24)  # 16 merged the 1 px red berries of the small bush into green
        c = g[:, :, :3].astype(int)  # purple fringe from the JPEG / magenta key -> the nearest dark outline colour
        pur = (g[:, :, 3] > 0) & (c[:, :, 0] - c[:, :, 1] > 40) & (c[:, :, 2] - c[:, :, 1] > 40) & (c[:, :, 2] >= 0.7 * c[:, :, 0])
        if pur.any():
            dark = (g[:, :, 3] > 0) & ~pur & (c.sum(2) < 150)
            g[pur, :3] = np.median(c[dark], axis=0).astype(np.uint8) if dark.any() else g[pur, :3]
        Image.fromarray(g).save(os.path.join(G, 'native', name + '.png'))
        out[name] = (Image.fromarray(g), round(r[0], 1), int(pur.sum()))
        print(f'{name}: {g.shape[1]}x{g.shape[0]} art px, pitch {p}, grid spread {r[0]:.1f}, purple fringe px fixed {int(pur.sum())}')
    return out


def main():
    nat = slice_all()
    blob = render([{'look': {'color': 0x5ec8ff, 'shape': 0, 'eyes': 0, 'mouth': 0, 'hat': 0}}])[0]
    blob = blob.crop(blob.getbbox())
    S = 3
    cols = [(n, o[0], t) for (_, _, _, n, t), o in zip(ITEMS, nat.values())]
    W = 2 * 200 + 20
    rows = []
    for name, g, ours_path in cols:
        o = Image.open(os.path.join(ART, *ours_path)).convert('RGBA')
        o = o.crop(o.getbbox())
        h = max(g.height, o.height, blob.height) * S + 38
        rows.append((name, g, o, h))
    H = 40 + sum(r[3] + 6 for r in rows)
    img = Image.new('RGBA', (W, H), (86, 150, 70, 255))
    d = ImageDraw.Draw(img)
    d.rectangle((0, 0, W, 34), fill=(14, 18, 18, 255))
    d.text((6, 4), 'Gemini (left) vs our current art (right), 3x, blob for scale', fill='white', font_size=13)
    d.text((6, 20), 'each left image is sampled on its real pixel grid', fill='#9fd3ff', font_size=10)
    y = 40
    for name, g, o, h in rows:
        base = y + h - 30
        gx = 6 + (190 - min(g.width * S, 190)) // 2
        gg = g.resize((g.width * S, g.height * S), Image.NEAREST)
        img.alpha_composite(gg.crop((0, 0, min(gg.width, 190), gg.height)), (gx, base - gg.height))
        oo = o.resize((o.width * S, o.height * S), Image.NEAREST)
        img.alpha_composite(oo.crop((0, 0, min(oo.width, 120), oo.height)), (214, base - oo.height))
        bb = blob.resize((blob.width * S, blob.height * S), Image.NEAREST)
        img.alpha_composite(bb, (350, base - bb.height))
        d.text((6, base + 3), f'{name}  Gemini {g.width}x{g.height}   ours {o.width}x{o.height}', fill='white', font_size=11)
        y += h + 6
    img.save(os.path.join(ROOT, 'docs', 'art-review', 'gemini-vs-ours.png'))
    print('gemini-vs-ours.png', img.size)


if __name__ == '__main__':
    main()
