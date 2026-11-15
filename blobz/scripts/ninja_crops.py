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

# The garden (Odling): two rows of soil plots (camp) with vegetables (Nature row y176) planted on them.
# Same layout as game.ts NINJA_COMPOSE['b-garden'].
GARDEN = {'size': (64, 42), 'parts': [
    (T + 'tileset_camp.png', 0, 128, 64, 16, 0, 12), *[(T + 'TilesetNature.png', 64, 176, 16, 16, i * 16, 3) for i in range(4)],
    (T + 'tileset_camp.png', 0, 128, 64, 16, 0, 26), *[(T + 'TilesetNature.png', 80, 176, 16, 16, i * 16, 17) for i in range(4)],
]}

# name: (file, x, y, w, h), a list stacked top to bottom, or {'size', 'parts': (file, x, y, w, h, dx, dy)}
CROPS = {
    'hut': (T + 'TilesetHouse.png', 48, 128, 47, 32),            # home / quest-home / new-village icon
    'flag': ('Backgrounds/Animated/Flag/FlagRed16x16.png', 0, 0, 16, 16),  # village badge
    'cottage-1': (T + 'TilesetHouse.png', 3, 120, 42, 39),
    'cottage-2': (T + 'TilesetHouse.png', 0, 0, 64, 48),
    'cottage-3': [(T + 'TilesetHouse.png', 400, 112, 64, 80), (T + 'TilesetHouse.png', 400, 192, 64, 32)],
    'storage': (T + 'TilesetHouse.png', 304, 224, 32, 32),
    'workshop': (T + 'TilesetHouse.png', 304, 304, 48, 48),
    'garden': GARDEN,
    'well': (T + 'TilesetElement.png', 112, 27, 16, 21),
    'watchtower': (T + 'TilesetTowers.png', 4, 0, 24, 32),
    'bridge': (T + 'TilesetHouse.png', 144, 240, 64, 46),
    'tree': (T + 'TilesetNature.png', 0, 0, 32, 32),
    'tree-roots': (T + 'TilesetNature.png', 96, 0, 32, 32),
    'bush': (T + 'TilesetNature.png', 256, 0, 32, 32),
}


def crop(spec):
    if isinstance(spec, dict):
        out = Image.new('RGBA', spec['size'])
        for f, x, y, w, h, dx, dy in spec['parts']:
            p = Image.open(os.path.join(NJ, f)).convert('RGBA').crop((x, y, x + w, y + h)); out.alpha_composite(p, (dx, dy))
        return out
    parts = spec if isinstance(spec, list) else [spec]
    ims = [Image.open(os.path.join(NJ, f)).convert('RGBA').crop((x, y, x + w, y + h)) for f, x, y, w, h in parts]
    out = Image.new('RGBA', (max(i.width for i in ims), sum(i.height for i in ims)))
    y = 0
    for i in ims:
        out.paste(i, (0, y)); y += i.height
    return out


def res_crops():
    """The resource pictures, read from src/resArt.ts (one line each) so the HUD and the game share one source."""
    import re
    src = open(os.path.join(ROOT, 'src', 'resArt.ts'), encoding='utf-8').read()
    out = {}
    for k, f, x, y, w, h in re.findall(r"(\w+): \{ file: '([^']+)', x: (\d+), y: (\d+), w: (\d+), h: (\d+) \}", src):
        out['res-' + k] = (f, int(x), int(y), int(w), int(h))
    return out


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    CROPS.update(res_crops())
    for name, spec in CROPS.items():
        crop(spec).save(os.path.join(OUT, name + '.png'), optimize=True)
    print(f'{len(CROPS)} crops -> public/art/ninja/')
