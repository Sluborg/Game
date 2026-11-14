// Procedural pixel blobz on a 36x48 pixel grid (2x the original 18x24 design units).
// Body shapes are defined in design units and sampled at 2x; eyes, mouths and hats are drawn in fine pixels.
// Every part (color, eyes, mouth, hat) is a choice, rendered to SVG (DOM) or canvas (Phaser).

export interface BlobLook { color: number; shape: number; eyes: number; mouth: number; hat: number }

export const COLORS = [
  0x5ec8ff, 0xff6b8b, 0x7ddc5a, 0xffc93c, 0xb18cff, 0xff9248,
  0x4fe0c3, 0xf2f2f2, 0xe63946, 0x3d6bff, 0xc08850, 0x9aa0b4,
];
export const SHAPES = ['Kupol', 'Boll', 'Lång', 'Platt', 'Päron', 'Kub'];
export const EYES = ['Glada', 'Runda', 'Stora', 'Nöjda', 'Sömniga', 'Coola', 'Kär', 'Stjärnor', 'Arga', 'Rosiga',
  'Blink', 'Tårar', 'Snurr', 'Förvånad', 'Cyklop', 'Nörd'];
export const MOUTHS = ['Öppen', 'Leende', 'Tunga', 'Tänder', 'Oj', 'Lugn', 'Skratt', 'Vampyr', 'Mustasch', 'Ledsen', 'Katt', 'Visslar'];
export const HATS = ['Ingen', 'Krona', 'Keps', 'Blomma', 'Partyhatt', 'Mössa', 'Rosett', 'Halmhatt',
  'Pirat', 'Trollkarl', 'Viking', 'Kock', 'Lurar', 'Kanin', 'Katt', 'Gloria', 'Cylinder', 'Bandana', 'Antenn', 'Grodd', 'Tomteluva'];

/** Fine pixels per design unit. */
const S = 2;
export const GRID_W = 18 * S;
export const GRID_H = 24 * S;
/** Vertical center of the ball, as a fraction of the grid height (sprite origin). */
export const BODY_CY = 15.5 / 24;

const OUT = '#3f2631';
// Part palette (one letter per fine pixel). M / m = the blob's own body color / shade.
const PAL: Record<string, string> = {
  U: OUT, K: '#1b1018', W: '#ffffff', w: '#ffffff', H: '#ff4d6d', r: '#c9184a', t: '#ff8fab',
  Y: '#ffd23f', y: '#e0a81e', o: '#fff1a8', e: '#e63946', c: '#a4161a', k: '#2b2b33', g: '#5a5f6b',
  a: '#a7adb8', i: '#d6f1ff', N: '#ff8fab', n: '#e05780', P: '#b18cff', p: '#7d5fd6', B: '#3d6bff',
  b: '#2a4bb8', S: '#f2cf6b', s: '#c99a3e', L: '#7ccf4a', l: '#3f8f2f', G: '#2f7a2a', O: '#ff8a3d',
  Q: '#ffc08a', z: '#ffe3ea', v: '#f3ead8', x: '#c9b48e', T: '#7fd3ff', q: '#2e86c1', d: '#6b4226', D: '#9a6a44',
};

/** Mirror a left half into a full symmetric row set (`odd`: the last column is the shared centre). */
const sym = (rows: string[], odd = false) => rows.map((r) => r + [...r].reverse().join('').slice(odd ? 1 : 0));

