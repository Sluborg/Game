#!/usr/bin/env python3
"""Test rooms built ONLY from a ready-made CC0 pack's own floor, walls, corners and door (contrast as the pack
designs it), 10x8 tiles at 3x, door/exit at the top, entrance gap at the bottom, our blob + one pack monster.

usage (from blobz/): python3 scripts/pack_rooms.py <packs dir>
  -> docs/art-review/room-0x72-ii.png, room-0x72-v1.png (packs are NOT vendored; <packs dir> holds
     0x72_dt2/0x72_DungeonTilesetII_v1.7.png and 0x72_dt1/sheet.png)
"""
import os
import random
import sys
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from blobz_v2_final import render  # noqa: E402

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
TW, TH, S = 10, 8, 3


def blob():
    b = render([{'look': {'color': 0x5ec8ff, 'shape': 0, 'eyes': 0, 'mouth': 0, 'hat': 0}}])[0]
    return b.crop(b.getbbox())


def finish(im, title, notes, out):
    big = im.resize((im.width * S, im.height * S), Image.NEAREST)
    head = Image.new('RGBA', (big.width, 34 + 17 * len(notes)), (10, 14, 14, 255))
    d = ImageDraw.Draw(head)
    d.text((8, 6), title, fill='white', font_size=17)
    for i, n in enumerate(notes):
        d.text((8, 30 + 17 * i), n, fill='#ffe18d', font_size=13)
    o = Image.new('RGBA', (big.width, big.height + head.height))
    o.paste(head, (0, 0))
    o.paste(big, (0, head.height))
    o.save(os.path.join(ROOT, 'docs', 'art-review', out))
    print(out, o.size)


def dt2(packs):
    sh = Image.open(os.path.join(packs, '0x72_dt2', '0x72_DungeonTilesetII_v1.7.png')).convert('RGBA')
    T = lambda x, y, w=16, h=16: sh.crop((x, y, x + w, y + h))  # noqa: E731
    rnd = random.Random(7)
    floors = [T(16, 64)] * 24 + [T(32, 64), T(48, 64), T(16, 80), T(32, 80), T(48, 80), T(16, 96), T(32, 96)]
    oy = 32  # room for the door frame above the top wall
    im = Image.new('RGBA', (TW * 16, TH * 16 + oy), (24, 20, 37, 255))
    put = lambda t, x, y: im.alpha_composite(t, (x * 16, oy + y * 16))  # noqa: E731
    gap = (4, 5)  # bottom entrance tiles
    for y in range(1, TH):  # floor under everything (the thin edge walls are mostly transparent)
        for x in range(TW):
            put(rnd.choice(floors), x, y)
    # top wall: cap row (y=-1 in room coords is above the face), face row y=0
    for x in range(TW):
        cap = T(31, 120) if x == 0 else T(48, 120) if x == TW - 1 else T(32, 0)
        im.alpha_composite(cap, (x * 16, oy - 16))
        face = T(32, 136) if x == 0 else T(48, 136) if x == TW - 1 else T(32, 16)
        put(face, x, 0)
    put(T(16, 32), 2, 0)  # banners
    put(T(32, 32), 7, 0)
    for y in range(1, TH - 1):  # side walls: the thin edge pieces
        put(T(32, 152), 0, y)
        put(T(48, 152), TW - 1, y)
    for x in range(TW):  # bottom wall: corners + cap
        if x in gap:
            continue
        t = T(32, 168) if x == 0 else T(48, 168) if x == TW - 1 else T(32, 0)
        put(t, x, TH - 1)
    # door: frame top 32x16 + frame sides 16x32 + leaf 32x32, bottom on the face row's bottom
    dx = 4
    by = oy + 16  # bottom of the face row
    im.alpha_composite(T(16, 240, 16, 32), ((dx - 1) * 16, by - 32))
    im.alpha_composite(T(64, 240, 16, 32), ((dx + 2) * 16, by - 32))
    im.alpha_composite(T(32, 224, 32, 16), (dx * 16, by - 48))
    im.alpha_composite(T(32, 240, 32, 32), (dx * 16, by - 32))
    mon = T(368, 40)  # goblin
    im.alpha_composite(mon, (6 * 16, oy + 4 * 16))
    b = blob()
    im.alpha_composite(b, (3 * 16, oy + 5 * 16 + 16 - b.height))
    finish(im, '0x72 DungeonTileset II (CC0), pack only, 3x', [
        'has: wall top/face, thin side walls + corners, inner T pieces, door frame + leaf',
        '(closed/open), stairs, ladder, hole, spikes, 8 floor variants, banners x4,',
        'wall fountains, goo, columns, crates, chests, levers, many monsters + heroes',
        'shown: goblin (16 px) + our blob; bottom gap = entrance (no entrance piece)'], 'room-0x72-ii.png')


def dt1(packs):
    sh = Image.open(os.path.join(packs, '0x72_dt1', 'sheet.png')).convert('RGBA')
    T = lambda x, y, w=16, h=16: sh.crop((x, y, x + w, y + h))  # noqa: E731
    rnd = random.Random(7)
    floors = [T(0, 96), T(16, 96), T(32, 96), T(48, 96), T(0, 112), T(16, 112), T(32, 112), T(48, 112)]
    oy = 32
    im = Image.new('RGBA', (TW * 16, TH * 16 + oy), (24, 20, 37, 255))
    put = lambda t, x, y: im.alpha_composite(t, (x * 16, oy + y * 16))  # noqa: E731
    gap = (4, 5)
    for y in range(1, TH - 1):
        for x in range(1, TW - 1):
            put(rnd.choice(floors) if y > 1 else T(16, 32), x, y)  # first floor row = the pack's wall-shadow floor
    for x in gap:
        put(T(16, 96), x, TH - 1)
    for x in range(TW):
        im.alpha_composite(T(16, 0), (x * 16, oy - 16))  # cap
        put(T(16, 16), x, 0)  # face
    put(T(192, 64), 2, 0)
    put(T(240, 64), 7, 0)  # banners
    # no side / corner / bottom pieces in v1: the sides are the pack's dark void with the cap tile laid along them
    for y in range(1, TH):
        for x in (0, TW - 1):
            put(T(16, 0), x, y)
    for x in range(1, TW - 1):
        if x not in gap:
            put(T(16, 0), x, TH - 1)
    # exit: the pack's stairs (32x48 incl. its wall) in the top wall
    im.alpha_composite(T(80, 0, 32, 32), (4 * 16, oy - 16))
    im.alpha_composite(T(128, 144, 16, 32), (2 * 16 + 16, oy - 16))  # torch
    im.alpha_composite(T(48, 160), (6 * 16, oy + 4 * 16))  # monster
    b = blob()
    im.alpha_composite(b, (3 * 16, oy + 5 * 16 + 16 - b.height))
    finish(im, '0x72 Dungeon Tileset v1 (CC0), pack only, 3x', [
        'has: wall cap + face (3 variants), wall-shadow floor, ~12 floor variants,',
        'stairs down, wooden doors, banners x4, torches, columns, chests, potions,',
        'weapons, ~30 monsters. NO side walls, corners or bottom wall pieces:',
        'sides/bottom here = dark void + the top cap tile. Exit = its stairs.'], 'room-0x72-v1.png')


if __name__ == '__main__':
    dt2(sys.argv[1])
    dt1(sys.argv[1])
