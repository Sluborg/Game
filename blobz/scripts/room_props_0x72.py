#!/usr/bin/env python3
"""Numbered option sheet of everything from 0x72 DungeonTileset II (vendored, public/assets/0x72-dungeon-ii) that can
stand in an Archero room, at 3x on floor_1, grouped A) obstacles, B) hazards, C) decor (walk-through).

usage (from blobz/): python3 scripts/room_props_0x72.py -> docs/art-review/room-props-0x72.png (A + B) + -2.png (C)
Composites (marked *) are stacks of the pack's own frames, e.g. a part wall = cap row over face row.
"""
import os
from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SH = Image.open(os.path.join(ROOT, 'public', 'assets', '0x72-dungeon-ii', '0x72_DungeonTilesetII_v1.7.png')).convert('RGBA')
S, COLS, CW = 3, 4, 120


def f(x, y, w=16, h=16):
    return SH.crop((x, y, x + w, y + h))


def stack(*rows):
    """rows of frames, top to bottom, each row a list of frames left to right."""
    w = max(sum(t.width for t in r) for r in rows)
    h = sum(max(t.height for t in r) for r in rows)
    im = Image.new('RGBA', (w, h))
    y = 0
    for r in rows:
        x = 0
        for t in r:
            im.alpha_composite(t, (x, y))
            x += t.width
        y += max(t.height for t in r)
    return im


A = [
    ('column', f(80, 80, 16, 48)), ('column (wall)', f(96, 80, 16, 48)), ('crate', f(288, 408, 16, 24)),
    ('*pillar block 1x2', stack([f(32, 0)], [f(32, 16)])),
    ('*part wall 3 wide', stack([f(16, 0), f(32, 0), f(48, 0)], [f(16, 16), f(32, 16), f(48, 16)])),
    ('*inner wall N-S', stack([f(0, 136), f(16, 136)], [f(0, 152), f(16, 152)], [f(0, 168), f(16, 168)])),
    ('chest (closed)', f(304, 416)), ('mimic chest', f(304, 432)),
]
B = [(f'spikes f{i}', f(16 + 16 * i, 192)) for i in range(4)] + [
    ('hole', f(96, 144)), ('pit edge', f(96, 128)), ('*pit 1x2', stack([f(96, 128)], [f(96, 144)])),
    ('*goo wall + pool', stack([f(64, 80)], [f(64, 96)])),
    ('*red fountain', stack([f(64, 0)], [f(64, 16)], [f(64, 32)])),
    ('*blue fountain', stack([f(80, 0)], [f(64, 48)], [f(64, 64)])),
    ('bomb f0', f(288, 320)), ('bomb f1', f(304, 320)), ('bomb f2', f(320, 320)),
]
C = [('skull', f(288, 432)), ('banner red', f(16, 32)), ('banner blue', f(32, 32)), ('banner green', f(16, 48)),
     ('banner yellow', f(32, 48)), ('wall hole 1', f(48, 32)), ('wall hole 2', f(48, 48))] + \
    [(f'crack floor_{i + 2}', f(x, y)) for i, (x, y) in enumerate(((32, 64), (48, 64), (16, 80), (32, 80), (48, 80), (16, 96), (32, 96)))] + [
    ('chest full (reward)', f(304, 416)), ('chest empty', f(304, 400)), ('lever L', f(80, 208)), ('lever R', f(96, 208)),
    ('button red up', f(16, 208)), ('button red down', f(32, 208)), ('button blue up', f(48, 208)),
    ('button blue down', f(64, 208)), ('ladder', f(48, 96)), ('stairs', f(80, 192)),
    ('flask big red', f(288, 336)), ('flask big blue', f(304, 336)), ('flask big green', f(320, 336)),
    ('flask big yellow', f(336, 336))]


def sheet(title, groups, out, start=1):
    floor = f(16, 64)
    blocks, k = [], start
    for head, items in groups:
        hb = Image.new('RGBA', (COLS * CW, 30), (20, 27, 27, 255))
        ImageDraw.Draw(hb).text((8, 5), head, fill='#ffe18d', font_size=16)
        blocks.append(hb)
        rows, cur, used = [], [], 0
        for it in items:  # pack items into rows; a wide item (> 2 tiles) takes 2 cells
            span = 2 if it[1].width > 32 else 1
            if used + span > COLS:
                rows.append(cur)
                cur, used = [], 0
            cur.append((it, span))
            used += span
        if cur:
            rows.append(cur)
        for row in rows:
            th = max(t.height for (_, t), _ in row)
            ph = max(16, ((th + 15) // 16) * 16) + 8
            rb = Image.new('RGBA', (COLS * CW, ph * S + 22), (10, 14, 14, 255))
            d = ImageDraw.Draw(rb)
            c = 0
            for (name, t), span in row:
                pw = max(16, ((t.width + 15) // 16) * 16) + 8
                patch = Image.new('RGBA', (pw, ph))
                for yy in range(0, ph, 16):
                    for xx in range(0, pw, 16):
                        patch.alpha_composite(floor, (xx, yy))
                patch.alpha_composite(t, ((pw - t.width) // 2, ph - 4 - t.height))
                big = patch.resize((pw * S, ph * S), Image.NEAREST)
                cw = CW * span
                x = c * CW + (cw - min(big.width, cw - 4)) // 2
                rb.paste(big.crop((0, 0, min(big.width, cw - 4), big.height)), (x, 0))
                d.text((c * CW + 4, ph * S + 3), f'{k}. {name}', fill='white', font_size=12)
                k += 1
                c += span
            blocks.append(rb)
    head = Image.new('RGBA', (COLS * CW, 44), (10, 14, 14, 255))
    ImageDraw.Draw(head).text((8, 4), title, fill='white', font_size=16)
    ImageDraw.Draw(head).text((8, 24), '0x72 DungeonTileset II (CC0), 3x on floor_1; * = stack of pack frames', fill='#9fd3ff', font_size=12)
    im = Image.new('RGBA', (COLS * CW, 44 + sum(b.height + 4 for b in blocks)), (10, 14, 14, 255))
    im.paste(head, (0, 0))
    y = 44
    for b in blocks:
        im.paste(b, (0, y))
        y += b.height + 4
    im.save(os.path.join(ROOT, 'docs', 'art-review', out))
    print(out, im.size, 'items', start, '-', k - 1)
    return k


if __name__ == '__main__':
    n = sheet('Room props 1/2: obstacles + hazards', [('A) Obstacles (block move + shots)', A),
                                                     ('B) Hazards (damage / fall)', B)], 'room-props-0x72.png')
    sheet('Room props 2/2: decor (walk-through)', [('C) Decor, rewards, switches, exits', C)], 'room-props-0x72-2.png', n)
