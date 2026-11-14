#!/usr/bin/env python3
"""Render 3 style-direction mockups of the same meadow scene (390x844 phone portrait, at 2x).

usage (from blobz/): python3 scripts/style_mockups.py   -> docs/art-review/style-A.png, style-B.png, style-C.png

A "polished current": today's sprites and palette, one consistent pixel size (3 px per art px), dirt-yard ring.
B "cozy storybook": warmer palette, soft grass with flowers and a dirt path, bigger items with a light glow,
  stone-circle ring, soft shadows.
C "chunky bold": thicker outlines, fewer colours, high contrast, flat bright grass, picket-fence ring with flowers.
Only a look test: nothing here is used by the game.
"""
import json
import os
import random
import subprocess
import sys
from PIL import Image, ImageEnhance

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
ART = os.path.join(ROOT, 'public', 'art')
OUT = os.path.join(ROOT, 'docs', 'art-review')
TMP = os.environ.get('TMPDIR', '/tmp')

W, H = 780, 1688  # physical px (390x844 at 2x)
PX = 6            # physical px per art px for the world (3 logical px)
PLUM = (63, 38, 49, 255)


def load(rel):
    return Image.open(os.path.join(ART, rel)).convert('RGBA')


def frame(im, i, fw):
    return im.crop((i * fw, 0, (i + 1) * fw, im.height))


def blob_png(look):
    """Render a blob with the game's own blob.ts (bundled with esbuild, run in node)."""
    mod = os.path.join(TMP, 'blob-mock.mjs')
    subprocess.run(['npx', 'esbuild', os.path.join(ROOT, 'src', 'blob.ts'), '--bundle', '--format=esm',
                    f'--outfile={mod}', '--log-level=error'], cwd=ROOT, check=True)
    js = f"const {{ blobGrid }} = await import('{mod}'); console.log(JSON.stringify(blobGrid({json.dumps(look)})));"
    grid = json.loads(subprocess.run(['node', '--input-type=module', '-e', js], capture_output=True, text=True, check=True).stdout)
    im = Image.new('RGBA', (36, 48))
    for y, row in enumerate(grid):
        for x, c in enumerate(row):
            if c:
                v = tuple(int(c[i:i + 2], 16) for i in (1, 3, 5)) if c.startswith('#') else tuple(int(t) for t in c[4:-1].split(','))
                im.putpixel((x, y), (*v, 255))
    return im


# ---------------------------------------------------------------- sprite treatments
def is_plum(p):
    return p[3] and p[0] < 90 and p[1] < 70 and p[2] < 80


def warm(im):
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a and not is_plum(px[x, y]):
                if g > r and g > b:  # greens towards a sunny yellow-green
                    r += 18
                px[x, y] = (min(255, int(r * 1.05) + 6), min(255, int(g * 1.02)), int(b * 0.88), a)
    return im


def bold(im, colors=8):
    """Fewer colours, more contrast and a 2 px outline."""
    alpha = im.getchannel('A')
    rgb = ImageEnhance.Contrast(ImageEnhance.Color(im.convert('RGB')).enhance(1.35)).enhance(1.15)
    q = rgb.quantize(colors=colors, method=Image.Quantize.MEDIANCUT).convert('RGB')
    out = Image.new('RGBA', (im.width + 2, im.height + 2))
    base = q.convert('RGBA')
    base.putalpha(alpha)
    a = out.load()
    src = base.load()
    for y in range(im.height):  # thick outline: plum wherever a neighbour of an opaque pixel is empty
        for x in range(im.width):
            if src[x, y][3]:
                for dx in (-1, 0, 1):
                    for dy in (-1, 0, 1):
                        a[x + 1 + dx, y + 1 + dy] = PLUM
    for y in range(im.height):
        for x in range(im.width):
            if src[x, y][3] and not is_plum(src[x, y]):
                a[x + 1, y + 1] = src[x, y]
    return out


