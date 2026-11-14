// UI languages: Swedish + English. The UI is local, so every phone (host or joiner) uses its own language.
// First run: navigator.language sv* -> 'sv', anything else -> 'en'; the pick is saved in localStorage `blobz.lang`.
//
// KEY NAMING RULE (everyone adding text, incl. the dungeon):
//   '<area>.<thing>' in camelCase, e.g. 'lobby.start', 'build.name.well'.
//   Areas: menu, design, join, lobby, hud, build, mini, end, err, tool, look, dg (dungeon, Code 2).
//   Variables are {name} placeholders filled by t(key, { name }).
//   Add every key to BOTH tables: `en` is typed against `sv`, so a missing key fails the build.
//   In index.html use data-i18n (text), data-i18n-aria (aria-label), data-i18n-ph (placeholder),
//   data-i18n-alt (alt), data-i18n-title (title); applyI18n() fills them. Icons stay outside the
//   translated element (wrap the text in a <span data-i18n>).

export type Lang = 'sv' | 'en';

const sv = {
  // menu / home
  'menu.newGame': 'Nytt spel',
  'menu.join': 'Joina',
  'menu.editBlob': 'Ändra blob',
  'menu.editBlobAria': 'Ändra din blob',
  'menu.creating': 'Skapar rum...',
  'menu.loadingGame': 'Laddar spelet...',
  'menu.loading': 'Laddar...',
  'menu.lang': 'Språk',
  // blob designer
  'design.title': 'Blob-designer',
  'design.random': 'Slumpa',
  'design.name': 'Namn',
  'design.namePh': 'Skriv ditt namn',
  'design.shape': 'Form',
  'design.color': 'Färg',
  'design.eyes': 'Ögon',
  'design.mouth': 'Mun',
  'design.hat': 'Hatt',
  'design.done': 'Klar',
  // join
  'join.title': 'Joina spel',
  'join.searching': 'Letar efter spel på ditt Wi-Fi...',
  'join.nothing': 'Hittar inga spel. Är ni på samma Wi-Fi?',
  'join.connectingFound': 'Hittade ett spel, ansluter...',
  'join.rescan': 'Leta igen',
  'join.back': 'Tillbaka',
  'join.room': 'Joina {name}',
  'join.roomAria': 'Joina {name}, {n} av {max}',
  'join.full': 'fullt',
  'join.playing': 'pågår',
  'join.otherVersion': 'Annan version ({v}), ladda om sidan',
  'join.old': 'gammal',
  'join.connecting': 'Ansluter...',
  // lobby
  'lobby.title': 'Lobby',
  'lobby.backAria': 'Tillbaka till menyn',
  'lobby.mapAria': 'Karta',
  'lobby.meadow': 'Äng',
  'lobby.snow': 'Snö',
  'lobby.start': 'Starta',
  'lobby.waitHost': 'Väntar på att värden startar...',
  'lobby.newVillage': 'Ny by',
  'lobby.newVillageAsk': 'Riv byn och börja om?',
  'lobby.yes': 'Ja, riv',
  'lobby.no': 'Nej',
  'lobby.newVillageDone': 'Ny by! Allt börjar om från början.',
  'lobby.noWifi': 'Letar efter ditt Wi-Fi... Kompisarna ser inte spelet än.',
  'lobby.village': 'Din by: stuga nivå {lvl} · {n} {what} · förråd {w}/{s}/{b}',
  'lobby.building1': 'byggnad',
  'lobby.buildingN': 'byggnader',
  // in-game HUD
  'hud.quest': 'Samla till basen',
  'hud.questAria': 'Uppdrag: samla till basen',
  'hud.day': 'Dagen',
  'hud.bank': 'Lagets förråd',
  'hud.wood': 'Trä',
  'hud.stone': 'Sten',
  'hud.berry': 'Bär',
  'hud.dash': 'Fart',
  // tools (action button label)
  'tool.axe': 'Yxa',
  'tool.pickaxe': 'Hacka',
  'tool.rake': 'Räfsa',
  // building
  'build.button': 'Bygg',
  'build.close': 'Stäng',
  'build.built': 'Byggd ✓',
  'build.done': 'Klar!',
  'build.goal': 'Bygg {name} vid huset',
  'build.goalDone': 'Byggt: {name}',
  'build.cottage': 'Stuga nivå {lvl}',
  'build.name.bridge': 'Bro',
  'build.name.watchtower': 'Utkikstorn',
  'build.name.garden': 'Odling',
  'build.name.workshop': 'Verkstad',
  'build.name.storage': 'Förråd',
  'build.name.well': 'Brunn',
  'build.eff.storage': 'Bär 4 saker',
  'build.eff.workshop': 'Färre slag, snabbare',
  'build.eff.garden': 'Mer bär',
  'build.eff.well': 'Dubbla bär hemma',
  'build.eff.watchtower': 'Pilar till resurser',
  'build.eff.bridge': 'Nytt hörn med resurser',
  'build.eff.cottage2': 'Bär 1 sak till',
  'build.eff.cottage3': 'Snabbare återväxt',
  // Bärregn mini game
  'mini.title': 'Bärregn!',
  'mini.name': 'Bärregn',
  'mini.skip': 'Hoppa över',
  // end screen
  'end.title': 'Solen gick ner!',
  'end.good': 'Bra jobbat!',
  'end.again': 'Spela igen',
  'end.waitHost': 'Väntar på värden...',
  'end.menu': 'Till menyn',
  // errors
  'err.hostLeft': 'Värden lämnade spelet.',
  'err.version': 'Värden kör {host}, du kör {me}. Ladda om sidan på den som är äldst.',
  'err.full': 'Spelet är fullt (max 5).',
  'err.timeout': 'Ingen svarade. Försök igen.',
  'err.gone': 'Spelet finns inte längre.',
  'err.server': 'Ingen kontakt med servern. Kolla internet.',
  'err.browser': 'Webbläsaren stöds inte.',
  'err.other': 'Något gick fel ({type}).',
} as const;

