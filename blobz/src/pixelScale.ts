// Whole-pixel scaling (Stefan 2026-11-15: "art never loses pixels"). Phones draw CSS px at a device-pixel ratio such as
// 2.625, so a whole CSS factor (3x = 7.875 device px per art px) still rounds unevenly. intFit picks the largest WHOLE
// number of DEVICE pixels per art pixel that fits the box, and returns the CSS size that gives exactly that.
//
// API (also for Code 2): intFit(natW, natH, boxW, boxH, dpr?) -> { w, h, k }
//   natW/natH: the art's native size in art px; boxW/boxH: the space in CSS px; dpr: defaults to devicePixelRatio
//   k: device px per art px (>= 1); w/h: the CSS size to set (natW * k / dpr). Centre it in the box yourself.
export function intFit(natW: number, natH: number, boxW: number, boxH: number, dpr = window.devicePixelRatio || 1) {
  const k = Math.max(1, Math.floor(Math.min((boxW * dpr) / natW, (boxH * dpr) / natH) + 1e-6));
  return { w: (natW * k) / dpr, h: (natH * k) / dpr, k };
}
