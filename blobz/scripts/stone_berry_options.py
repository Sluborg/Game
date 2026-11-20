#!/usr/bin/env python3
"""Board sheets (real game scale, 3x on meadow grass, blob + N-26 tree for scale, numbered):
  docs/art-review/stone-options.png: stone node comeback: ChatGPT N-29 boulders + rubble, N-26 rubble, Ninja plain
      rocks (no ore), the N-32 stone icon next to the N-27 wood icon
  docs/art-review/berry-options.png: food as berries: icon candidates next to the N-27 wood icon (Ninja food items,
      a crop of the N-16 berry bush, the current Meat icon labelled NOW)

usage (from blobz/): python3 scripts/stone_berry_options.py
"""
import os
import sys
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from blobz_v2_final import render  # noqa: E402

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
ART = os.path.join(ROOT, 'public', 'art')
NA = os.path.join(ROOT, 'public', 'assets', 'ninja-adventure')
TS = os.path.join(NA, 'Backgrounds', 'Tilesets')
S, COLS, CW = 3, 4, 120


def img(*p):
    im = Image.open(os.path.join(*p)).convert('RGBA')
    return im.crop(im.getbbox())


def ninja(f, x, y, w, h):
    im = Image.open(os.path.join(TS, f)).convert('RGBA').crop((x, y, x + w, y + h))
    return im.crop(im.getbbox())


def sheet(title, sub, items, out):
    grass = Image.open(os.path.join(TS, 'TilesetFloor.png')).convert('RGBA').crop((0, 192, 16, 208))
    blob = render([{'look': {'color': 0x5ec8ff, 'shape': 0, 'eyes': 0, 'mouth': 0, 'hat': 0}}])[0]
    blob = blob.crop(blob.getbbox())
    tree = img(ART, 'props', 'tree-round.png')
    rows = []
    # scale row: blob + tree
    ref = Image.new('RGBA', (COLS * CW // S, 52))
    for yy in range(0, 52, 16):
        for xx in range(0, ref.width, 16):
            ref.alpha_composite(grass, (xx, yy))
    ref.alpha_composite(tree, (8, 50 - tree.height))
    ref.alpha_composite(blob, (8 + tree.width + 6, 50 - blob.height))
    rows.append(ref.resize((ref.width * S, ref.height * S), Image.NEAREST))
    for r in range(0, len(items), COLS):
        row = items[r:r + COLS]
        ph = max(16, max(t.height for _, t, _ in row) + 8)
        rb = Image.new('RGBA', (COLS * CW, ph * S + 34), (14, 18, 18, 255))
        d = ImageDraw.Draw(rb)
        for i, (name, t, src) in enumerate(row):
            k = r + i + 1
            cell = Image.new('RGBA', (CW // S, ph))
            for yy in range(0, ph, 16):
                for xx in range(0, CW // S, 16):
                    cell.alpha_composite(grass, (xx, yy))
            cell.alpha_composite(t, ((CW // S - t.width) // 2, ph - 4 - t.height))
            rb.paste(cell.resize((CW, ph * S), Image.NEAREST), (i * CW, 0))
            d.text((i * CW + 4, ph * S + 2), f'{k}. {name}', fill='#ff9b8f' if name.startswith('NOW') else '#ffe18d', font_size=12)
            d.text((i * CW + 4, ph * S + 18), src[:24], fill='#cfd8dc', font_size=9)
        rows.append(rb)
    head = Image.new('RGBA', (COLS * CW, 44), (10, 14, 14, 255))
    ImageDraw.Draw(head).text((8, 4), title, fill='white', font_size=15)
    ImageDraw.Draw(head).text((8, 24), sub, fill='#9fd3ff', font_size=12)
    im = Image.new('RGBA', (COLS * CW, 44 + sum(x.height + 4 for x in rows)), (10, 14, 14, 255))
    im.paste(head, (0, 0))
    y = 44
    for x in rows:
        im.paste(x, (0, y))
        y += x.height + 4
    im.save(os.path.join(ROOT, 'docs', 'art-review', out))
    print(out, im.size, len(items))


def main():
    P = os.path.join(ART, 'props')
    I = os.path.join(ART, 'icons')
    stone = [(f'N-29 boulder {i}', img(P, f'boulder-{i}.png'), f'props/boulder-{i}.png') for i in (1, 2, 3)] + \
        [(f'N-29 rubble {i}', img(P, f'boulder-rubble-{i}.png'), f'props/boulder-rubble-{i}') for i in (1, 2, 3)] + \
        [(f'N-26 rubble {i}', img(P, f'rubble-{i}.png'), f'props/rubble-{i}.png') for i in (1, 2)] + [
        ('Ninja rock brown', ninja('TilesetNature.png', 240, 144, 16, 16), 'Nature 240,144'),
        ('Ninja rock grey', ninja('TilesetNature.png', 288, 144, 16, 16), 'Nature 288,144'),
        ('Ninja boulder brown', ninja('TilesetNature.png', 208, 128, 32, 32), 'Nature 208,128,32'),
        ('Ninja boulder grey', ninja('TilesetNature.png', 256, 128, 32, 32), 'Nature 256,128,32'),
        ('Ninja Rock item', img(NA, 'Items', 'Resource', 'Rock.png'), 'Items/Resource/Rock'),
        ('N-32 stone icon 16', img(I, 'res-stone-16.png'), 'icons/res-stone-16'),
        ('N-32 stone icon 32', img(I, 'res-stone-32.png'), 'icons/res-stone-32'),
        ('N-27 wood icon 16', img(I, 'res-wood-16.png'), 'icons/res-wood-16 (ref)'),
        ('N-27 wood icon 32', img(I, 'res-wood-32.png'), 'icons/res-wood-32 (ref)')]
    sheet('STONE node options (game scale, 3x)', 'pick a node + its mined-out rubble; icons vs wood icon', stone, 'stone-options.png')
    F = os.path.join(NA, 'Items', 'Food')
    bush = Image.open(os.path.join(P, 'berry-bush-16.png')).convert('RGBA')  # the 32 px bush was removed 2026-11-16
    berry = [('NOW: Meat', img(F, 'Meat.png'), 'Items/Food/Meat.png'),
             ('N-27 wood icon 16', img(I, 'res-wood-16.png'), 'icons/res-wood-16 (ref)'),
             ('N-16 bush 16', bush.crop(bush.getbbox()), 'props/berry-bush-16.png'),
             ('Honey', img(F, 'Honey.png'), 'Items/Food/Honey.png'),
             ('Nut', img(F, 'Nut.png'), 'Items/Food/Nut.png'),
             ('Seed big 1', img(F, 'SeedBig1.png'), 'Items/Food/SeedBig1'),
             ('Tea leaf', img(F, 'TeaLeaf.png'), 'Items/Food/TeaLeaf.png'),
             ('Gourd', img(NA, 'Items', 'Object', 'Gourd.png'), 'Items/Object/Gourd')]
    sheet('FOOD = berries: icon options (game scale, 3x)', 'Ninja has no berry item; N-41 (ChatGPT) ordered', berry, 'berry-options.png')


if __name__ == '__main__':
    main()