export type Key = keyof typeof sv;

const en: Record<Key, string> = {
  'menu.newGame': 'New game',
  'menu.join': 'Join',
  'menu.editBlob': 'Edit blob',
  'menu.editBlobAria': 'Edit your blob',
  'menu.creating': 'Creating room...',
  'menu.loadingGame': 'Loading the game...',
  'menu.loading': 'Loading...',
  'menu.lang': 'Language',
  'design.title': 'Blob designer',
  'design.random': 'Random',
  'design.name': 'Name',
  'design.namePh': 'Type your name',
  'design.shape': 'Shape',
  'design.color': 'Color',
  'design.eyes': 'Eyes',
  'design.mouth': 'Mouth',
  'design.hat': 'Hat',
  'design.done': 'Done',
  'join.title': 'Join a game',
  'join.searching': 'Looking for games on your Wi-Fi...',
  'join.nothing': 'No games found. Are you on the same Wi-Fi?',
  'join.connectingFound': 'Found a game, connecting...',
  'join.rescan': 'Search again',
  'join.back': 'Back',
  'join.room': 'Join {name}',
  'join.roomAria': 'Join {name}, {n} of {max}',
  'join.full': 'full',
  'join.playing': 'playing',
  'join.otherVersion': 'Other version ({v}), reload the page',
  'join.old': 'old',
  'join.connecting': 'Connecting...',
  'lobby.title': 'Lobby',
  'lobby.backAria': 'Back to the menu',
  'lobby.mapAria': 'Map',
  'lobby.meadow': 'Meadow',
  'lobby.snow': 'Snow',
  'lobby.start': 'Start',
  'lobby.waitHost': 'Waiting for the host to start...',
  'lobby.newVillage': 'New village',
  'lobby.newVillageAsk': 'Tear down the village and start over?',
  'lobby.yes': 'Yes, tear down',
  'lobby.no': 'No',
  'lobby.newVillageDone': 'New village! Everything starts over.',
  'lobby.noWifi': 'Looking for your Wi-Fi... Friends can\'t see the game yet.',
  'lobby.village': 'Your village: cottage level {lvl} · {n} {what} · storage {w}/{s}/{b}',
  'lobby.building1': 'building',
  'lobby.buildingN': 'buildings',
  'hud.quest': 'Bring to the base',
  'hud.questAria': 'Quest: bring to the base',
  'hud.day': 'The day',
  'hud.bank': 'Team storage',
  'hud.wood': 'Wood',
  'hud.stone': 'Stone',
  'hud.berry': 'Berries',
  'hud.dash': 'Dash',
  'tool.axe': 'Axe',
  'tool.pickaxe': 'Pickaxe',
  'tool.rake': 'Rake',
  'build.button': 'Build',
  'build.close': 'Close',
  'build.built': 'Built ✓',
  'build.done': 'Done!',
  'build.goal': 'Build {name} at the house',
  'build.goalDone': 'Built: {name}',
  'build.cottage': 'Cottage level {lvl}',
  'build.name.bridge': 'Bridge',
  'build.name.watchtower': 'Watchtower',
  'build.name.garden': 'Garden',
  'build.name.workshop': 'Workshop',
  'build.name.storage': 'Storage',
  'build.name.well': 'Well',
  'build.eff.storage': 'Carry 4 things',
  'build.eff.workshop': 'Fewer hits, faster',
  'build.eff.garden': 'More berries',
  'build.eff.well': 'Double berries at home',
  'build.eff.watchtower': 'Arrows to resources',
  'build.eff.bridge': 'New corner with resources',
  'build.eff.cottage2': 'Carry 1 more',
  'build.eff.cottage3': 'Faster regrowth',
  'mini.title': 'Berry Rain!',
  'mini.name': 'Berry Rain',
  'mini.skip': 'Skip',
  'end.title': 'The sun went down!',
  'end.good': 'Well done!',
  'end.again': 'Play again',
  'end.waitHost': 'Waiting for the host...',
  'end.menu': 'To the menu',
  'err.hostLeft': 'The host left the game.',
  'err.version': 'The host runs {host}, you run {me}. Reload the page on the older one.',
  'err.full': 'The game is full (max 5).',
  'err.timeout': 'Nobody answered. Try again.',
  'err.gone': 'That game is gone.',
  'err.server': 'No contact with the server. Check the internet.',
  'err.browser': 'This browser is not supported.',
  'err.other': 'Something went wrong ({type}).',
};

