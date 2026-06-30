// Disposable manifest cache. The manifest is small and changes rarely, so we keep
// an in-memory copy for the process and (in the browser) mirror it to localStorage
// with a TTL for fast reloads and offline fallback. The cache is never committed;
// image bytes themselves are served via the browser's HTTP cache from `raw_url`.
// See web/docs/ART.md (a gitignored `web/.artcache/` is reserved for any on-disk
// snapshots a developer wants to keep locally).

import type { ArtManifest } from "./types";

const LS_KEY = "artcatalog.manifest.v1";
const TTL_MS = 60 * 60 * 1000; // 1 hour

interface Envelope {
  at: number;
  manifest: ArtManifest;
}

let mem: Envelope | null = null;

function localStore(): Storage | null {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null; // access can throw (privacy mode, sandboxed iframe)
  }
}

function readEnvelope(): Envelope | null {
  if (mem) return mem;
  const ls = localStore();
  if (!ls) return null;
  try {
    const raw = ls.getItem(LS_KEY);
    if (!raw) return null;
    const env = JSON.parse(raw) as Envelope;
    if (!env || typeof env.at !== "number" || !env.manifest) return null;
    mem = env;
    return env;
  } catch {
    return null;
  }
}

/** Cached manifest if present and within the TTL, else null. */
export function readFreshManifest(): ArtManifest | null {
  const env = readEnvelope();
  if (!env) return null;
  return Date.now() - env.at <= TTL_MS ? env.manifest : null;
}

/** Cached manifest regardless of age — used as an offline fallback on fetch failure. */
export function readAnyManifest(): ArtManifest | null {
  return readEnvelope()?.manifest ?? null;
}

export function writeManifest(manifest: ArtManifest): void {
  const env: Envelope = { at: Date.now(), manifest };
  mem = env;
  const ls = localStore();
  if (!ls) return;
  try {
    ls.setItem(LS_KEY, JSON.stringify(env));
  } catch {
    // Quota / serialization issues are non-fatal — the in-memory copy still works.
  }
}

export function clearManifestCache(): void {
  mem = null;
  const ls = localStore();
  if (!ls) return;
  try {
    ls.removeItem(LS_KEY);
  } catch {
    // ignore
  }
}