def glow(im):
    """1 art-px cream halo around an item so it pops off the grass."""
    out = Image.new('RGBA', (im.width + 2, im.height + 2))
    a, src = out.load(), im.load()
    for y in range(im.height):
        for x in range(im.width):
            if src[x, y][3]:
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    a[x + 1 + dx, y + 1 + dy] = (255, 247, 230, 255)
    out.alpha_composite(im, (1, 1))
    return out


# ---------------------------------------------------------------- ground and ring (drawn on the art grid)
GW, GH = W // PX + 1, H // PX + 1
BX, BY, BR = 65, 120, 27  # base yard centre and radius in art px


def ground(style):
    rnd = random.Random(7)
    g = Image.new('RGBA', (GW, GH), {'A': (108, 191, 69), 'B': (132, 196, 84), 'C': (96, 206, 72)}[style] + (255,))
    px = g.load()
    if style == 'A':  # small tufts like in the game
        for _ in range(260):
            x, y = rnd.randrange(GW - 2), rnd.randrange(GH - 2)
            px[x, y] = px[x + 1, y - 1 if y else y] = (92, 170, 58, 255)
    elif style == 'B':  # soft lighter patches, flowers, a dirt path south from the base
        for _ in range(26):
            cx, cy, r = rnd.randrange(GW), rnd.randrange(GH), rnd.randrange(4, 9)
            for y in range(cy - r, cy + r):
                for x in range(cx - r * 2, cx + r * 2):
                    if 0 <= x < GW and 0 <= y < GH and ((x - cx) / 2) ** 2 + (y - cy) ** 2 <= r * r:
                        px[x, y] = (146, 206, 96, 255)
        for y in range(BY, GH):
            wob = int(2 * __import__('math').sin(y / 9))
            for x in range(BX - 4 + wob, BX + 5 + wob):
                px[x, y] = (214, 172, 118, 255) if abs(x - BX - wob) < 4 else (190, 146, 96, 255)
        for _ in range(90):
            x, y = rnd.randrange(GW), rnd.randrange(GH)
            if abs(x - BX) > 6:
                px[x, y] = rnd.choice([(255, 255, 255, 255), (255, 214, 92, 255), (255, 150, 170, 255)])
    else:  # C: flat with a few big blades
        for _ in range(70):
            x, y = rnd.randrange(GW - 3), rnd.randrange(3, GH)
            for k in range(3):
                px[x + k // 2, y - k] = (70, 170, 52, 255)
    return g


def ring(style, g):
    px = g.load()
    d2 = lambda x, y: ((x + 0.5 - BX) ** 2 + ((y + 0.5 - BY) * 1.25) ** 2) ** 0.5  # slight 3/4 squash
    for y in range(BY - BR - 4, BY + BR + 4):
        for x in range(BX - BR - 4, BX + BR + 5):
            d = d2(x, y)
            if style == 'A':
                if d <= BR:
                    px[x, y] = (226, 178, 122, 255) if d < BR - 2 else (196, 146, 96, 255)
                elif d <= BR + 1:
                    px[x, y] = PLUM
            elif style == 'B':
                if d <= BR:
                    px[x, y] = (232, 196, 140, 255)
            else:
                if d <= BR:
                    px[x, y] = (236, 196, 120, 255)
    return g


def ring_props(style):
    """Sprites placed around the yard edge: stones (B) or a picket fence with flowers (C). (x, y, image)"""
    import math
    out = []
    if style == 'B':
        for i in range(26):
            a = i / 26 * 2 * math.pi
            x, y = BX + (BR + 1) * math.cos(a), BY + (BR + 1) / 1.25 * math.sin(a)
            st = Image.new('RGBA', (4, 3))
            for (sx, sy) in ((1, 0), (2, 0), (0, 1), (1, 1), (2, 1), (3, 1), (1, 2), (2, 2)):
                st.putpixel((sx, sy), (176, 172, 180, 255) if sy < 2 else (126, 120, 132, 255))
            out.append((x - 2, y - 1, outline1(st)))
    elif style == 'C':
        for i in range(30):
            a = i / 30 * 2 * math.pi
            if math.sin(a) > 0.82 and abs(math.cos(a)) < 0.3:
                continue  # gap for the entrance at the front
            x, y = BX + (BR + 1) * math.cos(a), BY + (BR + 1) / 1.25 * math.sin(a)
            post = Image.new('RGBA', (2, 5), (255, 255, 255, 255))
            out.append((x - 1, y - 4, outline1(post)))
            if i % 3 == 0:
                fl = Image.new('RGBA', (3, 3))
                for (fx, fy) in ((1, 0), (0, 1), (2, 1), (1, 2)):
                    fl.putpixel((fx, fy), (255, 120, 160, 255))
                fl.putpixel((1, 1), (255, 214, 60, 255))
                out.append((x - 1, y + 1, fl))
    return out


def outline1(im):
    out = Image.new('RGBA', (im.width + 2, im.height + 2))
    a, src = out.load(), im.load()
    for y in range(im.height):
        for x in range(im.width):
            if src[x, y][3]:
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    a[x + 1 + dx, y + 1 + dy] = PLUM
    out.alpha_composite(im, (1, 1))
    return out


# ---------------------------------------------------------------- scene
def scene(style, blobs):
    treat = {'A': lambda im: im, 'B': warm, 'C': bold}[style]
    g = ring(style, ground(style))
    world = g.resize((GW * PX, GH * PX), Image.NEAREST)
    items = []  # (foot_y_physical, x_phys, y_phys_top, image)

    def put(im, ax, ay, scale=PX, foot=None):
        """Anchor bottom centre at art-grid (ax, ay)."""
        big = im.resize((im.width * scale, im.height * scale), Image.NEAREST)
        x = int(ax * PX - big.width / 2) // (scale) * scale
        y = int(ay * PX - big.height)
        items.append((foot if foot is not None else ay * PX, x, y, big))

    def shadow(ax, ay, rw):
        if style == 'C':
            col, rh = (40, 90, 30, 110), 0.38
        else:
            col, rh = (0, 0, 0, 46 if style == 'B' else 38), 0.32
        sh = Image.new('RGBA', (rw * 2 * PX, int(rw * 2 * rh) * PX + PX))
        p = sh.load()
        for y in range(sh.height):
            for x in range(sh.width):
                if ((x - sh.width / 2) / (sh.width / 2)) ** 2 + ((y - sh.height / 2) / (sh.height / 2)) ** 2 <= 1:
                    p[x, y] = col
        items.append((-1, int(ax * PX - sh.width / 2), int(ay * PX - sh.height / 2), sh))

    big_item = 8 if style == 'B' else PX
    item_fx = glow if style == 'B' else (lambda im: im)
    for name, ax, ay in (('props/tree-green.png', 20, 52), ('props/tree-orange.png', 110, 58), ('props/tree-pine.png', 112, 238),
                         ('props/tree-green.png', 16, 246)):
        shadow(ax, ay - 1, 8)
        put(treat(load(name)), ax, ay)
    shadow(28, 200, 5)
    put(treat(load('props/rock.png')), 28, 200)
    shadow(98, 196, 7)
    put(treat(load('gather/bush-berries.png')), 98, 196)
    put(treat(load('props/stump.png')), 104, 104)
    for name, ax, ay in (('icons/log.png', 80, 176), ('gather/item-stone.png', 46, 222), ('gather/item-berries.png', 86, 216)):
        im = item_fx(treat(load(name)))
        put(im, ax, ay, scale=big_item)
    for (rx, ry, im) in ring_props(style):  # yard edge: stones (B) or picket fence + flowers (C)
        big = im.resize((im.width * PX, im.height * PX), Image.NEAREST)
        items.append(((ry + im.height) * PX, int(rx * PX), int(ry * PX), big))
    # cottage on the yard
    put(treat(load('base/cottage-1.png')), BX, BY + 10)
    # blobs (fine pixels: half the world pixel size), the first holds an axe
    axe = frame(load('gather/tool-axe.png'), 1, 44)
    for i, (look, ax, ay) in enumerate(blobs):
        b = Image.new('RGBA', (80, 56))
        b.alpha_composite(look, (0, 4))
        if i == 0:
            b.alpha_composite(axe, (17, 0 + 4 - 5 + 5))
        bt = b  # blobs are drawn by blob.ts in every direction
        shadow(ax, ay, 5)
        put(bt, ax + 3.3, ay + 1, scale=PX // 2)
    items.sort(key=lambda t: t[0])
    for _, x, y, im in items:
        world.alpha_composite(im, (max(0, x), max(0, y)) if x >= 0 and y >= 0 else (x, y)) if x >= 0 and y >= 0 else paste_clip(world, im, x, y)
    hud(style, world)
    return world.crop((0, 0, W, H))


def paste_clip(dst, im, x, y):
    box = (max(0, -x), max(0, -y), im.width, im.height)
    dst.alpha_composite(im.crop(box), (max(0, x), max(0, y)))


def nine(im, w, h, b):
    """Nine-slice an image to w x h (art px) with border b."""
    out = Image.new('RGBA', (w, h))
    sw, sh = im.size
    cols = [(0, b, 0, b), (b, sw - b, b, w - b), (sw - b, sw, w - b, w)]
    rows = [(0, b, 0, b), (b, sh - b, b, h - b), (sh - b, sh, h - b, h)]
    for (sx0, sx1, dx0, dx1) in cols:
        for (sy0, sy1, dy0, dy1) in rows:
            part = im.crop((sx0, sy0, sx1, sy1)).resize((dx1 - dx0, dy1 - dy0), Image.NEAREST)
            out.alpha_composite(part, (dx0, dy0))
    return out


def hud(style, world):
    """Quest card at the top: 3 resource icons with progress bars and stars."""
    s = 4  # HUD art px size (physical)
    card = nine(load('gather/quest-card.png'), 80, 40, 6)
    if style == 'B':
        card = warm(card)
    elif style == 'C':
        card = bold(card, colors=5)
    cx, cy = (W - card.width * s) // 2, 40
    big = card.resize((card.width * s, card.height * s), Image.NEAREST)
    world.alpha_composite(big, (cx, cy))
    fill = load('gather/bar-fill-green.png')
    frame_ = load('gather/daybar-frame.png')
    for i, (icon, prog, done) in enumerate((('hud-wood.png', 1.0, True), ('hud-stone.png', 0.6, False), ('hud-berries.png', 0.25, False))):
        y = cy + (9 + i * 9) * s
        ic = load('gather/' + icon)
        if style == 'C':
            ic = bold(ic, 4)
        world.alpha_composite(ic.resize((ic.width * s, ic.height * s), Image.NEAREST), (cx + 6 * s, y))
        fr = frame_.resize((44, 8))
        fr = nine(frame_, 44, 8, 3)
        world.alpha_composite(fr.resize((fr.width * s, fr.height * s), Image.NEAREST), (cx + 18 * s, y))
        f = fill.crop((0, 0, max(1, int(42 * prog)), 6))
        world.alpha_composite(f.resize((f.width * s, f.height * s), Image.NEAREST), (cx + 19 * s, y + s))
        st = load('gather/star.png' if done else 'gather/star-empty.png')
        if style == 'C':
            st = bold(st, 4)
        world.alpha_composite(st.resize((st.width * s // 1, st.height * s // 1), Image.NEAREST), (cx + 64 * s, y - 2 * s))


def main():
    os.makedirs(OUT, exist_ok=True)
    blobs = [(blob_png({'color': 0x5ec8ff, 'shape': 0, 'eyes': 0, 'mouth': 1, 'hat': 1}), 52, 186),
             (blob_png({'color': 0xff6b8b, 'shape': 1, 'eyes': 6, 'mouth': 0, 'hat': 5}), 74, 168)]
    blobs = [(im, x, y) for im, x, y in blobs]
    for style in 'ABC':
        im = scene(style, blobs)
        path = os.path.join(OUT, f'style-{style}.png')
        im.save(path)
        print(path, im.size)


if __name__ == '__main__':
    main()
