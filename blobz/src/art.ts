// Blob art drawn with Canvas2D so skins are cheap: any color, any hat.

export const COLORS = [0x5ec8ff, 0xff6b8b, 0x7ddc5a, 0xffc93c, 0xb18cff, 0xff9248, 0x4fe0c3, 0xf2f2f2];
export const HATS = ['✖', '👑', '🧢', '🌼', '🎉'];

const hex = (c: number) => '#' + c.toString(16).padStart(6, '0');
function shade(c: number, f: number) {
  const r = Math.min(255, Math.max(0, ((c >> 16) & 255) * f));
  const g = Math.min(255, Math.max(0, ((c >> 8) & 255) * f));
  const b = Math.min(255, Math.max(0, (c & 255) * f));
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

/** Draws body + hat (no eyes) centered at (cx, cy) with radius r. */
export function drawBlob(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: number, hat: number) {
  ctx.save();
  // body: a soft dome, wider at the bottom
  ctx.beginPath();
  ctx.moveTo(cx - r * 1.05, cy + r * 0.55);
  ctx.bezierCurveTo(cx - r * 1.15, cy - r * 0.6, cx - r * 0.6, cy - r * 1.05, cx, cy - r * 1.05);
  ctx.bezierCurveTo(cx + r * 0.6, cy - r * 1.05, cx + r * 1.15, cy - r * 0.6, cx + r * 1.05, cy + r * 0.55);
  ctx.quadraticCurveTo(cx, cy + r * 0.95, cx - r * 1.05, cy + r * 0.55);
  ctx.closePath();
  const g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.45, r * 0.1, cx, cy, r * 1.2);
  g.addColorStop(0, shade(color, 1.25));
  g.addColorStop(0.6, hex(color));
  g.addColorStop(1, shade(color, 0.75));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = Math.max(2, r * 0.1);
  ctx.strokeStyle = shade(color, 0.5);
  ctx.stroke();
  // shine
  ctx.beginPath();
  ctx.ellipse(cx - r * 0.42, cy - r * 0.55, r * 0.26, r * 0.15, -0.5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fill();
  drawHat(ctx, cx, cy - r * 0.95, r, hat);
  ctx.restore();
}

function drawHat(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, hat: number) {
  ctx.lineWidth = Math.max(1.5, r * 0.07);
  ctx.strokeStyle = '#3a2a1a';
  if (hat === 1) { // crown
    ctx.beginPath();
    ctx.moveTo(x - r * 0.45, y + r * 0.1);
    ctx.lineTo(x - r * 0.5, y - r * 0.4);
    ctx.lineTo(x - r * 0.22, y - r * 0.15);
    ctx.lineTo(x, y - r * 0.5);
    ctx.lineTo(x + r * 0.22, y - r * 0.15);
    ctx.lineTo(x + r * 0.5, y - r * 0.4);
    ctx.lineTo(x + r * 0.45, y + r * 0.1);
    ctx.closePath();
    ctx.fillStyle = '#ffd23f'; ctx.fill(); ctx.stroke();
  } else if (hat === 2) { // cap
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.05, r * 0.5, r * 0.38, 0, Math.PI, 0);
    ctx.closePath();
    ctx.fillStyle = '#e63946'; ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(x + r * 0.45, y + r * 0.05, r * 0.35, r * 0.1, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#c1121f'; ctx.fill(); ctx.stroke();
  } else if (hat === 3) { // flower
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(x + r * 0.25 + Math.cos(a) * r * 0.18, y - r * 0.05 + Math.sin(a) * r * 0.18, r * 0.14, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff'; ctx.fill();
    }
    ctx.beginPath(); ctx.arc(x + r * 0.25, y - r * 0.05, r * 0.11, 0, Math.PI * 2);
    ctx.fillStyle = '#ffc93c'; ctx.fill();
  } else if (hat === 4) { // party hat
    ctx.beginPath();
    ctx.moveTo(x - r * 0.32, y + r * 0.1);
    ctx.lineTo(x, y - r * 0.7);
    ctx.lineTo(x + r * 0.32, y + r * 0.1);
    ctx.closePath();
    ctx.fillStyle = '#b18cff'; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y - r * 0.72, r * 0.12, 0, Math.PI * 2);
    ctx.fillStyle = '#ffd23f'; ctx.fill();
  }
}

/** Static eyes for previews (the game draws live eyes). */
export function drawEyes(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.ellipse(cx + s * r * 0.32, cy - r * 0.1, r * 0.2, r * 0.25, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#fff'; ctx.fill();
    ctx.beginPath(); ctx.arc(cx + s * r * 0.32 + r * 0.04, cy - r * 0.05, r * 0.1, 0, Math.PI * 2);
    ctx.fillStyle = '#222'; ctx.fill();
  }
}

export function blobCanvas(color: number, hat: number, size = 96): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const ctx = c.getContext('2d')!;
  drawBlob(ctx, size / 2, size * 0.62, size * 0.3, color, hat);
  return c;
}

export function previewInto(canvas: HTMLCanvasElement, color: number, hat: number) {
  const ctx = canvas.getContext('2d')!;
  const s = canvas.width;
  ctx.clearRect(0, 0, s, s);
  ctx.beginPath(); ctx.ellipse(s / 2, s * 0.88, s * 0.3, s * 0.07, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fill();
  drawBlob(ctx, s / 2, s * 0.62, s * 0.3, color, hat);
  drawEyes(ctx, s / 2, s * 0.62, s * 0.3);
}
