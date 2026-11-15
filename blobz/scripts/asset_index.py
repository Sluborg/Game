#!/usr/bin/env python3
"""Writes docs/ASSET_INDEX.md: every image under public/, with its source, license, where the code uses it and a status.

usage (from blobz/): python3 scripts/asset_index.py
- Own files (public/art/**, Kenney packs, app icons): one row each.
- Ninja Adventure (public/assets/ninja-adventure/**, ~2000 files, CC0): one row per file the code references, plus one
  summary row per top folder that covers the rest. src/assetIndex.test.ts fails if an image is missing from the index.
- "Used where" = code references found by a grep of src/**/*.{ts,css} and index.html (exact path, template prefix like
  `art/dungeon/card-class-${c}`, or a quoted file stem in a source that loads that folder). UNUSED = nothing found.
- Status: keep (Ninja, approved ChatGPT N-orders, pending Stefan rating), replace (old art still used, see
  docs/OLD_ART_CHECKLIST.md), delete (unused; candidates listed at the bottom, Lead decides).
"""
import fnmatch
import os
import re
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
PUB = os.path.join(ROOT, 'public')
NA = 'assets/ninja-adventure/'
OUT = os.path.join(ROOT, 'docs', 'ASSET_INDEX.md')
IMG = ('.png', '.gif', '.jpg', '.jpeg', '.webp', '.svg')

