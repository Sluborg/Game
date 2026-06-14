# Majesty — Day by Day (web)

A turn-based web port of the Kotlin/Compose idle game in `../app`. Build,
recruit heroes, and end each day to collect gold and face threats.

## Run it

```bash
npm install      # once
npm run dev      # hot-reloading dev server (the update loop)
npm test         # Vitest on the pure game logic (the test loop)
npm run build    # type-check + production bundle
```

No Gradle, Android SDK, or emulator — just Node.

## Layout

- `src/game/` — pure, framework-free, unit-tested game logic (state, economy,
  the day engine, combat placeholder, persistence).
- `src/ui/` — React DOM components.

See [`MIGRATION.md`](./MIGRATION.md) for the Kotlin → TS/React mapping and what
changed (idle → day system, fresh economy, combat stubbed). The combat system is
a placeholder; [`COMBAT_DESIGN_PROMPT.md`](./COMBAT_DESIGN_PROMPT.md) is a prompt
to design the real one in a separate chat.
