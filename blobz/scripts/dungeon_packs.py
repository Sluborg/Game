#!/usr/bin/env python3
"""Same-scale comparison of free 16 px dungeon packs vs our dungeon walls (N-34d stone, N-35 sand), each as a small
room corner (wall top edge, wall face, floor) next to our N-26 tree and a blob, all native pixels at 3x.

usage (from blobz/): python3 scripts/dungeon_packs.py <packs dir> -> docs/art-review/dungeon-packs.png
The packs are NOT vendored (Stefan's OK first); <packs dir> holds the downloaded sheets:
  0x72_dt2/0x72_DungeonTilesetII_v1.7.png, 0x72_dt1/sheet.png, tiny16/basictiles_2.png, dawnlike/{Wall,Floor}.png
"""
import os
import sys
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from blobz_v2_final import render  # noqa: E402

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
ART = os.path.join(ROOT, 'public', 'art')
NA = os.path.join(ROOT, 'public', 'assets', 'ninja-adventure', 'Backgrounds', 'Tilesets')
S = 3

# name, licence, link, {row: (sheet, x, y)} rows top edge / face / floor (None = pack has no such tile)
PACKS = [
    ('0x72 16x16 DungeonTileset II', 'CC0 (itch page)', '0x72.itch.io/dungeontileset-ii',
     ('0x72_dt2/0x72_DungeonTilesetII_v1.7.png', 32, 0), ('0x72_dt2/0x72_DungeonTilesetII_v1.7.png', 32, 16),
     ('0x72_dt2/0x72_DungeonTilesetII_v1.7.png', 16, 64)),
    ('0x72 16x16 Dungeon Tileset (v1)', 'CC0 (itch page)', '0x72.itch.io/16x16-dungeon-tileset',
     ('0x72_dt1/sheet.png', 16, 0), ('0x72_dt1/sheet.png', 16, 16), ('0x72_dt1/sheet.png', 32, 48)),
    ('Tiny 16: Basic (Lanea Zimmerman)', 'CC-BY 3.0/4.0 / OGA-BY 3.0, credit needed', 'opengameart.org/content/tiny-16-basic',
     None, ('tiny16/basictiles_2.png', 0, 0), ('tiny16/basictiles_2.png', 16, 144)),
    ('DawnLike v1.81 (DragonDePlatino)', 'CC-BY 4.0, credit + DawnBringer', 'opengameart.org/content/dawnlike-16x16-universal-rogue-like-tileset-v181',
     None, ('dawnlike/Wall.png', 16, 96), ('dawnlike/Floor.png', 16, 112)),
]


def tile(packs, spec):
    f, x, y = spec
    return Image.open(os.path.join(packs, f)).convert('RGBA').crop((x, y, x + 16, y + 16))


def ours():
    d = os.path.join(ART, 'dungeon')
    fl = Image.open(os.path.join(NA, 'Interior', 'TilesetInteriorFloor.png')).convert('RGBA').crop((192, 208, 208, 224))
    sfl = Image.open(os.path.join(NA, 'TilesetFloor.png')).convert('RGBA').crop((128, 16, 144, 32))
    return [('OURS: N-34d stone walls (ChatGPT)', 'own (ChatGPT)', 'in repo', None,
             Image.open(os.path.join(d, 'wall-t.png')).convert('RGBA'), fl),
            ('OURS: N-35 sandstone (ChatGPT)', 'own (ChatGPT)', 'in repo', None,
             Image.open(os.path.join(d, 'sand-t.png')).convert('RGBA'), sfl)]


def main(packs):
    rows = ours() + [(n, lic, url, *(tile(packs, s) if s else None for s in specs)) for n, lic, url, *specs in PACKS]
    tree = Image.open(os.path.join(ART, 'props', 'tree-round.png')).convert('RGBA')
    tree = tree.crop(tree.getbbox())
    blob = render([{'look': {'color': 0x5ec8ff, 'shape': 0, 'eyes': 0, 'mouth': 0, 'hat': 0}}])[0]
    blob = blob.crop(blob.getbbox())
    PH, W = 80, 136  # native panel: 4x4 tiles room corner + tree + blob
    panels = []
    for name, lic, url, top, face, floor in rows:
        im = Image.new('RGBA', (W, PH), (20, 27, 27, 255))
        y = 0
        for x in range(4):
            if top is not None:
                im.alpha_composite(top, (x * 16, 0))
        y = 16 if top is not None else 0
        for x in range(4):
            im.alpha_composite(floor, (x * 16, y + 16))
            im.alpha_composite(floor, (x * 16, y + 32))
            if y + 48 < PH:
                im.alpha_composite(floor, (x * 16, y + 48))
            im.alpha_composite(face, (x * 16, y))
        im.alpha_composite(tree, (70, PH - 4 - tree.height))
        im.alpha_composite(blob, (70 + tree.width + 4, PH - 4 - blob.height))
        big = im.resize((W * S, PH * S), Image.NEAREST)
        lab = Image.new('RGBA', (W * S, 54), (20, 27, 27, 255))
        d = ImageDraw.Draw(lab)
        d.text((8, 4), name, fill='white', font_size=15)
        d.text((8, 22), lic, fill='#ffe18d', font_size=12)
        d.text((8, 37), url, fill='#9fd3ff', font_size=11)
        p = Image.new('RGBA', (W * S, PH * S + 54))
        p.paste(lab, (0, 0))
        p.paste(big, (0, 54))
        panels.append(p)
    head = Image.new('RGBA', (W * S, 50), (10, 14, 14, 255))
    ImageDraw.Draw(head).text((8, 6), 'Dungeon packs vs ours, same scale (native px, 3x)', fill='white', font_size=17)
    ImageDraw.Draw(head).text((8, 28), 'wall top edge + face + floor, N-26 tree + blob', fill='#ffe18d', font_size=13)
    out = Image.new('RGBA', (W * S, 50 + sum(p.height + 6 for p in panels)), (10, 14, 14, 255))
    out.paste(head, (0, 0))
    y = 50
    for p in panels:
        out.paste(p, (0, y))
        y += p.height + 6
    out.save(os.path.join(ROOT, 'docs', 'art-review', 'dungeon-packs.png'))
    print('docs/art-review/dungeon-packs.png', out.size)


if __name__ == '__main__':
    main(sys.argv[1])
