// E2E (Code 2): the dungeon map, floors 3-4. Body in dungeon-map-lib.cjs.
// Usage: npm run build && npx vite preview --port 4173 &  node e2e/dungeon-map-deep.cjs [baseUrl] [shotDir]
require('./dungeon-map-lib.cjs')({ floors: [3, 4] });