// All parts are drawn directly in fine pixels.
// Eyes: left eye at (x, y) (default 8, 23), mirrored to x = GRID_W - x - w. `wide` = one piece centred
// on x = 18 (glasses, cyclops). `right` = a different right eye (wink), placed without mirroring.
interface EyePart { rows: string[]; x?: number; y?: number; wide?: boolean; right?: string[] }
const EYE_PARTS: EyePart[] = [
  { rows: ['..UUU..', '.UWWWU.', 'UWWWWWU', 'UWWKKKU', 'UWWKwKU', 'UWWKKKU', '.UWWWU.', '..UUU..'] }, // Glada
  { y: 24, rows: ['.KKKK.', 'KwwKKK', 'KwKKKK', 'KKKKKK', 'KKKKKK', '.KKKK.'], x: 9 }, // Runda (button eyes)
  { x: 7, y: 22, rows: ['..UUUU..', '.UWWWWU.', 'UWWWWWWU', 'UWWKKKWU', 'UWKKKKKU', 'UWKwwKKU', 'UWKwwKKU', 'UWKKKKwU', '.UWKKKU.', '..UUUU..'] }, // Stora
  { y: 25, rows: ['..KKK..', '.KKKKK.', 'KK...KK', 'K.....K'] }, // Nöjda ^^
  { y: 24, rows: ['.UUUUU.', 'UmmmmmU', 'KKKKKKK', 'UWWKKKU', '.UWKwU.', '..UUU..'] }, // Sömniga
  { wide: true, y: 25, rows: [ // Coola (sunglasses)
    'KKKKKKKKKKKKKKKKKKKKKK',
    'KkggkkkKKKKKKKKkggkkkK',
    'KkgkkkkK......KkgkkkkK',
    'KkkkkkkK......KkkkkkkK',
    '.KkkkkK........KkkkkK.',
    '..KKKK..........KKKK..'] },
  { y: 24, rows: ['.UU.UU.', 'UHwUHHU', 'UHHHHHU', 'UHHHHrU', '.UHHrU.', '..UrU..', '...U...'] }, // Kär
  { x: 7, y: 22, rows: ['....K....', '...KYK...', '...KoK...', 'KKKKYKKKK', 'KYYoYYYYK', '.KYYYYYK.', '..KYYYK..', '.KYYKYyK.', '.KyK.KyK.', '.KK...KK.'] }, // Stjärnor
  { y: 21, rows: ['KK.....', '.KKKK..', '...KKKK', '.....KK', '.UUUUU.', 'UWWKKKU', 'UWWKwKU', 'UWWKKKU', '.UWWWU.', '..UUU..'] }, // Arga
  { x: 6, rows: [ // Rosiga (blush: dark rose rim + light pink, reads on red and pink bodies too)
    '....UUU..', '...UWWWU.', '..UWWWWWU', '..UWWKKKU', '..UWWKwKU', '..UWWKKKU', '...UWWWU.', '....UUU..',
    '..cccc...', '.cNzNNc..', '..cccc...'] },
  { rows: ['..UUU..', '.UWWWU.', 'UWWWWWU', 'UWWKKKU', 'UWWKwKU', 'UWWKKKU', '.UWWWU.', '..UUU..'], // Blink
    right: ['.......', '.....KK', '...KKK.', '.KKK...', 'KK.....', '.KKK...', '...KKK.', '.....KK'] },
  { y: 23, rows: ['..UUU..', '.UWWWU.', 'UWWWWWU', 'UWWKKKU', 'UTWKwKU', 'qTTKKKU', 'qTTqUU.', 'qTTq...', '.qq....'] }, // Tårar
  { y: 23, rows: ['..KKK..', '.K...K.', 'K..KK.K', 'K.K..KK', 'K.K.K.K', 'K..K..K', '.K...K.', '..KKK..'] }, // Snurr
  { y: 20, rows: ['.KKKKK.', 'KK...KK', '.......', '..UUU..', '.UWWWU.', 'UWWWWWU', 'UWWKWWU', 'UWKKKWU', 'UWWKWWU', 'UWWWWWU', '.UWWWU.', '..UUU..'] }, // Förvånad
  { wide: true, y: 22, rows: [ // Cyklop
    '....UUUU....', '..UUWWWWUU..', '.UWWWWWWWWU.', '.UWWKKKKWWU.', 'UWWKKKKKKWWU', 'UWWKKwwKKWWU',
    'UWWKKwKKKWWU', 'UWWKKKKKKWWU', '.UWWKKKKWWU.', '.UWWWWWWWWU.', '..UUWWWWUU..', '....UUUU....'] },
  { wide: true, y: 23, rows: [ // Nörd (round glasses)
    '..KKKK..........KKKK..',
    '.KiiiiK........KiiiiK.',
    'KiiiiiiK......KiiiiiiK',
    'KiiKKiiKKKKKKKKiiKKiiK',
    'KiiKwiiK......KiiKwiiK',
    'KiiiiiiK......KiiiiiiK',
    '.KiiiiK........KiiiiK.',
    '..KKKK..........KKKK..'] },
];

