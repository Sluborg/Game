// Dungeon DOM UI (Code 2): class + weapon cards, dungeon HUD (hearts, gold, floor, XP + level, time, item),
// special button cooldown ring, level-up 1-of-3 skill cards, loot roll/pass card, knocked-out banner and
// the "Dungeon klar!" summary. Art that is not there yet falls back to Kenney Tiny Dungeon tiles.
// Markup lives in index.html (#weapon-pick, #hud-dg, #dg-ko, #dg-end, #attack); main.ts calls dungeonUi().
import './dungeon.css';
import type { Controls } from './controls';
import {
  skillIcon, ITEM_ICON, CLASS_WEAPONS, CLASSES, FLOORS, heroMods, itemOf, LEVEL_XP, LOOT_SECONDS, skillOf, specialOf,
  type DView, type HeroClass, type Weapon,
} from './dungeon';
import { sfx } from './sfx';
import { t, tClass, tClassHint, tEffects, tItem, tSkill, tSpecial, tWeapon, tWeaponHint } from './dungeonText';
import { applyI18n } from './i18n';
import type { View } from './sim';

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
/** Ninja weapon sprites on the rogue's weapon cards. */
const WEAPON_CARD: Partial<Record<Weapon, string>> = { sword: 'Items/Weapons/Sword/Sprite.png', hammer: 'Items/Weapons/Hammer/Sprite.png', dagger: 'Items/Weapons/Sai/Sprite.png', spear: 'Items/Weapons/Lance/Sprite.png' };

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
    root.replaceChildren(...CLASSES.map((c) => card(c, icon(`art/dungeon/card-class-${c}.png`, 0, 1, 'cardimg') /* GAP: ChatGPT N-5 class cards */, tClass(c), tClassHint(c), () => {
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

function renderHud(d: DView, myId: string) {
  const h = d.heroes[myId];
  if (h) renderHearts(h.hp, h.maxHp);
  setText($('dg-gold'), String(d.gold));
  setText($('dg-floor'), t('dg.floor', { n: d.floor, max: FLOORS }));
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
  btn.setAttribute('aria-label', h ? tSpecial(h.weapon) : t('dg.special'));
  // Art's icon per weapon special (spin / slam / charge)
  const spIcon = document.getElementById('attack-icon') as HTMLImageElement | null;
  // Art's special icon per weapon (spin / slam / charge / heal / volley / wall)
  const src = encodeURI(NAU + SPECIAL_ICON[h?.weapon ?? 'sword']);
  if (spIcon && !spIcon.src.endsWith(src)) spIcon.src = src;
  // my loot item next to the gold
  const key = h?.item ?? '';
  const slot = $('dg-item');
  if (slot.dataset.k !== key) {
    slot.dataset.k = key;
    const it = itemOf(key);
    slot.replaceChildren(...(it ? [icon(encodeURI(ITEM_ICON[it.id]), it.icon, 2)] : []));
    slot.title = it ? `${tItem(it.id)}: ${tEffects(it.mod)}` : '';
    slot.classList.toggle('hidden', !it);
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
      b.className = 'skcard'; b.type = 'button'; b.dataset.s = id;
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
        col.append(x ? icon(encodeURI(ITEM_ICON[x.id]), x.icon, 4) : document.createElement('i'));
        col.insertAdjacentHTML('beforeend', `<b>${x ? tItem(x.id) : t('dg.lootNone')}</b>${x ? `<small class="skfx">${tEffects(x.mod)}</small>` : ''}`);
        return col;
      };
      const arrow = document.createElement('span'); arrow.className = 'lootarrow'; arrow.textContent = '→';
      $('dg-loot-items').replaceChildren(side(t('dg.lootMine'), mine), arrow, side(t('dg.lootNew'), it));
    }
    const my = v.rolls[myId] ?? 0;
    show('dg-loot-btns', my === -1);
    // alone: no dice, just "Använd" / "Take"; with friends: "Rulla" / "Avstå"
    const solo = Object.keys(v.rolls).length <= 1;
    setText($('dg-roll'), t(solo ? 'dg.take' : 'dg.roll'));
    const others = Object.entries(v.rolls).map(([id, r]) => `${nameOf(id)}: ${r === -1 ? '...' : r === 0 ? t('dg.passes') : r}`).join(' · ');
    setText($('dg-loot-msg'), Object.keys(v.rolls).length <= 1 ? '' : `${others} · ${Math.max(0, Math.ceil(v.t))} s`); // alone: no roll list
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
    if (dashImg && !controls.tool) dashImg.src = mode === 'dungeon' ? encodeURI(NAU + 'Ui/Skill Icon/Spell/Camouflage.png') : 'art/icons/dash-arrow.png';
    show('hud-dg', mode === 'dungeon');
    if (mode !== 'dungeon') { show('dg-ko', false); show('dg-end', false); show('dg-cards', false); show('dg-loot', false); offerKey = ''; lootKey = ''; }
    lastMode = mode;
  }
  show('weapon-pick', mode === 'pick');
  if (mode === 'pick') {
    const picked = v.picked?.length ?? 0;
    const secs = Math.max(0, Math.ceil(v.pickT));
    setText($('pick-wait'), myPick ? t('dg.waitFriends', { n: picked, max: v.players.length, s: secs }) : t(pickClass ? 'dg.tapWeapon' : 'dg.tapClass', { s: secs }));
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
    setText($('dg-end-why'), t(d.why === 'boss' ? 'dg.whyBoss' : d.why === 'time' ? 'dg.whyTime' : 'dg.whyExit'));
    show('dg-end', true);
    sfx.star();
  }
  if (d.done <= 0 && endShown) { endShown = false; show('dg-end', false); }
  return true;
}
