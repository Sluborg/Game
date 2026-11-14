// Ninja Adventure pictures for the HTML UI (docs/ART_MAP.md 7, docs/OLD_ART_CHECKLIST.md). One place for every DOM path
// so no old art (art/gather, art/icons, art/base, art/fine) is referenced by the menus or the HUD.
// Single Ninja files are used in place; pieces cut from tilesets live in art/ninja/ (scripts/ninja_crops.py).
const N = (p: string) => encodeURI('assets/ninja-adventure/' + p);

export const NI = {
  wood: N('Items/Resource/Branch.png'), stone: N('Items/Resource/Rock.png'), berry: N('Items/Food/Nut2.png'),
  sun: N('Ui/Skill Icon/Meteo/Sun.png'), build: N('Ui/Skill Icon/Job & Action/Repair.png'),
  dice: N('Items/Object/Dice 6.png'), back: N('Ui/Theme/Theme Wood/arrow_left.png'), dash: N('Ui/Skill Icon/Items & Weapon/Boot.png'),
  axe: N('Ui/Skill Icon/Job & Action/Harvest.png'), pickaxe: N('Ui/Skill Icon/Job & Action/Mine.png'), rake: N('Ui/Skill Icon/Job & Action/Plant.png'),
  sparkle: N('Ui/Emote/emote29.png'), feather: N('Items/Resource/feather.png'),
  check: 'art/icons/check.png', // ChatGPT N-10 (approved)
  star: 'art/gather/star.png', starEmpty: 'art/gather/star-empty.png', // ChatGPT N-10 (approved)
  hut: 'art/ninja/hut.png', flag: 'art/ninja/flag.png',
} as const;

/** Building pictures for the build cards, the quest goal and the lobby village row (same crops as the game). */
export const building = (k: string) => `art/ninja/${k}.png`;

/** What each building does, as one Ninja icon (Art's stand-ins in OLD_ART_CHECKLIST.md). */
export const BUILD_HINT: Record<string, string[]> = {
  storage: [N('Items/Object/CrateEmpty.png')],
  workshop: [N('Ui/Skill Icon/Spell/AttackUpgrade.png'), N('Ui/Skill Icon/Items & Weapon/Boot.png')],
  garden: [N('Ui/Skill Icon/Job & Action/Plant.png')],
  well: [N('Ui/Skill Icon/Spell/LuckUpgrade.png')],
  watchtower: [N('Ui/Skill Icon/Spell/Vision.png')],
  bridge: [N('Items/Scroll/Scroll.png')],
  cottage2: [N('Items/Object/Bag.png')],
  cottage3: [N('Items/Object/Hourglass.png')],
};

/** data-icon names in index.html -> picture. */
export const DATA_ICON: Record<string, string> = { back: NI.back, check: NI.check, dice: NI.dice, 'dash-arrow': NI.dash };
