// E2E (Code 2): the dungeon map, floor 5 (the boss floor) + beating the boss unlocks Dungeon 2. Body in dungeon-map-lib.cjs.
// Usage: npm run build && npx vite preview --port 4173 &  node e2e/dungeon-map-boss.cjs [baseUrl] [shotDir]
require('./dungeon-map-lib.cjs')({ floors: [5], unlock: true });
