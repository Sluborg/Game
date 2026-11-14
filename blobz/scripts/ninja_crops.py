#!/usr/bin/env python3
"""Cut the Ninja Adventure pieces the HTML UI needs as single PNGs (the game itself crops in code, game.ts NINJA_CROPS).

usage (from blobz/): python3 scripts/ninja_crops.py   -> public/art/ninja/*.png
Source: CC0 Ninja Adventure (public/assets/ninja-adventure), rects as in docs/ART_MAP.md / OLD_ART_CHECKLIST.md.
"""
import os
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
NJ = os.path.join(ROOT, 'public', 'assets', 'ninja-adventure')
OUT = os.path.join(ROOT, 'public', 'art', 'ninja')
T = 'Backgrounds/Tilesets/'

# name: (file, x, y, w, h) or a list stacked top to bottom
CROPS = {
    'hut': (T + 'TilesetHouse.png', 48, 128, 47, 32),            # home / quest-home / new-village icon
    'flag': ('Backgrounds/Animated/Flag/FlagRed16x16.png', 0, 0, 16, 16),  # village badge
    'cottage-1': (T + 'TilesetHouse.png', 0, 128, 45, 47),
    'cottage-2': (T + 'TilesetHouse.png', 0, 0, 64, 48),
    'cottage-3': [(T + 'TilesetHouse.png', 400, 112, 64, 80), (T + 'TilesetHouse.png', 400, 192, 64, 32)],
    'storage': (T + 'TilesetHouse.png', 304, 224, 32, 32),
    'workshop': (T + 'TilesetHouse.png', 304, 304, 48, 48),
    'garden': (T + 'TilesetElement.png', 208, 64, 48, 48),
    'well': (T + 'TilesetElement.png', 112, 27, 16, 21),
    'watchtower': (T + 'TilesetTowers.png', 4, 0, 24, 32),
    'bridge': (T + 'TilesetHouse.png', 144, 240, 64, 46),
    'tree': (T + 'TilesetNature.png', 0, 0, 32, 32),
    'tree-roots': (T + 'TilesetNature.png', 96, 0, 32, 32),
    'bush': (T + 'TilesetNature.png', 256, 0, 32, 32),
}


def crop(spec):
    parts = spec if isinstance(spec, list) else [spec]
    ims = [Image.open(os.path.join(NJ, f)).convert('RGBA').crop((x, y, x + w, y + h)) for f, x, y, w, h in parts]
    out = Image.new('RGBA', (max(i.width for i in ims), sum(i.height for i in ims)))
    y = 0
    for i in ims:
        out.paste(i, (0, y)); y += i.height
    return out


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for name, spec in CROPS.items():
        crop(spec).save(os.path.join(OUT, name + '.png'), optimize=True)
    print(f'{len(CROPS)} crops -> public/art/ninja/')
