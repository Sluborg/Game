// UI-kit v2 comparison page (?uikit=2): Stefan's review decisions (docs/reviews/README.md) as one fixed base, with
// four selection / label variants side by side. Nothing here is used by the game.
// Fixed for every variant: parchment (warm cream) interiors, Theme Wood outer frame at ONE thin thickness, quiet thin
// option tiles (heavy wood only on the outer panel + primary button), primary = orange, secondary = cream + plum text
// + quiet wood edge, Fredoka >= 14 px (body 18), 8 px rhythm, >= 48 px targets, back chevron chip top-left, 3x pixels.
// A: dark outline + green tick badge, words only      B: gold inset border + check, words only
// C: as A + icon and word                              D: as B + icon and word
// Icons only from the Ninja pack (Ui/Skill Icon, Items, Emote) at 3x; where none fits, the label stays a word and the
// piece is listed in GAPS (shown at the bottom of the page) for a ChatGPT order.
import { blobEl, COLORS } from './blob';

const NJ = 'assets/ninja-adventure/';
const TW = NJ + 'Ui/Theme/Theme%20Wood/';
const u = (p: string) => encodeURI(NJ + p);
const CHECK = 'art/icons/check.png'; // ChatGPT N-10 (approved), 19x16
/** Ninja icons that fit (16 px items / 14 px emotes at 3x). Missing ones are GAPS. */
const ICON: Partial<Record<string, string>> = {
  Mun: u('Ui/Emote/emote1.png'), // open-mouth face, 14x13
  Joina: u('Items/Action/Interact.png'), // waving glove, 16x16
};
const GAPS = [
  'Tab icon "Form" (blob shape), 16x16 px art (48 px at 3x)',
  'Tab icon "Färg" (paint / colour drop), 16x16 px',
  'Tab icon "Ögon" (eye), 16x16 px: Ninja has Vision.png only as a 24 px skill tile with its own backing',
  'Tab icon "Hatt" (hat), 16x16 px: Ninja Helmet.png is a 24 px skill tile with its own backing',
  'Button icon "Nytt spel" (new game: flag / plus / sun), 16x16 px',
  'Lock icon for a build card you cannot afford yet, 12x12 px (36 px at 3x)',
  'Tick for the selection badge, 8x8 px (24 px at 3x); the N-10 check is 19x16, so it is shown at 1x here',
];

