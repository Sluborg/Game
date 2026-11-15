// UI-kit comparison page (?uikit): four selection/border styles side by side so Stefan can pick ONE.
// Only Ninja Adventure Theme Wood pieces + Fredoka, no new drawn art. Nothing here is used by the game yet.
// A "Thin + yellow"  thin frame, selection = the tile's own border turns thick yellow + a check in the corner
// B "Thin + glow"    thin frame, selection = white border + soft glow, inside the tile
// C "Inset"          flat tiles, selection = pressed in (darker, 1 px down) + orange border
// D "Current"        today's thick Ninja frames, for reference
// The selection always REPLACES the border (box-sizing: border-box, no outline/outer shadow).
import { blobEl, COLORS } from './blob';

const TW = 'assets/ninja-adventure/Ui/Theme/Theme%20Wood/';
const CHECK = 'art/icons/check.png'; // ChatGPT N-10 (approved)
const hex = (c: number) => '#' + c.toString(16).padStart(6, '0');

const CSS = `
body.uikit { overflow: auto !important; background: #6cb24a; height: auto; }
body.uikit > *:not(.uk-page) { display: none !important; }
.uk-page { font-family: var(--font); color: var(--plum); padding: 10px 8px 24px; box-sizing: border-box; }
.uk-page * { box-sizing: border-box; }
.uk-page h1 { font-size: 18px; margin: 0 0 8px; text-align: center; color: #fff8e8; -webkit-text-stroke: 1px #4a2f1c; }
.uk-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 8px; }
.uk-col { min-width: 0; }
.uk-col { padding: 8px 6px 10px; border: 6px solid; border-image: url('${TW}nine_path_panel_3.png') 6 5 5 6 fill / 6px stretch; }
.uk-col h2 { margin: 0 0 6px; font-size: 14px; text-align: center; }
.uk-sec { font-size: 10px; color: var(--muted); margin: 7px 0 3px; }
.uk-row { display: grid; gap: 5px; }
.uk-row.c4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.uk-row.c3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.uk-tile { position: relative; aspect-ratio: 1; display: grid; place-items: center; overflow: hidden; }
.uk-tile i { position: absolute; inset: 0; }
.uk-tile .blob { width: 88%; height: 88%; display: grid; place-items: center; }
.uk-tile .blob img { width: 100%; height: 100%; object-fit: contain; image-rendering: pixelated; }
.uk-tabs { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 2px; }
.uk-tab { display: grid; place-items: center; text-align: center; height: 26px; font-size: 10px; letter-spacing: -0.2px; overflow: hidden; font-weight: 600; padding: 0; }
.uk-btns { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 5px; }
.uk-btn { display: grid; place-items: center; height: 36px; font-size: 14px; font-weight: 700; padding: 0; }
.uk-input { height: 34px; font: 600 14px var(--font); color: var(--plum); padding: 0 8px; width: 100%; display: flex; align-items: center; }
.uk-chip { display: inline-grid; place-items: center; height: 26px; padding: 0 10px; font-size: 12px; font-weight: 600; }

/* A + B: thin Ninja frame (half of today's 9 px), square, content fills the tile */
.sA .uk-tile, .sB .uk-tile, .sA .uk-input, .sB .uk-input, .sA .uk-tab, .sB .uk-tab {
  border: 4px solid; border-image: url('${TW}nine_path_panel_3.png') 6 5 5 6 fill / 4px stretch; }
.sA .uk-tile i, .sB .uk-tile i { inset: 0; }
/* A: the own border turns thick yellow + check */
.sA .on { border: 4px solid var(--yellow) !important; border-image: none !important; background: var(--yellow-hi); }
.sA .uk-tile.on { border-width: 5px !important; }
.sA .uk-tile.on::after { content: ''; position: absolute; right: 1px; top: 1px; width: 14px; height: 14px;
  background: url('${CHECK}') center / contain no-repeat; image-rendering: pixelated; filter: drop-shadow(0 1px 0 #4a2f1c); }
/* B: white border + soft glow, inside the tile */
.sB .on { border: 4px solid #fff !important; border-image: none !important; background: #fff; outline: 1px solid var(--plum); outline-offset: -1px; }
.sB .uk-tile.on::before { content: ''; position: absolute; inset: 0; z-index: 1; box-shadow: inset 0 0 7px 3px #fffd; pointer-events: none; }

/* C: flat tiles, pressed in when selected */
.sC .uk-tile, .sC .uk-input, .sC .uk-tab { border: 2px solid #c9a46a; background: var(--cream-2); border-radius: 3px; }
.sC .on { border-color: var(--orange) !important; background: #e2cfa4; transform: translateY(1px); box-shadow: inset 0 2px 0 0 #0002; }
.sC .uk-tile.on i { filter: brightness(0.86); }

/* buttons for A/B/C: only primary (orange) + secondary (wood), same height and corner */
.sA .uk-btn, .sB .uk-btn, .sC .uk-btn, .sA .uk-chip, .sB .uk-chip, .sC .uk-chip { border: 6px solid; color: #fff8e8; text-shadow: 0 1px 0 #4a2f1c; }
.sA .uk-btn.pri, .sB .uk-btn.pri, .sC .uk-btn.pri { border-image: url('${TW}button_normal.png') 2 fill / 6px stretch; }
.sA .uk-btn.sec, .sB .uk-btn.sec, .sC .uk-btn.sec, .sA .uk-chip, .sB .uk-chip, .sC .uk-chip { border-image: url('${TW}button_hover.png') 2 fill / 6px stretch; color: var(--plum); text-shadow: none; }
.sA .uk-chip, .sB .uk-chip, .sC .uk-chip { border-width: 5px; border-image-width: 5px; }

/* D: today's game styles (style.css: .opt 9 px panel, .opt.on button_hover, tabs, .big 16 px, .chip 9 px) */
.sD .uk-tile, .sD .uk-input { border: 9px solid; border-image: url('${TW}nine_path_panel_3.png') 6 5 5 6 fill / 9px stretch; }
.sD .uk-tile.on { border-image-source: url('${TW}button_hover.png'); border-image-slice: 2 fill; }
.sD .uk-tile i { inset: 0; }
.sD .uk-tab { border: 9px solid; border-bottom-width: 0; border-image: url('${TW}tab_unselected.png') 4 6 0 4 fill / 9px 9px 0 9px stretch; height: 30px; justify-items: start; padding-left: 2px; }
.sD .uk-tab.on { border-image-source: url('${TW}tab_selected.png'); }
.sD .uk-btn { border: 16px solid; border-image: url('${TW}button_normal.png') 2 fill / 16px stretch; height: auto; padding: 2px 0; color: #fff8e8; }
.sD .uk-btn.sec { border-image-source: url('${TW}button_hover.png'); color: var(--plum); }
.sD .uk-chip { border: 9px solid; border-image: url('${TW}button_hover.png') 2 fill / 9px stretch; }
`;

