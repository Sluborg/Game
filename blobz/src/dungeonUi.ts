// Dungeon DOM UI (Code 2): class + weapon cards, dungeon HUD (hearts, gold, floor, XP + level, time, item),
// special button cooldown ring, level-up 1-of-3 skill cards, loot roll/pass card, knocked-out banner and
// the "Dungeon klar!" summary. Art that is not there yet falls back to Kenney Tiny Dungeon tiles.
// Markup lives in index.html (#weapon-pick, #hud-dg, #dg-ko, #dg-end, #attack); main.ts calls dungeonUi().
import './dungeon.css';
import { tileCanvas } from './art';
import type { Controls } from './controls';
import {
  CLASS_HINT, CLASS_NAMES, CLASS_WEAPONS, CLASSES, FLOORS, heroMods, itemOf, LEVEL_XP, LOOT_SECONDS, OFFER_SECONDS, skillOf, specialOf, WEAPON_NAMES,
  type DView, type HeroClass, type Weapon,
} from './dungeon';
import { sfx } from './sfx';
import type { View } from './sim';

const $ = (id: string) => document.getElementById(id)!;
const show = (id: string, on: boolean) => document.getElementById(id)?.classList.toggle('hidden', !on);
const setText = (el: HTMLElement, t: string) => { if (el.textContent !== t) el.textContent = t; };
/** Short picture-first hints on the cards (kids 8+: the picture and the name carry it). */
const WEAPON_HINT: Record<Weapon, string> = { sword: 'Snabb', hammer: 'Stark, slår runt', spear: 'Långt, rakt', staff: '', bow: '', shield: '' };
/** Kenney Tiny Dungeon tiles standing in for class cards until Art's card-<class>.png exists. */
const CLASS_TILE: Record<HeroClass, number> = { krigare: 87, prast: 84, bagskytt: 88, riddare: 96 };

let sendPick: (w: string) => void = () => {};
/** main.ts tells the UI how a pick reaches the host (host: straight into the sim; joiner: over the net).
 *  The same path carries weapons ('sword'), skill cards ('skill:k-dmg') and loot votes ('loot:roll'). */
export function setPicker(fn: (w: string) => void) { sendPick = fn; }

/** Art if it exists (`src`), else a Kenney tile. */
function icon(src: string, tile: number, scale: number, cls = 'dgicon'): HTMLElement {
  const img = new Image();
  img.className = cls; img.alt = '';
  img.onerror = () => { const c = tileCanvas('dungeon', tile, scale, cls); img.replaceWith(c); };
  img.src = src;
  return img;
}

let lastMode = 'meadow';
let myPick: Weapon | null = null;
let heartsKey = '';
let endShown = false;

let pickClass: HeroClass | null = null;
/** Step 1: four class cards. Step 2 (Krigare only): Svärd / Hammare / Spjut. Other classes pick their one weapon. */
function buildCards() {
  const root = $('weapon-cards');
  const card = (key: string, img: HTMLElement, name: string, hint: string, onPick: () => void) => {
    const b = document.createElement('button');
    b.className = 'wcard'; b.type = 'button'; b.dataset.w = key;
    b.setAttribute('aria-label', name);
    b.append(img);
    b.insertAdjacentHTML('beforeend', `<b>${name}</b><small>${hint}</small>`);
    b.onclick = () => { sfx.pick(); onPick(); };
    return b;
  };
  const h2 = $('weapon-pick').querySelector('h2');
  if (!pickClass) {
    if (h2) h2.textContent = 'Välj klass';
    root.replaceChildren(...CLASSES.map((c) => card(c, icon(`art/dungeon/card-${c}.png`, CLASS_TILE[c], 6, 'cardimg'), CLASS_NAMES[c], CLASS_HINT[c], () => {
      const ws = CLASS_WEAPONS[c];
      if (ws.length === 1) { myPick = ws[0]; pickClass = c; sendPick(ws[0]); markCards(); return; }
      pickClass = c; buildCards();
    })));
  } else if (!myPick) {
    if (h2) h2.textContent = 'Välj vapen';
    const arrow = document.createElement('span'); arrow.className = 'cardimg back'; arrow.textContent = '←';
    const back = card('back', arrow, 'Tillbaka', '', () => { pickClass = null; buildCards(); });
    root.replaceChildren(...CLASS_WEAPONS[pickClass].map((w) => {
      const img = new Image(); img.src = `art/dungeon/card-${w}.png`; img.alt = ''; img.className = 'cardimg';
      return card(w, img, WEAPON_NAMES[w], WEAPON_HINT[w], () => { myPick = w; sendPick(w); markCards(); });
    }), back);
  }
  markCards();
}

