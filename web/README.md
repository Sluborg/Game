# Godblood (web)

The web client. The start screen has two entries: **Combat Test** (the tick-based
battle engine) and **Node Test** (a minimal world-map slice that loads art from
the Art Library).

## Run it

```bash
npm install      # once
npm run dev      # hot-reloading dev server
npm test         # Vitest on the pure logic (live art smoke skipped by default)
ART_LIVE=1 npm test   # also run the live ArtLibrary manifest smoke test
npm run build    # type-check + production bundle
```

No Gradle, Android SDK, or emulator — just Node.

## Layout

- `src/game/battle/` — pure, framework-free, unit-tested tick-based combat engine.
- `src/ui/combat/` — the **Combat Test** feature (React).
- `src/ui/node/` — the minimal **Node Test** screen.
- `src/art/` — **ArtCatalog**, the visual library client. Art lives in the separate
  Sluborg/ArtLibrary repo and is referenced by URL, never vendored here. See
  [`docs/ART.md`](./docs/ART.md).

> Historical: [`MIGRATION.md`](./MIGRATION.md) and
> [`COMBAT_DESIGN_PROMPT.md`](./COMBAT_DESIGN_PROMPT.md) document the earlier
> Kotlin → TS/React port and the combat design brief. The old day/economy
> "campaign" and the guild "Asset Report" sim were removed when the start screen
> was reset around the Combat Test + Node Test slices.
