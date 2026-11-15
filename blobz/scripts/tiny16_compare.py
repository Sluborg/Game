#!/usr/bin/env python3
"""Style comparison for Stefan: Tiny 16 (well + fence, opengameart.org/node/114382, docs/art-review/tiny16-*.png, not
vendored) next to what we use (Ninja Adventure cottage, ChatGPT N-26 round + apple tree, N-16 berry bush, a blob).

usage (from blobz/): python3 scripts/tiny16_compare.py -> docs/art-review/tiny16-vs-ninja.png (3x nearest, meadow grass)
"""
import os
import sys
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from blobz_v2_final import render  # noqa: E402

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
REV = os.path.join(ROOT, 'docs', 'art-review')
PROPS = os.path.join(ROOT, 'public', 'art', 'props')
TS = os.path.join(ROOT, 'public', 'assets', 'ninja-adventure', 'Backgrounds', 'Tilesets')
S = 3


def bb(im):
    return im.crop(im.getbbox())


def main():
    W, H = 192, 176
    im = Image.new('RGBA', (W, H))
    grass = Image.open(os.path.join(TS, 'TilesetFloor.png')).convert('RGBA').crop((0, 192, 16, 208))
    for y in range(0, H, 16):
        for x in range(0, W, 16):
            im.alpha_composite(grass, (x, y))
    cottage = bb(Image.open(os.path.join(TS, 'TilesetHouse.png')).convert('RGBA').crop((0, 0, 64, 48)))
    well = bb(Image.open(os.path.join(REV, 'tiny16-well.png')).convert('RGBA'))
    fence = bb(Image.open(os.path.join(REV, 'tiny16-fence.png')).convert('RGBA').crop((0, 96, 96, 160)))
    rnd = bb(Image.open(os.path.join(PROPS, 'tree-round.png')).convert('RGBA'))
    apple = bb(Image.open(os.path.join(PROPS, 'tree-apple.png')).convert('RGBA'))
    bush = bb(Image.open(os.path.join(PROPS, 'berry-bush-32.png')).convert('RGBA'))
    blob = render([{'look': {'color': 0x5ec8ff, 'shape': 0, 'eyes': 0, 'mouth': 0, 'hat': 0}}])[0]
    blob = bb(blob)
    labels = []

    def put(spr, x, foot, lab):
        im.alpha_composite(spr, (x, foot - spr.height))
        labels.append((x, foot, lab))

    put(cottage, 4, 76, 'Ninja house')
    put(rnd, 74, 76, 'N-26 tree')
    put(apple, 108, 76, 'N-26 apple')
    put(well, 144, 76, 'Tiny16 well')
    put(fence, 4, 160, 'Tiny16 fence')
    put(bush, 100, 160, 'N-16 bush')
    put(blob, 146, 160, 'blob')
    big = im.resize((W * S, H * S), Image.NEAREST)
    d = ImageDraw.Draw(big)
    for x, foot, lab in labels:
        tw = d.textlength(lab, font_size=13)
        d.rounded_rectangle((x * S, foot * S + 4, x * S + tw + 8, foot * S + 22), 4, fill=(20, 27, 27, 210))
        d.text((x * S + 4, foot * S + 5), lab, fill='#ffe18d', font_size=13)
    bar = Image.new('RGBA', (W * S, 50), (20, 27, 27, 255))
    ImageDraw.Draw(bar).text((10, 6), 'Tiny 16 vs our art (3x, meadow grass)', fill='white', font_size=18)
    ImageDraw.Draw(bar).text((10, 28), 'Tiny16: well + fence (not in game). Rest: in use.', fill='#ffe18d', font_size=14)
    out = Image.new('RGBA', (W * S, H * S + 50))
    out.paste(bar, (0, 0))
    out.paste(big, (0, 50))
    out.save(os.path.join(REV, 'tiny16-vs-ninja.png'))
    print('docs/art-review/tiny16-vs-ninja.png', out.size)


if __name__ == '__main__':
    main()
