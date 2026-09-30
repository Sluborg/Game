// Picks the resolution engine once, at the UI boundary (game/ never reads env or
// location). v3 on the dev deploy (base /Game/dev/) or with ?engine=v3; v1 on
// production and with ?engine=v1 (game/guild/engine.ts: detectEngine).

import { detectEngine, setEngine } from "../../game/guild";

export function initEngine(): void {
  setEngine(detectEngine(import.meta.env.BASE_URL, typeof window === "undefined" ? undefined : window.location.search));
}
