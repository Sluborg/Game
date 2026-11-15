// UI-kit v2 comparison page (?uikit=2): Stefan's review decisions (docs/reviews/README.md) as one fixed base, with
// four selection / label variants side by side. Nothing here is used by the game.
// Fixed for every variant: parchment (warm cream) interiors, Theme Wood outer frame at ONE thin thickness, quiet thin
// option tiles (heavy wood only on the outer panel + primary button), primary = orange, secondary = cream + plum text
// + quiet wood edge, Fredoka >= 14 px (body 18), 8 px rhythm, >= 48 px targets, back chevron chip top-left, 3x pixels.
// A: dark outline + green tick badge, words only      B: gold inset border + check, words only
// C: as A + icon and word                              D: as B + icon and word
// v2.1: icons are ChatGPT N-17 (art/icons/ui/*-16) and N-18 state badges (art/icons/state/*-16), 16 px art at 3x;
// open items are listed in GAPS at the bottom of the page.
import { blobEl, COLORS } from './blob';

const NJ = 'assets/ninja-adventure/';
const TW = NJ + 'Ui/Theme/Theme%20Wood/';
const u = (p: string) => encodeURI(NJ + p);
const UI = (n: string) => `art/icons/ui/${n}-16.png`; // ChatGPT N-17, 16x16
const STATE = (n: string) => `art/icons/state/${n}-16.png`; // ChatGPT N-18, 16x16
/** Icon per label (16 px art shown at 3x = 48 px). */
const ICON: Partial<Record<string, string>> = {
  Form: UI('shape'), Färg: UI('colour'), Ögon: UI('eyes'), Mun: UI('mouth'), Hatt: UI('hat'),
  'Nytt spel': UI('new-game'), Joina: UI('join'), Slumpa: UI('dice'),
};
/** N-19 round button (48x48 file, the wooden ring itself is ~30x32 art px; pressed has the same outline). */
const ROUND = (state: 'normal' | 'pressed') => `art/dungeon/ui/btn-round-${state}-48.png`;
const GAPS = [
  'N-19 round button: its ring is ~30 px art, so integer scales give a ~62 px ring (2x) or ~93 px (3x); the review asked for 64-72 / 48-56 px. Both shown; pick one, or order a 22-24 px ring for 3x',
  'Selection tick badge: the N-18 ticks are 16x16, at 3x (48 px) they cover a 56 px tile, so they are shown at 2x (32 px) here; an 8x8 or 10x10 tick would fit 3x',
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
.k2 .kback { flex: none; width: 56px; height: 56px; background: var(--parch-2) url('${UI('back')}') center / 48px 48px no-repeat; image-rendering: pixelated;
  border: 2px solid var(--edge-lo); border-radius: 4px; padding: 0; box-shadow: 0 4px 0 0 #3f263166; }
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
.k2 .kbtns { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; }
.k2 .kchipwrap { display: flex; justify-content: center; }
.k2 .kchip { height: 48px; padding: 0 16px; display: inline-flex; align-items: center; gap: 6px; font: 700 16px var(--font); color: var(--plum);
  background: var(--parch-2); border: 2px solid var(--edge-lo); border-radius: 4px; }
/* calm press: nothing swaps, nothing changes size; the face moves 2 px down onto its shadow and darkens a little */
.k2 .kbtn, .k2 .kchip { box-shadow: 0 4px 0 0 #3f263166; }
.k2 .ksec { box-shadow: inset 0 -3px 0 0 #e4cf9f, 0 4px 0 0 #3f263166; }
.k2 .kbtn.press, .k2 .kchip.press, .k2 .kbtn:active, .k2 .kchip:active { transform: translateY(2px); filter: brightness(0.9); }
.k2 .kbtn.press, .k2 .kchip.press { box-shadow: 0 2px 0 0 #3f263166; }
.k2 .ksec.press { box-shadow: inset 0 -3px 0 0 #e4cf9f, 0 2px 0 0 #3f263166; }
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
.k2 .card2 { padding-top: 8px; }
.k2 .vC .ktab, .k2 .vD .ktab { min-height: 72px; }
.k2 .krow.c4, .k2 .kcards { margin-top: 14px; } /* room for the tick badge that overhangs the corner */
.k2 .kstate { position: absolute; left: 4px; top: 4px; width: 48px; height: 48px; image-rendering: pixelated; z-index: 1; }
.k2 .card2.no .kstate { filter: none; }
.k2 .badge-ok { position: absolute; left: 6px; top: 6px; padding: 2px 8px; border-radius: 10px; background: var(--green); color: #fff; font-size: 14px; font-weight: 700; }
.k2 .card2.no { background: #efe3c6; }
.k2 .card2.no .kpic { opacity: 0.6; }
.k2 .kcombat { display: flex; align-items: center; gap: 16px; }
.k2 .kround { display: grid; place-items: center; background-repeat: no-repeat; background-position: center; image-rendering: pixelated; }
.k2 .kround img { image-rendering: pixelated; transform: rotate(35deg); }
.k2 .kgaps { margin-top: 8px; padding: 8px 12px; background: var(--parch); border: 2px solid var(--edge); border-radius: 4px; font-size: 14px; }
.k2 .kgaps li { margin: 4px 0; }

/* A + C: dark outline + green tick badge top-right (the selection replaces the tile's edge) */
.k2 .vA .on, .k2 .vC .on { border: 3px solid var(--plum); }
.k2 .vA .ktab.on, .k2 .vC .ktab.on { border-bottom: 0; }
.k2 .vA .ktile.on::after, .k2 .vC .ktile.on::after, .k2 .vA .card2.on::after, .k2 .vC .card2.on::after {
  content: ''; position: absolute; right: -12px; top: -12px; width: 32px; height: 32px;
  background: url('${STATE('tick-green')}') center / 32px 32px no-repeat; image-rendering: pixelated; }
/* B + D: gold inset border + check (no glow) */
.k2 .vB .on, .k2 .vD .on { border: 3px solid var(--gold); box-shadow: inset 0 0 0 2px var(--gold-hi); }
.k2 .vB .ktab.on, .k2 .vD .ktab.on { border-bottom: 0; box-shadow: inset 2px 2px 0 0 var(--gold-hi), inset -2px 0 0 0 var(--gold-hi); }
.k2 .vB .ktile.on::after, .k2 .vD .ktile.on::after, .k2 .vB .card2.on::after, .k2 .vD .card2.on::after {
  content: ''; position: absolute; right: -12px; top: -12px; width: 32px; height: 32px;
  background: url('${STATE('tick-gold')}') center / 32px 32px no-repeat; image-rendering: pixelated; }
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
  if (ic) target.append(img(ic, 48, 48));
  target.append(el('span', '', word));
  return target;
}

/** Round combat button (N-19): the wooden ring art, plain backing, a free-standing symbol on top. Pressed = N-19's own
 *  pressed frame (same outline and size, darker sunk face), no jump. */
function roundBtn(scale: 2 | 3, pressed: boolean) {
  const r = el('div', 'kround' + (pressed ? ' press' : ''));
  r.style.cssText = `width:${48 * scale}px;height:${48 * scale}px;background-image:url('${ROUND(pressed ? 'pressed' : 'normal')}');background-size:${48 * scale}px`;
  const sym = img(u('Items/Weapons/Sword/Sprite.png'), 6 * scale, 17 * scale);
  if (pressed) sym.style.marginTop = `${scale}px`;
  r.append(sym);
  return r;
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

  // every button type: normal | pressed (calm press: same size and frame, face 2 px down, shadow shrinks, a bit darker)
  s.append(el('div', 'klab', 'Knappar: vanlig | nedtryckt'));
  const btns = el('div', 'kbtns');
  for (const pressed of [false, true]) btns.append(label(el('div', 'kbtn kpri' + (pressed ? ' press' : '')), 'Nytt spel', v.icons));
  for (const pressed of [false, true]) btns.append(label(el('div', 'kbtn ksec' + (pressed ? ' press' : '')), 'Joina', v.icons));
  for (const pressed of [false, true]) { const c = el('div', 'kchipwrap'); c.append(label(el('div', 'kchip' + (pressed ? ' press' : '')), 'Slumpa', v.icons)); btns.append(c); }
  s.append(btns);

  s.append(el('div', 'klab', 'Namnskylt'));
  const plate = el('div', 'kplate');
  const edit = el('div', 'kedit'); edit.append(img(UI('quill'), 48, 48));
  plate.append(el('b', '', 'Stefan'), edit);
  s.append(plate);

  s.append(el('div', 'klab', 'Byggkort (råd / inte råd)'));
  const cards = el('div', 'kcards');
  const card = (pic: string, name: string, cost: [string, string, boolean][], ok: boolean, on: boolean) => {
    const c = el('div', 'card2' + (ok ? '' : ' no') + (on ? ' on' : ''));
    const badge = img(STATE(ok ? 'can-build' : 'lock'), 48, 48); badge.className = 'kstate'; c.append(badge);
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

  s.append(el('div', 'klab', 'Rund stridsknapp N-19 i 2x (ring ~62 px): vanlig | nedtryckt'));
  const cb = el('div', 'kcombat');
  for (const pressed of [false, true]) cb.append(roundBtn(2, pressed));
  s.append(cb);
  s.append(el('div', 'klab', 'Rund stridsknapp N-19 i 3x (ring ~93 px): vanlig | nedtryckt'));
  const cb3 = el('div', 'kcombat');
  for (const pressed of [false, true]) cb3.append(roundBtn(3, pressed));
  s.append(cb3);
  return s;
}

export function showUiKit2() {
  const st = document.createElement('style'); st.textContent = CSS; document.head.append(st);
  const page = el('div', 'k2');
  page.append(el('h1', '', 'UI-kit v2: A B C D'));
  for (const v of VARIANTS) page.append(variant(v));
  const g = el('div', 'kgaps'); g.append(el('b', '', 'Öppet:'));
  const ul = el('ul'); for (const x of GAPS) ul.append(el('li', '', x)); g.append(ul);
  page.append(g);
  document.body.append(page);
  document.body.classList.add('uikit');
}
