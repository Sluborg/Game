// Gather ring (Stefan 2026-11-15, "the loader circle looks out of place, prettify"): one kit-styled ring for every
// "everyone stand here" spot (the meadow portal, Code 2's room doors). A thick dark-plum outline round a cream track,
// split into one segment per player; a segment turns GOLD while its blob stands inside; when everyone is in, a bright
// sweep fills the ring (the start countdown) and it pulses. Drawn on the ground (an ellipse, top-down 3/4 view).
//
// API (Phaser graphics, call every frame):
//   drawGatherRing(g, { x, y, rx, ry, inside, fill, now })
//     g      Phaser.GameObjects.Graphics (cleared and redrawn; set its depth just above the ground decal)
//     x, y   ring centre in world px;  rx, ry  outer radii (ry < rx for the 3/4 view)
//     inside one boolean per player in the game, in a fixed order (segment i = player i): true = on the ring
//     fill   0..1 start countdown (0 = not everyone in yet; 1 = starting now)
//     now    scene time in ms (pulse)
import type Phaser from 'phaser';

export const GATHER_RING = {
  plum: 0x3f2631, // outline (kit A --k-plum)
  track: 0xf6e8c4, // empty segment (kit A --k-parch)
  gold: 0xffc93c, // a blob stands here
  goldHi: 0xfff1a8, // the start sweep
  band: 12, // track thickness in px (outer radius minus inner radius, along x)
  outline: 3, // plum outline width in px
  gapDeg: 7, // gap between segments
};

export interface GatherRingOpts { x: number; y: number; rx: number; ry: number; inside: boolean[]; fill: number; now: number }

/** Points along an ellipse arc (angles in radians, 0 = right, clockwise on screen because y points down). */
function arc(x: number, y: number, rx: number, ry: number, a0: number, a1: number): { x: number; y: number }[] {
  const steps = Math.max(4, Math.ceil(Math.abs(a1 - a0) / 0.08));
  return Array.from({ length: steps + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / steps;
    return { x: x + Math.cos(a) * rx, y: y + Math.sin(a) * ry };
  });
}

/** One band piece between two angles: outer arc forward, inner arc back. */
function piece(x: number, y: number, rx: number, ry: number, a0: number, a1: number, band: number) {
  const k = ry / rx, irx = rx - band, iry = ry - band * k;
  return [...arc(x, y, rx, ry, a0, a1), ...arc(x, y, irx, iry, a1, a0)];
}

export function drawGatherRing(g: Phaser.GameObjects.Graphics, o: GatherRingOpts) {
  const S = GATHER_RING, n = Math.max(1, o.inside.length);
  const all = o.inside.length > 0 && o.inside.every(Boolean);
  const pulse = all ? 0.5 + 0.5 * Math.sin(o.now / 110) : 0;
  const grow = all ? 2 * pulse : 0; // the whole ring breathes out a little while it counts down
  const rx = o.rx + grow, ry = o.ry + grow * (o.ry / o.rx);
  const gap = (S.gapDeg * Math.PI) / 180, seg = (Math.PI * 2) / n, top = -Math.PI / 2;
  g.clear();
  for (let i = 0; i < n; i++) {
    const a0 = top + i * seg + (n > 1 ? gap / 2 : 0), a1 = top + (i + 1) * seg - (n > 1 ? gap / 2 : 0);
    const pts = piece(o.x, o.y, rx, ry, a0, a1, S.band);
    g.fillStyle(o.inside[i] ? S.gold : S.track, 1).fillPoints(pts, true);
    // the start sweep: the part of this segment the countdown has passed turns bright
    const sweepEnd = top + o.fill * Math.PI * 2;
    if (o.fill > 0 && sweepEnd > a0) {
      g.fillStyle(S.goldHi, 0.75 + 0.25 * pulse).fillPoints(piece(o.x, o.y, rx, ry, a0, Math.min(a1, sweepEnd), S.band), true);
    }
    g.lineStyle(S.outline, S.plum, 1).strokePoints(pts, true);
  }
}