GPT = 'ChatGPT image generation for this project (supplied by Stefan)'
OWN = 'Own art (CC0)'
CC0K = 'CC0 1.0 (Kenney)'
# (glob on the path under public/, source, license, approved?) first match wins
SOURCES = [
    ('art/dungeon/wall-*.png', 'ChatGPT N-34b room walls / N-34c entrance (wall-b, wall-entrance-*), sliced by scripts/room_walls.py', GPT, False),
    ('art/dungeon/door-*.png', 'ChatGPT N-34 dungeon room door, sliced by scripts/slice_grid_orders.py n34', GPT, False),
    ('art/props/plate-*.png', 'ChatGPT N-30 pressure plate, sliced by scripts/slice_grid_orders.py', GPT, True),
    ('art/props/fence-*.png', 'ChatGPT N-30b fence 3-piece set, sliced by scripts/fence_pieces.py (pen v4 rating pending; N-S: post every tile, rail-v centre strip on top)', GPT, False),
    ('art/props/gate-*.png', 'ChatGPT N-30 gate + posts, sliced by scripts/slice_grid_orders.py', GPT, True),
    ('art/props/site-*.png', 'ChatGPT N-31 build site, sliced by scripts/slice_grid_orders.py', GPT, True),
    ('art/icons/res-stone-*.png', 'ChatGPT N-32 stone icon, sliced by scripts/slice_grid_orders.py', GPT, True),
    ('art/props/chest-*.png', 'ChatGPT N-33 treasure chest, sliced by scripts/slice_grid_orders.py', GPT, True),
    ('art/icons/res-wood-*.png', 'ChatGPT N-27 wood icon, sliced by scripts/slice_grid_orders.py', GPT, True),
    ('art/props/portal-*.png', 'ChatGPT N-28 meadow portal, sliced by scripts/slice_grid_orders.py', GPT, True),
    ('art/props/boulder-*.png', 'ChatGPT N-29 boulders + rubble (stone parked), sliced by scripts/slice_grid_orders.py', GPT, True),
    ('art/props/tree-[rpa]*.png', 'ChatGPT N-26 meadow trees, sliced by scripts/slice_grid_orders.py', GPT, True),
    ('art/props/stump-*.png', 'ChatGPT N-26 stumps, sliced by scripts/slice_grid_orders.py', GPT, True),
    ('art/props/rubble-*.png', 'ChatGPT N-26 rubble (stone parked), sliced by scripts/slice_grid_orders.py', GPT, True),
    ('art/dungeon/skills/*.png', 'ChatGPT N-23 skill symbols, sliced by scripts/slice_grid_orders.py', GPT, True),
    ('art/dungeon/items/*.png', 'ChatGPT N-23 loot items, sliced by scripts/slice_grid_orders.py', GPT, True),
    ('art/icons/ui/dash-16.png', 'ChatGPT N-24 dash symbol, sliced by scripts/slice_grid_orders.py', GPT, True),
    ('art/icons/mouth-*.png', 'ChatGPT N-25 mouths, sliced by scripts/slice_grid_orders.py', GPT, True),
    ('art/meadow/speed-*.png', 'ChatGPT N-15b speed power-up, sliced by scripts/slice_grid_orders.py', GPT, True),
    ('art/dungeon/ui/btn-round-*-[12][48].png', 'ChatGPT N-19b round button rings, sliced by scripts/slice_grid_orders.py', GPT, True),
    ('art/icons/ui/*.png', 'ChatGPT N-17 UI icons, sliced by scripts/slice_grid_orders.py', GPT, True),
    ('art/icons/state/*.png', 'ChatGPT N-18 state badges, sliced by scripts/slice_grid_orders.py', GPT, True),
    ('art/props/berry-bush-[0-9]*.png', 'ChatGPT N-16 berry bush, sliced by scripts/slice_grid_orders.py', GPT, True),
    ('art/props/berry-bush-picked-*.png', 'ChatGPT N-16 berry bush, sliced by scripts/slice_grid_orders.py', GPT, True),
    ('art/dungeon/ui/*.png', 'ChatGPT N-19 / N-21 dungeon UI, sliced by scripts/slice_grid_orders.py', GPT, True),
    ('art/lobby/*.png', 'ChatGPT N-20 lobby, sliced by scripts/slice_grid_orders.py', GPT, True),
    ('art/dungeon-end*.png', 'ChatGPT N-22 dungeon end screen', GPT, True),
    ('art/dungeon/weapons/[dwsc]*-[13][62].png', 'ChatGPT N-11 class weapons, sliced by scripts/slice_grid_orders.py', GPT, True),
    ('art/dungeon/icons/*.png', 'ChatGPT N-12 move/mode icons, sliced by scripts/slice_grid_orders.py', GPT, True),
    ('art/dungeon/fx/*.png', 'ChatGPT N-13 combat FX (round 2), sliced by scripts/slice_grid_orders.py', GPT, True),
    ('art/dungeon/boss-*.png', 'ChatGPT N-14 boss intro, sliced by scripts/slice_grid_orders.py', GPT, True),
    ('art/meadow/*.png', 'ChatGPT N-15 meadow extras, sliced by scripts/slice_grid_orders.py', GPT, True),
    ('art/ninja/*', 'Ninja crop: Ninja Adventure rect cut by scripts/ninja_crops.py (Code)', 'CC0 1.0 (Ninja Adventure)', True),
    ('art/dungeon/card-class-*.png', 'ChatGPT N-5 class cards, sliced by scripts/slice_cards.py', GPT, True),
    ('art/dungeon/weapons/ninja-*.png', 'Claude-drawn: scripts/ninja_weapons.py (Ninja palette)', OWN, None),
    ('art/dungeon/weapons/*.png', 'ChatGPT N-4 hovering weapons, sliced by scripts/slice_weapons.py', GPT, True),
    ('art/dungeon/*.png', 'Claude-drawn: scripts/dungeon_art.py', OWN, False),
    ('art/dungeon/skills/*.png', 'Claude-drawn: scripts/dungeon_art.py', OWN, False),
    ('art/props/berry-bush-ninja*.png', 'Claude-drawn: scripts/berry_bush.py (berries on a Ninja bush)', OWN, False),
    ('art/props/*.png', 'ChatGPT order 30 (map props), sliced by scripts/slice_sheet.py', GPT, False),
    ('art/ui/*.png', 'ChatGPT order 10 (UI kit), sliced by scripts/slice_sheet.py', GPT, False),
    ('art/icons/check.png', 'ChatGPT N-10, sliced by scripts/slice_n_orders.py', GPT, True),
    ('art/icons/*.png', 'ChatGPT order 20 (icons), sliced by scripts/slice_sheet.py', GPT, False),
    ('art/gather/star*.png', 'ChatGPT N-10, sliced by scripts/slice_n_orders.py', GPT, True),
    ('art/gather/*.png', 'Claude-drawn: scripts/gather_art.py', OWN, False),
    ('art/base/cottage-1.png', 'Cut from ChatGPT loading art by scripts/cut_loading_house.py', GPT, False),
    ('art/base/*.png', 'Claude-drawn: scripts/base_art.py', OWN, False),
    ('art/fine/icons/*.png', 'Claude-drawn: scripts/hint_icons.py / fine_art.py', OWN, False),
    ('art/fine/*', 'Claude-drawn: scripts/fine_art.py', OWN, False),
    ('art/fx/*.png', 'Claude-drawn: scripts/fx_sheet.py', OWN, False),
    ('art/props-winter/tree-snow-pine.png', 'Kenney Tiny Ski cut by scripts/winter_props.py', CC0K, False),
    ('art/props-winter/tree-snow-small.png', 'Kenney Tiny Ski cut by scripts/winter_props.py', CC0K, False),
    ('art/props-winter/tree-bare.png', 'Kenney Tiny Ski cut by scripts/winter_props.py', CC0K, False),
    ('art/props-winter/snowman.png', 'Kenney Tiny Ski cut by scripts/winter_props.py', CC0K, False),
    ('art/props-winter/rock-snow.png', 'Kenney Tiny Ski cut by scripts/winter_props.py', CC0K, False),
    ('art/props-winter/*.png', 'Claude-drawn: scripts/winter_props.py', OWN, False),
    ('art/totems/*.png', 'ChatGPT order 40 (totems), sliced by scripts/slice_sheet.py', GPT, False),
    ('art/enemies/*.png', 'ChatGPT order 50 (goo enemies), sliced by scripts/slice_sheet.py', GPT, False),
    ('art/lobby.png', 'ChatGPT order 60 (lobby)', GPT, False),
    ('art/title.png', 'ChatGPT N-2 start screen, landscape', GPT, True),
    ('art/start-portrait.png', 'ChatGPT N-2 start screen, portrait', GPT, True),
    ('art/loading*.png', 'ChatGPT N-3 loading screen', GPT, True),
    ('art/logo*.png', 'ChatGPT N-1 logo (A/B/old = earlier variants)', GPT, True),
    ('art/victory.png', 'ChatGPT N-6 end screen', GPT, True),
    ('art/app-icon/*.png', 'ChatGPT N-7 app icon, resized by scripts/slice_n_orders.py', GPT, True),
    ('art/map-*.png', 'ChatGPT N-8 map picker (order cancelled)', GPT, True),
    ('art/mini/*.png', 'ChatGPT N-9 Bärregn background', GPT, True),
    ('icon-*.png', 'ChatGPT app icon (old, before N-7)', GPT, False),
    ('apple-touch-icon.png', 'ChatGPT app icon (old, before N-7)', GPT, False),
    ('assets/kenney-*/*.png', 'Kenney pack (see public/assets/LICENSES.md)', CC0K, False),
]