// Mouths: centred on x = 18, top row y = 33 (+ dy).
interface MouthPart { rows: string[]; dy?: number }
const MOUTH_PARTS: MouthPart[] = [
  { rows: ['KKKKKKKKKK', 'KKKKKKKKKK', '.KKttttKK.', '..KttttK..', '...KKKK...'] }, // Öppen
  { rows: ['K........K', 'KK......KK', '.KKKKKKKK.', '..KKKKKK..'] }, // Leende
  { rows: ['K........K', '.KKKKKKKK.', '....KtttK.', '....KtrtK.', '....KtttK.', '.....KKK..'] }, // Tunga
  { rows: ['.KKKKKKKKKK.', 'KWWWKWWKWWWK', 'KWWWKWWKWWWK', '.KKKKKKKKKK.'] }, // Tänder
  { rows: ['..KK..', '.KKKK.', 'KKttKK', '.KttK.', '..KK..'] }, // Oj
  { rows: ['KKKKKKKK', '.KKKKKK.'], dy: 1 }, // Lugn
  { rows: ['KKKKKKKKKKKK', 'KWWWWWWWWWWK', 'KKKKKKKKKKKK', '.KKKttttKKK.', '..KKttttKK..', '...KKKKKK...'] }, // Skratt
  { rows: ['KKKKKKKKKK', 'KWWKKKKWWK', '.KWKKKKWK.', '..KKttKK..', '...KKKK...'] }, // Vampyr
  { dy: -1, rows: sym(['...UUU.', '..UdddU', '.UdDddd', 'UddDddd', 'UdUUddd', 'UU..UUU']) }, // Mustasch
  { rows: ['..KKKKKK..', '.KKKKKKKK.', 'KK......KK', 'K........K'], dy: 1 }, // Ledsen
  { rows: ['....KK....', 'K...KK...K', 'KK.KKKK.KK', '.KKK..KKK.'] }, // Katt :3
  { rows: ['..........UU..', '..........UUU.', '..KKK.....U..U', '.KKKKK....U...', '.KKtKK..UUU...', '.KKKKK..UUU...', '..KKK.........'] }, // Visslar
];

