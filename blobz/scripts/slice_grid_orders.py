#!/usr/bin/env python3
"""Slice ChatGPT grid orders N-11..N-15 (sprites drawn on an exact 16/32/64 px grid, delivered scaled up).

usage (from blobz/): python3 scripts/slice_grid_orders.py [n11 n12 n13 n14 n15]   (default: all)
Sources: docs/art-review/n11-weapons-r2.png, n12-move-icons.png, n13-fx-r2.png, n14-boss.png, n15-meadow-extras.png.
Preview: docs/art-review/n12-n15-sliced.png.

Per object: background out (flat magenta #ff00ff + near-magenta, or transparent alpha), a morphological opening
removes stray halo/noise pixels outside the sprite (cleanup only, nothing redrawn), the art-pixel size is measured
from the dark outline runs and refined by the least colour spread per cell, every cell takes the median colour of its
centre, alpha is hard. The sprite is centred on its N x N grid (frames of one FX row share one centre).
"""
import os
import sys
import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
REV = os.path.join(ROOT, 'docs', 'art-review')
ART = os.path.join(ROOT, 'public', 'art')


def load(name):
    a = np.array(Image.open(os.path.join(REV, name)).convert('RGBA')).astype(float)
    r, g, b, al = a[:, :, 0], a[:, :, 1], a[:, :, 2], a[:, :, 3]
    magenta = (r > 140) & (b > 140) & (g < np.minimum(r, b) - 70)  # #ff00ff and its anti-aliased neighbours
    return a[:, :, :3], (al > 128) & ~magenta


def box(m, r):
    p = np.pad(m.astype(np.int32), r + 1)
    c = p.cumsum(0).cumsum(1)
    k = 2 * r + 1
    return c[k:, k:] - c[:-k, k:] - c[k:, :-k] + c[:-k, :-k]


def opening(m, r):
    if r < 1:
        return m
    return box(box(m, r) == (2 * r + 1) ** 2, r) > 0


def runs(mask):
    """Column runs [x0, x1) of a mask."""
    c = np.r_[0, mask.any(0).astype(int), 0]
    return np.where(np.diff(c))[0].reshape(-1, 2)


def outline_pitch(rgb, m):
    """Median length of short dark runs (the 1-art-px outline) along rows and columns."""
    dark = m & (rgb.sum(2) < 200)
    lens = []
    for arr in (dark, dark.T):
        for row in arr[::3]:
            d = np.diff(np.r_[0, row.astype(int), 0])
            s, e = np.where(d == 1)[0], np.where(d == -1)[0]
            lens += [int(x) for x in (e - s) if 3 <= x <= 40]
    return float(np.median(lens)) if lens else 8.0


