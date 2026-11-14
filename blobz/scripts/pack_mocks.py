#!/usr/bin/env python3
"""Art-pack comparison mocks for the board: docs/art-review/pack-A.png .. pack-D.png (390x844 phone views).

usage (from blobz/): python3 scripts/pack_mocks.py <dl_dir>
  <dl_dir> holds the unzipped review downloads (not vendored): Kenney_gameIcons/, kenney_board-game-icons/,
  lpc/ (LPC Base Assets, opengameart), zelda/ (ArMM1998 "Zelda-like tilesets and sprites", CC0), na/ (Ninja
  Adventure itch.io preview images: the pack zip itself could not be fetched from this environment).

Each mock: the meadow (house, trees, berry bush, rocks, water, 2 blobz at the pack's pixel grid, HUD from the pack)
and a dungeon strip with 3 enemies. World px ~ screen px (camera zoom ~0.9 on a 390 px phone).
"""
import json
import os
import random
import subprocess
import sys
from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
AS = os.path.join(ROOT, 'public', 'assets')
OUT = os.path.join(ROOT, 'docs', 'art-review')
DL = sys.argv[1] if len(sys.argv) > 1 else '.'
TMP = os.environ.get('TMPDIR', '/tmp')
W, H, MEADOW_H = 390, 844, 640
PLUM = (63, 38, 49, 255)


def sheet(path):
    return Image.open(path).convert('RGBA')


