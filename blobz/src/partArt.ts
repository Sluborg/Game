// Designer tiles that show ONLY the item (PLAN step 3): eyes alone, mouth alone, hat alone; the shape tile is the
// body with a neutral face. Built from blob.ts's pixel grid (Art's file, only read here): a pixel belongs to the item
// when it does not change with the body colour (so it is not body) and it changes between the options of this part
// (so it is not another part). Face parts are a few pixels, so they get a bigger whole scale (SCALE).
import { blobEl, blobGrid, COLORS, type BlobLook } from './blob';

export type TilePart = 'shape' | 'eyes' | 'mouth' | 'hat';
const COUNT: Record<Exclude<TilePart, 'shape'>, number> = { eyes: 5, mouth: 5, hat: 15 };
/** Whole scale per part: face parts are only a few pixels, so they are shown bigger to read on a 72 px tile. */
const SCALE: Record<Exclude<TilePart, 'shape'>, number> = { eyes: 6, mouth: 8, hat: 4 };
const cache = new Map<string, string>();

/** Neutral face for the shape tiles: dot eyes, calm mouth, no hat. */
export const NEUTRAL = { eyes: 0, mouth: 2, hat: 0 };

function isolate(look: BlobLook, part: Exclude<TilePart, 'shape'>, i: number): (string | null)[][] {
  const grid = (color: number, k: number) => blobGrid({ ...look, color, [part]: k, ...(part === 'hat' ? {} : { hat: 0 }) });
  const a = grid(COLORS[0], i), b = grid(COLORS[1], i);
  const none = grid(COLORS[0], 0); // hats: option 0 = no hat
  const others = Array.from({ length: COUNT[part] }, (_, k) => k).filter((k) => k !== i).map((k) => grid(COLORS[0], k));
  return a.map((row, y) => row.map((col, x) => {
    if (!col || col !== b[y][x]) return null; // empty or body (changes with the colour)
    // hats: everything that differs from "no hat" (option 0), so the head outline stays out;
    // eyes / mouth (no "none" option): what differs from at least one other option of the part
    if (part === 'hat') return i !== 0 && none[y][x] !== col ? col : null;
    return others.some((o) => o[y][x] !== col) ? col : null; // same in every option = another part
  }));
}

function toPng(g: (string | null)[][], SCALE: number): string | null {
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  g.forEach((row, y) => row.forEach((c, x) => { if (c) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } }));
  if (x1 < 0) return null;
  const c = document.createElement('canvas');
  c.width = (x1 - x0 + 1) * SCALE; c.height = (y1 - y0 + 1) * SCALE;
  const ctx = c.getContext('2d')!;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const col = g[y][x];
    if (col) { ctx.fillStyle = col; ctx.fillRect((x - x0) * SCALE, (y - y0) * SCALE, SCALE, SCALE); }
  }
  return c.toDataURL('image/png');
}

/** The picture for one designer tile. A hat option without pixels ("none") gets an empty tile. */
export function partTile(look: BlobLook, part: TilePart, i: number): HTMLElement {
  if (part === 'shape') return blobEl({ ...look, shape: i, ...NEUTRAL });
  const key = `${part}|${i}|${look.shape}`;
  let url = cache.get(key);
  if (url === undefined) { url = toPng(isolate({ ...look, color: COLORS[0] }, part, i), SCALE[part]) ?? ''; cache.set(key, url); }
  const s = document.createElement('span');
  s.className = 'part part-' + part;
  if (url) { const img = new Image(); img.src = url; img.alt = ''; img.draggable = false; s.append(img); }
  else s.classList.add('none');
  return s;
}
