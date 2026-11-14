#!/usr/bin/env python3
"""Build the winter prop set for a future snow map into public/art/props-winter/.

usage (from blobz/): python3 scripts/winter_props.py [--preview docs/art-review/winter-sheet.png]

- Kenney Tiny Ski (CC0, public/assets/kenney-tiny-ski) tiles are cut out and trimmed: snowy pine,
  small snowy tree, bare tree, snowman, snow rock.
- Own art (CC0): snowy round tree (our props/tree-green.png with a snow cap), ice patch, igloo base
  (same footprint as icons/house.png, 19x17).
All outputs are native-size, transparent, trimmed to their content like the other props.
"""
import os
import sys
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SKI = os.path.join(ROOT, 'public', 'assets', 'kenney-tiny-ski', 'tilemap_packed.png')
OUT_DIR = os.path.join(ROOT, 'public', 'art', 'props-winter')

PLUM = (63, 38, 49, 255)
SNOW = (255, 255, 255, 255)
SNOW_SHADE = (205, 226, 242, 255)
SNOW_DEEP = (160, 192, 222, 255)
ICE = (168, 220, 245, 255)
ICE_HI = (232, 248, 255, 255)
ICE_LO = (110, 175, 220, 255)
DOOR = (43, 43, 51, 255)


def trim(im):
    box = im.getbbox()
    return im.crop(box) if box else im