// Hats: centred on x = 18 (+ dx); bottom row on fine row min(top + 2, 11) * S - 1 (+ drop).
// `float`: hovers above the real head top (halo). `proc`: drawn procedurally to hug the body shape.
interface HatPart { rows: string[]; dx?: number; float?: boolean; proc?: 'phones' | 'bandana' }
const HAT_PARTS: HatPart[] = [
  { rows: [] }, // Ingen
  { rows: ['U......UU......U', 'UYU...UYYU...UYU', 'UYYU.UYYYYU.UYYU', 'UYYYUYYYYYYUYYYU', 'UYYYYYYeeYYYYYYU',
    'UYoYYYYeeYYYYoYU', 'UYYYYYYYYYYYYYYU', 'UyyyyyyyyyyyyyyU', 'UUUUUUUUUUUUUUUU'] }, // Krona
  { dx: 2, rows: [ // Keps
    '......UUUUUU........', '....UUeeeeeeUU......', '...UeeeWeeeeeeU.....', '..UeeWeeeeeeeeeU....',
    '..UeeeeeeeeeeeeU....', '..UeeeeeeeeeeeeUUUUU', '..UccccccccccccccccU', '..UUUUUUUUUUUUUUUUU.'] },
  { dx: 6, rows: [ // Blomma
    '....UU....', '...UNNU...', '.UUUNNUUU.', 'UNNUYYUNNU', 'UNNUYoUNNU', '.UUUNNUUU.', '...UNNU...',
    '....ULU...', '....ULLU..', '....ULU...'] },
  { rows: [ // Partyhatt
    '....UooU....', '....UooU....', '.....UU.....', '.....UU.....', '....UPPU....', '....UPYU....', '...UPPYYU...',
    '...UYPPPU...', '..UPYYPPPU..', '..UPPPYYPU..', '.UPPPPPPYYU.', '.UYYPPPPPPU.', 'UPPYYPPPPPPU', 'UppppppppppU', 'UUUUUUUUUUUU'] },
  { rows: sym([ // Mössa
    '......UU', '.....UWW', '.....UWW', '......UU', '....UUBB', '..UUBBBB', '.UBBBBBB', '.UBBbBBb',
    'UWWWWWWW', 'UaWaWaWa', 'UUUUUUUU']) },
  { rows: [ // Rosett
    '.UU........UU.', 'UNNUU....UUNNU', 'UNWNNUUUUNNNNU', 'UNNNNUnnUNNNNU', 'UNNNNUnnUNNNNU',
    'UNNnnUUUUnnNNU', 'UNnnU....UnnNU', '.UU........UU.'] },
  { rows: [ // Halmhatt
    '........UUUUUU........', '......UUSSSSSSUU......', '.....USSsSSSSSsSU.....', '.....USSSSSsSSSSU.....',
    '.....UeeeeeeeeeeU.....', '.UUUUUSSSSSSSSSSUUUUU.', 'USSsSSSSsSSSSsSSSSsSSU', 'UssssssssssssssssssssU',
    '.UUUUUUUUUUUUUUUUUUUU.'] },
  { rows: [ // Pirat
    '.......UUUUUU.......', '....UUUkkkkkkUUU....', '..UUkkkkkkkkkkkkUU..', '.UkkkkkkkWWWkkkkkkU.',
    '.UkkkkkkWkWkWkkkkkU.', 'UkkkkkkkWWWWWkkkkkkU', 'UkkkkkkkkWkWkkkkkkkU', 'UYYYYYYYYYYYYYYYYYYU',
    '.UUUUUUUUUUUUUUUUUU.'] },
  { dx: 1, rows: [ // Trollkarl
    '..............UU....', '............UUPPU...', '...........UPPUU....', '..........UPPU......',
    '.........UPPPU......', '.........UPYPU......', '........UPPPPPU.....', '........UPPPPPU.....',
    '.......UPPPPYPPU....', '.......UPYPPPPPU....', '......UPPPPPPPPPU...', '.....UYYYYYYYYYYYU..',
    'UUUUUUPPPPPPPPPPPUUU', 'UPPPPPPPPPPPPPPPPPPU', 'UppppppppppppppppppU', '.UUUUUUUUUUUUUUUUUU.'] },
  { rows: sym([ // Viking
    '.U.........', 'UvU........', 'UvU........', 'UvvU.......', 'UxvvU..UUUU', '.UxvvUUaaaa',
    '..UxxUaWaaa', '...UUaaaaaa', '....UgggggU', '....UgygggU', '....UUUUUUU']) },
  { rows: sym([ // Kock
    '..UUU.UU', '.UWWWUWW', 'UWWWWWWW', 'UWWWWWWW', 'UWWWWWWW', '.UWWWWWW', '..UWWWWW', '..UaWWaW',
    '..UaWWaW', '..UUUUUU']) },
  { proc: 'phones', rows: [] }, // Lurar
  { rows: sym([ // Kanin
    '..UUU...', '.UWWWU..', '.UWNWU..', '.UWNWU..', '.UWNWU..', '.UWNWU..', '.UWNWU..', '.UWNWU..',
    '.UWNWU..', '..UWWWU.', '..UWWWU.']) },
  { rows: sym([ // Katt (body colored)
    'U........', 'UU.......', 'UNU......', 'UNNU.....', 'UNNMU....', 'UNNMMUUUU', 'UNMMMMMMM', 'UMMMMMMMM']) },
  { float: true, rows: ['...UUUUUUUU...', '.UUYYYYYYYYUU.', 'UYYUUUUUUUUoYU', 'UyYU......UYyU', '.UyyYYYYYYyyU.', '...UUUUUUUU...'] }, // Gloria
  { rows: ['..UUUUUUUUUU..', '..UkkkkkkkkU..', '..UkgkkkkkkU..', '..UkgkkkkkkU..', '..UkgkkkkkkU..', '..UkkkkkkkkU..',
    '..UeeeeeeeeU..', '..UeeeeeeeeU..', 'UUUUUUUUUUUUUU', 'UkkkkkkkkkkkkU', '.UUUUUUUUUUUU.'] }, // Cylinder
  { proc: 'bandana', rows: [] }, // Bandana
  { rows: ['..UUUU..', '.UoYYYU.', 'UoYYYYYU', 'UYYYYYyU', 'UYYYYyyU', '.UYyyyU.', '..UUUU..', '...UU...',
    '...UU...', '...UU...', '..UaaU..', '.UaaaaU.', '.UUUUUU.'] }, // Antenn
  { rows: sym([ // Grodd
    '.UUU...', 'ULLLUU.', 'ULLLLLU', '.UlLLLU', '..UUlLU', '....UUG', '.....UG', '.....UG', '.....UG']) },
  { dx: 1, rows: [ // Tomteluva
    '..............UUU...', '.............UWWWU..', '.........UUUUWWWWU..', '.......UUeeeeUWWU...',
    '......UeeeeeeeUU....', '.....UeeeeeeeeU.....', '.....UeeeeeeeecU....', '....UeeeeeeeeeecU...',
    '....UeeeeeeeeeeecU..', '..UUWWWWWWWWWWWWWUU.', '..UWWWWWWWWWWWWWWWU.', '..UaWaaWaaWaaWaaWaU.',
    '..UUUUUUUUUUUUUUUUU.'] },
];

