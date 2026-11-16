// The look of the three resources, ONE line each (PLAN.md step 2; Stefan picks from Art's option sheet, Lead swaps).
// Used everywhere: on the ground and carried (game.ts), in the HUD, edge arrows and build costs (main.ts, index.html).
// To swap: change the line, then run `python3 scripts/ninja_crops.py` (it reads these lines and writes the HUD
// pictures art/ninja/res-*.png) and `python3 scripts/asset_index.py`.
// Rules: wood = a log (not a branch), food = never Nut2, stone = one clean rock (no extra mini stone).
/** A Ninja crop (file + rect), or a ready picture pair: `world` (16 px, shown at 2x on the ground and 1x carried) and
 *  `hud` (32 px, the HUD / build costs / end screen). */
export type ResArt = { file: string; x: number; y: number; w: number; h: number } | { world: string; hud: string };
export const isImgArt = (a: ResArt): a is { world: string; hud: string } => 'world' in a;

export const RES_ART: Record<'wood' | 'stone' | 'berry', ResArt> = {
  wood: { world: 'art/icons/res-wood-16.png', hud: 'art/icons/res-wood-16.png' }, // ChatGPT N-27 log (Stefan 2026-11-15); was the Ninja crop tileset_camp.png 0,0 32x16
  stone: { file: 'Backgrounds/Tilesets/TilesetNature.png', x: 288, y: 144, w: 16, h: 16 }, // rock, grey small
  berry: { world: 'art/icons/res-berry-16.png', hud: 'art/icons/res-berry-16.png' }, // ChatGPT N-41 berries (Stefan + Alea 2026-11-16: no more meat); was the Ninja Meat.png crop
};

/** HUD picture for a resource (cut by scripts/ninja_crops.py from RES_ART). */
export const resIcon = (k: keyof typeof RES_ART) => {
  const a = RES_ART[k];
  return isImgArt(a) ? a.world : `art/ninja/res-${k}.png`; // the 16 px file, sized to whole device px (snapAll)
};
