// Which resolution engine grades quest beats: the shipped v1 (power × variance ÷
// difficulty) or the Skills-v3 2d6 check (wire/bridge.ts).
//
// This is CONFIG, not sim state: the UI sets it once at startup and clock.ts reads
// it at dispatch, where each quest's whole log is computed and stored (sealed) —
// so flipping it never rewrites a stored log. It is the one piece of module-level
// state in game/guild (excluded from the "pure sim" claim); tests that change it
// must reset it (wire.test.ts does, in afterEach).

export type Engine = "v1" | "v3";

let current: Engine = "v1";

export function getEngine(): Engine {
  return current;
}

export function setEngine(engine: Engine): void {
  current = engine;
}

/** Pure engine selection from the build's base path and the URL query.
 *  - `?engine=v3` / `?engine=v1` always wins (an explicit opt-in/out, in any build).
 *  - Otherwise v3 only on the dev deploy (base `/Game/dev/`); production (`/Game/`),
 *    local `vite dev`, and any unknown base stay on v1.
 * Takes its inputs as arguments so it never reads env or location itself. */
export function detectEngine(baseUrl: string | undefined, search: string | undefined): Engine {
  const q = new URLSearchParams(search ?? "").get("engine");
  if (q === "v3" || q === "v1") return q;
  return typeof baseUrl === "string" && baseUrl.startsWith("/Game/dev/") ? "v3" : "v1";
}
