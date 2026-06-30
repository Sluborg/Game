// Stable slug derivation — the join key shared by art + code. Slugs come from the
// filename, with the type prefix stripped so the slug matches the shared enums:
//   node-home-keep.png      -> home-keep
//   icon-resource-wood.png  -> wood
//   title-screen.jpg        -> title-screen
//   map-overworld-v2.png    -> map-overworld-v2
//
// A prefix is only stripped when the remainder is a *known* NodeType / ResourceType
// slug. Reference visuals whose names merely start with `node-` (e.g.
// `node-design-sheet.png`) keep their full stem so they stay addressable.

import { NodeType, ResourceType } from "./enums";

const NODE_SLUGS = new Set<string>(Object.values(NodeType));
const RESOURCE_SLUGS = new Set<string>(Object.values(ResourceType));

/** Derive the stable slug for a manifest entry from its original filename. */
export function deriveSlug(originalFilename: string, _tags: string[] = []): string {
  const stem = originalFilename.replace(/\.[^.]+$/, "");

  if (stem.startsWith("node-")) {
    const rest = stem.slice("node-".length);
    if (NODE_SLUGS.has(rest)) return rest;
  }
  if (stem.startsWith("icon-resource-")) {
    const rest = stem.slice("icon-resource-".length);
    if (RESOURCE_SLUGS.has(rest)) return rest;
  }
  return stem;
}
