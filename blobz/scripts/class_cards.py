#!/usr/bin/env python3
"""Two class-card style variants (48x64) for the decision board: A "blob in action", B "big symbol".

usage (from blobz/): python3 scripts/class_cards.py
  -> docs/art-review/class-cards-A.png, class-cards-B.png (4 cards side by side, 4x) and the single cards in
     docs/art-review/class-cards/. Roles: Präst = healing, Krigare = melee, Riddare = shield, Bågskytt = crossbow.
No humans: every card shows a blob or a symbol.
"""
import json
import os
import subprocess
import sys
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base_art as ba  # noqa: E402
import dungeon_art as da  # noqa: E402
import gather_art as ga  # noqa: E402
from fx_sheet import Canvas  # noqa: E402

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'docs', 'art-review')
DUN = os.path.join(ROOT, 'public', 'art', 'dungeon')
TMP = os.environ.get('TMPDIR', '/tmp')

CLASSES = ['prast', 'krigare', 'riddare', 'bagskytt']
COL = da.CLASS_COLORS
HEALG = (ba.rgb(98, 196, 88), ba.rgb(190, 240, 160), ba.rgb(62, 140, 66))


def blobs():
    """Class blobs rendered by the game's blob.ts (class hat where the class has one)."""
    mod = os.path.join(TMP, 'blob-cards.mjs')
    subprocess.run(['npx', 'esbuild', os.path.join(ROOT, 'src', 'blob.ts'), '--bundle', '--format=esm',
                    f'--outfile={mod}', '--log-level=error'], cwd=ROOT, check=True)
    looks = {
        'prast': ({'color': 0xf2f2f2, 'shape': 0, 'eyes': 3, 'mouth': 1, 'hat': 0}, 0),
        'krigare': ({'color': 0xff9248, 'shape': 1, 'eyes': 8, 'mouth': 6, 'hat': 10}, None),
        'riddare': ({'color': 0x3d6bff, 'shape': 5, 'eyes': 0, 'mouth': 5, 'hat': 0}, 2),
        'bagskytt': ({'color': 0x7ddc5a, 'shape': 4, 'eyes': 10, 'mouth': 1, 'hat': 0}, 1),
    }
    js = (f"const {{ blobGrid }} = await import('{mod}'); const L = {json.dumps(looks)};"
          "const o = {}; for (const k in L) o[k] = blobGrid(L[k][0], L[k][1] ?? undefined); console.log(JSON.stringify(o));")
    grids = json.loads(subprocess.run(['node', '--input-type=module', '-e', js], capture_output=True, text=True, check=True).stdout)
    out = {}
    for k, grid in grids.items():
        im = Image.new('RGBA', (36, 48))
        for y, row in enumerate(grid):
            for x, c in enumerate(row):
                if c:
                    v = tuple(int(c[i:i + 2], 16) for i in (1, 3, 5)) if c.startswith('#') else tuple(int(t) for t in c[4:-1].split(','))
                    im.putpixel((x, y), (*v, 255))
        out[k] = im.crop(im.getbbox())
    return out


def frame(name, i):
    im = Image.open(os.path.join(DUN, name)).convert('RGBA')
    fw = 44
    return im.crop((i * fw, 0, (i + 1) * fw, im.height))


def card_base(cls, parchment=True):
    c = Canvas(48, 64)
    mat = da.PARCH if parchment else COL[cls]
    body = ba.rect(1, 2, 46, 61) | ba.rect(2, 1, 45, 62)
    ba.comp(c, body, ba.shaded(mat))
    ring = {(x, y) for x in range(4, 44) for y in (4, 59)} | {(x, y) for y in range(4, 60) for x in (4, 43)}
    ba.comp(c, ring, mat[2] if parchment else mat[1], outline=False)
    return c.image()


def ribbon(im, cls):
    rb = Canvas(48, 64)
    r = COL[cls]
    ba.comp(rb, ba.rect(6, 50, 41, 56), ba.shaded(r))
    ba.comp(rb, ba.poly([(2, 49), (7, 49), (7, 58), (4.5, 55.5), (2, 58)]), r[2])
    ba.comp(rb, ba.poly([(41, 49), (46, 49), (46, 58), (43.5, 55.5), (41, 58)]), r[2])
    im.alpha_composite(rb.image())
    return im


def sparkles(pts, mat):
    c = Canvas(48, 64)
    for (x, y, big) in pts:
        if big:  # plus
            ba.comp(c, ba.rect(x - 1, y - 3, x, y + 3) | ba.rect(x - 3, y - 1, x + 3, y), mat[0])
        else:
            ba.comp(c, {(x, y - 1), (x - 1, y), (x, y), (x + 1, y), (x, y + 1)}, mat[1])
    return c.image()