function markCards() {
  $('weapon-cards').querySelectorAll<HTMLButtonElement>('.wcard').forEach((b) => {
    const on = b.dataset.w === myPick || (!!myPick && b.dataset.w === pickClass);
    b.classList.toggle('on', on);
    b.classList.toggle('off', !!myPick && !on);
  });
}

function renderHearts(hearts: number, max: number) {
  const key = hearts + '/' + max;
  if (key === heartsKey) return;
  heartsKey = key;
  $('dg-hearts').replaceChildren(...Array.from({ length: max }, (_, i) => {
    const img = new Image();
    img.src = `art/dungeon/heart-${hearts >= i + 1 ? 'full' : hearts >= i + 0.5 ? 'half' : 'empty'}.png`;
    img.alt = '';
    return img;
  }));
}

function ensureExtras() {
  if (!document.getElementById('dg-time')) {
    const t = document.createElement('span');
    t.id = 'dg-time';
    $('dg-row').append(t);
  }
  if (!document.getElementById('dg-end-why')) {
    const p = document.createElement('p');
    p.id = 'dg-end-why'; p.className = 'tag';
    $('dg-end').querySelector('h2')?.after(p);
  }
}

const fmt = (t: number) => Math.floor(t / 60) + ':' + String(Math.max(0, Math.floor(t % 60))).padStart(2, '0');

function renderHud(d: DView, myId: string) {
  const h = d.heroes[myId];
  if (h) renderHearts(h.hearts, h.maxHearts);
  setText($('dg-gold'), String(d.gold));
  setText($('dg-floor'), `Våning ${d.floor}/${FLOORS}`);
  setText($('dg-time'), fmt(d.time));
  $('dg-time').classList.toggle('low', d.time <= 30);
  setText($('dg-level'), String(d.level));
  const lo = d.level >= 2 ? LEVEL_XP[d.level - 2] : 0, hi = LEVEL_XP[d.level - 1] ?? lo + 1;
  $('dg-xpfill').style.width = Math.round(Math.max(0, Math.min(1, (d.xp - lo) / Math.max(1, hi - lo))) * 100) + '%';
  // knocked out: countdown
  const ko = (h?.ko ?? 0) > 0;
  show('dg-ko', ko);
  if (ko) setText($('dg-ko-t'), String(Math.ceil(h!.ko)));
  // special button: cooldown ring (fills up again), dim while cooling down
  const btn = $('attack');
  const max = h ? specialOf(h.cls, h.weapon).cd * heroMods(h).spCd : 1;
  const left = h ? Math.max(0, Math.min(1, h.spCd / max)) : 0;
  btn.style.setProperty('--cd', String(left));
  btn.classList.toggle('cd', left > 0);
  btn.setAttribute('aria-label', h ? specialOf(h.cls, h.weapon).name : 'Special');
  // Art's icon per weapon special (spin / slam / charge)
  const spIcon = document.getElementById('attack-icon') as HTMLImageElement | null;
  const src = `art/dungeon/btn-special-${h?.weapon ?? 'sword'}.png`;
  if (spIcon && !spIcon.src.endsWith(src)) { spIcon.onerror = () => { spIcon.onerror = null; spIcon.src = 'art/dungeon/btn-attack.png'; }; spIcon.src = src; }
  // my loot item next to the gold
  const key = h?.item ?? '';
  const slot = $('dg-item');
  if (slot.dataset.k !== key) {
    slot.dataset.k = key;
    const it = itemOf(key);
    slot.replaceChildren(...(it ? [icon(`art/dungeon/item-${it.id}.png`, it.icon, 2)] : []));
    slot.title = it?.name ?? '';
    slot.classList.toggle('hidden', !it);
  }
}