def tile(im, i, cols, size=16):
    return im.crop(((i % cols) * size, (i // cols) * size, (i % cols) * size + size, (i // cols) * size + size))


def up(im, k):
    return im.resize((round(im.width * k), round(im.height * k)), Image.NEAREST)


def trim(im):
    return im.crop(im.getbbox()) if im.getbbox() else im


def grid(parts):
    """Compose a list of rows of equal-size tiles into one image."""
    th, tw = parts[0][0].height, parts[0][0].width
    out = Image.new('RGBA', (tw * len(parts[0]), th * len(parts)))
    for r, row in enumerate(parts):
        for c, t in enumerate(row):
            out.alpha_composite(t, (c * tw, r * th))
    return out


# ---------------------------------------------------------------- blobz from the game's renderer
def blobs():
    mod = os.path.join(TMP, 'blob-packs.mjs')
    subprocess.run(['npx', 'esbuild', os.path.join(ROOT, 'src', 'blob.ts'), '--bundle', '--format=esm', f'--outfile={mod}',
                    '--log-level=error'], cwd=ROOT, check=True)
    looks = [{'color': 0x5ab4f0, 'shape': 0, 'eyes': 0, 'mouth': 1, 'hat': 0}, {'color': 0xff8fb0, 'shape': 1, 'eyes': 3, 'mouth': 0, 'hat': 0}]
    js = f"const {{ blobGrid }} = await import('{mod}'); console.log(JSON.stringify({json.dumps(looks)}.map((l) => blobGrid(l))));"
    grids = json.loads(subprocess.run(['node', '--input-type=module', '-e', js], capture_output=True, text=True, check=True).stdout)
    out = []
    for g in grids:
        im = Image.new('RGBA', (36, 48))
        for y, row in enumerate(g):
            for x, c in enumerate(row):
                if c:
                    v = tuple(int(c[i:i + 2], 16) for i in (1, 3, 5)) if c.startswith('#') else tuple(int(t) for t in c[4:-1].split(','))
                    im.putpixel((x, y), (*v, 255))
        out.append(trim(im))
    return out


def half(im):
    """Blob on a coarse 16 px-pack grid: 2x2 -> 1 (keeps the dark outline)."""
    w, h = im.width // 2, im.height // 2
    out = Image.new('RGBA', (w, h))
    for y in range(h):
        for x in range(w):
            px = [im.getpixel((2 * x + dx, 2 * y + dy)) for dx in (0, 1) for dy in (0, 1)]
            solid = [p for p in px if p[3]]
            if len(solid) < 2:
                continue
            dark = [p for p in solid if sum(p[:3]) < 200]
            out.putpixel((x, y), dark[0] if dark else max(set(solid), key=solid.count))
    return out


# ---------------------------------------------------------------- generic mock
def mock(label, kit, blob_imgs, path):
    im = Image.new('RGBA', (W, H), (0, 0, 0, 255))
    rnd = random.Random(5)
    g = kit['grass']
    for y in range(0, MEADOW_H, g[0].height):
        for x in range(0, W, g[0].width):
            v = rnd.random()
            im.alpha_composite(g[0] if v < 0.8 or len(g) == 1 else g[1] if v < 0.95 or len(g) == 2 else g[2], (x, y))
    def put(sprite, cx, by):
        im.alpha_composite(sprite, (int(cx - sprite.width / 2), int(by - sprite.height)))
    lake = kit['lake']
    im.alpha_composite(lake, (W - lake.width - 10, 70))
    put(kit['house'], 120, 330)
    t = kit['trees']
    put(t[0], 40, 200)
    put(t[1 % len(t)], 340, 360)
    put(t[0], 330, 470)
    put(t[1 % len(t)], 50, 560)
    put(kit['bush'], 240, 470)
    for (x, y), r in zip(((170, 560), (300, 600)), kit['rocks']):
        put(r, x, y)
    put(blob_imgs[0], 210, 400)
    put(blob_imgs[1], 140, 440)
    kit['hud'](im)
    # dungeon strip
    d = Image.new('RGBA', (W, H - MEADOW_H - 10))
    ft = kit['floor']
    for y in range(0, d.height, ft.height):
        for x in range(0, W, ft.width):
            d.alpha_composite(ft, (x, y))
    if kit.get('wall'):
        for x in range(0, W, kit['wall'].width):
            d.alpha_composite(kit['wall'], (x, 0))
    im.alpha_composite(d, (0, MEADOW_H + 10))
    base = H - 26
    im.alpha_composite(blob_imgs[0], (30, base - blob_imgs[0].height))
    for x, e in zip((140, 230, 320), kit['enemies']):
        im.alpha_composite(e, (int(x - e.width / 2), base - e.height))
    dr = ImageDraw.Draw(im)
    dr.rectangle((0, MEADOW_H, W, MEADOW_H + 10), fill=PLUM)
    dr.rounded_rectangle((6, MEADOW_H - 30, 6 + 9 * len(label) + 10, MEADOW_H - 6), 6, fill=(63, 38, 49, 220))
    dr.text((12, MEADOW_H - 27), label, fill=(255, 247, 230, 255), font_size=16)
    im.save(path)
    print(path)


def round_button(im, cx, cy, r, glyph, fill=(255, 138, 61, 255), shade=(200, 96, 40, 255)):
    d = ImageDraw.Draw(im)
    d.ellipse((cx - r, cy - r + 3, cx + r, cy + r + 3), fill=shade, outline=PLUM, width=2)
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=fill, outline=PLUM, width=2)
    if glyph is not None:
        im.alpha_composite(glyph, (int(cx - glyph.width / 2), int(cy - glyph.height / 2)))


def glyph_from(path, box, col=(255, 247, 230)):
    g = trim(sheet(path))
    g.thumbnail((box, box), Image.LANCZOS)
    a = g.getchannel('A').point(lambda v: 255 if v >= 120 else 0)
    out = Image.new('RGBA', g.size, (*col, 255))
    out.putalpha(a)
    return out


def no_icons(im, note):
    for cx, cy in ((26, 26), (320, 560), (360, 500)):
        round_button(im, cx, cy, 20 if cy < 100 else 26, None, fill=(150, 150, 150, 255), shade=(110, 110, 110, 255))
    ImageDraw.Draw(im).text((52, 18), note, fill=(255, 255, 255, 255), font_size=13)


# ---------------------------------------------------------------- A: Kenney Tiny family
def kit_kenney():
    town, battle, farm, dun = (sheet(os.path.join(AS, f'kenney-tiny-{n}', 'tilemap_packed.png')) for n in ('town', 'battle', 'farm', 'dungeon'))
    T = lambda s, i, cols=12: up(tile(s, i, cols), 2)  # noqa: E731
    G = os.path.join(DL, 'Kenney_gameIcons', 'PNG', 'White', '2x')
    B = os.path.join(DL, 'kenney_board-game-icons', 'PNG', 'Double (128px)')

    def hud(im):
        round_button(im, 26, 26, 20, glyph_from(os.path.join(G, 'arrowLeft.png'), 22, (63, 38, 49)), fill=(255, 247, 230, 255), shade=(226, 207, 178, 255))
        im.paste(Image.new('RGBA', (1, 1)), (0, 0))
        for k, n in enumerate(('suit_hearts', 'suit_hearts', 'suit_hearts')):
            im.alpha_composite(glyph_from(os.path.join(B, n + '.png'), 18, (230, 57, 70)), (60 + k * 22, 17))
        im.alpha_composite(T(town, 93), (W - 70, 10))
        ImageDraw.Draw(im).text((W - 36, 16), '12', fill=(255, 247, 230, 255), font_size=18, stroke_width=2, stroke_fill=PLUM)
        round_button(im, 330, 560, 30, glyph_from(os.path.join(B, 'sword.png'), 30))
        round_button(im, 360, 495, 20, glyph_from(os.path.join(B, 'fire.png'), 20))
    return {
        'grass': [T(town, 0), T(town, 1), T(town, 2)],
        'lake': grid([[T(battle, i, 18) for i in r] for r in ((18, 19, 19, 19, 20), (36, 37, 37, 37, 38), (54, 55, 55, 55, 56))]),
        'house': grid([[T(town, i) for i in r] for r in ((63, 53, 67), (64, 65, 66), (84, 86, 84))]),
        'trees': [T(town, 16), T(town, 28)],
        'bush': T(farm, 78), 'rocks': [T(farm, 89), T(farm, 77)],
        'enemies': [T(dun, 120), T(dun, 121), T(dun, 122)],
        'floor': T(dun, 48), 'wall': T(dun, 40), 'hud': hud,
    }


# ---------------------------------------------------------------- C: LPC base assets (32 px, scale 1)
def kit_lpc():
    L = os.path.join(DL, 'lpc', 'LPC Base Assets')
    S = lambda n: sheet(os.path.join(L, n))  # noqa: E731
    grass, water, house, top, trunk, rock = (S('tiles/' + n + '.png') for n in ('grass', 'water', 'house', 'treetop', 'trunk', 'rock'))
    floor = S('tiles/castlefloors.png').crop((0, 0, 32, 32))
    h = Image.new('RGBA', (96, 192))
    h.alpha_composite(house.crop((96, 96, 192, 192)), (0, 0))
    h.alpha_composite(house.crop((0, 0, 96, 96)), (0, 96))
    h.alpha_composite(house.crop((96, 0, 128, 48)), (32, 144))
    h.alpha_composite(house.crop((256, 10, 288, 52)), (2, 110))

    def tree(t):
        out = Image.new('RGBA', (96, t.height + 56))
        out.alpha_composite(trunk.crop((15, 0, 80, 72)), (15, t.height - 16))
        out.alpha_composite(t, (0, 0))
        return trim(out)
    mon = lambda n, box: trim(S('sprites/monsters/' + n + '.png').crop(box))  # noqa: E731
    return {
        'grass': [grass.crop((x, 160, x + 32, 192)) for x in (0, 32, 64)],
        'lake': water.crop((0, 64, 96, 160)),
        'house': trim(h),
        'trees': [tree(trim(top.crop((0, 0, 96, 96)))), tree(trim(top.crop((0, 96, 96, 192))))],
        'bush': trim(grass.crop((0, 0, 32, 32))), 'rocks': [trim(rock.crop((0, 0, 32, 32))), trim(rock.crop((32, 0, 64, 32)))],
        'enemies': [mon('slime', (0, 0, 32, 32)), mon('bat', (0, 0, 32, 32)), mon('ghost', (0, 0, 40, 46))],
        'floor': floor, 'hud': lambda im: no_icons(im, 'no icon/UI set in the pack'),
    }


def opaque_tile(im):
    """First fully opaque, not-too-dark 16 px tile of a sheet (a floor)."""
    for y in range(0, im.height, 16):
        for x in range(0, im.width, 16):
            t = im.crop((x, y, x + 16, y + 16))
            px = list(t.getdata())
            if all(p[3] == 255 for p in px) and sum(sum(p[:3]) for p in px) / len(px) > 200:
                return t
    return im.crop((0, 0, 16, 16))


# ---------------------------------------------------------------- D: ArMM1998 Zelda-like (16 px, scale 2)
def kit_zelda():
    Z = os.path.join(DL, 'zelda', 'gfx')
    ow, log, inner = (sheet(os.path.join(Z, n + '.png')) for n in ('Overworld', 'log', 'Inner'))
    C = lambda box: up(ow.crop(box), 2)  # noqa: E731
    return {
        'grass': [C((0, 0, 16, 16))],
        'lake': C((32, 96, 80, 144)),
        'house': trim(C((96, 0, 176, 80))),
        'trees': [trim(C((80, 256, 112, 290)))],
        'bush': trim(C((0, 224, 16, 240))), 'rocks': [trim(C((98, 82, 120, 100))), trim(C((124, 82, 150, 100)))],
        'enemies': [trim(up(log.crop((0, 0, 32, 32)), 2)), trim(up(log.crop((32, 32, 64, 64)), 2)), trim(up(log.crop((0, 64, 32, 96)), 2))],
        'floor': up(opaque_tile(sheet(os.path.join(Z, 'cave.png'))), 2), 'hud': lambda im: no_icons(im, 'no icon/UI set (font only)'),
    }


# ---------------------------------------------------------------- B: Ninja Adventure (official previews)
def ninja(blob_imgs, path):
    N = os.path.join(DL, 'na')
    im = Image.new('RGBA', (W, H), (34, 30, 38, 255))
    shot = sheet(os.path.join(N, 'p9.png'))  # forest village preview (pixel scale 4 -> 2 here)
    s = shot.crop((560, 0, 560 + 780, 0 + 1260 if shot.height >= 1260 else shot.height))
    s = s.resize((s.width // 2, s.height // 2), Image.NEAREST)
    im.alpha_composite(s.crop((0, 0, W, min(s.height, MEADOW_H - 160))), (0, 0))
    y = min(s.height, MEADOW_H - 160)
    mons = sheet(os.path.join(N, 'p15.png'))
    m = mons.resize((mons.width * W // mons.width, mons.height * W // mons.width), Image.NEAREST)
    im.alpha_composite(m, (0, y))
    icons = sheet(os.path.join(N, 'p12.png'))
    ic = icons.resize((W, icons.height * W // icons.width), Image.NEAREST)
    im.alpha_composite(ic.crop((0, 0, W, H - MEADOW_H - 10)), (0, MEADOW_H + 10))
    im.alpha_composite(blob_imgs[0], (180, 200))
    im.alpha_composite(blob_imgs[1], (130, 230))
    dr = ImageDraw.Draw(im)
    dr.rectangle((0, MEADOW_H, W, MEADOW_H + 10), fill=PLUM)
    lab = 'B  Ninja Adventure (official previews)'
    dr.rounded_rectangle((6, MEADOW_H - 30, 6 + 9 * len(lab) - 20, MEADOW_H - 6), 6, fill=(63, 38, 49, 220))
    dr.text((12, MEADOW_H - 27), lab, fill=(255, 247, 230, 255), font_size=16)
    im.save(path)
    print(path)


def main():
    bl = blobs()
    coarse = [up(half(b), 2) for b in bl]  # blob on a 16 px grid at scale 2
    fine = bl  # blob on a 32 px grid at scale 1
    mock('A  Kenney Tiny family (16 px)', kit_kenney(), coarse, os.path.join(OUT, 'pack-A.png'))
    ninja(coarse, os.path.join(OUT, 'pack-B.png'))
    mock('C  LPC base assets (32 px)', kit_lpc(), fine, os.path.join(OUT, 'pack-C.png'))
    mock('D  Zelda-like by ArMM1998 (16 px)', kit_zelda(), coarse, os.path.join(OUT, 'pack-D.png'))


if __name__ == '__main__':
    main()
