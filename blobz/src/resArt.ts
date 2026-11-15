// The look of the three resources, ONE line each (PLAN.md step 2; Stefan picks from Art's option sheet, Lead swaps).
// Used everywhere: on the ground and carried (game.ts), in the HUD, edge arrows and build costs (main.ts, index.html).
// To swap: change the line, then run `python3 scripts/ninja_crops.py` (it reads these lines and writes the HUD
// pictures art/ninja/res-*.png) and `python3 scripts/asset_index.py`.
// Rules: wood = a log (not a branch), food = never Nut2, stone = one clean rock (no extra mini stone).
export interface ResArt { file: string; x: number; y: number; w: number; h: number }

export const RES_ART: Record<'wood' | 'stone' | 'berry', ResArt> = {
  wood: { file: 'Backgrounds/Tilesets/tileset_camp.png', x: 0, y: 0, w: 32, h: 16 }, // log, brown
  stone: { file: 'Backgrounds/Tilesets/TilesetNature.png', x: 288, y: 144, w: 16, h: 16 }, // rock, grey small
  berry: { file: 'Items/Food/Meat.png', x: 0, y: 0, w: 15, h: 15 }, // food
};

/** HUD picture for a resource (cut by scripts/ninja_crops.py from RES_ART). */
export const resIcon = (k: keyof typeof RES_ART) => `art/ninja/res-${k}.png`;
