// Kenney sheets for the DOM UI (icons, pixel font). Blobz themselves live in blob.ts.

// Kenney sheets used by the DOM UI (menu, HUD, icons). Phaser loads its own copies.
const SHEETS = {
  town: { url: 'assets/kenney-tiny-town/tilemap_packed.png', tile: 16, cols: 12 },
  dungeon: { url: 'assets/kenney-tiny-dungeon/tilemap_packed.png', tile: 16, cols: 12 },
  farm: { url: 'assets/kenney-tiny-farm/tilemap_packed.png', tile: 16, cols: 12 },
  ski: { url: 'assets/kenney-tiny-ski/tilemap_packed.png', tile: 16, cols: 12 },
  battle: { url: 'assets/kenney-tiny-battle/tilemap_packed.png', tile: 16, cols: 18 },
  pp: { url: 'assets/kenney-pixel-platformer/tilemap_packed.png', tile: 18, cols: 20 },
} as const;
export type SheetKey = keyof typeof SHEETS;
const imgs: Partial<Record<SheetKey, HTMLImageElement>> = {};

export function loadArt(): Promise<void> {
  return Promise.all((Object.keys(SHEETS) as SheetKey[]).map((k) => new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = () => { imgs[k] = img; resolve(); };
    img.onerror = () => resolve(); // UI falls back to plain shapes/text
    img.src = SHEETS[k].url;
  }))).then(() => undefined);
}


/** Draws one Kenney tile onto ctx at (x, y) with integer scale. Returns false if not loaded. */
export function drawTile(ctx: CanvasRenderingContext2D, key: SheetKey, frame: number, x: number, y: number, scale: number) {
  const img = imgs[key];
  if (!img) return false;
  const { tile, cols } = SHEETS[key];
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, (frame % cols) * tile, Math.floor(frame / cols) * tile, tile, tile, x, y, tile * scale, tile * scale);
  return true;
}

/** A pixelated canvas holding one tile, for use as an icon in the DOM. */
export function tileCanvas(key: SheetKey, frame: number, scale: number, cls = 'px') {
  const t = SHEETS[key].tile;
  const c = document.createElement('canvas');
  c.width = t * scale; c.height = t * scale; c.className = cls;
  drawTile(c.getContext('2d')!, key, frame, 0, 0, scale);
  return c;
}

// Tiny Ski ships a pixel font: 0-9 at 84, ':' at 94, A-Z at 96.
function glyph(ch: string): number | null {
  if (ch >= '0' && ch <= '9') return 84 + ch.charCodeAt(0) - 48;
  if (ch >= 'A' && ch <= 'Z') return 96 + ch.charCodeAt(0) - 65;
  return ({ ':': 94, '!': 122, '+': 126, '-': 127, '.': 131 } as Record<string, number>)[ch] ?? null;
}

/** Renders text with the Kenney Tiny Ski pixel letters. Falls back to canvas text. */
export function pixelText(text: string, scale: number, spacing = -3) {
  const t = text.toUpperCase();
  const step = 16 + spacing;
  const c = document.createElement('canvas');
  c.width = Math.max(1, (t.length * step - spacing) * scale); c.height = 16 * scale; c.className = 'px';
  const ctx = c.getContext('2d')!;
  [...t].forEach((ch, i) => {
    const g = glyph(ch);
    if (g !== null && drawTile(ctx, 'ski', g, i * step * scale, 0, scale)) return;
    if (ch !== ' ') { ctx.font = `bold ${12 * scale}px sans-serif`; ctx.fillStyle = '#fff'; ctx.fillText(ch, i * step * scale, 13 * scale); }
  });
  return c;
}