/** English names for the blob designer options (tooltips); Swedish ones live in blob.ts (Art). */
const LOOK_EN: Record<'shape' | 'eyes' | 'mouth' | 'hat', string[]> = {
  shape: ['Dome', 'Ball', 'Tall', 'Flat', 'Pear', 'Cube'],
  eyes: ['Happy', 'Round', 'Big', 'Pleased', 'Sleepy', 'Cool', 'In love', 'Stars', 'Angry', 'Rosy', 'Wink', 'Tears', 'Dizzy', 'Surprised', 'Cyclops', 'Nerd'],
  mouth: ['Open', 'Smile', 'Tongue', 'Teeth', 'Oops', 'Calm', 'Laugh', 'Vampire', 'Moustache', 'Sad', 'Cat', 'Whistle'],
  hat: ['None', 'Crown', 'Cap', 'Flower', 'Party hat', 'Beanie', 'Bow', 'Straw hat', 'Pirate', 'Wizard', 'Viking', 'Chef',
    'Headphones', 'Bunny', 'Cat', 'Halo', 'Top hat', 'Bandana', 'Antenna', 'Sprout', 'Santa hat', 'Ninja', 'Dino', 'Astronaut',
    'Flower crown', 'Propeller', 'Unicorn'],
};

const TABLES: Record<Lang, Record<Key, string>> = { sv, en };
/** Every key (tests). */
export const KEYS = Object.keys(sv) as Key[];
const STORE = 'blobz.lang';

export function detectLang(nav = typeof navigator === 'undefined' ? 'en' : navigator.language): Lang {
  return /^sv\b/i.test(nav || '') ? 'sv' : 'en';
}

let current: Lang = (() => {
  try {
    const saved = localStorage.getItem(STORE);
    if (saved === 'sv' || saved === 'en') return saved;
  } catch { /* storage blocked */ }
  return detectLang();
})();

export const lang = () => current;
export function setLang(l: Lang) {
  current = l;
  try { localStorage.setItem(STORE, l); } catch { /* storage blocked */ }
}

/** Text for a key in the current language, {vars} filled in. Unknown keys fall back to Swedish, then the key. */
export function t(key: Key, vars?: Record<string, string | number>): string {
  let s: string = TABLES[current][key] ?? sv[key] ?? key;
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
  return s;
}

/** Designer option name: English from LOOK_EN, else the Swedish name from blob.ts. */
export function lookName(part: keyof typeof LOOK_EN, i: number, svName: string): string {
  return current === 'en' ? LOOK_EN[part][i] ?? svName : svName;
}

/** Fill every data-i18n* element under `root` (index.html markup). */
export function applyI18n(root: ParentNode = document) {
  if (root === document) document.documentElement.lang = current;
  const attrs: [string, string | null][] = [['i18n', null], ['i18nAria', 'aria-label'], ['i18nPh', 'placeholder'], ['i18nAlt', 'alt'], ['i18nTitle', 'title']];
  for (const [ds, attr] of attrs) {
    const sel = '[data-' + ds.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase()) + ']';
    root.querySelectorAll<HTMLElement>(sel).forEach((el) => {
      const text = t(el.dataset[ds] as Key);
      if (attr) el.setAttribute(attr, text);
      else if (el.textContent !== text) el.textContent = text;
    });
  }
}