const STYLES: [string, string][] = [
  ['sA', 'A · Tunn + gul'], ['sB', 'B · Tunn + vit glöd'], ['sC', 'C · Intryckt'], ['sD', 'D · Nuvarande'],
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

function column(cls: string, title: string) {
  const col = el('section', `uk-col ${cls}`);
  col.append(el('h2', '', title));
  col.append(el('div', 'uk-sec', 'Färgrutor'));
  const sw = el('div', 'uk-row c4');
  [COLORS[0], COLORS[1], COLORS[3], COLORS[2]].forEach((c, i) => {
    const t = el('div', 'uk-tile' + (i === 1 ? ' on' : ''));
    const f = el('i'); f.style.background = hex(c); t.append(f); sw.append(t);
  });
  col.append(sw);
  col.append(el('div', 'uk-sec', 'Blobbar'));
  const bl = el('div', 'uk-row c3');
  LOOKS.forEach((l, i) => { const t = el('div', 'uk-tile' + (i === 0 ? ' on' : '')); t.append(blobEl(l)); bl.append(t); });
  col.append(bl);
  col.append(el('div', 'uk-sec', 'Flikar'));
  const tabs = el('div', 'uk-tabs');
  TABS.forEach((n, i) => tabs.append(el('div', 'uk-tab' + (i === 1 ? ' on' : ''), n)));
  col.append(tabs);
  col.append(el('div', 'uk-sec', 'Knappar'));
  const btns = el('div', 'uk-btns');
  btns.append(el('div', 'uk-btn pri', 'Klar'), el('div', 'uk-btn sec', 'Slumpa'));
  col.append(btns);
  col.append(el('div', 'uk-sec', 'Namn'));
  col.append(el('div', 'uk-input', 'Stefan'));
  col.append(el('div', 'uk-sec', 'Chip'));
  col.append(el('div', 'uk-chip', 'Ny by'));
  return col;
}

export function showUiKit() {
  const st = document.createElement('style'); st.textContent = CSS; document.head.append(st);
  const page = el('div', 'uk-page');
  page.append(el('h1', '', 'UI-kit: välj EN stil'));
  const grid = el('div', 'uk-grid');
  for (const [cls, title] of STYLES) grid.append(column(cls, title));
  page.append(grid);
  document.body.append(page);
  document.body.classList.add('uikit');
}
