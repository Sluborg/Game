#!/usr/bin/env python3
"""Option sheet: straight swords for the knight (Riddare), at the in-game weapon scale (1 art px = 1 blob px, WSCALE
in src/dungeonScene.ts) next to a blob, 3x. Sources: Ninja Adventure Items/Weapons (CC0, vendored), 0x72 DungeonTileset II
weapons (CC0, vendored 2026-11-15), the ChatGPT N-11 sword (art/dungeon/weapons). #1 = "now" (what the knight draws).

usage (from blobz/): python3 scripts/knight_swords.py -> docs/art-review/knight-swords.png
"""
import os
import sys
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from blobz_v2_final import render  # noqa: E402

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
W = os.path.join(ROOT, 'public', 'assets', 'ninja-adventure', 'Items', 'Weapons')
DT2 = Image.open(os.path.join(ROOT, 'public', 'assets', '0x72-dungeon-ii', '0x72_DungeonTilesetII_v1.7.png')).convert('RGBA')
S, COLS, CW = 3, 4, 120


def na(name, f='Sprite.png'):
    return Image.open(os.path.join(W, name, f)).convert('RGBA'), f'Ninja Weapons/{name}/{f}'


def dt(name, x, y, w, h):
    return DT2.crop((x, y, x + w, y + h)), f'0x72 II {name} {x},{y},{w},{h}'


ITEMS = [('NOW (curved)',) + na('Sword'), ('Sword2',) + na('Sword2'), ('BigSword',) + na('BigSword'),
         ('Rapier',) + na('Rapier'), ('Katana',) + na('Katana'), ('Ninjaku',) + na('Ninjaku'),
         ('knight sword',) + dt('weapon_knight_sword', 339, 98, 10, 29),
         ('regular sword',) + dt('weapon_regular_sword', 323, 10, 10, 21),
         ('rusty sword',) + dt('weapon_rusty_sword', 307, 10, 10, 21),
         ('red gem sword',) + dt('weapon_red_gem_sword', 339, 10, 10, 21),
         ('golden sword',) + dt('weapon_golden_sword', 291, 137, 10, 22),
         ('lavish sword',) + dt('weapon_lavish_sword', 307, 129, 10, 30),
         ('duel sword',) + dt('weapon_duel_sword', 325, 97, 9, 30),
         ('anime sword',) + dt('weapon_anime_sword', 322, 65, 12, 30),
         ('ChatGPT N-11 sword', Image.open(os.path.join(ROOT, 'public', 'art', 'dungeon', 'weapons', 'sword-16.png')).convert('RGBA'),
          'art/dungeon/weapons/sword-16.png')]


def main():
    blob = render([{'look': {'color': 0x5ec8ff, 'shape': 0, 'eyes': 0, 'mouth': 0, 'hat': 0}}])[0]
    blob = blob.crop(blob.getbbox())
    PH = 34
    rows = (len(ITEMS) + COLS - 1) // COLS
    head = 44
    im = Image.new('RGBA', (COLS * CW, head + rows * (PH * S + 50)), (14, 18, 18, 255))
    d = ImageDraw.Draw(im)
    d.text((8, 4), 'Knight sword options, game scale (1 art px = 1 blob px), 3x', fill='white', font_size=15)
    d.text((8, 24), 'Ninja Adventure + 0x72 DungeonTileset II, both CC0', fill='#9fd3ff', font_size=12)
    for i, (name, spr, src) in enumerate(ITEMS):
        spr = spr.crop(spr.getbbox())
        c, r = i % COLS, i // COLS
        cell = Image.new('RGBA', (40, PH), (40, 34, 52, 255) if i else (70, 30, 30, 255))
        cell.alpha_composite(blob, (2, PH - 2 - blob.height))
        cell.alpha_composite(spr, (min(40 - spr.width - 1, blob.width + 4), PH - 2 - spr.height))
        x, y = c * CW, head + r * (PH * S + 50)
        im.paste(cell.resize((40 * S, PH * S), Image.NEAREST), (x, y))
        d.text((x + 4, y + PH * S + 2), f'{i + 1}. {name}', fill='#ffe18d' if i else '#ff9b8f', font_size=12)
        for j in range(0, min(len(src), 66), 22):  # wrap the source under its own cell
            d.text((x + 4, y + PH * S + 17 + j // 22 * 10), src[j:j + 22], fill='#cfd8dc', font_size=9)
    im.save(os.path.join(ROOT, 'docs', 'art-review', 'knight-swords.png'))
    print('knight-swords.png', im.size, len(ITEMS))


if __name__ == '__main__':
    main()