def thin_outline(im):
    """Kenney Tiny Ski uses a 2 px dark outline; peel the outer pixel so it matches our 1 px outline."""
    px = im.load()
    w, h = im.size
    dark = lambda x, y: 0 <= x < w and 0 <= y < h and px[x, y][3] and is_plum(px[x, y])
    clear = lambda x, y: not (0 <= x < w and 0 <= y < h) or not px[x, y][3]
    peel = []
    for y in range(h):
        for x in range(w):
            if not dark(x, y):
                continue
            nb = [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
            if any(clear(*q) for q in nb) and all(clear(*q) or dark(*q) for q in nb):
                peel.append((x, y))
    for (x, y) in peel:
        px[x, y] = (0, 0, 0, 0)
    return trim(im)


def ski_tiles(sheet, tiles):
    """Stack Kenney 16x16 tiles vertically (top to bottom) and trim."""
    out = Image.new('RGBA', (16, 16 * len(tiles)), (0, 0, 0, 0))
    for i, t in enumerate(tiles):
        x, y = (t % 12) * 16, (t // 12) * 16
        out.paste(sheet.crop((x, y, x + 16, y + 16)), (0, i * 16))
    return thin_outline(trim(out))


def is_plum(p):
    return p[3] and p[0] < 90 and p[1] < 70 and p[2] < 80


def snowy_round_tree():
    """props/tree-green.png with a snow cap on the canopy (top 2-3 pixels below the outline)."""
    im = Image.open(os.path.join(ROOT, 'public', 'art', 'props', 'tree-green.png')).convert('RGBA')
    w, h = im.size
    px = im.load()
    canopy_bottom = int(h * 0.62)  # trunk starts below this
    for x in range(w):
        y = 0
        while y < canopy_bottom and (not px[x, y][3] or is_plum(px[x, y])):
            y += 1
        if y >= canopy_bottom:
            continue
        depth = 3 if (x % 4) in (1, 2) else 2  # little drips
        for d in range(depth):
            if y + d < canopy_bottom and px[x, y + d][3] and not is_plum(px[x, y + d]):
                px[x, y + d] = SNOW if d < depth - 1 else SNOW_SHADE
    return im


def snow_cap(path, cap_rows=0.62, depth=2):
    """Any prop with a snow cap on its top edge (2-3 px under the outline)."""
    im = Image.open(path).convert('RGBA')
    w, h = im.size
    px = im.load()
    bottom = int(h * cap_rows)
    for x in range(w):
        y = 0
        while y < bottom and (not px[x, y][3] or is_plum(px[x, y])):
            y += 1
        if y >= bottom:
            continue
        d = depth + (1 if (x % 4) in (1, 2) else 0)
        for k in range(d):
            if y + k < bottom and px[x, y + k][3] and not is_plum(px[x, y + k]):
                px[x, y + k] = SNOW if k < d - 1 else SNOW_SHADE
    return im


def ice_rock():
    """Mineable ice block: faceted blue crystal rock with glints, 16x14."""
    w, h = 16, 14
    mask = ellipse(8, 9, 7, 4.5) | {(x, y) for (x, y) in ellipse(8, 7, 5, 6) if y >= 2}
    def col(x, y, m):
        if (x - 1, y) not in m or (x, y - 1) not in m:
            return ICE_HI
        if (x + 1, y) not in m or (x, y + 1) not in m:
            return ICE_LO
        if x - y in (0, 1) and 4 <= x <= 9:
            return ICE_HI  # facet glint
        if x + y == 20:
            return ICE_LO  # facet edge
        return ICE
    return trim(draw(mask, w, h, col))


def frozen_pond_tiles():
    """3x3 autotile sheet (48x48, 16 px tiles): corners, edges, centre of a frozen pond with a snowy rim.
    Tile order (row-major): TL, T, TR, L, C, R, BL, B, BR. The centre tile repeats seamlessly."""
    S = 48
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    px = im.load()
    def inside(x, y):
        # rounded square with 6 px corner radius
        r = 6
        cx = min(max(x + 0.5, r), S - r)
        cy = min(max(y + 0.5, r), S - r)
        return (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r
    for y in range(S):
        for x in range(S):
            if not inside(x, y):
                continue
            edge = not all(inside(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
            d = min(x, y, S - 1 - x, S - 1 - y)
            if edge:
                c = PLUM
            elif d <= 2 or not all(inside(x + dx, y + dy) for dx in (-3, 3) for dy in (-3, 3)):
                c = SNOW if d <= 1 else SNOW_SHADE  # snowy rim
            else:
                lx, ly = x % 16, y % 16  # periodic so the centre tile tiles
                if lx - ly in (2, 3) and 3 <= lx <= 9:
                    c = ICE_HI
                elif (lx + ly) % 16 == 13 and 8 <= lx <= 14:
                    c = ICE_LO
                else:
                    c = ICE
            px[x, y] = c
    return im


def ellipse(cx, cy, rx, ry):
    return {(x, y) for y in range(int(cy - ry) - 1, int(cy + ry) + 2) for x in range(int(cx - rx) - 1, int(cx + rx) + 2)
            if ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1}


def draw(mask, w, h, color_fn):
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    for (x, y) in mask:
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            q = (x + dx, y + dy)
            if q not in mask and 0 <= q[0] < w and 0 <= q[1] < h:
                im.putpixel(q, PLUM)
    for (x, y) in mask:
        if 0 <= x < w and 0 <= y < h:
            im.putpixel((x, y), color_fn(x, y, mask))
    return im


def ice_patch():
    """Flat frozen puddle seen top-down at 3/4 (decal, like props/pond.png)."""
    w, h = 24, 13
    mask = ellipse(12, 6.5, 11, 5.5) | ellipse(7, 7.5, 6, 4.5)

    def col(x, y, m):
        if (x - 1, y) not in m or (x, y - 1) not in m:
            return ICE_HI
        if (x + 1, y) not in m or (x, y + 1) not in m:
            return ICE_LO
        if (x - y) in (4, 5) and 5 <= x <= 12 or (x - y) in (12,) and 14 <= x <= 17:
            return ICE_HI  # glints
        return ICE
    return trim(draw(mask, w, h, col))


def igloo():
    """Snow-block dome with a front tunnel; 19x17 footprint like icons/house.png."""
    w, h = 19, 17
    dome = {(x, y) for (x, y) in ellipse(9.5, 15, 8.5, 13) if 1 <= y <= 15}
    tunnel = {(x, y) for x in range(6, 13) for y in range(9, 16)}
    mask = dome | tunnel
    door = {(x, y) for x in range(8, 11) for y in range(12, 16)} | {(9, 11)}

    def col(x, y, m):
        if (x, y) in door:
            return DOOR
        in_tunnel = (x, y) in tunnel and ((x, y) not in dome or y >= 9)
        if in_tunnel:
            if x in (6, 12) or y == 9 and x not in (6, 12):
                return SNOW_SHADE if x == 12 else SNOW
            return SNOW
        if (x + 1, y) not in m or (x, y + 1) not in m:
            return SNOW_DEEP if x > 12 else SNOW_SHADE
        if y % 4 == 0:
            return SNOW_SHADE  # block rows
        if (x + (y // 4) * 2) % 5 == 0:
            return SNOW_SHADE  # staggered block joints
        if x > 13:
            return SNOW_SHADE
        return SNOW
    im = draw(mask, w, h, col)
    # outline the tunnel against the dome so it reads as a separate front piece
    for y in range(9, 16):
        for x in (5, 13):
            if im.getpixel((x, y))[3]:
                im.putpixel((x, y), PLUM)
    for x in range(6, 13):
        im.putpixel((x, 8), PLUM)
    return im


def main():
    sheet = Image.open(SKI).convert('RGBA')
    outputs = {
        'tree-snow-pine.png': ski_tiles(sheet, [6, 18]),
        'tree-snow-small.png': ski_tiles(sheet, [30]),
        'tree-snow-round.png': snowy_round_tree(),
        'tree-bare.png': ski_tiles(sheet, [7, 19]),
        'snowman.png': ski_tiles(sheet, [69]),
        'rock-snow.png': ski_tiles(sheet, [81]),
        'ice.png': ice_patch(),
        'igloo.png': igloo(),
        'bush-berries-snow.png': snow_cap(os.path.join(ROOT, 'public', 'art', 'gather', 'bush-berries.png'), 0.7, 2),
        'bush-empty-snow.png': snow_cap(os.path.join(ROOT, 'public', 'art', 'gather', 'bush-empty.png'), 0.7, 2),
        'ice-rock.png': ice_rock(),
        'pond-frozen-tiles.png': frozen_pond_tiles(),
    }
    os.makedirs(OUT_DIR, exist_ok=True)
    for name, im in outputs.items():
        im.save(os.path.join(OUT_DIR, name))
        print(name, im.size)
    if '--preview' in sys.argv:
        path = sys.argv[sys.argv.index('--preview') + 1]
        scale, pad = 8, 24
        w = sum(im.width * scale + pad for im in outputs.values()) + pad
        h = max(im.height for im in outputs.values()) * scale + 2 * pad
        out = Image.new('RGBA', (w, h), (236, 244, 250, 255))
        x = pad
        for im in outputs.values():
            out.alpha_composite(im.resize((im.width * scale, im.height * scale), Image.NEAREST), (x, h - pad - im.height * scale))
            x += im.width * scale + pad
        out.save(path)
        print('preview', path)


if __name__ == '__main__':
    main()
