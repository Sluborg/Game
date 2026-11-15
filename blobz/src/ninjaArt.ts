// Ninja Adventure pictures for the HTML UI (docs/ART_MAP.md 7, docs/OLD_ART_CHECKLIST.md). One place for every DOM path
// so no old art (art/gather, art/icons, art/base, art/fine) is referenced by the menus or the HUD.
// Single Ninja files are used in place; pieces cut from tilesets live in art/ninja/ (scripts/ninja_crops.py).
import { resIcon } from './resArt';

const N = (p: string) => encodeURI('assets/ninja-adventure/' + p);

export const NI = {
  wood: resIcon('wood'), stone: resIcon('stone'), berry: resIcon('berry'), // one line each in resArt.ts
  sun: N('Ui/Skill Icon/Meteo/Sun.png'), build: 'art/icons/ui/hammer-16.png', // ChatGPT N-17 hammer
  dice: 'art/icons/ui/dice-16.png', back: 'art/icons/ui/back-16.png', // ChatGPT N-17
  dash: 'art/icons/ui/dash-16.png', // ChatGPT N-24: free-standing dash symbol (speed lines), 16 px at 3x
  // the meadow action button: free-standing Ninja tool sprites inside the N-19 ring (no square skill backing)
  axe: N('Items/Tool/Axe.png'), pickaxe: N('Items/Tool/Pickaxe.png'), rake: N('Items/Tool/Hoe.png'),
  quill: 'art/icons/ui/quill-16.png', hammer: 'art/icons/ui/hammer-16.png', close: 'art/icons/ui/close-16.png', home: 'art/icons/ui/home-16.png',
  tickGreen: 'art/icons/state/tick-green-16.png', lock: 'art/icons/state/lock-16.png', canBuild: 'art/icons/state/can-build-16.png', you: 'art/icons/state/you-arrow-16.png',
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
