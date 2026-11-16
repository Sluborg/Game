// Dungeon DOM UI (Code 2): class + weapon cards, dungeon HUD (hearts, gold, floor, XP + level, time, item),
// special button cooldown ring, level-up 1-of-3 skill cards, loot roll/pass card, knocked-out banner and
// the "Dungeon klar!" summary. Art that is not there yet falls back to Kenney Tiny Dungeon tiles.
// Markup lives in index.html (#weapon-pick, #hud-dg, #dg-ko, #dg-end, #attack); main.ts calls dungeonUi().
import './dungeon.css';
import type { Controls } from './controls';
import { ITEM_SLOTS, lootReplaces,
  DUNGEON_TIMER_ENABLED, ROOMS, skillIcon, ITEM_ICON, CLASS_WEAPONS, CLASSES, FLOORS, heroMods, itemOf, LEVEL_XP, LOOT_SECONDS, skillOf, specialOf,
  type DView, type HeroClass, type Weapon,
} from './dungeon';
import { sfx } from './sfx';
import { t, tClass, tClassHint, tEffects, tItem, tSkill, tSpecial, tWeapon, tWeaponHint } from './dungeonText';
import { applyI18n } from './i18n';
import { PICK_TIMER_ENABLED, type View } from './sim';
import { NI } from './ninjaArt';

const $ = (id: string) => document.getElementById(id)!;
const show = (id: string, on: boolean) => document.getElementById(id)?.classList.toggle('hidden', !on);
const setText = (el: HTMLElement, t: string) => { if (el.textContent !== t) el.textContent = t; };

let sendPick: (w: string) => void = () => {};
/** main.ts tells the UI how a pick reaches the host (host: straight into the sim; joiner: over the net).
 *  The same path carries weapons ('sword'), skill cards ('skill:k-dmg') and loot votes ('loot:roll'). */
export function setPicker(fn: (w: string) => void) { sendPick = fn; }

