// The meadow water corner on a 32 px tile grid: which shore piece each water tile needs.
// Ported from scripts/water_variants.py shore_tile() (8-neighbour shore logic). Art-agnostic: the renderer maps
// a Shore to frames of whichever water art Stefan picks on the board (A Tiny Battle 2x, B fine 2x, C free-form).
import { WORLD_H, WORLD_W } from './sim';

export const WATER_TILE = 32;
/** Where the land is around a water tile. Outer edges/corners: land on that side ('nw' = land north AND west).
 *  Inner corners ('inw' ...): only the diagonal neighbour is land. 'open' / 'open2': all water (two looks). */
export type Shore = 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'w' | 'e' | 'inw' | 'ine' | 'isw' | 'ise' | 'open' | 'open2';
interface Rect { x0: number; y0: number; x1: number; y1: number }

export function shoreTile(isWater: (tx: number, ty: number) => boolean, tx: number, ty: number): Shore {
  const land = (dx: number, dy: number) => !isWater(tx + dx, ty + dy);
  const n = land(0, -1), s = land(0, 1), w = land(-1, 0), e = land(1, 0);
  if (n && w) return 'nw';
  if (n && e) return 'ne';
  if (s && w) return 'sw';
  if (s && e) return 'se';
  if (n) return 'n';
  if (s) return 's';
  if (w) return 'w';
  if (e) return 'e';
  if (land(-1, -1)) return 'inw';
  if (land(1, -1)) return 'ine';
  if (land(-1, 1)) return 'isw';
  if (land(1, 1)) return 'ise';
  return (tx * 7 + ty * 3) % 4 ? 'open' : 'open2';
}

/** Every on-screen water tile of `rects` with its shore piece. Water that runs off the map edge counts as water
 *  beyond the edge (no shore drawn along the world border). */
export function waterTiles(rects: Rect[]): { tx: number; ty: number; shore: Shore }[] {
  const T = WATER_TILE, cols = WORLD_W / T, rows = WORLD_H / T;
  const inRect = (tx: number, ty: number) => rects.some((r) => (tx + 0.5) * T > r.x0 && (tx + 0.5) * T < r.x1 && (ty + 0.5) * T > r.y0 && (ty + 0.5) * T < r.y1);
  const clampIdx = (v: number, max: number) => Math.max(0, Math.min(max - 1, v));
  const isWater = (tx: number, ty: number) => inRect(clampIdx(tx, cols), clampIdx(ty, rows));
  const out: { tx: number; ty: number; shore: Shore }[] = [];
  for (let ty = 0; ty < rows; ty++) for (let tx = 0; tx < cols; tx++) if (inRect(tx, ty)) out.push({ tx, ty, shore: shoreTile(isWater, tx, ty) });
  return out;
}
