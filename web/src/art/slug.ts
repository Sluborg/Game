// Stable slug derivation — the join key shared by art + code. Slugs come from the
// filename, with the type prefix stripped so the slug matches the shared enums:
//   node-home-keep.png      -> home-keep
//   icon-resource-wood.png  -> wood
//   title-screen.jpg        -> title-screen
//   map-overworld-v2.png    -> map-overworld-v2

const PREFIXES = ["node-", "icon-resource-"];

/** Derive the stable slug for a manifest entry from its original filename. */
export function deriveSlug(originalFilename: string, _tags: string[] = []): string {
  const stem = originalFilename.replace(/\.[^.]+$/, "");
  for (const prefix of PREFIXES) {
    if (stem.startsWith(prefix)) return stem.slice(prefix.length);
  }
  return stem;
}
