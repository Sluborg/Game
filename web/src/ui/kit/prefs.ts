// Tiny UI-preference persistence (localStorage; NEVER GuildState — sim purity).
// Guarded like persist.ts: node/vitest has no localStorage, private mode throws.

export function readPref<T extends string>(key: string, valid: readonly T[], fallback: T): T {
  if (typeof localStorage === "undefined") return fallback;
  try {
    const v = localStorage.getItem(key);
    return (valid as readonly string[]).includes(v ?? "") ? (v as T) : fallback;
  } catch {
    return fallback;
  }
}

export function savePref(key: string, value: string): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, value);
  } catch {
    /* privacy mode — the pref just doesn't stick */
  }
}