def source_of(rel):
    for pat, src, lic, ok in SOURCES:
        if fnmatch.fnmatch(rel, pat):
            return src, lic, ok
    return 'other (unknown)', '?', False


def code_texts():
    out = {}
    for d, _, fs in os.walk(os.path.join(ROOT, 'src')):
        for f in fs:
            if re.search(r'\.(ts|css)$', f) and '.test.' not in f:
                p = os.path.join(d, f)
                out[os.path.relpath(p, ROOT)] = open(p, encoding='utf-8').read()
    out['index.html'] = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
    return out


def uses(rel, texts):
    """Code refs (file:line) to public/<rel>."""
    stem = os.path.basename(rel)[:-4]
    d = os.path.dirname(rel)
    hits = []
    for f, t in texts.items():
        for i, line in enumerate(t.split('\n')):
            hit = rel in line
            if not hit and d:  # template prefix: `art/dungeon/card-class-${c}.png`
                for m in re.finditer(re.escape(d) + r"/([A-Za-z0-9_-]*)\$\{", line):
                    if stem.startswith(m.group(1)):
                        hit = True
            if not hit and re.search(r"['\"`/]" + re.escape(stem) + r"['\"`.]", line):  # any quoted stem counts (preload lists)
                hit = True
            if hit:
                hits.append(f'{f}:{i + 1}')
    return hits