// ---------- level-up: 1 of 3 skill cards from my class (10 s, then the first is taken) ----------
let offerKey = '';
function renderOffer(d: DView, myId: string) {
  const h = d.heroes[myId];
  const offer = h?.ko ? [] : h?.offer ?? [];
  const key = offer.join(',');
  show('dg-cards', offer.length > 0);
  if (key !== offerKey) {
    offerKey = key;
    if (offer.length) sfx.star();
    $('dg-cards-row').replaceChildren(...offer.map((id) => {
      const sk = skillOf(id)!;
      const b = document.createElement('button');
      b.className = 'skcard'; b.type = 'button'; b.dataset.s = id;
      b.append(icon(`art/dungeon/skill-${id}.png`, sk.icon, 3));
      b.insertAdjacentHTML('beforeend', `<b>${sk.name}</b>`);
      b.onclick = () => { sfx.pick(); sendPick('skill:' + id); b.classList.add('on'); };
      return b;
    }));
  }
  if (offer.length) {
    $('dg-cards-bar').style.width = Math.round(Math.max(0, Math.min(1, (h!.offerT) / OFFER_SECONDS)) * 100) + '%';
    setText($('dg-cards-title'), `Nivå ${d.level}! Välj en`);
  }
}

// ---------- rare loot: my item vs the new one, Rulla or Passa ----------
let lootKey = '';
function renderLoot(d: DView, myId: string, nameOf: (id: string) => string) {
  const v = d.loot, last = d.lootLast;
  show('dg-loot', !!v || !!last);
  if (!v && !last) { lootKey = ''; return; }
  const mine = itemOf(d.heroes[myId]?.item);
  if (v) {
    const it = itemOf(v.item)!;
    const key = 'v:' + v.item + ':' + (mine?.id ?? '');
    if (key !== lootKey) {
      lootKey = key;
      sfx.power();
      const side = (label: string, x: typeof it | undefined) => {
        const col = document.createElement('div');
        col.className = 'lootside';
        col.insertAdjacentHTML('beforeend', `<small>${label}</small>`);
        col.append(x ? icon(`art/dungeon/item-${x.id}.png`, x.icon, 4) : document.createElement('i'));
        col.insertAdjacentHTML('beforeend', `<b>${x?.name ?? 'Inget'}</b>`);
        return col;
      };
      const arrow = document.createElement('span'); arrow.className = 'lootarrow'; arrow.textContent = '→';
      $('dg-loot-items').replaceChildren(side('Din', mine), arrow, side('Ny!', it));
    }
    const my = v.rolls[myId] ?? 0;
    show('dg-loot-btns', my === -1);
    const others = Object.entries(v.rolls).map(([id, r]) => `${nameOf(id)}: ${r === -1 ? '...' : r === 0 ? 'passar' : r}`).join(' · ');
    setText($('dg-loot-msg'), `${others} · ${Math.max(0, Math.ceil(v.t))} s`);
    setText($('dg-loot-title'), 'Ny skatt!');
  } else if (last) {
    const key = 'l:' + last.item + ':' + last.win;
    if (key !== lootKey) {
      lootKey = key;
      const it = itemOf(last.item)!;
      $('dg-loot-items').replaceChildren(icon(`art/dungeon/item-${it.id}.png`, it.icon, 4));
      show('dg-loot-btns', false);
      setText($('dg-loot-title'), last.win ? `${nameOf(last.win)} fick ${it.name}!` : `Ingen tog ${it.name}`);
      setText($('dg-loot-msg'), last.win ? `Rullade ${last.roll}` : '');
      if (last.win === myId) sfx.star();
    }
  }
}