/** Part tables, exported for tests only. */
export const PART_TABLES = { eyes: EYE_PARTS, mouths: MOUTH_PARTS, hats: HAT_PARTS, palette: PAL };

function rgb(c: number) { return [(c >> 16) & 255, (c >> 8) & 255, c & 255]; }
function css([r, g, b]: number[]) { return `rgb(${r | 0},${g | 0},${b | 0})`; }
function tone(c: number, f: number) {
  const v = rgb(c);
  return css(f >= 1 ? v.map((x) => x + (255 - x) * (f - 1)) : v.map((x) => x * f));
}

// Body shapes. Each returns the half-width of row y (or <0 outside); the face sits on rows 12-19
// so every shape keeps those rows wide enough. TOP[] is the first body row (hats sit on it).
const SHAPE_TOP = [8, 8, 6, 10, 7, 8];
const BOTTOM = 21;
/** Half-width (design units) of the body at continuous height yc (design units). */
function halfWidth(shape: number, yc: number) {
  const top = SHAPE_TOP[shape] ?? 8;
  const t = (yc - top) / (BOTTOM + 1 - top);
  if (t < 0 || t > 1) return -1;
  const ease = (k: number) => Math.sin(Math.min(1, k) * Math.PI / 2);
  switch (shape) {
    case 1: return 8 * Math.sqrt(Math.max(0, 1 - (2 * t - 1) ** 2)) + 0.4; // ball
    case 2: return t > 0.9 ? 6.5 - ((t - 0.9) / 0.1) * 2 : 2.5 + 4 * ease(t / 0.35); // tall
    case 3: return t > 0.8 ? 8 - ((t - 0.8) / 0.2) * 2.2 : 4.5 + 3.5 * ease(t / 0.45); // flat/wide
    case 4: return t > 0.88 ? 8 - ((t - 0.88) / 0.12) * 2.6 : 2.5 + 2 * ease(t / 0.3) + 3.5 * ease(Math.max(0, t - 0.35) / 0.4); // pear
    case 5: { // cube with rounded corners
      const ty = Math.min(yc - top, BOTTOM + 1 - yc), r = 2;
      return ty >= r ? 7.5 : 7.5 - r + Math.sqrt(Math.max(0, r * r - (r - ty) ** 2));
    }
    default: return t > 0.86 ? 8 - ((t - 0.86) / 0.14) * 2.6 : 3 + 5 * ease(t / 0.62); // dome
  }
}
let curShape = 0;
/** Is fine pixel (x, y) inside the body? */
function inBody(x: number, y: number) {
  const w = halfWidth(curShape, (y + 0.5) / S);
  return w > 0 && Math.abs((x + 0.5) / S - 9) <= w;
}