def ninja_uses(texts):
    """Ninja files referenced anywhere (full path under the pack, or a 2-segment tail without .png, e.g. 'Spell/Heal')."""
    alltext = '\n'.join(texts.values())
    used = {}
    base = os.path.join(PUB, NA)
    for d, _, fs in os.walk(base):
        for f in fs:
            if not f.lower().endswith(IMG):
                continue
            rel = os.path.relpath(os.path.join(d, f), base).replace(os.sep, '/')
            tail2 = '/'.join(rel[:-4].split('/')[-2:])
            if rel in alltext or ("'" + tail2 + "'") in alltext or (tail2 + ".png") in alltext:
                used[rel] = True
    return used


def size(p):
    try:
        w, h = Image.open(p).size
        return f'{w}x{h}'
    except Exception:
        return '?'


def status(rel, used, ok):
    if rel.startswith('art/props/berry-bush-ninja'):
        return 'replace (Stefan dislikes; Code uses a Ninja bush + Ninja berry)'
    if not used and ok and not rel.startswith('art/map-'):
        return 'keep (approved ChatGPT, not wired yet)'
    if not used:
        return 'delete'
    if rel.startswith('art/dungeon/weapons/ninja-'):
        return 'keep (pending Stefan rating)'
    if ok:
        return 'keep'
    return 'replace (see OLD_ART_CHECKLIST)'


def own_files():
    out = []
    for d, _, fs in os.walk(PUB):
        if os.path.relpath(d, PUB).replace(os.sep, '/').startswith(NA.rstrip('/')):
            continue
        for f in fs:
            if f.lower().endswith(IMG):
                out.append(os.path.relpath(os.path.join(d, f), PUB).replace(os.sep, '/'))
    return sorted(out)


def runtime():
    """docs/asset-runtime.json from scripts/asset_runtime.cjs (None if it was never run)."""
    import json
    p = os.path.join(ROOT, 'docs', 'asset-runtime.json')
    if not os.path.exists(p):
        return None
    j = json.load(open(p, encoding='utf-8'))
    return j, set(j['requested']), set(j['shown'])


def rt_state(rel, hits, rt):
    if rt is None:
        return '?'
    _, req, shown = rt
    if rel in shown:
        return 'IN GAME'
    if hits:
        return 'CODE ONLY' + (' (loaded, not shown)' if rel in req else '')
    return 'UNUSED'


