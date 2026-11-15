// E2E (Code 2): the dungeon map, floors 1-2 (no black holes, the camera follows). Body in dungeon-map-lib.cjs.
// Usage: npm run build && npx vite preview --port 4173 &  node e2e/dungeon-map.cjs [baseUrl] [shotDir]
require('./dungeon-map-lib.cjs')({ floors: [1, 2] });
