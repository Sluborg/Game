#!/usr/bin/env python3
"""Board option sheets: every Ninja Adventure candidate for the WOOD, FOOD and STONE resource icons (plan step 2).

usage (from blobz/): python3 scripts/res_options.py  -> docs/art-review/res-wood.png, res-food.png, res-stone.png
Each candidate is numbered, drawn at 3x (integer, nearest) on the game's Ninja grass, with its source file + rect.
Rules (Stefan): wood = logs/planks, not a branch; food = never Items/Food/Nut2.png (forbidden art); stone = a clean
single rock or ore, nothing with an extra mini stone beside it.
"""
import os
from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
NA = os.path.join(ROOT, 'public', 'assets', 'ninja-adventure')
OUT = os.path.join(ROOT, 'docs', 'art-review')
T = 'Backgrounds/Tilesets/'
S = 3

WOOD = [
    (T + 'tileset_camp.png', (0, 0, 32, 16), 'log, brown'),
    (T + 'tileset_camp.png', (32, 0, 32, 16), 'log, birch'),
    (T + 'tileset_camp.png', (16, 32, 32, 16), 'log, lying'),
    (T + 'tileset_camp.png', (48, 16, 16, 32), 'log, upright'),
    (T + 'tileset_camp.png', (0, 16, 48, 32), 'wood pile'),
    (T + 'TilesetNature.png', (80, 128, 16, 16), 'small log'),
    (T + 'TilesetNature.png', (192, 224, 32, 32), 'logs, upright pair'),
    (T + 'TilesetNature.png', (64, 208, 16, 16), 'log end (stump top)'),
    (T + 'TilesetNature.png', (80, 208, 16, 16), 'log end, light'),
    (T + 'TilesetWater.png', (0, 240, 64, 16), 'planks, strip'),
    (T + 'TilesetWater.png', (48, 192, 16, 48), 'planks, vertical'),
]
FOOD = sorted(f for f in os.listdir(os.path.join(NA, 'Items', 'Food')) if f.endswith('.png') and f != 'Nut2.png')
STONE = [
    (T + 'TilesetNature.png', (240, 144, 16, 16), 'rock, brown small'),
    (T + 'TilesetNature.png', (288, 144, 16, 16), 'rock, grey small'),
    (T + 'TilesetNature.png', (208, 128, 32, 32), 'boulder, brown'),
    (T + 'TilesetNature.png', (256, 128, 32, 32), 'boulder, grey'),
    (T + 'TilesetNature.png', (0, 192, 32, 32), 'boulder, teal'),
    (T + 'TilesetNature.png', (96, 192, 16, 16), 'rock, teal a'),
    (T + 'TilesetNature.png', (112, 192, 16, 16), 'rock, teal b'),
    (T + 'TilesetNature.png', (128, 192, 16, 16), 'rock, teal c'),
] + [(T + 'TilesetNature.png', (x, y, 16, 16), f'ore rock {c} {i + 1}') for y, c in ((224, 'grey'), (240, 'brown'), (256, 'blue'), (272, 'orange'))
     for i, x in enumerate((64, 80, 96))] + [
    (T + 'TilesetNature.png', (112, 224, 32, 32), 'ore boulder, grey'),
    (T + 'TilesetNature.png', (144, 224, 32, 32), 'ore boulder, brown'),
    (T + 'TilesetNature.png', (112, 256, 32, 32), 'ore boulder, blue'),
    (T + 'TilesetNature.png', (144, 256, 32, 32), 'ore boulder, orange'),
]


def crop(path, rect):
    im = Image.open(os.path.join(NA, path)).convert('RGBA')
    if rect:
        x, y, w, h = rect
        im = im.crop((x, y, x + w, y + h))
    bb = im.getbbox()
    return im.crop(bb) if bb else im


def sheet(title, items, out, cols=6):
    grass = Image.open(os.path.join(NA, T + 'TilesetFloor.png')).convert('RGBA').crop((0, 192, 16, 192 + 16))
    cw, ch = 220, 210
    rows = (len(items) + cols - 1) // cols
    W, H = cols * cw + 20, rows * ch + 60
    im = Image.new('RGBA', (W, H))
    for y in range(0, H, 16 * S):
        for x in range(0, W, 16 * S):
            im.alpha_composite(grass.resize((16 * S, 16 * S), Image.NEAREST), (x, y))
    d = ImageDraw.Draw(im)
    d.rectangle((0, 0, W, 44), fill=(20, 27, 27, 230))
    d.text((12, 10), title, fill='white', font_size=22)
    for i, (spr, label, src) in enumerate(items):
        x, y = 10 + (i % cols) * cw, 54 + (i // cols) * ch
        big = spr.resize((spr.width * S, spr.height * S), Image.NEAREST)
        im.alpha_composite(big, (x + (cw - big.width) // 2, y + 8 + max(0, (130 - big.height) // 2)))
        d.rounded_rectangle((x + 4, y + 146, x + cw - 12, y + 200), 6, fill=(20, 27, 27, 200))
        d.text((x + 10, y + 148), f'{i + 1}. {label}', fill='#ffe18d', font_size=16)
        d.text((x + 10, y + 172), src, fill='white', font_size=11)
    im.save(os.path.join(OUT, out))
    print(out, len(items))


def main():
    w = [(crop(p, r), lab, f'{os.path.basename(p)} {r[0]},{r[1]},{r[2]},{r[3]}') for p, r, lab in WOOD]
    sheet('WOOD: Ninja Adventure candidates (3x), pick one', w, 'res-wood.png')
    f = [(crop('Items/Food/' + n, None), n[:-4], f'Items/Food/{n}') for n in FOOD]
    sheet('FOOD: Ninja Adventure candidates (3x), pick one (Nut2 excluded: forbidden)', f, 'res-food.png')
    s = [(crop(p, r), lab, f'{os.path.basename(p)} {r[0]},{r[1]},{r[2]},{r[3]}') for p, r, lab in STONE]
    sheet('STONE: Ninja Adventure candidates (3x), pick one', s, 'res-stone.png')


if __name__ == '__main__':
    main()