/** A pixel-art icon image (Ninja Adventure / Art). */
function icon(src: string, _tile = 0, _scale = 1, cls = 'dgicon'): HTMLElement {
  const img = new Image();
  img.className = cls; img.alt = '';
  img.src = src;
  return img;
}
const NAU = 'assets/ninja-adventure/';
/** Ninja icon on the special button per weapon (docs/OLD_ART_CHECKLIST.md). */
const SPECIAL_ICON: Record<Weapon, string> = {
  sword: 'Ui/Skill Icon/Spell/Cut.png', hammer: 'Ui/Skill Icon/Spell/Explosion.png', spear: 'Ui/Skill Icon/Spell/MagicWeapon.png', staff: 'Ui/Skill Icon/Spell/Heal.png',
  bow: 'Ui/Skill Icon/Items & Weapon/Kunai.png', shield: 'Ui/Skill Icon/Spell/DefenseUpgrade.png', dagger: 'Ui/Skill Icon/Items & Weapon/Shuriken.png',
};
/** the small button's class move icon (Ninja skill icons) */
const MOVE_ICON: Record<string, string> = { rogue: 'art/dungeon/icons/dodge-16.png', marksman: 'art/dungeon/icons/jump-back-16.png', tank: 'art/dungeon/icons/shield-charge-16.png', healer: 'art/dungeon/icons/phase-out-16.png' }; // ChatGPT N-12
/** the healer's button shows the wand's current mode: damage (red orb) / heal (green) */
const HEALER_ICON = ['art/dungeon/icons/damage-mode-16.png', 'art/dungeon/icons/heal-mode-16.png']; // ChatGPT N-12
/** the big round button's free symbol for the other classes: their own weapon (ChatGPT N-11, 16 px art at 3x) */
const BIG_ICON: Record<string, string> = { rogue: 'art/dungeon/weapons/dagger-16.png', marksman: 'art/dungeon/weapons/crossbow-16.png', tank: 'art/dungeon/weapons/shield-16.png' };
/** Ninja weapon sprites on the rogue's weapon cards. */
const WEAPON_CARD: Partial<Record<Weapon, string>> = { sword: 'Items/Weapons/Sword/Sprite.png', shield: 'Items/Weapons/BigSword/Sprite.png', hammer: 'Items/Weapons/Hammer/Sprite.png', dagger: 'Items/Weapons/Ninjaku/SpriteInHand.png', spear: 'Items/Weapons/Lance/Sprite.png' };

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
    if (h2) h2.textContent = t('dg.pickClass');
    root.replaceChildren(...CLASSES.map((c) => card(c, icon(`art/dungeon/card-class-${c}.png`, 0, 1, 'cardimg') /* ChatGPT N-5 / N-5b class cards */, tClass(c), tClassHint(c), () => {
      const ws = CLASS_WEAPONS[c];
      if (ws.length === 1) { myPick = ws[0]; pickClass = c; sendPick(ws[0]); markCards(); return; }
      pickClass = c; buildCards();
    })));
  } else if (!myPick) {
    if (h2) h2.textContent = t('dg.pickWeapon');
    const arrow = document.createElement('span'); arrow.className = 'cardimg back'; arrow.textContent = '←';
    const back = card('back', arrow, t('dg.back'), '', () => { pickClass = null; buildCards(); });
    root.replaceChildren(...CLASS_WEAPONS[pickClass].map((w) => {
      const img = icon(NAU + (WEAPON_CARD[w] ?? 'Items/Weapons/Sword/Sprite.png'), 0, 1, 'cardimg wpnimg');
      return card(w, img, tWeapon(w), tWeaponHint(w), () => { myPick = w; sendPick(w); markCards(); });
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

/** Health bar (Stefan: a bar, not hearts): fill + "80/100". Red when low. */
function renderHearts(hp: number, max: number) {
  const key = hp + '/' + max;
  if (key === heartsKey) return;
  heartsKey = key;
  const box = $('dg-hearts');
  if (!box.firstChild) box.innerHTML = '<div class="hpbar"><i></i></div><span class="hpnum"></span>';
  const frac = Math.max(0, Math.min(1, hp / Math.max(1, max)));
  const fill = box.querySelector<HTMLElement>('.hpbar i')!;
  fill.style.width = Math.round(frac * 100) + '%';
  fill.classList.toggle('low', frac <= 0.3);
  setText(box.querySelector<HTMLElement>('.hpnum')!, `${Math.ceil(hp)}/${max}`);
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

/** Set a HUD number; when it goes up it pops (juice). */
function bump(el: HTMLElement, v: string) {
  if (el.textContent === v) return;
  const up = Number(v) > Number(el.textContent || 0);
  el.textContent = v;
  if (up) { el.classList.remove('dg-bump'); void el.offsetWidth; el.classList.add('dg-bump'); }
}

function renderHud(d: DView, myId: string) {
  const h = d.heroes[myId];
  if (h) renderHearts(h.hp, h.maxHp);
  bump($('dg-gold'), String(d.gold));
  setText($('dg-floor'), d.rooms ? t('dg.room', { n: d.floor, max: ROOMS, w: Math.max(1, Math.min(d.waves, d.wave)), wm: d.waves }) : t('dg.floor', { d: d.dungeon, n: d.floor, max: FLOORS }));
  $('dg-time').classList.toggle('hidden', !DUNGEON_TIMER_ENABLED); // no time limit underground (flag off)
  if (DUNGEON_TIMER_ENABLED) { setText($('dg-time'), fmt(d.time)); $('dg-time').classList.toggle('low', d.time <= 30); }
  bump($('dg-level'), String(d.level));
  // the level-up button (Stefan 2026-11-15): unspent level-ups wait in a pulsing badge; tap = pick now (the cards
  // also open by themselves when the room is clear)
  let lb = document.getElementById('dg-lvlup') as HTMLButtonElement | null;
  if (!lb) {
    lb = document.createElement('button'); lb.id = 'dg-lvlup'; lb.type = 'button';
    lb.innerHTML = '<span class="up" aria-hidden="true"></span><b></b>';
    lb.onclick = () => { sfx.pick(); sendPick('skill:open'); };
    $('dg-xp').append(lb);
  }
  const unspent = h && h.ko <= 0 && !h.offer.length ? h.pending : 0;
  lb.classList.toggle('hidden', unspent <= 0);
  if (unspent > 0) { const r = $('hud-dg').getBoundingClientRect(); lb.style.top = `${Math.round(r.bottom + 10)}px`; } // right under the HP panel, at the right edge
  lb.setAttribute('aria-label', t('dg.lvlUp', { n: unspent }));
  setText(lb.querySelector('b')!, String(unspent));
  const lo = d.level >= 2 ? LEVEL_XP[d.level - 2] : 0, hi = LEVEL_XP[d.level - 1] ?? lo + 1;
  $('dg-xpfill').style.width = Math.round(Math.max(0, Math.min(1, (d.xp - lo) / Math.max(1, hi - lo))) * 100) + '%';
  // knocked out: countdown
  const ko = (h?.ko ?? 0) > 0;
  show('dg-ko', ko);
  if (ko) setText($('dg-ko-t'), String(Math.ceil(h!.ko)));
  // special button: cooldown ring (fills up again), dim while cooling down
  const btn = $('attack');
  const max = h ? specialOf(h.cls, h.weapon).cd * heroMods(h).spCd : 1;
  // the healer's button toggles the wand, the knight's raises the shield (held): no cooldown on either
  const noCd = h?.cls === 'healer' || h?.cls === 'tank';
  const left = h && !noCd ? Math.max(0, Math.min(1, h.spCd / max)) : 0;
  btn.dataset.mode = h?.cls === 'healer' ? (h.mode ? 'heal' : 'dmg') : h?.guard ? 'guard' : '';
  btn.style.setProperty('--cd', String(left));
  btn.classList.toggle('cd', left > 0);
  btn.setAttribute('aria-label', h ? tSpecial(h.weapon) : t('dg.special'));
  // Art's icon per weapon special (spin / slam / charge)
  const spIcon = document.getElementById('attack-icon') as HTMLImageElement | null;
  // Art's special icon per weapon (spin / slam / charge / heal / volley / wall)
  const src = h?.cls === 'healer' ? HEALER_ICON[h.mode ? 1 : 0] : h && BIG_ICON[h.cls] ? BIG_ICON[h.cls] : encodeURI(NAU + SPECIAL_ICON[h?.weapon ?? 'sword']);
  if (spIcon && !spIcon.src.endsWith(src)) spIcon.src = src;
  // the small button = my class move: its icon, a radial sweep while recharging, the rogue's charge pips
  const dash = document.getElementById('dash');
  if (dash && h) {
    const mvLeft = h.charges >= h.maxCharges ? 0 : Math.max(0, Math.min(1, h.mvCd / h.mvMax));
    dash.style.setProperty('--cd', String(mvLeft));
    dash.classList.toggle('cd', h.charges <= 0);
    dash.dataset.cls = h.cls;
    const di = dash.querySelector('img');
    const dsrc = MOVE_ICON[h.cls];
    if (di && !di.src.endsWith(dsrc)) di.src = dsrc;
    let pips = dash.querySelector('.dg-pips') as HTMLElement | null;
    if (h.maxCharges > 1) {
      if (!pips) { pips = document.createElement('span'); pips.className = 'dg-pips'; dash.append(pips); }
      const want = String(h.charges);
      if (pips.dataset.n !== want) { pips.dataset.n = want; pips.replaceChildren(...[...Array(h.maxCharges).keys()].map((i) => { const p = document.createElement('i'); if (i < h.charges) p.className = 'on'; return p; })); }
    } else pips?.remove();
  }
  // my loot items: a row of ITEM_SLOTS wood cells under the XP row (shown once I own one); empty cells stay empty
  const key = (h?.items ?? []).join(',');
  const slot = $('dg-item');
  if (slot.dataset.k !== key) {
    slot.dataset.k = key;
    const its = (h?.items ?? []).map((i) => itemOf(i)).filter((i): i is NonNullable<typeof i> => !!i);
    slot.replaceChildren(...[...Array(ITEM_SLOTS).keys()].map((k) => {
      const cell = document.createElement('span'); cell.className = 'dgcell';
      const it = its[k];
      if (it) { cell.append(icon(encodeURI(ITEM_ICON[it.id]), it.icon, 2)); cell.title = `${tItem(it.id)}: ${tEffects(it.mod)}`; }
      return cell;
    }));
    slot.classList.toggle('hidden', !its.length);
  }
}

// ---------- level-up: 1 of 3 skill cards from my class (no timer; my blob is frozen and safe meanwhile) ----------
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
      b.className = 'skcard'; b.type = 'button'; b.dataset.s = id; b.dataset.cls = sk.cls; // the badge takes the class colour
      b.append(icon(encodeURI(skillIcon(id)), sk.icon, 3));
      b.insertAdjacentHTML('beforeend', `<b>${tSkill(sk.id)}</b><small class="skfx">${tEffects(sk.mod)}</small>`);
      b.onclick = () => { sfx.pick(); sendPick('skill:' + id); b.classList.add('on'); };
      return b;
    }));
  }
  if (offer.length) {
    setText($('dg-cards-title'), t('dg.levelPick', { n: d.level }));
  }
}

