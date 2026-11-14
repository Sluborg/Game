#!/usr/bin/env python3
"""Final blobz v2 sheet rendered by the game's own src/blob.ts (docs/art-review/blobz-v2-final.png).

usage (from blobz/): python3 scripts/blobz_v2_final.py
Rows: every hat (auto size by head width) on all 6 shapes, faces cycling; the S/M/L sizes of each hat on a matching
head; class hats; idle/glide and mirrored; Ninja actors for scale.
"""
import json
import os
import subprocess
from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
NA = os.path.join(ROOT, 'public', 'assets', 'ninja-adventure')
OUT = os.path.join(ROOT, 'docs', 'art-review', 'blobz-v2-final.png')
TMP = os.environ.get('TMPDIR', '/tmp')
COLS = [0x5ec8ff, 0xff6b8b, 0x7ddc5a, 0xffc93c, 0xb18cff, 0xff9248, 0x4fe0c3, 0xf2f2f2]


def render(reqs):
    mod = os.path.join(TMP, 'blob-v2.mjs')
    subprocess.run(['npx', 'esbuild', os.path.join(ROOT, 'src', 'blob.ts'), '--bundle', '--format=esm', f'--outfile={mod}',
                    '--log-level=error'], cwd=ROOT, check=True)
    js = (f"const B = await import('{mod}'); const R = {json.dumps(reqs)};"
          "console.log(JSON.stringify(R.map((r) => B.blobGrid(r.look, r.ch ?? undefined, r.face ?? undefined, r.frame ?? 0))));")
    grids = json.loads(subprocess.run(['node', '--input-type=module', '-e', js], capture_output=True, text=True, check=True).stdout)
    out = []
    for g in grids:
        im = Image.new('RGBA', (16, 18))
        for y, row in enumerate(g):
            for x, c in enumerate(row):
                if c:
                    v = tuple(int(c[i:i + 2], 16) for i in (1, 3, 5)) if c.startswith('#') else tuple(int(t) for t in c[4:-1].split(','))
                    im.putpixel((x, y), (*v, 255))
        out.append(im)
    return out


def main(scale=6):
    hats = ['none', 'cap', 'crown', 'sprout', 'beanie', 'wizard', 'bow', 'headphones']
    shapes = ['dome', 'ball', 'tall', 'flat', 'pear', 'cube']
    reqs, labels = [], []
    for h in range(len(hats)):
        for s in range(6):
            reqs.append({'look': {'color': COLS[s], 'shape': s, 'eyes': (s + h) % 5, 'mouth': (s + 2 * h) % 5, 'hat': h}})
    for ch in range(3):
        for s in range(6):
            reqs.append({'look': {'color': 0xf2f2f2, 'shape': s, 'eyes': 0, 'mouth': 0, 'hat': 0}, 'ch': ch})
    for s in range(6):
        for fr, face in ((0, None), (1, None), (0, {'dx': -1, 'dy': 0}), (1, {'dx': -1, 'dy': 0})):
            reqs.append({'look': {'color': COLS[s], 'shape': s, 'eyes': 1, 'mouth': 0, 'hat': 1}, 'face': face, 'frame': fr})
    ims = render(reqs)
    cell = 19 * scale
    lab_w = 120
    rows = len(hats) + 3 + 6
    w = lab_w + 6 * cell + 10
    w = max(w, 12 * cell + 20)
    out = Image.new('RGBA', (w, rows * cell + 120), (98, 150, 72, 255))
    d = ImageDraw.Draw(out)
    d.text((10, 8), 'Blobz v2 final (rendered by src/blob.ts): every hat on all 6 shapes, size S/M/L picked by head width', fill=(255, 255, 255, 255), font_size=20)
    y = 40
    for s, sh in enumerate(shapes):
        d.text((lab_w + s * cell + 10, y), sh, fill=(255, 255, 255, 255), font_size=16)
    y += 24
    k = 0
    for h in hats:
        d.text((10, y + cell // 2 - 10), h, fill=(255, 255, 255, 255), font_size=16)
        for s in range(6):
            out.alpha_composite(ims[k].resize((16 * scale, 18 * scale), Image.NEAREST), (lab_w + s * cell, y))
            k += 1
        y += cell
    for name in ('priest hood', 'archer cap', 'knight helm'):
        d.text((10, y + cell // 2 - 10), name, fill=(255, 255, 255, 255), font_size=16)
        for s in range(6):
            out.alpha_composite(ims[k].resize((16 * scale, 18 * scale), Image.NEAREST), (lab_w + s * cell, y))
            k += 1
        y += cell
    d.text((10, y + 4), 'Idle, glide, mirrored (left) idle, glide', fill=(255, 255, 255, 255), font_size=16)
    y += 28
    for s in range(6):
        for j in range(4):
            out.alpha_composite(ims[k].resize((16 * scale, 18 * scale), Image.NEAREST), (10 + (s % 3) * 4 * cell + j * cell, y + (s // 3) * cell))
            k += 1
    y += 2 * cell + 10
    x = 10
    for path in ('Actor/Character/Boy/SpriteSheet.png', 'Actor/Monster/Slime/Slime.png', 'Actor/Monster/Skull/SpriteSheet.png', 'Actor/Monster/Mushroom/mushroom.png'):
        t = Image.open(os.path.join(NA, path)).convert('RGBA').crop((0, 0, 16, 16))
        out.alpha_composite(t.resize((16 * scale, 16 * scale), Image.NEAREST), (x, y + 2 * scale))
        x += cell
    y += cell + 10
    out.crop((0, 0, w, y)).save(OUT)
    print(OUT)


if __name__ == '__main__':
    main()
