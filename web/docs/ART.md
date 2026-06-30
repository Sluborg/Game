# Art / Visual Library (ArtCatalog)

## Where art lives

All game visuals live in the external repo **[Sluborg/ArtLibrary](https://github.com/Sluborg/ArtLibrary)**, a Git-native DAM — **not** in this repo. The game references them at runtime by `raw_url` from the manifest. **No image bytes are committed here.**

- Manifest: `https://raw.githubusercontent.com/Sluborg/ArtLibrary/main/asset-index.json`
- Our game's visuals are the entries with `collection == "AssetReport"`.

## Terminology (important)

In this game, **"asset" is a reserved gameplay concept** (quests, ledger line-items, requisitions). To avoid collision:

- An image in ArtLibrary is a **"visual"**.
- The module that loads them is **`ArtCatalog`** (`src/art/`) — **never** `AssetManager`.

## How it works

`ArtCatalog` (`web/src/art/`):

1. Fetches `asset-index.json` and filters to `collection == "AssetReport"`.
2. Derives a **stable slug** per entry — the kebab-case join key shared by art + code:
   - `node-<x>.png` → `<x>` **when `<x>` is a known `NodeType`** (e.g. `node-home-keep.png` → `home-keep`)
   - `icon-resource-<x>.png` → `<x>` **when `<x>` is a known `ResourceType`** (e.g. `icon-resource-wood.png` → `wood`)
   - otherwise the filename stem (`title-screen.jpg` → `title-screen`, `map-overworld-v2.png` → `map-overworld-v2`, and reference visuals like `node-design-sheet.png` → `node-design-sheet`)
3. Indexes by slug / kind / tag, and exposes typed lookups:
   ```ts
   const catalog = await loadArtCatalog();
   catalog.bySlug("map-overworld-v2");   // a real Visual (raw_url, dimensions, sha256)
   catalog.byNode(NodeType.HomeKeep);     // placeholder today (no node art produced yet)
   catalog.byResource(ResourceType.WOOD); // placeholder today
   catalog.byKind("illustration");        // present visuals of a kind
   catalog.byTag("overworld");
   ```
4. **Missing slug → a graceful placeholder** (a labelled inline-SVG `Visual` with `isPlaceholder: true`). The manifest is the source of truth for what *exists*; many visuals are still being produced (see ArtLibrary's `Games/AssetReport/{Buildings,Resources,UI}.md` worklists). The loader never crashes on a missing slug.

## Shared vocabulary (enums)

`src/art/enums.ts` defines `NodeType`, `Category`, `ResourceType`, and a `NODE_CATEGORY` map. The string enum **values are the slugs**, and they match ArtLibrary's `Games/AssetReport/GameArtBible.md` exactly. If the manifest ever diverges, leave a `TODO` and flag it — don't silently change these.

## Pinning the source ref (reproducibility)

`raw .../main/...` URLs are mutable. `src/art/config.ts` has a single `ART_REF` constant:

- **`"main"`** (default) — dev tracks the latest art.
- **a 40-char commit SHA** — for a release build, pin a frozen, reproducible art set. `pinRawUrl()` rewrites each `raw_url`'s ref segment to the pinned SHA.

## Adding / refreshing art

1. Add and commit the image to **Sluborg/ArtLibrary** (it regenerates `asset-index.json`). Don't add art to this repo.
2. Follow the filename conventions (`node-<type>.png`, `icon-resource-<type>.png`) so the slug maps onto a `NodeType` / `ResourceType`.
3. Locally, refresh by calling `loadArtCatalog({ force: true })` or `clearManifestCache()` (the cache TTL is 1h otherwise).
4. Validate against the live library: `ART_LIVE=1 npm test`.

## Cache

The manifest is cached in-memory and (in the browser) mirrored to `localStorage` with a 1h TTL for fast reloads and offline fallback. `web/.artcache/` is **gitignored and disposable** (reserved for any local on-disk snapshots). Image bytes are served via the browser's HTTP cache from `raw_url`. Nothing here is ever committed.
