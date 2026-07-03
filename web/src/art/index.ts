// Public surface of the ArtCatalog (visual library client). See web/docs/ART.md.

export { loadArtCatalog, buildCatalog, type ArtCatalog } from "./catalog";
export { deriveSlug } from "./slug";
export { placeholderVisual } from "./placeholder";
export { NodeType, Category, ResourceType, NODE_CATEGORY } from "./enums";
export type { ArtEntry, ArtManifest, ArtKind, Visual } from "./types";
export {
  ART_REPO,
  ART_REF,
  ART_COLLECTION,
  MANIFEST_URL,
  pinRawUrl,
} from "./config";
export { clearManifestCache } from "./cache";
