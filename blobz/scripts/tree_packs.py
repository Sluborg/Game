#!/usr/bin/env python3
"""Preview sheet of trees from other CC0 packs (candidates only, nothing vendored): docs/art-review/tree-packs.png.

usage (from blobz/): python3 scripts/tree_packs.py <dir with the downloaded preview images>
Each pack: its trees cropped from the OpenGameArt preview image, at 3x (native pixels) on grass, with the
Ninja reference tree (Nature 96,128) for comparison.
"""
import os
import sys
from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
NAT = os.path.join(ROOT, 'public', 'assets', 'ninja-adventure', 'Backgrounds', 'Tilesets', 'TilesetNature.png')
PACKS = [  # file, crop, downscale (preview is 2x), title, link, licence / note
    ('punyworld-overworld-tileset_0.png', (0, 112, 300, 160), 1, '1. 16x16 Puny World Tileset (Shade)',
     'opengameart.org/node/155014', 'CC0. Closest to Ninja (chunky, simple). Trees are small tile pines/rounds, mostly in groves.'),
    ('foliage_pack.png', (0, 0, 240, 320), 1, "2. Idylwild's Foliage Pack",
     'opengameart.org/node/171914', 'CC0. 8 trees + 5 small + 3 big fruit trees, stumps, axe stump. SNES look, no black outline.'),
    ('free_content_0.png', (0, 105, 318, 245), 1, '3. Seasons of Forest, free sample (inkBubi)',
     'opengameart.org/node/180257', 'CC0 (author was revising the licence text: re-check). Oak + pine, soft, no black outline.'),
    ('preview_x2.png', (230, 0, 704, 300), 2, '4. RPG Town Pixel Art Assets (ansimuz)',
     'opengameart.org/node/34211', 'CC0. Tall pines in rows (from the 2x preview scene), painterly, no outline.'),
    ('forest-deco.png', (0, 0, 228, 96), 1, '5. Forest Level Decorations',
     'opengameart.org/node/111606', 'CC0. 2 big oaks + bushes, rocks; soft, no black outline.'),
]
S = 3


def main(src):
    ref = Image.open(NAT).convert('RGBA').crop((96, 128, 128, 160))
    tiles = []
    for f, box, down, title, link, note in PACKS:
        im = Image.open(os.path.join(src, f)).convert('RGBA').crop(box)
        if down > 1:
            im = im.resize((im.width // down, im.height // down), Image.NEAREST)
        tiles.append((im.resize((im.width * S, im.height * S), Image.NEAREST), title, link, note))
    W = max(t[0].width for t in tiles) + ref.width * S + 60
    H = sum(t[0].height + 70 for t in tiles) + 60
    out = Image.new('RGBA', (W, H), (98, 150, 72, 255))
    d = ImageDraw.Draw(out)
    d.rectangle((0, 0, W, 44), fill=(20, 27, 27, 230))
    d.text((12, 10), 'Trees in other CC0 packs (3x, native pixels). Right: the Ninja tree Stefan likes (Nature 96,128) for comparison',
           fill='white', font_size=18)
    y = 54
    for im, title, link, note in tiles:
        d.text((12, y), f'{title}  |  {link}', fill='#ffe18d', font_size=18)
        d.text((12, y + 24), note, fill='white', font_size=14)
        out.alpha_composite(im, (12, y + 50))
        r = ref.resize((ref.width * S, ref.height * S), Image.NEAREST)
        out.alpha_composite(r, (W - r.width - 20, y + 50))
        y += im.height + 70
    out.save(os.path.join(ROOT, 'docs', 'art-review', 'tree-packs.png'))
    print('tree-packs.png', out.size)


if __name__ == '__main__':
    main(sys.argv[1])