type Setter = (x: number, y: number, col: string | null) => void;
/** Body including its 1 px outline. */
function inSilhouette(x: number, y: number) {
  return inBody(x, y) || inBody(x - 1, y) || inBody(x + 1, y) || inBody(x, y - 1) || inBody(x, y + 1);
}
/** First fine row of the outline above the face centre. */
function headTop() { for (let y = 0; y < GRID_H; y++) if (inSilhouette(GRID_W / 2 - 1, y)) return y; return 0; }
/** Chebyshev distance (capped) from fine pixel (x, y) to the silhouette. */
function distToBody(x: number, y: number, cap: number) {
  for (let d = 0; d <= cap; d++) for (let dy = -d; dy <= d; dy++) for (let dx = -d; dx <= d; dx++) {
    if ((Math.abs(dx) === d || Math.abs(dy) === d) && inSilhouette(x + dx, y + dy)) return d;
  }
  return cap + 1;
}
/** Headphones: a band hugging the head (any shape) and two cups at eye height on the sides. */
function drawPhones(set: Setter) {
  const cupY = 22, cupH = 10;
  for (let y = 0; y < cupY + 1; y++) for (let x = 0; x < GRID_W; x++) {
    const d = distToBody(x, y, 3);
    if (d === 1 || d === 2) set(x, y, d === 1 ? PAL.g : PAL.a);
    else if (d === 3) set(x, y, OUT);
  }
  let left = GRID_W;
  for (let x = 0; x < GRID_W; x++) if (inSilhouette(x, cupY + 5)) { left = x; break; }
  const cup = ['.UUUU.', 'UOOOOU', 'UOQOOU', 'UOQOOU', 'UOOOOU', 'UOOOOU', 'UOOOOU', 'UOOOOU', 'UOOOOU', '.UUUU.'];
  const cx = Math.max(0, left - 4);
  cup.slice(0, cupH).forEach((row, ry) => [...row].forEach((ch, rx) => {
    if (ch === '.') return;
    set(cx + rx, cupY + ry, PAL[ch]);
    set(GRID_W - 1 - cx - rx, cupY + ry, PAL[ch === 'Q' ? 'O' : ch]);
  }));
}
/** Bandana: a dotted red band across the forehead (inside the body, above the eyes) and a knot. */
function drawBandana(set: Setter, color: number) {
  const [r, g] = rgb(color);
  const band = r > 180 && g < 150 ? PAL.B : PAL.e; // blue on red/pink/orange bodies, else red
  const y1 = headTop() >= 18 ? 22 : 21, y0 = y1 - 4; // flat heads: one row lower so it stays visible
  let right = 0;
  for (let y = y0; y <= y1; y++) for (let x = 0; x < GRID_W; x++) {
    if (!inBody(x, y)) continue;
    const edge = y === y0 || y === y1 || !inBody(x, y - 1);
    set(x, y, edge ? OUT : (y === y0 + 2 && x % 4 === 1) || (y === y0 + 3 && x % 4 === 3) ? PAL.W : band);
    if (y === y0 + 2) right = Math.max(right, x);
  }
  const knot = ['UUU...', 'UeeUU.', 'UeUUeU', 'UUU.UU'];
  const kx = Math.min(right - 1, GRID_W - knot[0].length);
  knot.forEach((row, ry) => [...row].forEach((ch, rx) => { if (ch !== '.') set(kx + rx, y0 + 1 + ry, ch === 'e' ? band : PAL[ch]); }));
}

/** Pixel grid of CSS colors (null = transparent). */
export function blobGrid(look: BlobLook): (string | null)[][] {
  const g: (string | null)[][] = Array.from({ length: GRID_H }, () => Array<string | null>(GRID_W).fill(null));
  const set = (x: number, y: number, col: string | null) => { if (x >= 0 && x < GRID_W && y >= 0 && y < GRID_H && col) g[y][x] = col; };
  curShape = look.shape;
  const top = SHAPE_TOP[look.shape] ?? 8;
  const mid = tone(look.color, 1), light = tone(look.color, 1.45), dark = tone(look.color, 0.68);
  const sparkle = '#ffffff';
  for (let y = 0; y < GRID_H; y++) for (let x = 0; x < GRID_W; x++) {
    if (inBody(x, y)) {
      let col = mid;
      if (!inBody(x, y + 4) || !inBody(x + 4, y + 2)) col = dark; // bottom/right shade band
      // soft shine on the upper-left, plus a tiny white sparkle
      const xc = (x + 0.5) / S, yc = (y + 0.5) / S;
      const hx = (xc - 5.4) / 2.4, hy = (yc - (top + 2.6)) / 1.3;
      if (hx * hx + hy * hy <= 1 && inBody(x - 2, y) && inBody(x, y - 2)) col = light;
      set(x, y, col);
    } else if (inBody(x - 1, y) || inBody(x + 1, y) || inBody(x, y - 1) || inBody(x, y + 1)) {
      set(x, y, OUT);
    }
  }
  const spx = Math.round(4.2 * S), spy = Math.round((top + 2.2) * S);
  if (inBody(spx, spy)) { set(spx, spy, sparkle); set(spx + 1, spy, sparkle); set(spx, spy + 1, sparkle); }

  // parts are drawn in fine pixels
  const paint = (rows: string[], x0: number, y0: number, mirror = false) => rows.forEach((row, ry) => [...row].forEach((ch, rx) => {
    if (ch === '.') return;
    set(mirror ? x0 + row.length - 1 - rx : x0 + rx, y0 + ry, ch === 'M' ? mid : ch === 'm' ? dark : PAL[ch]);
  }));
  const eye = EYE_PARTS[look.eyes] ?? EYE_PARTS[0];
  const ew = eye.rows[0].length, ex = eye.x ?? 8, ey = eye.y ?? 23;
  if (eye.wide) paint(eye.rows, GRID_W / 2 - ew / 2, ey);
  else {
    paint(eye.rows, ex, ey);
    if (eye.right) paint(eye.right, GRID_W - ex - eye.right[0].length, ey);
    else paint(eye.rows, GRID_W - ex - ew, ey, true);
  }
  const mouth = MOUTH_PARTS[look.mouth] ?? MOUTH_PARTS[0];
  paint(mouth.rows, GRID_W / 2 - Math.floor(mouth.rows[0].length / 2), 33 + (mouth.dy ?? 0));
  const hat = HAT_PARTS[look.hat] ?? HAT_PARTS[0];
  if (hat.proc === 'phones') drawPhones(set);
  else if (hat.proc === 'bandana') drawBandana(set, look.color);
  else if (hat.rows.length) {
    // the hat's bottom row sits just above the eyes (row 23) on every shape; tall hats clip at the top
    const bottom = hat.float ? headTop() - 3 : Math.min(top + 2, 11) * S - 1;
    paint(hat.rows, GRID_W / 2 - hat.rows[0].length / 2 + (hat.dx ?? 0), bottom - hat.rows.length + 1);
  }
  return g;
}

