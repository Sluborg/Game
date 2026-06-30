// ArtCatalog — the game's client for the ArtLibrary manifest.
//
// It fetches `asset-index.json`, filters to `collection == "AssetReport"`, derives
// a stable slug per entry, and exposes lookups that resolve a visual's `raw_url`.
// Visuals are referenced, never vendored. Unknown slugs degrade to a placeholder.

import { MANIFEST_URL, ART_COLLECTION, pinRawUrl } from "./config";
import type { ArtEntry, ArtManifest, Visual } from "./types";
import { deriveSlug } from "./slug";
import { placeholderVisual, type PlaceholderHint } from "./placeholder";
import { NodeType, ResourceType } from "./enums";
import { readFreshManifest, readAnyManifest, writeManifest } from "./cache";

export interface ArtCatalog {
  /** Lookup by stable slug. ALWAYS returns a Visual — a placeholder if absent. */
  bySlug(slug: string, hint?: PlaceholderHint): Visual;
  /** Lookup a building node's visual (slug == NodeType value). */
  byNode(type: NodeType, hint?: PlaceholderHint): Visual;
  /** Lookup a resource icon (slug == ResourceType value). */
  byResource(type: ResourceType, hint?: PlaceholderHint): Visual;
  /** All present visuals of a given kind (no placeholders). */
  byKind(kind: string): Visual[];
  /** All present visuals carrying a tag (no placeholders). */
  byTag(tag: string): Visual[];
  /** Whether a real (non-placeholder) visual exists for this slug. */
  has(slug: string): boolean;
  /** All present visuals. */
  all(): Visual[];
}

function toVisual(entry: ArtEntry): Visual {
  const [w, h] = entry.dimensions ?? [0, 0];
  return {
    slug: deriveSlug(entry.original_filename, entry.tags),
    kind: entry.kind,
    rawUrl: pinRawUrl(entry.raw_url),
    width: w ?? 0,
    height: h ?? 0,
    sha256: entry.sha256,
    tags: entry.tags ?? [],
    title: entry.title,
    isPlaceholder: false,
  };
}

/** Build an in-memory catalog from a manifest. Pure — used directly in tests. */
export function buildCatalog(manifest: ArtManifest): ArtCatalog {
  const bySlugMap = new Map<string, Visual>();
  const visuals: Visual[] = [];

  for (const entry of manifest.assets ?? []) {
    if (entry.collection !== ART_COLLECTION) continue;
    const visual = toVisual(entry);
    visuals.push(visual);
    if (!bySlugMap.has(visual.slug)) bySlugMap.set(visual.slug, visual);
  }

  const bySlug = (slug: string, hint?: PlaceholderHint): Visual =>
    bySlugMap.get(slug) ?? placeholderVisual(slug, hint);

  return {
    bySlug,
    byNode: (type, hint) => bySlug(type, hint),
    byResource: (type, hint) => bySlug(type, hint),
    byKind: (kind) => visuals.filter((v) => v.kind === kind),
    byTag: (tag) => visuals.filter((v) => v.tags.includes(tag)),
    has: (slug) => bySlugMap.has(slug),
    all: () => [...visuals],
  };
}

async function fetchManifest(): Promise<ArtManifest> {
  const res = await fetch(MANIFEST_URL);
  if (!res.ok) {
    throw new Error(`ArtCatalog: failed to fetch manifest (HTTP ${res.status})`);
  }
  return (await res.json()) as ArtManifest;
}

let inflight: Promise<ArtManifest> | null = null;

/**
 * Load the catalog. Uses the cached manifest when fresh; otherwise fetches the
 * live manifest and caches it. On a network failure it falls back to any cached
 * manifest (even stale) before throwing, so callers degrade gracefully.
 */
export async function loadArtCatalog(opts: { force?: boolean } = {}): Promise<ArtCatalog> {
  if (!opts.force) {
    const fresh = readFreshManifest();
    if (fresh) return buildCatalog(fresh);
  }

  if (!inflight) {
    inflight = fetchManifest()
      .then((manifest) => {
        writeManifest(manifest);
        return manifest;
      })
      .finally(() => {
        inflight = null;
      });
  }

  try {
    return buildCatalog(await inflight);
  } catch (err) {
    const stale = readAnyManifest();
    if (stale) return buildCatalog(stale);
    throw err;
  }
}