const CSS = `
body.uikit { overflow: auto !important; background: #6cb24a; height: auto; }
body.uikit > *:not(.k2) { display: none !important; }
.k2 { --parch: #f6e8c4; --parch-2: #fbf2da; --edge: #c9a46a; --edge-lo: #a87e46; --gold: #e3a520; --gold-hi: #ffd66b;
  --plum: #3f2631; --green: #4caf3a;
  font-family: var(--font); color: var(--plum); font-size: 18px; padding: 8px 8px 24px; box-sizing: border-box; }
.k2 * { box-sizing: border-box; }
.k2 h1 { font-size: 24px; margin: 0 0 8px; text-align: center; color: #fff8e8; -webkit-text-stroke: 1px #4a2f1c; }
.k2 .kvar { margin: 0 0 16px; padding: 8px; background: var(--parch);
  border: 6px solid; border-image: url('${TW}nine_path_panel_3.png') 6 5 5 6 / 6px stretch; } /* frame only: parchment shows inside */
.k2 .kvhead { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.k2 .kvhead h2 { margin: 0; font-size: 24px; line-height: 1.1; }
.k2 .kvhead small { display: block; font-size: 14px; font-weight: 500; color: #6f5546; }
.k2 .kback { flex: none; width: 48px; height: 48px; background: url('${TW}arrow_left.png') center / 48px 48px no-repeat; image-rendering: pixelated; border: 0; padding: 0; }
.k2 .klab { font-size: 14px; color: #6f5546; margin: 8px 0 4px; }
.k2 .krow { display: grid; gap: 8px; }
.k2 .c4 { grid-template-columns: repeat(4, 56px); }
.k2 .c3 { grid-template-columns: repeat(3, 72px); }
.k2 .ktile { position: relative; width: 100%; aspect-ratio: 1; display: grid; place-items: center; overflow: visible;
  background: var(--parch-2); border: 2px solid var(--edge); border-radius: 4px; }
.k2 .ktile i { position: absolute; inset: 2px; border-radius: 2px; }
.k2 .ktile .blob, .k2 .ktile .blob img { width: 60px; height: 60px; image-rendering: pixelated; }
.k2 .ktabs { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 4px; align-items: end; }
.k2 .ktab { min-height: 48px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
  font-size: 15px; font-weight: 600; text-align: center; background: var(--parch-2); border: 2px solid var(--edge); border-bottom: 0;
  border-radius: 4px 4px 0 0; padding: 4px 0; }
.k2 .ktabpanel { height: 16px; background: var(--parch-2); border: 2px solid var(--edge); border-top: 0; margin-top: -2px; border-radius: 0 0 4px 4px; }
.k2 .ktab.on { background: var(--parch-2); position: relative; z-index: 1; padding-bottom: 6px; margin-bottom: -2px; }
.k2 .kbtns { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.k2 .kbtn { height: 56px; display: flex; align-items: center; justify-content: center; gap: 8px; font: 700 20px var(--font); }
.k2 .kpri { color: #fff8e8; text-shadow: 0 2px 0 #8a3d12; border: 6px solid; border-image: url('${TW}button_normal.png') 2 fill / 6px stretch; }
.k2 .ksec { color: var(--plum); background: var(--parch-2); border: 2px solid var(--edge-lo); border-radius: 4px; box-shadow: inset 0 -3px 0 0 #e4cf9f; }
.k2 .kbtn img, .k2 .ktab img { image-rendering: pixelated; flex: none; }
.k2 .kplate { display: flex; align-items: center; gap: 8px; padding: 4px 4px 4px 12px; background: var(--parch-2); border: 2px solid var(--edge); border-radius: 4px; }
.k2 .kplate b { flex: 1; font-size: 20px; }
.k2 .kplate .kedit { width: 48px; height: 48px; display: grid; place-items: center; background: var(--parch); border: 2px solid var(--edge-lo); border-radius: 4px; }
.k2 .kplate .kedit img { width: 48px; height: 48px; image-rendering: pixelated; }
.k2 .kcards { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.k2 .card2 { position: relative; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 8px 4px; background: var(--parch-2); border: 2px solid var(--edge); border-radius: 4px; }
.k2 .card2 .kpic { width: 96px; height: 96px; image-rendering: pixelated; object-fit: contain; }
.k2 .card2 b { font-size: 16px; }
.k2 .kcost { display: flex; gap: 4px; align-items: center; font-size: 18px; font-weight: 700; }
.k2 .kcost img { width: 48px; height: 48px; image-rendering: pixelated; }
.k2 .kcost .kmiss { color: #c0392b; }
.k2 .card2 { padding-top: 32px; }
.k2 .vC .ktab, .k2 .vD .ktab { min-height: 72px; }
.k2 .badge-ok { position: absolute; left: 6px; top: 6px; padding: 2px 8px; border-radius: 10px; background: var(--green); color: #fff; font-size: 14px; font-weight: 700; }
.k2 .card2.no { filter: saturate(0.6); }
.k2 .card2.no .kpic { opacity: 0.6; }
.k2 .kcombat { display: flex; align-items: center; gap: 16px; }
.k2 .kround { width: 72px; height: 72px; border-radius: 50%; display: grid; place-items: center; background: var(--parch-2);
  border: 6px solid #8a5a3c; box-shadow: inset 0 0 0 2px #c9965a, 0 4px 0 0 #3f263155; }
.k2 .kround img { width: 18px; height: 51px; image-rendering: pixelated; transform: rotate(35deg); }
.k2 .kround.s { width: 56px; height: 56px; }
.k2 .kgaps { margin-top: 8px; padding: 8px 12px; background: var(--parch); border: 2px solid var(--edge); border-radius: 4px; font-size: 14px; }
.k2 .kgaps li { margin: 4px 0; }

/* A + C: dark outline + green tick badge top-right (the selection replaces the tile's edge) */
.k2 .vA .on, .k2 .vC .on { border: 3px solid var(--plum); }
.k2 .vA .ktab.on, .k2 .vC .ktab.on { border-bottom: 0; }
.k2 .vA .ktile.on::after, .k2 .vC .ktile.on::after, .k2 .vA .card2.on::after, .k2 .vC .card2.on::after {
  content: ''; position: absolute; right: -8px; top: -8px; width: 26px; height: 26px; border-radius: 50%;
  background: var(--green) url('${CHECK}') center / 19px 16px no-repeat; border: 2px solid var(--plum); image-rendering: pixelated; }
/* B + D: gold inset border + check (no glow) */
.k2 .vB .on, .k2 .vD .on { border: 3px solid var(--gold); box-shadow: inset 0 0 0 2px var(--gold-hi); }
.k2 .vB .ktab.on, .k2 .vD .ktab.on { border-bottom: 0; box-shadow: inset 2px 2px 0 0 var(--gold-hi), inset -2px 0 0 0 var(--gold-hi); }
.k2 .vB .ktile.on::after, .k2 .vD .ktile.on::after, .k2 .vB .card2.on::after, .k2 .vD .card2.on::after {
  content: ''; position: absolute; right: 3px; top: 3px; width: 19px; height: 16px;
  background: url('${CHECK}') center / 19px 16px no-repeat; image-rendering: pixelated; filter: drop-shadow(0 1px 0 #4a2f1c); }
`;

const VARIANTS: { cls: string; name: string; sub: string; icons: boolean }[] = [
  { cls: 'vA', name: 'A', sub: 'Mörk kant + grön bock, bara ord', icons: false },
  { cls: 'vB', name: 'B', sub: 'Guldkant inuti + bock, bara ord', icons: false },
  { cls: 'vC', name: 'C', sub: 'Som A + ikon och ord', icons: true },
  { cls: 'vD', name: 'D', sub: 'Som B + ikon och ord', icons: true },
];
const TABS = ['Form', 'Färg', 'Ögon', 'Mun', 'Hatt'];
const LOOKS = [
  { color: COLORS[2], shape: 0, eyes: 1, mouth: 0, hat: 0 },
  { color: COLORS[1], shape: 1, eyes: 2, mouth: 1, hat: 0 },
  { color: COLORS[0], shape: 5, eyes: 0, mouth: 3, hat: 0 },
];