def grid(rgb, m, p, ox, oy, thr=0.4):
    H, W = m.shape
    ny, nx = int((H - oy) // p), int((W - ox) // p)
    out = np.zeros((ny, nx, 4), np.uint8)
    spread = 0.0
    for j in range(ny):
        for i in range(nx):
            y0, x0 = oy + j * p, ox + i * p
            sl = (slice(int(y0 + p * 0.3), int(y0 + p * 0.7) + 1), slice(int(x0 + p * 0.3), int(x0 + p * 0.7) + 1))
            mm = m[sl]
            if mm.size == 0 or mm.mean() < thr:
                continue
            c = rgb[sl][mm]
            out[j, i] = (*np.median(c, axis=0).astype(np.uint8), 255)
            spread += c.std(axis=0).sum()
    return out, spread


def sample(rgb, m, p0, n_max):
    """Best grid for one object: pitch near p0 (outline estimate), sprite must fit n_max."""
    best = None
    for p in np.arange(p0 * 0.85, p0 * 1.18, max(0.1, p0 / 60)):
        for ox in np.arange(0, p, max(1.0, p / 4)):
            for oy in np.arange(0, p, max(1.0, p / 4)):
                g, sp = grid(rgb, m, p, ox, oy)
                n = (g[:, :, 3] > 0).sum()
                if not n:
                    continue
                ys, xs = np.where(g[:, :, 3] > 0)
                if ys.max() - ys.min() + 1 > n_max[1] or xs.max() - xs.min() + 1 > n_max[0]:
                    continue
                if best is None or sp / n < best[0]:
                    best = (sp / n, g[ys.min():ys.max() + 1, xs.min():xs.max() + 1], p)
    return best


def sample_fixed(rgb, m, p, n_max):
    """Like sample() but with a fixed pitch (only the grid offset is searched)."""
    best = None
    for ox in np.arange(0, p, max(0.5, p / 8)):
        for oy in np.arange(0, p, max(0.5, p / 8)):
            g, sp = grid(rgb, m, p, ox, oy)
            n = (g[:, :, 3] > 0).sum()
            if not n:
                continue
            ys, xs = np.where(g[:, :, 3] > 0)
            if ys.max() - ys.min() + 1 > n_max[1] or xs.max() - xs.min() + 1 > n_max[0]:
                continue
            if best is None or sp / n < best[0]:
                best = (sp / n, g[ys.min():ys.max() + 1, xs.min():xs.max() + 1], p)
    return best


def place(g, W, H, anchor='centre'):
    out = np.zeros((H, W, 4), np.uint8)
    h, w = g.shape[:2]
    x = (W - w) // 2
    y = (H - h) // 2 if anchor == 'centre' else H - h
    out[y:y + h, x:x + w] = g
    return out


def objects(m, min_w=20):
    """Bounding boxes of the objects in one row band, left to right."""
    out = []
    for x0, x1 in runs(m):
        if x1 - x0 < min_w:
            continue
        ys = np.where(m[:, x0:x1].any(1))[0]
        out.append((x0, x1, ys.min(), ys.max() + 1))
    return out


def bands(m, min_h=20):
    r = np.r_[0, m.any(1).astype(int), 0]
    b = np.where(np.diff(r))[0].reshape(-1, 2)
    return [(y0, y1) for y0, y1 in b if y1 - y0 >= min_h]


def save(arr, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    Image.fromarray(arr).save(path)
    return path


def two_size_sheet(src, names, folder, n_small=16, n_big=32, gap=40, anchor='centre', open_r=0.3):
    rgb, m = load(src)
    made = []
    bs = bands(opening(m, 3))
    assert len(bs) == 2, (src, bs)
    for (y0, y1), n in zip(bs, (n_small, n_big)):
        mb = m[y0:y1]
        objs = objects(opening(mb, 3), gap)
        # merge pieces of one object (e.g. speed lines) by grouping into len(names) columns by x centre
        if len(objs) != len(names):
            xs = sorted(objs, key=lambda o: o[0])
            W = m.shape[1]
            cols = [[] for _ in names]
            for o in xs:
                cols[min(len(names) - 1, int(((o[0] + o[1]) / 2) / W * len(names)))].append(o)
            objs = [(min(o[0] for o in c), max(o[1] for o in c), min(o[2] for o in c), max(o[3] for o in c)) for c in cols]
        crops = []
        for name, (x0, x1, oy0, oy1) in zip(names, objs):
            pad = 6
            sl = (slice(max(0, y0 + oy0 - pad), y0 + oy1 + pad), slice(max(0, x0 - pad), x1 + pad))
            orgb, om = rgb[sl], m[sl]
            p0 = outline_pitch(orgb, om)
            om = opening(om, int(p0 * open_r))
            best = sample(orgb, om, p0, (n, n)) or sample(orgb, om, max(om.shape) / n * 1.02, (n, n))
            crops.append((name, orgb, om, best[2]))
        # one grid per row: every sprite of a row was drawn on the same N x N grid, so they share one pitch
        prow = float(np.median([c[3] for c in crops]))
        for name, orgb, om, _ in crops:
            best = sample_fixed(orgb, om, prow, (n, n)) or sample(orgb, om, prow, (n, n))
            g = place(best[1], n, n, anchor)
            made.append((save(g, os.path.join(folder, f'{name}-{n}.png')), round(best[2], 2), best[1].shape[1], best[1].shape[0]))
    return made


def n11():
    return two_size_sheet('n11-weapons-r2.png', ['dagger', 'wand', 'sword', 'crossbow', 'shield'], os.path.join(ART, 'dungeon', 'weapons'))


def n12():
    return two_size_sheet('n12-move-icons.png', ['dodge', 'jump-back', 'shield-charge', 'phase-out', 'heal-mode', 'damage-mode'],
                          os.path.join(ART, 'dungeon', 'icons'), open_r=0.35)


def n15():
    return two_size_sheet('n15-meadow-extras.png', ['build-marker', 'sign', 'magnet', 'speed', 'home-flag'], os.path.join(ART, 'meadow'),
                          anchor='bottom', open_r=0.35)


def drop_edge_bits(g, max_px=12):
    """Remove tiny pieces touching the top/bottom edge: bits of the neighbouring row's effect, not this frame."""
    h, w = g.shape[:2]
    seen = np.zeros((h, w), bool)
    for y0 in range(h):
        for x0 in range(w):
            if seen[y0, x0] or not g[y0, x0, 3]:
                continue
            comp, stack = [], [(y0, x0)]
            seen[y0, x0] = True
            while stack:
                y, x = stack.pop()
                comp.append((y, x))
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        ny, nx = y + dy, x + dx
                        if 0 <= ny < h and 0 <= nx < w and not seen[ny, nx] and g[ny, nx, 3]:
                            seen[ny, nx] = True
                            stack.append((ny, nx))
            if len(comp) <= max_px and any(y <= 5 or y >= h - 6 for y, _ in comp):
                for y, x in comp:
                    g[y, x] = 0
    return g


def n13():
    rgb, m = load('n13-fx-r2.png')
    H, W = m.shape
    names = ['ko-stars', 'shockwave', 'slam-warning', 'levelup', 'hit-spark']
    cw, ch = W / 4, H / 5
    made = []
    p0 = min(cw, ch) / 32  # each frame is one 32x32 cell of the sheet
    for r, name in enumerate(names):
        cells = [(rgb[int(r * ch):int((r + 1) * ch), int(c * cw):int((c + 1) * cw)], m[int(r * ch):int((r + 1) * ch), int(c * cw):int((c + 1) * cw)]) for c in range(4)]
        # one pitch for the row; sample each frame on a 32x32 grid centred on the cell centre (common centre)
        # the 32x32 grid must cover all ink of every frame (around the cell centre): lower bound on the pitch
        reach = 0.0
        for crgb, cm in cells:
            ys, xs = np.where(opening(cm, 2))
            if len(ys):
                h, w = cm.shape
                reach = max(reach, np.abs(xs - w / 2).max(), np.abs(ys - h / 2).max())
        pmin = max(p0 * 0.9, (reach + 1) / 16)
        best = None
        for p in np.arange(pmin, max(pmin, p0 * 1.1) + p0 / 25, p0 / 50):
            tot, gs = 0.0, []
            for crgb, cm in cells:
                h, w = cm.shape
                ox, oy = w / 2 - 16 * p, h / 2 - 16 * p
                g = np.zeros((32, 32, 4), np.uint8)
                sp = 0.0
                for j in range(32):
                    for i in range(32):
                        y0, x0 = oy + j * p, ox + i * p
                        if y0 + p * 0.3 < 0 or x0 + p * 0.3 < 0 or y0 + p * 0.7 >= h or x0 + p * 0.7 >= w:
                            continue  # outside this frame's cell: never read a neighbour's pixels
                        sl = (slice(int(y0 + p * 0.3), int(y0 + p * 0.7) + 1), slice(int(x0 + p * 0.3), int(x0 + p * 0.7) + 1))
                        mm = cm[sl]
                        if mm.size == 0 or mm.mean() < 0.4:
                            continue
                        c = crgb[sl][mm]
                        g[j, i] = (*np.median(c, axis=0).astype(np.uint8), 255)
                        sp += c.std(axis=0).sum()
                tot += sp / max(1, (g[:, :, 3] > 0).sum())
                gs.append(g)
            if best is None or tot < best[0]:
                best = (tot, gs, p)
        frames = [drop_edge_bits(g) if name in ('shockwave', 'slam-warning') else g for g in best[1]]  # these two rows touch
        best = (best[0], frames, best[2])
        strip = np.concatenate(best[1], axis=1)
        for i, g in enumerate(best[1]):
            save(g, os.path.join(ART, 'dungeon', 'fx', f'{name}-{i}.png'))
        made.append((save(strip, os.path.join(ART, 'dungeon', 'fx', f'{name}.png')), round(best[2], 2), 128, 32))
    return made


def n14():
    rgb, m = load('n14-boss.png')
    bs = bands(opening(m, 3))
    assert len(bs) == 2, bs
    made = []
    for (y0, y1), (name, W, H) in zip(bs, (('boss-portrait', 64, 64), ('boss-banner', 256, 64))):
        xs = np.where(m[y0:y1].any(0))[0]
        sl = (slice(y0 - 6, y1 + 6), slice(xs.min() - 6, xs.max() + 7))
        orgb, om = rgb[sl], m[sl]
        p0 = outline_pitch(orgb, om)
        best = sample(orgb, opening(om, int(p0 * 0.3)), p0, (W, H))
        # ChatGPT drew these with bigger art pixels than the 64 / 256x64 grid asked for: keep the native crop
        made.append((save(best[1], os.path.join(ART, 'dungeon', f'{name}.png')), round(best[2], 2), best[1].shape[1], best[1].shape[0]))
    return made


def preview(paths):
    S = 4
    rows = {}
    for p in paths:
        rows.setdefault(os.path.dirname(p), []).append(p)
    ims = [[Image.open(p).convert('RGBA') for p in sorted(v)] for v in rows.values()]
    W = max(sum(i.width * S + 10 for i in r) for r in ims) + 20
    Hs = [max(i.height * S for i in r) + 30 for r in ims]
    out = Image.new('RGBA', (W, sum(Hs) + 40), (98, 150, 72, 255))
    d = ImageDraw.Draw(out)
    d.text((10, 8), 'ChatGPT N-11..N-15 sliced (4x, on game grass)', fill='white', font_size=18)
    y = 36
    for (folder, r), h in zip(zip(rows.keys(), ims), Hs):
        d.text((10, y), os.path.relpath(folder, ROOT), fill='white', font_size=14)
        x = 10
        for im in r:
            if x + im.width * S > out.width:
                break
            out.alpha_composite(im.resize((im.width * S, im.height * S), Image.NEAREST), (x, y + 18))
            x += im.width * S + 10
        y += h
    out.save(os.path.join(REV, 'n12-n15-sliced.png'))


def main():
    which = sys.argv[1:] or ['n11', 'n12', 'n13', 'n14', 'n15']
    made = []
    for w in which:
        res = globals()[w]()
        for path, p, w_, h_ in res:
            print(w, os.path.relpath(path, ROOT), f'{w_}x{h_}', 'pitch', p)
        made += [r[0] for r in res]
    preview([p for p in made if not os.path.basename(p)[:-4][-2:] in ('-0', '-1', '-2', '-3')])


if __name__ == '__main__':
    main()
