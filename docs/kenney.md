# Kenney asset catalogue

Living reference for the guild game's visual layer. Kenney packs are **CC0**
(public domain) — no attribution required, files can be committed straight into
the repo, zero legal friction.

## The one hard constraint

**Kenney is the frame around the game; LPC is the people in it.**

- **Characters (heroes) stay on our existing LPC layered sprites**
  (`web/src/ui/combat/lpc/`). That pipeline is frozen (see CLAUDE.md) and it
  already does the "swap the armour/weapon layer" modifiable-equipment thing —
  we don't replace it.
- Kenney supplies everything *around* the characters: window frames, buttons,
  icons, item tiles, mood faces, and (later) map/environment tiles.
- Kenney character/equipment packs (e.g. Roguelike Characters) would clash with
  LPC heroes, so they're reserved for **enemies / props / flavour**, not the
  player's heroes.

## Foundation kit (adopt now)

The small foundation PR skins the guild UI with a tight, coherent set:

| Pack | Role |
|---|---|
| **Fantasy UI Borders** | Window/panel frames — the chrome around every screen |
| **Board Game Icons** | General icon set — gold, actions, status, most needs |
| **Game Icons** | System/settings icons (gear, close, chevrons) |
| **Emotes pack** | Hero mood faces — upgrades the mood dots we already have |
| **Cartography pack** | Quest/location icons for the quest page |

## Full catalogue

Ordered by when we'd actually use each. "Map fork" ⚠️ = a competing map-style
choice; we pick **one** direction when we build a map surface, not all of them.

| Pack | Role in the game | When |
|---|---|---|
| Fantasy UI Borders | Panel/window frames | Foundation (now) |
| Board Game Icons | General icons (gold, actions, status) | Foundation (now) |
| Game Icons | System/settings icons | Foundation (now) |
| Emotes pack | Hero mood faces | Foundation (now, optional) |
| Cartography pack | Quest/location icons | Foundation-adjacent |
| Roguelike/RPG pack | Huge tile/item/enemy library | Later (general utility) |
| Roguelike Dungeons | Tiles for a "watch the adventure" view | Later (Slice 2+ fidelity) |
| Minimap pack | Dungeon/minimap rendering | Later |
| Isometric tiles + roads | Iso map surface | Later — map fork ⚠️ |
| Hexagon Kit | Hex map surface | Later — map fork ⚠️ |
| Hexagon Buildings | Buildings for a hex map | Later — map fork ⚠️ |
| Medieval RTS | Alt map/environment style | Later — map fork ⚠️ |
| Particle pack | VFX juice (guild UI only — combat renderer is frozen) | Later |
| Roguelike Characters | Equippable chars — **enemies/props only**, clashes with LPC heroes | Later |
| Rune pack | Decorative runes / flavour glyphs | Optional/flavour |
| Medals | Achievement symbols | Optional |
| Playing Cards pack | Not chrome — see "Design parking lot" below | Design idea |

## Maps — future notes (Stefan has many ideas; expand here)

We deliberately have **not** picked a map direction. When we do, it's one of
these — they don't combine:

- **Hex** — Hexagon Kit + Hexagon Buildings. Clean strategic feel; good for a
  region of nodes.
- **Isometric** — Isometric tiles landscape + roads add-on. More scenic; heavier
  to author.
- **Top-down / dungeon** — Minimap pack + Roguelike Dungeons. Best if the map is
  really about *watching heroes crawl a dungeon* rather than a world map.
- **RTS-style** — Medieval RTS tiles. A more zoomed-out settlement/world look.

Open questions to resolve before committing:
- Is "the map" a **world of quest nodes** (pick where to send parties) or an
  **adventure viewer** (watch a party crawl a dungeon)? These want different
  packs (hex/iso world vs. dungeon/minimap).
- How much map do the report-fidelity tiers (DESIGN §4) actually need? A
  summary-tier report may need no map at all; embedded/log tiers might.

<!-- Stefan's map ideas — add freely below -->

## Design parking lot

Ideas surfaced while picking art that are really **mechanics**, not assets:

- **Playing-card personality types.** Each hero carries a suit (spades / hearts /
  clubs / diamonds) that flavours their personality/temperament — a compact,
  legible hook for the traits system. Art from the Playing Cards pack could badge
  it. Belongs to a later hero-arcs slice (DESIGN §3/§5), not the art foundation.
