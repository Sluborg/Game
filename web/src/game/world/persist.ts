// localStorage persistence with a schema-version + SHAPE guard. A fresh clone,
// a bumped schema, or a truncated/garbage payload all degrade to "no saved run"
// (the caller starts a new one) — never a crash. Writes swallow failures
// (Safari private mode throws on setItem; a phone-only player must not lose the
// core loop to a storage error).

import { SCHEMA_VERSION, type WorldState } from "./types";

const KEY = "guild.slice1.state";

function store(): Storage | null {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null; // access itself can throw (disabled cookies / sandboxed iframe)
  }
}

/** Structural validation — not just the version. A version match on a partial
 *  object would slip the guard and then crash on field access downstream. */
export function isWorldState(v: unknown): v is WorldState {
  if (typeof v !== "object" || v === null) return false;
  const s = v as Record<string, unknown>;
  return (
    s.schemaVersion === SCHEMA_VERSION &&
    typeof s.day === "number" &&
    typeof s.gold === "number" &&
    typeof s.rngState === "number" &&
    typeof s.runSeed === "number" &&
    Array.isArray(s.heroes) &&
    Array.isArray(s.quests) &&
    (s.quests as unknown[]).length === 2 &&
    typeof s.party === "object" &&
    s.party !== null &&
    typeof s.loan === "object" &&
    s.loan !== null &&
    typeof s.insolventStreak === "number" &&
    (s.status === "playing" || s.status === "revoked")
  );
}

export function save(state: WorldState): void {
  const st = store();
  if (!st) return;
  try {
    st.setItem(KEY, JSON.stringify(state));
  } catch {
    // Quota exceeded / SecurityError (private mode) — keep playing in-memory.
  }
}

export function load(): WorldState | null {
  const st = store();
  if (!st) return null;
  try {
    const raw = st.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isWorldState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function clear(): void {
  const st = store();
  if (!st) return;
  try {
    st.removeItem(KEY);
  } catch {
    // ignore
  }
}
