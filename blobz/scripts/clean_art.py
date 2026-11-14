#!/usr/bin/env python3
"""Clean sliced ChatGPT pixel art: hard alpha edges and flat colors (style bible: crisp, flat).

usage (from blobz/): python3 scripts/clean_art.py [--check] FILE_OR_GLOB ...
- alpha: >= 128 becomes fully opaque, below becomes fully transparent (no soft fringe, no specks)
- colors: near-identical colors (generation noise, distance <= TOL) merge into the most common one,
  so every flat area is one color again. Real shading steps (larger differences) are kept.
Files whose name ends in -empty (intentionally translucent placeholders) are skipped.
--check only prints what would change.
"""
import glob
import sys
from PIL import Image

TOL = 14  # max RGB distance merged as noise


def clean(path, write=True):
    im = Image.open(path).convert('RGBA')
    px = list(im.get_flattened_data())
    alpha = [255 if p[3] >= 128 else 0 for p in px]
    counts = {}
    for p, a in zip(px, alpha):
        if a:
            counts[p[:3]] = counts.get(p[:3], 0) + 1
    centres = []
    mapping = {}
    for col, _ in sorted(counts.items(), key=lambda kv: -kv[1]):
        for c in centres:
            if sum((x - y) ** 2 for x, y in zip(col, c)) <= TOL * TOL:
                mapping[col] = c
                break
        else:
            centres.append(col)
            mapping[col] = col
    out = Image.new('RGBA', im.size)
    out.putdata([(*mapping[p[:3]], 255) if a else (0, 0, 0, 0) for p, a in zip(px, alpha)])
    if write:
        out.save(path)
    return len(counts), len(centres), sum(1 for p, a in zip(px, alpha) if p[3] not in (0, 255))


def main():
    check = '--check' in sys.argv
    files = sorted({f for a in sys.argv[1:] if a != '--check' for f in glob.glob(a)})
    for f in files:
        if f.endswith('-empty.png'):
            print(f'{f}: skipped (translucent placeholder)')
            continue
        before, after, soft = clean(f, write=not check)
        print(f'{f}: colors {before} -> {after}, soft alpha px fixed {soft}')


if __name__ == '__main__':
    main()