function el(tag: string, cls = '', text = '') {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}
function img(src: string, w: number, h: number) {
  const i = new Image(); i.src = src; i.alt = ''; i.width = w; i.height = h; return i;
}
/** A label as word, or icon + word when the variant wants icons and the Ninja pack has one. */
function label(target: HTMLElement, word: string, icons: boolean) {
  const ic = icons ? ICON[word] : undefined;
  if (ic) target.append(word === 'Mun' ? img(ic, 42, 39) : img(ic, 48, 48));
  target.append(el('span', '', word));
  return target;
}

function variant(v: (typeof VARIANTS)[number]) {
  const s = el('section', `kvar ${v.cls}`);
  const head = el('div', 'kvhead');
  const back = el('button', 'kback'); back.setAttribute('aria-label', 'Tillbaka');
  const t = el('div'); t.append(el('h2', '', v.name), el('small', '', v.sub));
  head.append(back, t); s.append(head);

  s.append(el('div', 'klab', 'Färger och blobbar'));
  const sw = el('div', 'krow c4');
  [COLORS[0], COLORS[1], COLORS[3], COLORS[2]].forEach((c, i) => {
    const tl = el('div', 'ktile' + (i === 1 ? ' on' : '')); const f = el('i'); f.style.background = '#' + c.toString(16).padStart(6, '0'); tl.append(f); sw.append(tl);
  });
  s.append(sw);
  const bl = el('div', 'krow c3'); bl.style.marginTop = '8px';
  LOOKS.forEach((l, i) => { const tl = el('div', 'ktile' + (i === 0 ? ' on' : '')); tl.append(blobEl(l)); bl.append(tl); });
  s.append(bl);

  s.append(el('div', 'klab', 'Flikar'));
  const tabs = el('div', 'ktabs');
  TABS.forEach((n, i) => tabs.append(label(el('div', 'ktab' + (i === 1 ? ' on' : '')), n, v.icons)));
  s.append(tabs, el('div', 'ktabpanel'));

  s.append(el('div', 'klab', 'Knappar'));
  const btns = el('div', 'kbtns');
  btns.append(label(el('div', 'kbtn kpri'), 'Nytt spel', v.icons), label(el('div', 'kbtn ksec'), 'Joina', v.icons));
  s.append(btns);

  s.append(el('div', 'klab', 'Namnskylt'));
  const plate = el('div', 'kplate');
  const edit = el('div', 'kedit'); edit.append(img(u('Items/Resource/feather.png'), 48, 48));
  plate.append(el('b', '', 'Stefan'), edit);
  s.append(plate);

  s.append(el('div', 'klab', 'Byggkort (råd / inte råd)'));
  const cards = el('div', 'kcards');
  const card = (pic: string, name: string, cost: [string, string, boolean][], ok: boolean, on: boolean) => {
    const c = el('div', 'card2' + (ok ? '' : ' no') + (on ? ' on' : ''));
    if (ok) c.append(el('span', 'badge-ok', 'Kan byggas'));
    const p = img(pic, 96, 96); p.className = 'kpic'; c.append(p, el('b', '', name));
    const row = el('div', 'kcost');
    for (const [ic, n, miss] of cost) { row.append(img(ic, 48, 48)); const x = el('span', miss ? 'kmiss' : '', n); row.append(x); }
    c.append(row);
    return c;
  };
  cards.append(
    card('art/ninja/storage.png', 'Förråd', [[u('Items/Resource/Branch.png'), '6', false]], true, true),
    card('art/ninja/watchtower.png', 'Vakttorn', [[u('Items/Resource/Branch.png'), '10', false], [u('Items/Resource/Rock.png'), '6', true]], false, false),
  );
  s.append(cards);

  s.append(el('div', 'klab', 'Stridsknappar (72 / 56 px)'));
  const cb = el('div', 'kcombat');
  const r1 = el('div', 'kround'); r1.append(img(u('Items/Weapons/Sword/Sprite.png'), 18, 51));
  const r2 = el('div', 'kround s'); r2.append(img(u('Items/Action/Interact.png'), 48, 48));
  r2.querySelector('img')!.style.cssText = 'width:48px;height:48px;transform:none';
  cb.append(r1, r2);
  s.append(cb);
  return s;
}

export function showUiKit2() {
  const st = document.createElement('style'); st.textContent = CSS; document.head.append(st);
  const page = el('div', 'k2');
  page.append(el('h1', '', 'UI-kit v2: A B C D'));
  for (const v of VARIANTS) page.append(variant(v));
  const g = el('div', 'kgaps'); g.append(el('b', '', 'Luckor (ingen bra Ninja-ikon):'));
  const ul = el('ul'); for (const x of GAPS) ul.append(el('li', '', x)); g.append(ul);
  page.append(g);
  document.body.append(page);
  document.body.classList.add('uikit');
}
