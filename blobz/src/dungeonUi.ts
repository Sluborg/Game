// Dungeon DOM UI (Code 2): weapon cards, dungeon HUD (hearts, gold, floor, XP + level, time),
// special button cooldown ring, knocked-out banner and the "Dungeon klar!" summary.
// Markup lives in index.html (#weapon-pick, #hud-dg, #dg-ko, #dg-end, #attack); main.ts calls dungeonUi().
import './dungeon.css';
import type { Controls } from './controls';
import { FLOORS, LEVEL_XP, specialOf, WEAPON_NAMES, WEAPONS, type DView, type Weapon } from './dungeon';
import { sfx } from './sfx';
import type { View } from './sim';

const $ = (id: string) => document.getElementById(id)!;
const show = (id: string, on: boolean) => document.getElementById(id)?.classList.toggle('hidden', !on);
const setText = (el: HTMLElement, t: string) => { if (el.textContent !== t) el.textContent = t; };
/** Short picture-first hints on the cards (kids 8+: the picture and the name carry it). */
const WEAPON_HINT: Record<Weapon, string> = { sword: 'Snabb', hammer: 'Stark, slår runt', spear: 'Långt, rakt' };

let sendPick: (w: Weapon) => void = () => {};
/** main.ts tells the UI how a pick reaches the host (host: straight into the sim; joiner: over the net). */
export function setPicker(fn: (w: Weapon) => void) { sendPick = fn; }

let lastMode = 'meadow';
let myPick: Weapon | null = null;
let heartsKey = '';
let endShown = false;

function buildCards() {
  const root = $('weapon-cards');
  if (root.childElementCount) return;
  root.replaceChildren(...WEAPONS.map((w) => {
    const b = document.createElement('button');
    b.className = 'wcard'; b.type = 'button'; b.dataset.w = w;
    b.setAttribute('aria-label', WEAPON_NAMES[w]);
    b.innerHTML = `<img src="art/dungeon/card-${w}.png" alt="" /><b>${WEAPON_NAMES[w]}</b><small>${WEAPON_HINT[w]}</small>`;
    b.onclick = () => { myPick = w; sfx.pick(); sendPick(w); markCards(); };
    return b;
  }));
}

function markCards() {
  $('weapon-cards').querySelectorAll<HTMLButtonElement>('.wcard').forEach((b) => {
    b.classList.toggle('on', b.dataset.w === myPick);
    b.classList.toggle('off', !!myPick && b.dataset.w !== myPick);
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
  const max = h ? specialOf('krigare', h.weapon).cd : 1;
  const left = h ? Math.max(0, Math.min(1, h.spCd / max)) : 0;
  btn.style.setProperty('--cd', String(left));
  btn.classList.toggle('cd', left > 0);
  btn.setAttribute('aria-label', h ? specialOf('krigare', h.weapon).name : 'Special');
  // Art's icon per weapon special (spin / slam / charge)
  const icon = document.getElementById('attack-icon') as HTMLImageElement | null;
  const src = `art/dungeon/btn-special-${h?.weapon ?? 'sword'}.png`;
  if (icon && !icon.src.endsWith(src)) icon.src = src;
}

/** Called first thing in main.ts onView. Returns true when the meadow HUD/end logic should be skipped. */
export function dungeonUi(v: View, myId: string | undefined, controls: Controls): boolean {
  const mode = v.mode ?? 'meadow';
  ensureExtras();
  if (mode !== lastMode) {
    if (mode === 'pick') { myPick = null; buildCards(); markCards(); }
    if (mode === 'dungeon') { endShown = false; heartsKey = ''; controls.setTool(null); }
    controls.setDungeon(mode === 'dungeon');
    // the small button: sidestep icon underground, the dash arrow again on the meadow
    const dashImg = controls.dashBtn.querySelector('img');
    if (dashImg && !controls.tool) dashImg.src = mode === 'dungeon' ? 'art/dungeon/btn-sidestep.png' : 'art/icons/dash-arrow.png';
    show('hud-dg', mode === 'dungeon');
    if (mode !== 'dungeon') { show('dg-ko', false); show('dg-end', false); }
    lastMode = mode;
  }
  show('weapon-pick', mode === 'pick');
  if (mode === 'pick') {
    const picked = v.picked?.length ?? 0;
    setText($('pick-wait'), myPick ? `Väntar på kompisar ${picked}/${v.players.length} · ${Math.max(0, Math.ceil(v.pickT))} s` : `Tryck på ett vapen · ${Math.max(0, Math.ceil(v.pickT))} s`);
    return true;
  }
  if (mode !== 'dungeon' || !v.dungeon) return false;
  const d = v.dungeon;
  if (myId) renderHud(d, myId);
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
