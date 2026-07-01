// Graceful placeholder for any slug not yet present in the manifest. Many visuals
// are still being produced; the loader must never crash on a missing slug. This
// returns a self-contained inline SVG data-URI (no network) labelled with the slug,
// so a not-yet-produced node degrades to a visible stand-in.

import type { Visual } from "./types";

export interface PlaceholderHint {
  width?: number;
  height?: number;
  /** Human-facing text to show instead of the raw slug (e.g. a node's display
   *  name), so a placeholder reads as the thing it stands in for, not its slug. */
  label?: string;
}

export function placeholderVisual(slug: string, hint: PlaceholderHint = {}): Visual {
  const w = hint.width ?? 256;
  const h = hint.height ?? 256;
  // A label may carry arbitrary text; escape it so it can't break the inline SVG.
  const text = (hint.label ?? slug).replace(/[<>&]/g, (c) =>
    c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&amp;",
  );
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'>` +
    `<rect width='100%' height='100%' fill='#2a2118'/>` +
    `<rect x='2' y='2' width='${w - 4}' height='${h - 4}' fill='none' ` +
    `stroke='#c9a24a' stroke-width='2' stroke-dasharray='6 4'/>` +
    `<text x='50%' y='50%' fill='#c9a24a' font-family='monospace' font-size='13' ` +
    `text-anchor='middle' dominant-baseline='middle'>${text}</text>` +
    `</svg>`;
  return {
    slug,
    kind: "icon",
    rawUrl: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
    width: w,
    height: h,
    sha256: "",
    tags: [],
    title: slug,
    isPlaceholder: true,
  };
}
