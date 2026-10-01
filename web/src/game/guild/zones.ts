// The 0–100 story-meter zones each grade owns (the check-bar's benchmarks).
// Extracted from resolver.ts so the v3 bridge (wire/bridge.ts) and the v1
// resolver can share it without importing each other. resolver.ts re-exports it,
// so every existing import keeps working.

import type { Grade } from "./types";

export const GRADE_ZONES: Record<Grade, [number, number]> = {
  fail: [0, 20],
  poor: [20, 40],
  ok: [40, 65],
  good: [65, 90],
  crit: [90, 100],
};