def main():
    texts = code_texts()
    rt = runtime()
    rtc, in_game = {}, {'Claude-drawn': [], 'Kenney': []}
    rows, counts, unused = [], {}, []
    for rel in own_files():
        src, lic, ok = source_of(rel)
        hits = uses(rel, texts)
        st = status(rel, bool(hits), ok)
        kind = src.split(':')[0].split(' ')[0] if not src.startswith('Claude') else 'Claude-drawn'
        kind = {'ChatGPT': 'ChatGPT', 'Kenney': 'Kenney', 'Cut': 'ChatGPT', 'Ninja': 'Ninja crop'}.get(kind, kind)
        counts[kind] = counts.get(kind, 0) + 1
        where = ', '.join(hits[:3]) + (f' (+{len(hits) - 3})' if len(hits) > 3 else '') if hits else 'UNUSED'
        state = rt_state(rel, hits, rt)
        rtc[state.split(' (')[0]] = rtc.get(state.split(' (')[0], 0) + 1
        if state == 'IN GAME' and kind in in_game:
            in_game[kind].append(rel)
        rows.append(f'| `{rel}` | {size(os.path.join(PUB, rel))} | {src} | {lic} | {state} | {where} | {st} |')
        if st == 'delete':
            unused.append(rel)
    nused = ninja_uses(texts)
    base = os.path.join(PUB, NA)
    folders = {}
    for d, _, fs in os.walk(base):
        for f in fs:
            if f.lower().endswith(IMG):
                rel = os.path.relpath(os.path.join(d, f), base).replace(os.sep, '/')
                folders.setdefault(rel.split('/')[0] if '/' in rel else '', []).append(rel)
    nrows = []
    for rel in sorted(nused):
        nst = rt_state(NA + rel, True, rt)
        nrows.append(f'| `{NA}{rel}` | {size(os.path.join(base, rel))} | Ninja Adventure | CC0 1.0 | {nst} | referenced by code | keep |')
    ntotal = sum(len(v) for v in folders.values())
    counts['Ninja'] = ntotal
    frows = [f'| `{NA}{k}/**` | {len(v)} files | Ninja Adventure (Pixel-boy & AAA) | CC0 1.0 | {sum(1 for r in v if r in nused)} referenced (rows above) | keep (the art source) |'
             for k, v in sorted(folders.items()) if k]
    frows += [f'| `{NA}{r}` | {size(os.path.join(base, r))} | Ninja Adventure (pack preview / palette) | CC0 1.0 | UNUSED | keep (reference) |'
              for r in sorted(folders.get('', []))]
    arows = []
    adir = os.path.join(ROOT, 'archive')
    for d, _, fs in os.walk(adir):
        for f in sorted(fs):
            if f.lower().endswith(IMG):
                rel = os.path.relpath(os.path.join(d, f), adir).replace(os.sep, '/')
                src, lic, _ = source_of(rel)
                arows.append(f'| `archive/{rel}` | {size(os.path.join(d, f))} | {src} | {lic} | archived (not shipped) |')
    arows.sort()
    md = ['# Asset index: every image under `public/`, with source and license', '',
          'Generated by `python3 scripts/asset_index.py` (re-run after adding, slicing or removing art); `src/assetIndex.test.ts`',
          'fails if an image under `public/` is missing here. Licenses: `public/assets/LICENSES.md`. Replacement plan for old art:',
          '`docs/OLD_ART_CHECKLIST.md`. Ninja rects: `docs/ART_MAP.md`.', '',
          '- **Status:** keep / replace (old art still used, a Ninja or ChatGPT replacement is mapped) / delete (no code',
          '  reference found: a candidate only, Lead decides).',
          '- "Used where" is a grep of `src/` + `index.html`: exact path, template prefix, or the file stem quoted ANYWHERE (preload lists count; safe side).',
          '- **Runtime** (`node scripts/asset_runtime.cjs`, the whole e2e suite with a hook): IN GAME = drawn on screen (visible DOM',
          '  image / CSS background or border image / canvas icon, or a WebGL texture bound at a Phaser draw call); CODE ONLY =',
          '  referenced but never shown in the run (remove the reference and the file); UNUSED = no reference and never shown.',
          *(['', f'**Runtime run:** {rt[0]["date"]}, e2e {rt[0]["e2e"]}. **Own files:** ' + ' / '.join(f'{k} {v}' for k, v in sorted(rtc.items())) + '.',
             '', '**Claude-drawn still IN GAME** (' + str(len(in_game['Claude-drawn'])) + '): ' + (', '.join(f'`{f}`' for f in in_game['Claude-drawn']) or 'none'),
             '', '**Kenney still IN GAME** (' + str(len(in_game['Kenney'])) + '): ' + (', '.join(f'`{f}`' for f in in_game['Kenney']) or 'none')] if rt else []), '',
          '**Counts by source:** ' + ' / '.join(f'{k} {v}' for k, v in sorted(counts.items())) +
          f' (Ninja: {len(nused)} referenced by code). **Own files:** {len(rows)}, {len(unused)} delete candidates.', '',
          '## Own files (art, Kenney, app icons)', '', '| Path (public/) | Size | Source | License | Runtime | Used where | Status |',
          '|---|---|---|---|---|---|---|', *rows, '',
          '## Ninja Adventure files referenced by code', '', '| Path (public/) | Size | Source | License | Runtime | Used where | Status |',
          '|---|---|---|---|---|---|---|', *nrows, '',
          '## Ninja Adventure folders (cover every other pack file)', '', '| Folder | Files | Source | License | Used | Status |',
          '|---|---|---|---|---|---|', *frows, '',
          f'## Archived (`blobz/archive/`, not shipped): {len(arows)} files', '', 'See `archive/README.md`.', '',
          '| Path | Size | Source | License | Status |', '|---|---|---|---|---|', *arows, '',
          '## Delete candidates (UNUSED, Lead decides)', '', *[f'- `{u}`' for u in unused], '']
    open(OUT, 'w', encoding='utf-8').write('\n'.join(md))
    print(OUT, counts, 'ninja referenced', len(nused), 'own', len(rows), 'unused', len(unused))


if __name__ == '__main__':
    main()
