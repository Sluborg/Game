# The art loop — needs ↔ done

Two repos, one loop. This repo (`Sluborg/game`) **declares** what art the game needs and **consumes**
it; the separate repo `Sluborg/ArtLibrary` **produces** it. They stay in sync through a manifest and a
reconcile script. No image bytes are ever committed here — ArtLibrary is read-only from this side.

```
  game declares NEEDED            ArtLibrary produces            game consumes
  ───────────────────             ───────────────────            ─────────────
  /art-needs.json         ──▶     asset-index.json      ──▶      web/src/art (ArtCatalog)
  docs/ROADMAP.md                 (collection            ◀──      resolves each slug's raw_url,
  (per-feature slugs)             "AssetReport")                  falls back to a placeholder
        │                               │
        └──────────  npm run reconcile  ┘   ← compares NEEDED vs DONE, exits non-zero on drift
```

## The three artifacts

| Artifact | Role | Path |
| --- | --- | --- |
| **Roadmap** | Features/milestones, each listing the art slugs it needs | [`docs/ROADMAP.md`](./ROADMAP.md) |
| **Declared needs** (NEEDED) | Machine-readable list of every slug the game expects | [`/art-needs.json`](../art-needs.json) |
| **Reconcile** | Compares NEEDED vs the live manifest (DONE), gates CI | [`/scripts/reconcile-art.mjs`](../scripts/reconcile-art.mjs) |

`art-needs.json` entries are `{ slug, kind (node|resource|ui), description, feature }`. Node/resource
slugs are seeded from `web/src/art/enums.ts` (`NodeType` / `ResourceType`); the parity test
`web/src/art/art-needs.test.ts` keeps the two in sync.

## DONE — the authoritative source

`ArtLibrary/asset-index.json` is the source of truth for what art **exists**. A slug is DONE when the
manifest has an entry with `collection == "AssetReport"` and a non-empty `raw_url`. The slug for a
manifest entry is derived from its filename the same way the game's `ArtCatalog` does
(`web/src/art/slug.ts`): `node-<slug>.png → <slug>`, `icon-resource-<slug>.png → <slug>` (only when the
remainder is a known type), otherwise the filename stem (`map-overworld.png → map-overworld`).

> ArtLibrary also keeps human worklists at `Games/AssetReport/{Buildings,Resources,UI}.md`. The
> reconcile script can optionally warn on roster drift against `Buildings.md`, but that check is
> **non-fatal** — `asset-index.json` is the only thing that decides DONE.

## Running the reconcile

```
npm run reconcile        # from the repo root
```

It prints a row per slug — `SLUG` · `KIND` · `NEEDED?` · `DONE?` · **status** — then a summary, and exits:

| status | meaning |
| --- | --- |
| `ok` | NEEDED and DONE — art exists for a declared need |
| `missing-art` | NEEDED but not produced yet — declare-then-produce (the normal backlog state) |
| `orphan-art` | produced but not declared here — either add it to `art-needs.json` or it's stray |

**Exit code:** `0` only when everything is `ok`; `1` on any `missing-art`/`orphan-art` (drift); `2` on a
fetch/parse error. Because art is still being produced, reconcile intentionally exits non-zero today —
so it is **not** wired into CI as a blocking gate yet; enable it once the backlog is cleared.

**Which ref it checks:** the script reads `ART_REPO` / `ART_REF` / `ART_COLLECTION` from
`web/src/art/config.ts`, so the gate always validates the *same* manifest the game consumes — including
a release build that pins `ART_REF` to a commit SHA. Override for a one-off check with
`ART_REF=<sha> npm run reconcile`.

## Consuming art at runtime

How the game actually loads and displays a visual (the `ArtCatalog` client, caching, placeholders,
ref-pinning for reproducible builds) is documented in **[`web/docs/ART.md`](../web/docs/ART.md)**. In
short: `loadArtCatalog()` → `catalog.byNode(NodeType.HomeKeep)` returns a real `Visual` once the art
exists, or a labelled placeholder until then — so a `missing-art` slug degrades gracefully instead of
crashing.
