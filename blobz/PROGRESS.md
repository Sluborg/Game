# Blobz progress

## 2026-11-14 - First playable (milestones 10 + 20)
- Branch: `claude/mobile-game-5-players-8qthjq`
- Files: `blobz/` (new: sim, net, game scene, controls, art, sfx, menu/lobby/HUD, tests, Kenney Tiny Town CC0),
  `.github/workflows/deploy.yml` (Blobz temporarily at Pages root, Asset Report main at `/asset-report/`).
- Built: host/join with 4-letter code (PeerJS), up to 5 blobz, glide physics + dash, tree bumps drop wood,
  items (wood/mushroom/coin) carried 3 at a time to base, big crystals need 2+ blobz, speed + magnet power-ups,
  3-minute round, team score with 1-3 stars, skins (8 colors x 5 hats), sound blips.
- Verified: `npm run build` green, 5 vitest tests, headless Chromium with 3 players (host + 2 joiners):
  lobby, sync, movement, pickup, end screen. Screenshots in `docs/screenshots/`.
- 2026-11-14: switched to Kenney pixel art: Tiny Dungeon slime recolored per skin + pixel hats, potions as power-ups, treasure chest as co-op carry, Tiny Farm decor, Tiny Battle flags at base. Packs added: Tiny Dungeon, Farm, Battle, Ski (CC0).
- Open: real-phone test on home Wi-Fi; tune star thresholds after first family session.
