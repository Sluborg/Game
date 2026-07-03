# LPC Asset Catalog — source list

> **How this repo uses it.** Committed sprites live in `lpc/` and every file is
> attributed in [`CREDITS.md`](./CREDITS.md). We currently source from the
> **sanderfrenken** fork on `master` (its `raw.githubusercontent.com` paths and
> `sheet_definitions/*.json` resolve reliably from CI). Working rule for any
> committed layer: it must support the animations/direction we render — today the
> **south/front-facing** `walk` row (held weapon visible) — verified per its
> `sheet_definition`. Only commit the layers actually used.
>
> Open lead for true per-frame swings: **Extended Weapon Animations** (§5) adds
> grid-aligned `thrust`/`slash` frames for longsword & dagger, which would let us
> drive the attack off real frames instead of the current lunge + walk-step.

Purpose: the LPC art is not scarce, it is **fragmented across OpenGameArt submissions**.
This file lists the consolidated sources so units, gear, and enemies can be sourced
reliably. Primary rule: **pull from the generator repo first** — it already aggregates
nearly all compatible LPC character art into one place with machine-readable definitions.

---

## 1. Primary library (use this as the main source)

**Universal LPC Spritesheet Character Generator** — the aggregator. Maintainers have
incorporated essentially all compatible LPC character artwork into this single repo,
organized with per-asset `sheet_definitions/*.json` (each lists which animations and
directions an asset supports) and the spritesheets themselves.

- Canonical repo: https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator
- Long-maintained fork: https://github.com/sanderfrenken/Universal-LPC-Spritesheet-Character-Generator
- Live tool (browse/preview/export): https://liberatedpixelcup.github.io/Universal-LPC-Spritesheet-Character-Generator/
- Mirror tool: https://sanderfrenken.github.io/Universal-LPC-Spritesheet-Character-Generator/

How to use it:
- Clone the repo. Read `sheet_definitions/` to know exactly which assets support which
  animations/directions. Only commit assets whose definition includes the animations we
  need (`slash`, `thrust`, `walk`, `hurt`) for the **south/down (front-facing)** direction.
- The live tool's "animations" filter does the same thing visually — pick layers, confirm
  they animate, export sheets.

## 2. Modern/cleaner set (preferred art where available)

**ElizaWy — LPC Revised / Expanded.** A reworked, cleaner, strictly-paletted overhaul.
Adds idle, run, jump, sit, emotes; modular weapons (no per-weapon duplication); realistic
helmets. Best base/clothing quality, but combat-anim coverage is still being completed.

- https://github.com/ElizaWy/LPC
- Expanded frames (sit/run/jump + remapped assets): https://opengameart.org/content/lpc-expanded-sit-run-jump-more
- Revised character basics: https://opengameart.org/content/lpc-revised-character-basics
- Cleaned character bases (male/female/muscular/pregnant/teen/child + swappable heads): https://opengameart.org/content/lpc-character-bases

## 3. Master collection + auto-credits (licensing lifesaver)

**LPC Collection** — "nearly all the LPC assets in one place." OpenGameArt can generate a
single combined CREDITS file for everything in the collection (still must be reviewed).

- https://opengameart.org/content/lpc-collection
- Character-only collections: https://opengameart.org/content/lpc-characters and https://opengameart.org/content/lpc-character-collection

---

## 4. Enemies / monsters (covers our Goblin / Orc / Troll / undead)

LPC enemy sprites that exist in-style (find via the collections above or bluecarrot16):
- [LPC] Goblin / [LPC] Goblin - Full Sheet
- Female Orc / Ogre / Goblin / Troll base (walkcycle)
- [LPC] Zombie, [LPC] Golem, [LPC] Imp, [LPC] Spider, [LPC] Wolf
- LPC Dark Elves, Drakes and lizardfolk, Grue, Skeletons
- "Medieval fantasy character sprites" (humanoid enemy set)

Note: many enemies have fewer combat frames than humanoids — verify per
`sheet_definition` / preview before committing, same rule as weapons.

## 5. Equipment categories (for the gear-display system)

All available through the generator; standalone sources if needed:
- **Weapons (melee/ranged):** swords, daggers, axes, maces, spears, bows, staves, tridents.
  - Extended Weapon Animations (adds walk+thrust+hurt+reverse-slash for longsword & dagger): https://opengameart.org/content/lpc-extended-weapon-animations
  - More Weapons / Siege Weapons / Hand Tools (bluecarrot16): https://opengameart.org/users/bluecarrot16
- **Armor/torso:** cloth, leather, mail, plate, robes; Roman/combat armor.
- **Head:** many hairstyles, beards, hoods; Helmets + Realistic Helmet Pack.
- **Shields, capes/cloaks, belts, gloves, boots, backpacks, accessories.**
- Clothing updates (palette-standardized for auto-recolor): https://opengameart.org/content/lpc-clothing-updates

## 6. Tooling

- **lpctools** — recolor and re-arrange/place items on spritesheets programmatically
  (useful for our gold/purple recolor + layout normalization).
- **LPC Style Guide** — frame/pivot/palette spec for authoring NEW compatible gear
  (e.g. Egyptian pantheon pieces later): https://lpc.opengameart.org/static/LPC-Style-Guide/build/index.html

## 7. Licensing (must handle)

- LPC art is dual-licensed **CC-BY-SA 3.0 / GPLv3**; many pieces also offer **OGA-BY 3.0+**.
- Requires **attribution + share-alike**. Keep a complete `CREDITS.md` of every asset/author.
- If we ever publish to **Steam / iOS App Store** (DRM platforms), prefer the **CC0 / OGA-BY**
  subset to avoid the CC-BY-SA DRM clause. The generator can filter by license.

---

## Recommended approach

1. Use the generator repo as the asset source of truth.
2. Build the unit/equipment layer model off `sheet_definitions` (data-driven; see
   `web/src/ui/combat/lpc/`). Require south-facing `slash`/`thrust`/`walk`/`hurt` for any
   committed layer.
3. Drive the attack off the **thrust** animation where aligned frames exist (guaranteed
   weapon, reads as a lunge); otherwise the current lunge + walk-step.
4. Recolor toward the divine gold/purple palette via the runtime tint layer (see the
   `skin`/`gear` tint groups) or lpctools at build time.
5. Generate `CREDITS.md` from the source `sheet_definitions` credits, then verify by hand.
