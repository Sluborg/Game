#!/usr/bin/env python3
"""Class hats style 1 (approved) vs style 2 (learned from the N-5 class cards), on all 6 shapes, next to the cards.

usage (from blobz/): python3 scripts/classhats_mock.py  -> docs/art-review/classhats-r3.png
"""
import json
import os
import subprocess
from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
TMP = os.environ.get('TMPDIR', '/tmp')
COLS = {0: 0x7ddc5a, 1: 0x5ec8ff, 2: 0xff9248, 3: 0xb18cff}  # healer green, marksman blue, tank orange, rogue purple
NAMES = ['Healer hood', 'Marksman cap', 'Tank helm', 'Rogue bandana']
CARD = {0: 'healer', 1: 'marksman', 2: 'tank', 3: 'rogue'}


def render(reqs):
    mod = os.path.join(TMP, 'blob-ch.mjs')
    subprocess.run(['npx', 'esbuild', os.path.join(ROOT, 'src', 'blob.ts'), '--bundle', '--format=esm', f'--outfile={mod}', '--log-level=error'], cwd=ROOT, check=True)
    js = (f"const B = await import('{mod}'); const R = {json.dumps(reqs)};"
          "console.log(JSON.stringify(R.map((r) => { B.CLASS_HAT_STYLE.v = r.v; return B.blobGrid(r.look, r.ch); })));")
    grids = json.loads(subprocess.run(['node', '--input-type=module', '-e', js], capture_output=True, text=True, check=True).stdout)
    out = []
    for g in grids:
        im = Image.new('RGBA', (20, 20))
        for y, row in enumerate(g):
            for x, c in enumerate(row):
                if c:
                    v = tuple(int(c[i:i + 2], 16) for i in (1, 3, 5)) if c.startswith('#') else tuple(int(t) for t in c[4:-1].split(','))
                    im.putpixel((x, y), (*v, 255))
        out.append(im)
    return out


def main(S=6):
    reqs = []
    for ch in range(4):
        for v in ((1, 2) if ch < 3 else (2,)):
            for s in range(6):
                reqs.append({'look': {'color': COLS[ch], 'shape': s, 'eyes': 0, 'mouth': 0, 'hat': 0}, 'ch': ch, 'v': v})
    ims = render(reqs)
    cell = 21 * S
    W = 170 + 6 * cell + 20 + 62 * 3
    rows = 7
    out = Image.new('RGBA', (W, rows * cell + 50), (98, 150, 72, 255))
    d = ImageDraw.Draw(out)
    d.text((10, 8), 'Class hats: now (approved) vs NEW learned from the N-5 cards (card on the right)', fill='white', font_size=20)
    y, k = 44, 0
    for ch in range(4):
        card = Image.open(os.path.join(ROOT, 'public', 'art', 'dungeon', f'card-class-{CARD[ch]}.png')).convert('RGBA')
        vs = (1, 2) if ch < 3 else (2,)
        for v in vs:
            d.text((10, y + cell // 2 - 10), f'{NAMES[ch]} {"now" if v == 1 else "NEW"}', fill='white' if v == 1 else '#ffe18d', font_size=16)
            for s in range(6):
                out.alpha_composite(ims[k].resize((20 * S, 20 * S), Image.NEAREST), (170 + s * cell, y))
                k += 1
            if v == vs[-1]:
                big = card.resize((card.width * 3, card.height * 3), Image.NEAREST)
                out.alpha_composite(big, (170 + 6 * cell + 10, y + cell - big.height if len(vs) == 2 else y))
            y += cell
    p = os.path.join(ROOT, 'docs', 'art-review', 'classhats-r3.png')
    out.crop((0, 0, W, y + 6)).save(p)
    print(p)


if __name__ == '__main__':
    main()