/** Crisp pixel SVG (scales to any size without blur). */
export function blobSvg(look: BlobLook): string {
  const g = blobGrid(look);
  let rects = '';
  for (let y = 0; y < GRID_H; y++) {
    let x = 0;
    while (x < GRID_W) {
      const col = g[y][x];
      if (!col) { x++; continue; }
      let w = 1;
      while (x + w < GRID_W && g[y][x + w] === col) w++;
      rects += `<rect x="${x}" y="${y}" width="${w}" height="1" fill="${col}"/>`;
      x += w;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${GRID_W} ${GRID_H}" shape-rendering="crispEdges">${rects}</svg>`;
}

/** Canvas at integer scale (Phaser textures, previews). */
export function blobCanvas(look: BlobLook, scale = 1): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = GRID_W * scale; c.height = GRID_H * scale;
  const ctx = c.getContext('2d')!;
  blobGrid(look).forEach((row, y) => row.forEach((col, x) => {
    if (!col) return;
    ctx.fillStyle = col;
    ctx.fillRect(x * scale, y * scale, scale, scale);
  }));
  return c;
}

/** <span> holding the SVG, for menus. */
// Menus show blobz as PNG <img> (not inline SVG): phone "force dark" modes recolor inline SVG fills,
// raster images are left alone. Cached per look.
const pngCache = new Map<string, string>();
export function blobEl(look: BlobLook, cls = 'blob') {
  const key = JSON.stringify(look);
  let url = pngCache.get(key);
  if (!url) { url = blobCanvas(look, 3).toDataURL('image/png'); pngCache.set(key, url); }
  const s = document.createElement('span');
  s.className = cls;
  const img = new Image();
  img.src = url; img.alt = ''; img.draggable = false;
  s.append(img);
  return s;
}

export function clampLook(l: Partial<BlobLook>): BlobLook {
  const pick = (v: unknown, n: number) => Math.max(0, Math.min(n - 1, Math.floor(Number(v)) || 0));
  return {
    color: COLORS.includes(Number(l.color)) ? Number(l.color) : COLORS[0],
    shape: pick(l.shape, SHAPES.length), eyes: pick(l.eyes, EYES.length), mouth: pick(l.mouth, MOUTHS.length), hat: pick(l.hat, HATS.length),
  };
}

export function randomLook(): BlobLook {
  const r = (n: number) => Math.floor(Math.random() * n);
  return { color: COLORS[r(COLORS.length)], shape: r(SHAPES.length), eyes: r(EYES.length), mouth: r(MOUTHS.length), hat: r(HATS.length) };
}