// ---------- rare loot: my item vs the new one, Rulla or Passa ----------
let lootKey = '';
function renderLoot(d: DView, myId: string, nameOf: (id: string) => string) {
  const v = d.loot, last = d.lootLast;
  show('dg-loot', !!v || !!last);
  if (!v && !last) { lootKey = ''; return; }
  const myItems = d.heroes[myId]?.items ?? [];
  if (v) {
    const it = itemOf(v.item)!;
    // what it does to MY slots: I have it already / a free slot / it replaces my oldest (only when all 3 are full)
    const mine = myItems.includes(v.item) ? it : itemOf(lootReplaces(myItems, v.item));
    const key = 'v:' + v.item + ':' + (mine?.id ?? '');
    if (key !== lootKey) {
      lootKey = key;
      sfx.power();
      // the new item big and first; under it a small line with what it would replace (Stefan: Din -> Ny read backwards)
      const main = document.createElement('div');
      main.className = 'lootnew';
      main.append(icon(encodeURI(ITEM_ICON[it.id]), it.icon, 4));
      main.insertAdjacentHTML('beforeend', `<div><b>${tItem(it.id)}</b><small class="skfx">${tEffects(it.mod)}</small></div>`);
      const rep = document.createElement('div');
      rep.className = 'lootrep';
      if (mine) {
        rep.insertAdjacentHTML('beforeend', `<small>${t(mine.id === it.id ? 'dg.lootHave' : 'dg.lootReplaces')}</small>`);
        if (mine.id !== it.id) { rep.append(icon(encodeURI(ITEM_ICON[mine.id]), mine.icon, 2)); rep.insertAdjacentHTML('beforeend', `<small>${tItem(mine.id)}</small>`); }
      }
      $('dg-loot-items').replaceChildren(main, ...(mine ? [rep] : []));
    }
    const my = v.rolls[myId] ?? 0;
    show('dg-loot-btns', my === -1);
    // alone: no dice, just "Använd" / "Take"; with friends: "Rulla" / "Avstå"
    const solo = Object.keys(v.rolls).length <= 1;
    setText($('dg-roll'), t(solo ? 'dg.take' : 'dg.roll'));
    const others = Object.entries(v.rolls).map(([id, r]) => `${nameOf(id)}: ${r === -1 ? '...' : r === 0 ? t('dg.passes') : r}`).join(' · ');
    // rooms: a clear room's door waits for this vote (and any queued one): say so, so nobody wonders why it won't open
    const doorWaits = d.rooms && d.wave >= d.waves && d.landing === 0 && d.enemies.length === 0;
    const rolls = Object.keys(v.rolls).length <= 1 ? '' : `${others} · ${Math.max(0, Math.ceil(v.t))} s`; // alone: no roll list
    setText($('dg-loot-msg'), doorWaits ? (rolls ? rolls + ' · ' : '') + t('dg.lootDoorWait') : rolls);
    setText($('dg-loot-title'), t('dg.lootTitle'));
  } else if (last) {
    const key = 'l:' + last.item + ':' + last.win;
    if (key !== lootKey) {
      lootKey = key;
      const it = itemOf(last.item)!;
      $('dg-loot-items').replaceChildren(icon(encodeURI(ITEM_ICON[it.id]), it.icon, 4));
      show('dg-loot-btns', false);
      setText($('dg-loot-title'), last.win ? t('dg.lootWon', { name: nameOf(last.win), item: tItem(it.id) }) : t('dg.lootNobody', { item: tItem(it.id) }));
      setText($('dg-loot-msg'), last.win ? t('dg.rolled', { n: last.roll }) : '');
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
  cards.innerHTML = '<div id="dg-cards-title"></div><div id="dg-cards-row"></div><div id="dg-cards-safe" data-i18n="dg.safe"></div>';
  hud.append(stop(cards));
  applyI18n(cards);
  const loot = document.createElement('div');
  loot.id = 'dg-loot'; loot.className = 'hidden';
  loot.innerHTML = '<div id="dg-loot-title"></div><div id="dg-loot-items"></div><div id="dg-loot-btns"><button type="button" id="dg-roll" data-i18n="dg.roll"></button><button type="button" id="dg-pass" data-i18n="dg.pass"></button></div><div id="dg-loot-msg"></div>';
  hud.append(stop(loot));
  applyI18n(loot);
  $('dg-roll').onclick = () => { sfx.pick(); sendPick('loot:roll'); };
  $('dg-pass').onclick = () => { sfx.pick(); sendPick('loot:pass'); };
  // boss strip + entry screen
  const boss = document.createElement('div');
  boss.id = 'dg-boss'; boss.className = 'hidden';
  boss.innerHTML = '<img class="dg-boss-emblem" src="art/dungeon/ui/boss-emblem.png" alt="" /><div class="dg-boss-col"><b id="dg-boss-name"></b><div class="dg-boss-bar"><i id="dg-boss-fill"></i></div></div>';
  hud.append(boss);
  const load = document.createElement('div');
  load.id = 'dg-loading'; load.className = 'hidden';
  load.innerHTML = '<b data-i18n="dg.entering"></b>';
  document.body.append(load);
  applyI18n(load);
  const item = document.createElement('span');
  item.id = 'dg-item'; item.className = 'hidden';
  $('dg-xp').after(item); // its own row under the XP row
  void LOOT_SECONDS;
}

// ---------- boss strip at the top (N-21 bar frame + emblem + name) while the boss is on the floor ----------
function renderBoss(d: DView, myId?: string) {
  const boss = d.enemies.find((e) => e.kind === 2);
  // hidden while I pick a level-up card (frozen and safe), so the cards never sit on top of it
  const picking = !!myId && (d.heroes[myId]?.offer.length ?? 0) > 0;
  show('dg-boss', !!boss && !picking);
  if (!boss) return;
  setText($('dg-boss-name'), t('dg.bossName'));
  $('dg-boss-fill').style.width = (Math.max(0, Math.min(1, boss.hp / Math.max(1, boss.mx))) * 95).toFixed(1) + '%'; // 95% = the frame's inner slot
}

// ---------- dungeon entry: the dusk cave art for ~2 s (atmosphere, even when loading is done) ----------
export const ENTRY_MS = 2000;
let loadingTimer = 0;
function showLoading() {
  const el = $('dg-loading');
  el.classList.remove('hidden', 'out');
  clearTimeout(loadingTimer);
  loadingTimer = window.setTimeout(() => { el.classList.add('out'); loadingTimer = window.setTimeout(() => el.classList.add('hidden'), 400); }, ENTRY_MS);
}

/** Called first thing in main.ts onView. Returns true when the meadow HUD/end logic should be skipped. */
export function dungeonUi(v: View, myId: string | undefined, controls: Controls, nameOf: (id: string) => string = () => '?'): boolean {
  const mode = v.mode ?? 'meadow';
  ensureExtras();
  buildOverlays();
  if (mode !== lastMode) {
    if (mode === 'pick') { myPick = null; pickClass = null; buildCards(); }
    if (mode === 'dungeon') { endShown = false; heartsKey = ''; controls.setTool(null); showLoading(); }
    controls.setDungeon(mode === 'dungeon');
    // the small button: sidestep icon underground, the dash arrow again on the meadow
    const dashImg = controls.dashBtn.querySelector('img');
    // underground the class move icon is set per frame (MOVE_ICON); back on the meadow: Code's dash icon (N-24, NI.dash)
    if (dashImg && !controls.tool) dashImg.src = mode === 'dungeon' ? MOVE_ICON.rogue : NI.dash;
    show('hud-dg', mode === 'dungeon');
    if (mode !== 'dungeon') { show('dg-boss', false); controls.dashBtn.querySelector('.dg-pips')?.remove(); controls.dashBtn.style.removeProperty('--cd'); controls.dashBtn.classList.remove('cd'); show('dg-ko', false); show('dg-end', false); show('dg-cards', false); show('dg-loot', false); offerKey = ''; lootKey = ''; }
    lastMode = mode;
  }
  show('weapon-pick', mode === 'pick');
  // the dungeon flow hides the whole meadow HUD (quest bar, carried pill, meadow button): nothing dim behind the cards
  document.body.classList.toggle('dgpick', mode === 'pick');
  document.body.classList.toggle('dgflow', mode === 'pick' || mode === 'dungeon');
  if (mode === 'pick') {
    const picked = v.picked?.length ?? 0;
    const secs = Math.max(0, Math.ceil(v.pickT));
    // no pick timer (PICK_TIMER_ENABLED off): pick in your own time, no seconds shown
    const tail = PICK_TIMER_ENABLED ? ` · ${secs} s` : '';
    setText($('pick-wait'), (myPick ? t('dg.waitFriends', { n: picked, max: v.players.length }) : t(pickClass ? 'dg.tapWeapon' : 'dg.tapClass')) + tail);
    return true;
  }
  if (mode !== 'dungeon' || !v.dungeon) return false;
  const d = v.dungeon;
  if (myId) { renderHud(d, myId); renderOffer(d, myId); renderLoot(d, myId, nameOf); }
  renderBoss(d, myId);
  if (d.done > 0 && !endShown) {
    endShown = true;
    setText($('dg-end-gold'), String(d.gold));
    setText($('dg-end-level'), String(d.level));
    setText($('dg-end-kills'), String(d.kills));
    setText($('dg-end-why'), t(d.why === 'boss' ? 'dg.whyBoss' : d.why === 'time' ? 'dg.whyTime' : 'dg.whyExit'));
    show('dg-end', true);
    sfx.star();
  }
  if (d.done <= 0 && endShown) { endShown = false; show('dg-end', false); }
  return true;
}
