// Single source of truth for *which* ArtLibrary ref we read the manifest from.
//
// Art lives in the separate Sluborg/ArtLibrary repo and is referenced by URL —
// never copied into this repo. `raw.githubusercontent.com/.../<ref>/...` URLs are
// mutable, so the ref is centralised here:
//   - dev   : track "main" for the latest art (default).
//   - release: pin a 40-char commit SHA below for a reproducible, frozen art set.
// See web/docs/ART.md.

export const ART_REPO = "Sluborg/ArtLibrary";

// Default: floating branch (dev tracks latest). For a release build, replace with
// a commit SHA, e.g. ART_REF = "a1b2c3d4e5f6...";
export const ART_REF = "main";

/** The machine-readable art manifest indexing every approved visual. */
export const MANIFEST_URL = `https://raw.githubusercontent.com/${ART_REPO}/${ART_REF}/asset-index.json`;

/** Our game's visuals live under this collection; the catalog filters on it. */
export const ART_COLLECTION = "AssetReport";

/**
 * Rewrite a manifest `raw_url` so it points at the configured {@link ART_REF}.
 * Manifest entries embed the canonical `main` ref; when ART_REF is pinned to a
 * SHA we swap the ref segment so pinned builds resolve frozen bytes.
 */
export function pinRawUrl(rawUrl: string): string {
  if (ART_REF === "main") return rawUrl;
  return rawUrl.replace(
    new RegExp(`(raw\\.githubusercontent\\.com/${ART_REPO}/)[^/]+/`),
    `$1${ART_REF}/`,
  );
}
