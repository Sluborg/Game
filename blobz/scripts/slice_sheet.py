#!/usr/bin/env python3
"""Cut a ChatGPT art sheet (transparent PNG) into separate sprites, in reading order.

usage: slice_sheet.py SHEET OUT_DIR name1 name2 ... [--native] [--grid=CxR] [--px=N]
  --native  also snap each sprite back to its pixel-art grid (estimated from the outline
            thickness) so it can be upscaled crisply with image-rendering: pixelated.
  --grid=CxR  the sheet is an even C x R grid: one sprite per cell (keeps multi-part icons whole).
  --px=N    size of one art pixel in the sheet (overrides the per-sprite estimate).
  --merge=N merge objects whose boxes are closer than N px (multi-part objects like an open gate).
Objects are found as connected areas of non-transparent pixels (8-neighbour); tiny specks are dropped.
"""
import sys
from collections import deque
from PIL import Image

def components(alpha, w, h, min_area=400):
    seen = bytearray(w * h)
    out = []
    for start in range(w * h):
        if seen[start] or alpha[start] < 40:
            continue
        q = deque([start]); seen[start] = 1
        x0 = y0 = 10**9; x1 = y1 = -1; n = 0
        while q:
            i = q.popleft(); n += 1
            x, y = i % w, i // w
            x0, y0, x1, y1 = min(x0, x), min(y0, y), max(x1, x), max(y1, y)
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h:
                        j = ny * w + nx
                        if not seen[j] and alpha[j] >= 40:
                            seen[j] = 1; q.append(j)
        if n >= min_area:
            out.append((x0, y0, x1 + 1, y1 + 1))
    return out

def reading_order(boxes):
    boxes = sorted(boxes, key=lambda b: (b[1] + b[3]) / 2)
    rows, cur = [], []
    for b in boxes:
        cy = (b[1] + b[3]) / 2
        if cur and cy - (cur[-1][1] + cur[-1][3]) / 2 > max(20, (b[3] - b[1]) * 0.6):
            rows.append(cur); cur = []
        cur.append(b)
    if cur: rows.append(cur)
    return [b for r in rows for b in sorted(r, key=lambda b: b[0])]

def outline_px(img):
    """Thickness of the dark outline at the left edge, middle row = size of one art pixel."""
    w, h = img.size
    y = h // 2
    run = 0
    for x in range(w):
        r, g, b, a = img.getpixel((x, y))
        if a < 40: continue
        if r + g + b < 260: run += 1
        else: break
    return max(1, run)

def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    opts = dict(a[2:].split('=', 1) for a in sys.argv[1:] if a.startswith('--') and '=' in a)
    native = '--native' in sys.argv or 'px' in opts
    sheet, out, names = args[0], args[1], args[2:]
    im = Image.open(sheet).convert('RGBA')
    w, h = im.size
    if 'grid' in opts:
        cols, rows = (int(v) for v in opts['grid'].lower().split('x'))
        boxes = []
        for r in range(rows):
            for c in range(cols):
                cell = (c * w // cols, r * h // rows, (c + 1) * w // cols, (r + 1) * h // rows)
                bb = im.crop(cell).getchannel('A').point(lambda v: 255 if v >= 40 else 0).getbbox()
                if bb: boxes.append((cell[0] + bb[0], cell[1] + bb[1], cell[0] + bb[2], cell[1] + bb[3]))
    else:
        alpha = im.getchannel('A').tobytes()
        boxes = components(alpha, w, h, min_area=150)
        gap = int(opts.get('merge', 0))
        merged = True
        while gap and merged:
            merged = False
            for i in range(len(boxes)):
                for j in range(i + 1, len(boxes)):
                    a, b = boxes[i], boxes[j]
                    dx = max(0, max(a[0], b[0]) - min(a[2], b[2])); dy = max(0, max(a[1], b[1]) - min(a[3], b[3]))
                    if dx <= gap and dy <= gap:
                        boxes[i] = (min(a[0], b[0]), min(a[1], b[1]), max(a[2], b[2]), max(a[3], b[3]))
                        del boxes[j]; merged = True; break
                if merged: break
        boxes = reading_order(boxes)
    print(f'found {len(boxes)} objects, {len(names)} names')
    for i, b in enumerate(boxes):
        name = names[i] if i < len(names) else f'extra-{i + 1}'
        crop = im.crop(b)
        if native:
            px = float(opts['px']) if 'px' in opts else outline_px(crop)
            nw, nh = max(1, round(crop.width / px)), max(1, round(crop.height / px))
            crop = crop.resize((nw, nh), Image.NEAREST)
            print(f'  {name}: box {b} pixel~{px:g} -> {nw}x{nh}')
        else:
            print(f'  {name}: box {b}')
        crop.save(f'{out}/{name}.png')

if __name__ == '__main__':
    main()
