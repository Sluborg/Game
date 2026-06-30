// Typed model for the ArtLibrary manifest and the catalog's lookup results.
//
// Terminology: in this game "asset" is a reserved *gameplay* concept. The image
// files indexed by ArtLibrary are "visuals". This module never says "asset".

/** Validation-required `kind` on a manifest entry (building nodes are illustrations). */
export type ArtKind = "wallpaper" | "illustration" | "icon" | "texture";

/** One row of `asset-index.json`. Only the fields we consume are typed; the
 *  manifest carries more and extra fields are ignored. */
export interface ArtEntry {
  kind: string;
  title: string;
  description: string;
  tags: string[];
  collection: string | null;
  path: string;
  sha256: string;
  /** `[width, height]` in pixels. */
  dimensions: [number, number];
  github_url: string;
  /** Direct-download CDN URL of the image bytes. */
  raw_url: string;
  original_filename: string;
}

/** Top-level shape of `asset-index.json` (other fields ignored). */
export interface ArtManifest {
  assets: ArtEntry[];
}

/** What a lookup returns: a resolved visual, or a graceful placeholder. */
export interface Visual {
  /** Stable kebab-case join key shared by art + code. */
  slug: string;
  kind: string;
  /** Resolved (pinned) download URL — a real CDN URL, or a data-URI placeholder. */
  rawUrl: string;
  width: number;
  height: number;
  sha256: string;
  tags: string[];
  title: string;
  /** True when the slug is not in the manifest yet and this is a stand-in. */
  isPlaceholder: boolean;
}
