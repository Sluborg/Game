// Shared vocabulary between the art side (ArtLibrary GameArtBible) and game code.
// String-enum VALUES are the canonical kebab-case slugs used as the join key, so
// `NodeType.HomeKeep` -> slug "home-keep" -> art file `node-home-keep.png`.
//
// These match the manifest / GameArtBible exactly. If the manifest ever diverges,
// leave a TODO and flag it — don't silently change these.

export enum NodeType {
  HomeKeep = "home-keep",
  GrandCitadel = "grand-citadel",
  Settlement = "settlement",
  LumberCamp = "lumber-camp",
  Quarry = "quarry",
  Farmland = "farmland",
  IronMine = "iron-mine",
  GoldMine = "gold-mine",
  Academy = "academy",
  Forge = "forge",
  Barracks = "barracks",
  ArcherTower = "archer-tower",
  Wall = "wall",
  Temple = "temple",
  Market = "market",
  // TODO(art-bible): `ruins` is declared here ahead of ArtLibrary's GameArtBible —
  // the first quest-site node for the /node "Map" slice. Reconcile it into the
  // manifest roster (and remove this note) once the bible adds a quest-site entry.
  Ruins = "ruins",
}

export enum Category {
  PLAYER_BASE = "PLAYER_BASE",
  LANDMARK = "LANDMARK",
  CIVIC = "CIVIC",
  RESOURCE = "RESOURCE",
  RESEARCH = "RESEARCH",
  CRAFTING = "CRAFTING",
  MILITARY = "MILITARY",
  DEFENSE = "DEFENSE",
  DIVINE = "DIVINE",
  ECONOMY = "ECONOMY",
  // TODO(art-bible): quest sites (the Ruins node) — game-declared ahead of the
  // GameArtBible manifest; fold in when the bible formalizes the category.
  QUEST_SITE = "QUEST_SITE",
}

export enum ResourceType {
  WOOD = "wood",
  STONE = "stone",
  FOOD = "food",
  IRON = "iron",
  GOLD = "gold",
  KNOWLEDGE = "knowledge",
  FAITH = "faith",
  APPROVAL = "approval",
}

/** Canonical NodeType -> Category mapping (from ArtLibrary Buildings.md). */
export const NODE_CATEGORY: Record<NodeType, Category> = {
  [NodeType.HomeKeep]: Category.PLAYER_BASE,
  [NodeType.GrandCitadel]: Category.LANDMARK,
  [NodeType.Settlement]: Category.CIVIC,
  [NodeType.LumberCamp]: Category.RESOURCE,
  [NodeType.Quarry]: Category.RESOURCE,
  [NodeType.Farmland]: Category.RESOURCE,
  [NodeType.IronMine]: Category.RESOURCE,
  [NodeType.GoldMine]: Category.RESOURCE,
  [NodeType.Academy]: Category.RESEARCH,
  [NodeType.Forge]: Category.CRAFTING,
  [NodeType.Barracks]: Category.MILITARY,
  [NodeType.ArcherTower]: Category.DEFENSE,
  [NodeType.Wall]: Category.DEFENSE,
  [NodeType.Temple]: Category.DIVINE,
  [NodeType.Market]: Category.ECONOMY,
  [NodeType.Ruins]: Category.QUEST_SITE,
};