# ---------------------------------------------------------------- A: blob in action
def card_a(cls, b):
    im = card_base(cls)
    scene = Image.new('RGBA', (48, 64))
    bx, by = 3, 46 - b.height  # blob stands on the ribbon line
    if cls == 'prast':
        scene.alpha_composite(b, (bx + 1, by + 2))
        scene.alpha_composite(frame('gear-staff.png', 0), (bx + 13, by - 12))
        scene.alpha_composite(sparkles([(11, 10, True), (22, 8, False), (7, 20, False), (40, 30, False)], HEALG))
        heart = Canvas(48, 64)
        ba.comp(heart, da.heart_pts(36, 10, 3.2), ba.shaded(HEALG))
        scene.alpha_composite(heart.image())
    elif cls == 'krigare':
        sw = Image.open(os.path.join(DUN, 'fx-spin.png')).convert('RGBA').crop((0, 0, 48, 40))
        scene.alpha_composite(sw, (8, by - 16))  # swoosh behind the blob
        scene.alpha_composite(b, (bx - 1, by + 2))
        scene.alpha_composite(frame('weapon-sword.png', 0), (bx + 12, by - 12))
    elif cls == 'riddare':
        scene.alpha_composite(b, (bx + 2, by))
        sh = da.shield_img()
        big = sh.resize((sh.width * 2, sh.height * 2), Image.NEAREST)
        scene.alpha_composite(big, (48 - big.width - 3, 48 - big.height - 3))
    else:  # bagskytt: aiming the crossbow, bolt flying out to the right
        scene.alpha_composite(b, (bx - 1, by + 2))
        xb = frame('gear-crossbow.png', 1)
        scene.alpha_composite(xb, (bx - 1 + 13, by + 2 - 3))
        bolt = Canvas(48, 64)
        ba.comp(bolt, ba.rect(36, 18, 42, 18) | ba.poly([(42, 16), (45.5, 18.5), (42, 21)]), ba.STONE[1])
        ba.comp(bolt, ba.rect(28, 16, 33, 16) | ba.rect(26, 20, 32, 20), ba.SMOKE[1], outline=False)
        scene.alpha_composite(bolt.image())
    # keep the picture inside the card frame
    mask = Image.new('L', (48, 64), 0)
    mask.paste(255, (5, 5, 43, 49))
    clipped = Image.new('RGBA', (48, 64))
    clipped.paste(scene, (0, 0), Image.composite(scene.getchannel('A'), Image.new('L', (48, 64), 0), mask))
    im.alpha_composite(clipped)
    return ribbon(im, cls)


# ---------------------------------------------------------------- B: one big symbol on the class colour
def card_b(cls):
    im = card_base(cls, parchment=False)
    c = Canvas(48, 64)
    if cls == 'prast':
        ba.comp(c, da.heart_pts(24, 24, 8), ba.shaded(HEALG))
        ba.comp(c, ba.rect(22, 18, 25, 33) | ba.rect(16, 24, 31, 27), da.CREAM)
    elif cls == 'krigare':
        for sgn in (1, -1):
            blade = {(24 + sgn * (k - 12) + d, 12 + k) for k in range(26) for d in (-1, 0, 1)}
            ba.comp(c, {p for p in blade if p[1] < 32}, ba.STONE[1])
            ba.comp(c, {p for p in blade if 34 <= p[1] < 38}, ba.WOOD[0])
            ba.comp(c, {(24 + sgn * (k - 12) + d, 12 + k) for k in (20, 21) for d in range(-3, 4)}, da.GOLD[0])
    elif cls == 'riddare':
        sh = da.shield_img()
        im2 = c.image()
        big = sh.resize((sh.width * 2, sh.height * 2), Image.NEAREST)
        im.alpha_composite(big, ((48 - big.width) // 2, 8))
    else:
        xb = ga.tool_frame(da.crossbow(5, True), -35, size=(48, 48), pivot=(10, 36), scale=1.6)
        im.alpha_composite(xb, (0, 0))
    im.alpha_composite(c.image())
    strip_ = Canvas(48, 64)
    ba.comp(strip_, ba.rect(6, 50, 41, 56), ba.shaded((COL[cls][2], COL[cls][0], COL[cls][2])))
    im.alpha_composite(strip_.image())
    return im


def sheet(cards, path, scale=4, pad=12):
    w = len(cards) * (48 * scale + pad) + pad
    out = Image.new('RGBA', (w, 64 * scale + 2 * pad), (74, 60, 70, 255))
    for i, im in enumerate(cards):
        out.alpha_composite(im.resize((48 * scale, 64 * scale), Image.NEAREST), (pad + i * (48 * scale + pad), pad))
    out.save(path)
    print(path, out.size)


def main():
    b = blobs()
    os.makedirs(os.path.join(OUT, 'class-cards'), exist_ok=True)
    a = [card_a(cls, b[cls]) for cls in CLASSES]
    bb = [card_b(cls) for cls in CLASSES]
    for cls, ia, ib in zip(CLASSES, a, bb):
        ia.save(os.path.join(OUT, 'class-cards', f'A-{cls}.png'))
        ib.save(os.path.join(OUT, 'class-cards', f'B-{cls}.png'))
    sheet(a, os.path.join(OUT, 'class-cards-A.png'))
    sheet(bb, os.path.join(OUT, 'class-cards-B.png'))


if __name__ == '__main__':
    main()