function buildOverlays() {
  if (document.getElementById('dg-cards')) return;
  const hud = $('hud');
  const stop = (el: HTMLElement) => { el.addEventListener('pointerdown', (e) => e.stopPropagation()); return el; };
  const cards = document.createElement('div');
  cards.id = 'dg-cards'; cards.className = 'hidden';
  cards.innerHTML = '<div id="dg-cards-title"></div><div id="dg-cards-row"></div><div class="dgbar"><i id="dg-cards-bar"></i></div>';
  hud.append(stop(cards));
  const loot = document.createElement('div');
  loot.id = 'dg-loot'; loot.className = 'hidden';
  loot.innerHTML = '<div id="dg-loot-title"></div><div id="dg-loot-items"></div><div id="dg-loot-btns"><button type="button" id="dg-roll">Rulla</button><button type="button" id="dg-pass">Passa</button></div><div id="dg-loot-msg"></div>';
  hud.append(stop(loot));
  $('dg-roll').onclick = () => { sfx.pick(); sendPick('loot:roll'); };
  $('dg-pass').onclick = () => { sfx.pick(); sendPick('loot:pass'); };
  const item = document.createElement('span');
  item.id = 'dg-item'; item.className = 'hidden';
  $('dg-row').append(item);
  void LOOT_SECONDS;
}

/** Called first thing in main.ts onView. Returns true when the meadow HUD/end logic should be skipped. */
export function dungeonUi(v: View, myId: string | undefined, controls: Controls, nameOf: (id: string) => string = () => '?'): boolean {
  const mode = v.mode ?? 'meadow';
  ensureExtras();
  buildOverlays();
  if (mode !== lastMode) {
    if (mode === 'pick') { myPick = null; pickClass = null; buildCards(); }
    if (mode === 'dungeon') { endShown = false; heartsKey = ''; controls.setTool(null); }
    controls.setDungeon(mode === 'dungeon');
    // the small button: sidestep icon underground, the dash arrow again on the meadow
    const dashImg = controls.dashBtn.querySelector('img');
    if (dashImg && !controls.tool) dashImg.src = mode === 'dungeon' ? 'art/dungeon/btn-sidestep.png' : 'art/icons/dash-arrow.png';
    show('hud-dg', mode === 'dungeon');
    if (mode !== 'dungeon') { show('dg-ko', false); show('dg-end', false); show('dg-cards', false); show('dg-loot', false); offerKey = ''; lootKey = ''; }
    lastMode = mode;
  }
  show('weapon-pick', mode === 'pick');
  if (mode === 'pick') {
    const picked = v.picked?.length ?? 0;
    setText($('pick-wait'), myPick ? `Väntar på kompisar ${picked}/${v.players.length} · ${Math.max(0, Math.ceil(v.pickT))} s` : `${pickClass ? 'Tryck på ett vapen' : 'Tryck på en klass'} · ${Math.max(0, Math.ceil(v.pickT))} s`);
    return true;
  }
  if (mode !== 'dungeon' || !v.dungeon) return false;
  const d = v.dungeon;
  if (myId) { renderHud(d, myId); renderOffer(d, myId); renderLoot(d, myId, nameOf); }
  if (d.done > 0 && !endShown) {
    endShown = true;
    setText($('dg-end-gold'), String(d.gold));
    setText($('dg-end-level'), String(d.level));
    setText($('dg-end-kills'), String(d.kills));
    setText($('dg-end-why'), d.why === 'boss' ? 'Ni besegrade bossen!' : d.why === 'time' ? 'Tiden tog slut.' : 'Ni klev upp ur grottan.');
    show('dg-end', true);
    sfx.star();
  }
  if (d.done <= 0 && endShown) { endShown = false; show('dg-end', false); }
  return true;
}
