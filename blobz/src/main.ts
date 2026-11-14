import Phaser from 'phaser';
import '@fontsource/nunito/600.css';
import '@fontsource/nunito/800.css';
import '@fontsource/nunito/900.css';
import { loadArt, pixelText } from './art';
import { blobEl, clampLook, COLORS, EYES, HATS, MOUTHS, randomLook, SHAPES, type BlobLook } from './blob';
import { Controls } from './controls';
import { dungeonUi, setPicker } from './dungeonUi'; // [dungeon hook]
import { GameScene, type Session } from './game';
import { ClientNet, HostNet, friendlyError, type ToClient } from './net';
import { MINI_SECONDS } from './mini';
import { applyI18n, lang, lookName, setLang, t, type Key } from './i18n';
import { lanNamespace, Scanner, type FoundRoom } from './discovery';
import { sfx, unlockAudio } from './sfx';
import {
  addPlayer, affordable, atHome, BUILD_KINDS, COTTAGE_COST, COTTAGE_MAX, requestBuild, type BuildKind, BUILDING_ENABLED, finishMini, cleanBiome, type Biome, BUILD_COST, canAfford, cleanVillage, createState, makeTrees, villageOf, MAX_PLAYERS, nodeTool, pickWeapon, removePlayer, RES, ROUND_SECONDS, snapshot, starsFor, step,
  toolNode, viewFromSnapshot, viewFromState,
} from './sim';
import type { FxEvent, Input, PlayerInfo, Snapshot, State, View } from './sim';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const show = (id: string, on = true) => $(id).classList.toggle('hidden', !on);

// ---------- loading screen ----------
let loadingSince = performance.now();
function loading(on: boolean, progress = 0) {
  const el = $('loading');
  if (on) { loadingSince = performance.now(); el.classList.remove('hidden', 'out'); setLoad(progress); return; }
  setLoad(1);
  const wait = Math.max(0, 600 - (performance.now() - loadingSince)); // never just flash
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.classList.add('hidden'), 400); }, wait);
}
const onLoadProgress = (p: number) => setLoad(0.1 + p * 0.85);
function setLoad(p: number) { $('loadfill').style.width = Math.round(Math.max(0, Math.min(1, p)) * 100) + '%'; }
setLoad(0.15);

// ---------- profile (name / color / hat) ----------
const store = {
  get(k: string) { try { return localStorage.getItem('blobz.' + k); } catch { return null; } },
  set(k: string, v: string) { try { localStorage.setItem('blobz.' + k, v); } catch { /* private mode */ } },
};
function loadLook(): BlobLook {
  try {
    const raw = store.get('look');
    if (raw) return clampLook(JSON.parse(raw));
  } catch { /* corrupt: start fresh */ }
  const legacy = store.get('color');
  return legacy ? clampLook({ color: Number(legacy), hat: Number(store.get('hat') ?? 0) }) : randomLook();
}
const profile = { name: store.get('name') ?? '', look: loadLook() };
const saveLook = () => store.set('look', JSON.stringify(profile.look));

const nameInput = $<HTMLInputElement>('name');
nameInput.value = profile.name;
function myInfo(): Omit<PlayerInfo, 'id'> {
  const name = nameInput.value.trim().slice(0, 10) || 'Blob';
  store.set('name', name);
  return { name, ...profile.look };
}

// ---------- blob designer ----------
type Part = 'shape' | 'color' | 'eyes' | 'mouth' | 'hat';
const PARTS: Part[] = ['shape', 'color', 'eyes', 'mouth', 'hat'];
// remember the last tab between visits
let part: Part = PARTS.includes(store.get('tab') as Part) ? (store.get('tab') as Part) : 'shape';
let boing = false; // squash-bounce the live preview on the next render (after a change)
let slide: '' | 'from-left' | 'from-right' = '';
const PART_OPTS: Record<Exclude<Part, 'color'>, string[]> = { shape: SHAPES, eyes: EYES, mouth: MOUTHS, hat: HATS };

function renderPicker() {
  $('preview').replaceChildren(blobEl(profile.look));
  const big = blobEl(profile.look);
  if (boing) { big.classList.add('boing'); boing = false; }
  $('preview2').replaceChildren(big);
  $('me-name').textContent = nameInput.value.trim() || 'Blob';
  document.querySelectorAll<HTMLButtonElement>('.tab').forEach((t) => {
    t.classList.toggle('on', t.dataset.part === part);
    t.setAttribute('aria-selected', String(t.dataset.part === part));
  });
  const choose = (patch: Partial<BlobLook>) => { profile.look = { ...profile.look, ...patch }; saveLook(); boing = true; renderPicker(); };
  if (part === 'color') {
    $('opts').replaceChildren(...COLORS.map((c) => {
      const b = document.createElement('button');
      b.className = 'opt swatch-opt' + (c === profile.look.color ? ' on' : '');
      b.setAttribute('aria-label', t('design.color'));
      const i = document.createElement('i');
      i.style.background = '#' + c.toString(16).padStart(6, '0');
      b.append(i);
      b.onclick = () => choose({ color: c });
      return b;
    }));
  } else {
    const key = part;
    $('opts').replaceChildren(...PART_OPTS[key].map((svLabel, i) => {
      const label = lookName(key, i, svLabel);
      const b = document.createElement('button');
      b.className = 'opt' + (profile.look[key] === i ? ' on' : '');
      b.append(blobEl({ ...profile.look, [key]: i }));
      b.setAttribute('aria-label', label); b.title = label;
      b.onclick = () => choose({ [key]: i });
      return b;
    }));
  }
}
/** Switch tab: slide the options in from the side we came from, keep the chosen tile in view. */
function setPart(next: Part) {
  if (next === part) return;
  slide = PARTS.indexOf(next) > PARTS.indexOf(part) ? 'from-right' : 'from-left';
  part = next;
  store.set('tab', part);
  renderPicker();
  const opts = $('opts');
  opts.classList.remove('from-left', 'from-right'); void opts.offsetWidth;
  if (slide) opts.classList.add(slide);
  slide = '';
  showChosen();
}
/** Scroll the option grid so the selected tile is visible (only the grid scrolls, never the page). */
function showChosen() {
  const opts = $('opts');
  const on = opts.querySelector<HTMLElement>('.opt.on');
  if (!on) { opts.scrollTop = 0; return; }
  const top = on.offsetTop - opts.clientHeight / 2 + on.offsetHeight / 2;
  opts.scrollTop = Math.max(0, top);
}
document.querySelectorAll<HTMLButtonElement>('.tab').forEach((t) => {
  t.onclick = () => setPart(t.dataset.part as Part);
});
// swipe left/right on the options to change tab (vertical drags still scroll the grid)
{
  const opts = $('opts');
  let sx = 0, sy = 0, down = false, swipedAt = 0;
  opts.addEventListener('pointerdown', (e) => { down = true; sx = e.clientX; sy = e.clientY; });
  opts.addEventListener('pointercancel', () => { down = false; });
  opts.addEventListener('pointerup', (e) => {
    if (!down) return;
    down = false;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    const i = PARTS.indexOf(part) + (dx < 0 ? 1 : -1);
    if (i < 0 || i >= PARTS.length) return;
    swipedAt = performance.now();
    setPart(PARTS[i]);
  });
  // a swipe must not also pick the tile it started on
  opts.addEventListener('click', (e) => { if (performance.now() - swipedAt < 400) { e.stopPropagation(); e.preventDefault(); } }, true);
}
$('btn-random').onclick = () => { profile.look = randomLook(); saveLook(); boing = true; renderPicker(); };
saveLook();

// ---------- Kenney UI icons ----------
/** ChatGPT order 20 icon (public/art/icons/NAME.png), crisp at any size. */
const icon = (name: string, cls = '') => { const i = new Image(); i.src = `art/icons/${name}.png`; i.alt = ''; i.className = 'icon ' + cls; i.draggable = false; return i; };
document.querySelectorAll<HTMLElement>('[data-icon]').forEach((el) => el.replaceWith(icon(el.dataset.icon!)));
function renderIcons() {
  const logo = $('logo');
  // AI-generated logo (public/art/logo.png); Kenney pixel letters if it fails to load
  const img = new Image();
  img.src = 'art/logo.png'; img.alt = 'Blobz'; img.className = 'logo-img';
  img.onerror = () => logo.replaceChildren(pixelText('BLOBZ', 4));
  logo.replaceChildren(img);
}

// ---------- menu panels: home -> (customize | join) ----------
function panel(id: 'home' | 'custom' | 'join') {
  for (const p of ['home', 'custom', 'join']) show(p, p === id);
  $('menu-msg').textContent = ''; $('join-msg').textContent = '';
  if (id === 'join') startScan(); else stopScan();
}

// ---------- Wi-Fi room list ("Joina Stefan") ----------
let scanner: Scanner | null = null;
let scanGen = 0;
let emptyRounds = 0;
let retryTimer = 0;
const SEARCHING = (): string => t('join.searching');
const NOTHING = (): string => t('join.nothing');
function lanStatus(text: string, rescan = false) {
  $('lan-status').textContent = text;
  $('lan-status').classList.toggle('static', rescan);
  show('btn-rescan', rescan);
}
function startScan() {
  stopScan();
  const gen = ++scanGen;
  emptyRounds = 0;
  $('lan-list').replaceChildren();
  show('lan-status');
  lanStatus(SEARCHING());
  const tryNs = () => void lanNamespace().then((ns) => {
    if (gen !== scanGen) return; // left the panel meanwhile
    if (!ns) {
      // no public IP yet (strict NAT, no UDP): say so, keep trying in the background
      lanStatus(NOTHING(), true);
      retryTimer = window.setTimeout(tryNs, 5000);
      return;
    }

    lanStatus(SEARCHING());
    scanner = new Scanner(ns, clampLook);
    scanner.onUpdate = renderRooms;
    scanner.start();
  });
  tryNs();
}
function stopScan() { scanGen++; clearTimeout(retryTimer); scanner?.stop(); scanner = null; }
function renderRooms(rooms: FoundRoom[]) {
  const connecting = scanner?.pending.size ?? 0;
  show('lan-status', rooms.length === 0);
  emptyRounds = rooms.length || connecting ? 0 : emptyRounds + 1;
  // ~10 s without a game: hint at the usual cause, still scanning
  lanStatus(connecting && !rooms.length ? t('join.connectingFound') : emptyRounds >= 3 ? NOTHING() : SEARCHING(), emptyRounds >= 3 && !connecting);
  $('lan-list').replaceChildren(...rooms.map((r) => {
    const li = document.createElement('li');
    const b = document.createElement('button');
    const otherVersion = r.v !== __APP_VERSION__;
    const full = r.players >= r.max || otherVersion;
    b.className = 'lanrow' + (full ? ' full' : '');
    b.disabled = full;
    b.dataset.slot = String(r.slot);
    const txt = document.createElement('span');
    txt.className = 'lantext';
    const title = document.createElement('b');
    title.textContent = t('join.room', { name: r.name });
    const sub = document.createElement('span');
    sub.className = 'lansub';
    sub.textContent = otherVersion
      ? t('join.otherVersion', { v: r.v || t('join.old') })
      : `${r.players}/${r.max}` + (full ? ' · ' + t('join.full') : r.started ? ' · ' + t('join.playing') : '');
    txt.append(title, sub);
    b.append(blobEl(r.look), txt);
    b.setAttribute('aria-label', t('join.roomAria', { name: r.name, n: r.players, max: r.max }) + (full ? ', ' + t('join.full') : r.started ? ', ' + t('join.playing') : ''));
    b.onclick = () => void joinGame(r.peerId, b);
    li.append(b);
    return li;
  }));
}
$('btn-rescan').onclick = () => { $('join-msg').textContent = ''; startScan(); };
$('me').onclick = () => { panel('custom'); showChosen(); };
$('btn-custom-done').onclick = () => { myInfo(); renderPicker(); panel('home'); };
nameInput.addEventListener('input', () => { $('me-name').textContent = nameInput.value.trim() || 'Blob'; });
nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') nameInput.blur(); });
$('btn-show-join').onclick = () => panel('join');
$('btn-join-back').onclick = () => panel('home');

// Stale-build guard: phones may keep an older index.html cached (Pages caches ~10 min). Ask the server
// for the live version (no cache) and reload onto it, so friends always play the same version.
async function checkForNewVersion() {
  try {
    const r = await fetch(`version.json?ts=${Date.now()}`, { cache: 'no-store' });
    if (!r.ok) return;
    const live = String((await r.json()).v || '');
    if (live && live !== __APP_VERSION__) {
      const url = new URL(location.href);
      if (url.searchParams.get('v') === live) return; // already tried this version, avoid a reload loop
      url.searchParams.set('v', live);
      location.replace(url.toString());
    }
  } catch { /* offline or dev server: keep running */ }
}
void checkForNewVersion();
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && $('hud').classList.contains('hidden')) void checkForNewVersion(); });
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => { /* optional */ });
const versionText = () => __APP_VERSION__ + (matchMedia('(prefers-color-scheme: dark)').matches ? ' D' : '');
$('version').textContent = versionText();
// language: SV | EN chip on the home card (each phone keeps its own language)
function renderLang() {
  applyI18n();
  document.querySelectorAll<HTMLButtonElement>('#lang-toggle button').forEach((b) => {
    const on = b.dataset.lang === lang();
    b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on));
  });
}
document.querySelectorAll<HTMLButtonElement>('#lang-toggle button').forEach((b) => {
  b.onclick = () => { setLang(b.dataset.lang === 'en' ? 'en' : 'sv'); renderLang(); renderPicker(); };
});
renderLang();
// Wi-Fi code next to the version: two phones must show the same code to find each other (a VPN changes it)
void lanNamespace().then((ns) => { if (ns) $('version').textContent = `${versionText()} (${ns.slice(0, 4).toUpperCase()})`; });
$('version').title = __APP_COMMIT__;
renderPicker();
// First visit: pick your blob before anything else.
if (!store.get('name')) panel('custom');
Promise.all([loadArt().then(() => setLoad(0.7)), new Promise((r) => (document.readyState === 'complete' ? r(null) : window.addEventListener('load', () => r(null), { once: true })))])
  .then(() => loading(false));
void loadArt().then(() => { renderPicker(); renderLobby(); renderIcons(); });

// ---------- shared game plumbing ----------
const controls = new Controls();
controls.onDash = () => sfx.dash();
let game: Phaser.Game | null = null;
let infos = new Map<string, PlayerInfo>();
let endShown = false;
let lastStars = 0;
let isHost = false;

function sanitize(id: string, i: Partial<PlayerInfo>): PlayerInfo {
  return { id, name: String(i.name ?? 'Blob').slice(0, 10) || 'Blob', ...clampLook(i) };
}

function renderLobby() {
  $('lobby-list').replaceChildren(...[...infos.values()].map((p) => {
    const li = document.createElement('li');
    li.append(blobEl(clampLook(p)), document.createTextNode(p.name));
    return li;
  }));
}

function startScene(session: Session) {
  if (DEBUG) (window as unknown as { __blobzBiome?: string }).__blobzBiome = session.biome ?? 'meadow';
  endShown = false; lastStars = 0;
  show('menu', false); show('lobby', false); show('end', false); show('hud');
  try { (navigator as Navigator & { wakeLock?: { request(t: string): Promise<unknown> } }).wakeLock?.request('screen').catch(() => {}); } catch { /* optional */ }
  if (!game) {
    game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: 'game',
      backgroundColor: '#2b6b3a',
      scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
      render: { pixelArt: true, antialias: false, roundPixels: true },
      scene: [],
    });
    game.scene.add('game', GameScene, false);
  }
  loading(true, 0.1);
  loadPending = true;
  $('loading-text').textContent = t('menu.loadingGame');
  const hook = (scene: GameScene) => {
    scene.onView = onView;
    scene.load.off('progress', onLoadProgress).on('progress', onLoadProgress);
    scene.events.once('create', () => { $('loading-text').textContent = t('menu.loading'); loading(false); });
  };
  game.scene.start('game', { session });
  const sc = game.scene.getScene('game') as GameScene | null;
  if (sc) hook(sc);
  else game.events.once('ready', () => hook(game!.scene.getScene('game') as GameScene));
}

/** Fill the 3 quest rows (icon, bar, n/target, star) inside `root`. */
function renderQuestRows(root: ParentNode, v: View) {
  root.querySelectorAll<HTMLElement>('.qrow').forEach((row) => {
    const k = row.dataset.k as keyof View['delivered'];
    const got = v.delivered[k], need = Math.max(1, v.quest[k]);
    const done = got >= need;
    row.querySelector<HTMLElement>('.qfill')!.style.clipPath = `inset(0 ${100 - Math.min(100, (got / need) * 100)}% 0 0)`;
    const txt = `${Math.min(got, need)}/${need}`;
    const num = row.querySelector('.qnum')!;
    if (num.textContent !== txt) num.textContent = txt;
    if (row.classList.contains('done') !== done) {
      row.classList.toggle('done', done);
      row.querySelector<HTMLImageElement>('.qstar')!.src = `art/gather/star${done ? '' : '-empty'}.png`;
    }
  });
}
const QUEST_ROWS = () => $('hud-quest').innerHTML.split('<div class="qrow"').slice(1).map((r) => '<div class="qrow"' + r).join('');
let savedAt = 0;
let treesFor = { seed: -1, trees: [] as ReturnType<typeof makeTrees> };

// ---------- build panel: the one place to build (hammer button when your blob is at home) ----------
let sendBuild: (k: BuildKind | 'cottage') => void = () => {};
let panelOpen = false;
const COST_ICON: Record<string, string> = { wood: 'art/gather/hud-wood.png', stone: 'art/gather/hud-stone.png', berry: 'art/gather/hud-berries.png' };
const buildName = (k: BuildKind) => t(`build.name.${k}` as Key);
/** What each building does, as pictures (no reading): sprite paths and short symbols (+1, x2, -1).
 *  Placeholders from existing art until Art's effect icons land (see the icon list sent to Lead). */
const A = (p: string) => 'art/' + p + '.png';
const BUILD_ICONS: Record<BuildKind | 'cottage2' | 'cottage3', string[]> = {
  storage: [A('icons/log'), A('gather/item-stone'), A('gather/item-berries'), A('icons/log')], // carry 4 things
  workshop: [A('gather/btn-axe'), '-1', A('icons/boot')], // one hit less, faster
  garden: [A('gather/bush-berries'), '+'], // more berries
  well: [A('gather/item-berries'), '×2', A('icons/house')], // berries count double at home
  watchtower: [A('icons/dash-arrow'), A('props/tree-green')], // arrows to resources
  bridge: [A('icons/dash-arrow'), A('icons/chest')], // a new corner with loot
  cottage2: [A('icons/log'), '+1'], // carry one more
  cottage3: [A('gather/bush-berries'), A('icons/clock')], // faster regrowth
};
function iconRow(items: string[]): Node[] {
  return items.map((it) => {
    if (!it.startsWith('art/')) { const b = document.createElement('b'); b.textContent = it; return b; }
    const im = new Image(); im.src = it; im.alt = ''; return im;
  });
}
function buildCard(kind: BuildKind | 'cottage'): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'bcard'; b.dataset.kind = kind;
  b.innerHTML = '<span class="bimg"><img alt="" /></span><b class="bname"></b><span class="bicons"></span><span class="beff"></span><span class="bcost"></span>';
  b.onclick = () => { if (!b.disabled) { b.classList.remove('tap'); void b.offsetWidth; b.classList.add('tap'); sendBuild(kind); } };
  return b;
}
function setupBuildPanel() {
  const grid = $('build-cards');
  if (grid.childElementCount) return;
  grid.append(...[...BUILD_KINDS, 'cottage' as const].map(buildCard));
  $('btn-build').onclick = () => { panelOpen = true; show('build-panel'); };
  $('btn-build-close').onclick = () => { panelOpen = false; show('build-panel', false); };
}
function renderBuildPanel(v: View) {
  const me = v.players.find((p) => p.id === session?.myId);
  const home = BUILDING_ENABLED && v.phase === 'play' && v.mode === 'meadow' && !!me && atHome(me.x, me.y);
  setupBuildPanel(); // idempotent: wires the button + cards once
  show('btn-build', home);
  if (!home && panelOpen) { panelOpen = false; show('build-panel', false); }
  if (!panelOpen) return;
  document.querySelectorAll<HTMLButtonElement>('#build-cards .bcard').forEach((card) => {
    const kind = card.dataset.kind as BuildKind | 'cottage';
    const isCot = kind === 'cottage';
    const lvl = v.cottage?.level ?? 1;
    const built = isCot ? lvl >= COTTAGE_MAX : v.builds.find((b) => b.kind === kind)?.state === 2;
    const cost = isCot ? (lvl >= COTTAGE_MAX ? null : COTTAGE_COST[lvl - 1]) : BUILD_COST[kind];
    const name = isCot ? t('build.cottage', { lvl: Math.min(COTTAGE_MAX, lvl + 1) }) : buildName(kind);
    const img = isCot ? `art/base/cottage-${Math.min(3, lvl + (lvl >= COTTAGE_MAX ? 0 : 1))}.png` : `art/base/${kind}.png`;
    const eff = isCot ? (lvl < COTTAGE_MAX ? t(`build.eff.cottage${lvl + 1}` as Key) : t('build.done')) : t(`build.eff.${kind}` as Key);
    const can = !built && !!cost && canAfford(v.bank, cost);
    const key = `${built}|${can}|${name}|${cost ? RES.map((k) => cost[k] + ':' + (v.bank[k] >= cost[k] ? 1 : 0)).join(',') : ''}`;
    if (card.dataset.key === key) return;
    card.dataset.key = key;
    card.disabled = built || !can;
    card.classList.toggle('built', !!built);
    card.classList.toggle('can', can);
    card.querySelector('img')!.src = img;
    card.querySelector('.bname')!.textContent = name;
    card.querySelector('.beff')!.textContent = built ? t('build.built') : eff;
    const icons = built ? [A('icons/check')] : BUILD_ICONS[isCot ? (lvl + 1 === 2 ? 'cottage2' : 'cottage3') : kind];
    card.querySelector('.bicons')!.replaceChildren(...iconRow(icons));
    card.setAttribute('aria-label', `${name}: ${built ? t('build.built') : eff}`);
    card.querySelector('.bcost')!.replaceChildren(...(built || !cost ? [] : RES.filter((k) => cost[k] > 0).map((k) => {
      const s = document.createElement('span');
      s.className = 'c ' + (v.bank[k] >= cost[k] ? 'ok' : 'no');
      const i = new Image(); i.src = COST_ICON[k]; i.alt = '';
      s.append(i, document.createTextNode(String(cost[k])));
      return s;
    })));
  });
}

/** Building goal on the quest card, as pictures: the building + hammer when the bank covers it, + a check after it
 *  was built this round. The Build button pulses while something is affordable. */
function renderBuildGoal(v: View) {
  const row = $('q-build');
  if (!BUILDING_ENABLED) { show('q-build', false); return; }
  const lvl = v.cottage?.level ?? 1;
  const doneK = v.builtNow?.[v.builtNow.length - 1] as BuildKind | undefined;
  const next = v.phase === 'play' ? affordable(v.bank, v.builds ?? [], lvl) : null;
  $('btn-build').classList.toggle('can', !!next);
  const k = doneK ?? next;
  show('q-build', !!k);
  if (!k) return;
  const name = k === 'cottage' ? t('build.cottage', { lvl: lvl + 1 }) : buildName(k);
  const text = doneK ? t('build.goalDone', { name }) : t('build.goal', { name });
  if (row.getAttribute('aria-label') === text) return;
  row.setAttribute('aria-label', text); row.title = text;
  row.classList.toggle('done', !!doneK);
  row.querySelector<HTMLImageElement>('.qbimg')!.src = k === 'cottage' ? A(`base/cottage-${Math.min(COTTAGE_MAX, lvl + 1)}`) : A(`base/${k}`);
  row.querySelector<HTMLImageElement>('.qbico')!.src = doneK ? A('icons/check') : A('base/btn-build');
}

// ---------- the village: saved on the host between rounds ----------
const loadVillage = () => { try { return cleanVillage(JSON.parse(store.get('village') ?? 'null')); } catch { return cleanVillage(null); } };
function villageText() {
  const v = loadVillage();
  const n = Object.values(v.builds).filter(Boolean).length;
  const bank = v.bank.wood + v.bank.stone + v.bank.berry;
  return n || v.cottage > 1 || bank ? t('lobby.village', { lvl: v.cottage, n, what: t(n === 1 ? 'lobby.building1' : 'lobby.buildingN'), w: v.bank.wood, s: v.bank.stone, b: v.bank.berry }) : '';
}
/** The saved village as pictures (no reading): cottage, the buildings it has, the bank. Text stays as aria-label. */
function renderVillage(el: HTMLElement) {
  const text = villageText();
  el.setAttribute('aria-label', text);
  if (!text) { el.replaceChildren(); return; }
  const v = loadVillage();
  const img = (src: string, cls: string) => { const im = new Image(); im.src = src; im.alt = ''; im.className = cls; return im; };
  const res = (src: string, n: number) => { const s = document.createElement('span'); s.className = 'vres'; s.append(img(src, ''), String(n)); return s; };
  el.replaceChildren(
    img(A(`base/cottage-${v.cottage}`), 'vcot'),
    ...BUILD_KINDS.filter((k) => v.builds[k]).map((k) => img(A(`base/${k}`), 'vb')),
    res(A('gather/hud-wood'), v.bank.wood), res(A('gather/hud-stone'), v.bank.stone), res(A('gather/hud-berries'), v.bank.berry),
  );
}

/** Bärregn HUD: basket counter, goal bar with 3 stars, time left; the host gets "Hoppa över". */
let miniStarsShown = 0;
function renderMini(v: View) {
  const m = v.phase === 'mini' ? v.mini : null;
  $('hud').classList.toggle('mini', !!m);
  show('mini-hud', !!m);
  show('btn-skip-mini', !!m && isHost);
  if (!m) { miniStarsShown = 0; show('mini-intro', false); return; }
  controls.setTool(null);
  const c = String(m.caught);
  if ($('mini-caught').textContent !== c) {
    $('mini-caught').textContent = c;
    // the basket hops on every catch (restart the CSS animation)
    const bk = document.querySelector<HTMLElement>('#mini-hud .mbasket')!;
    bk.classList.remove('hop'); void bk.offsetWidth; bk.classList.add('hop');
  }
  const top = m.goal[2] || 1;
  $('mini-fill').style.clipPath = `inset(0 ${100 - Math.min(100, (m.caught / top) * 100)}% 0 0)`;
  document.querySelectorAll<HTMLImageElement>('#mini-hud .mstar').forEach((im) => {
    const i = Number(im.dataset.i);
    im.style.left = `${(m.goal[i] / top) * 100}%`;
    const on = m.caught >= m.goal[i];
    if (im.classList.contains('on') !== on) { im.classList.toggle('on', on); im.src = `art/gather/star${on ? '' : '-empty'}.png`; }
  });
  const stars = m.goal.filter((g) => m.caught >= g).length;
  if (stars > miniStarsShown) { miniStarsShown = stars; sfx.star(); }
  $('mini-time').style.width = `${Math.min(1, m.t / MINI_SECONDS) * 100}%`;
  // picture intro (no reading): berry on your blob = good, bomb = dizzy
  const intro = m.t > MINI_SECONDS;
  if (intro && $('mini-intro').classList.contains('hidden')) {
    document.querySelectorAll('#mini-intro .mi-blob').forEach((el) => el.prepend(blobEl(profile.look)));
  }
  if (!intro) document.querySelectorAll('#mini-intro .mi-blob .blob').forEach((el) => el.remove());
  show('mini-intro', intro);
  $('mini-hud').classList.toggle('hurry', m.t <= 10);
}

/** True from startScene until the first rendered frame. On "Spela igen" the assets are cached, so Phaser
 *  runs create() synchronously inside scene.start(), before the once('create') hook exists; the first view
 *  is the reliable "ready" signal (the overlay otherwise stayed up and blocked every tap). */
let loadPending = false;

function onView(v: View) {
  if (loadPending) { loadPending = false; loading(false); }
  if (DEBUG) (window as unknown as { __blobzView: View }).__blobzView = v;
  if (dungeonUi(v, session?.myId, controls, (id) => infos.get(id)?.name ?? '?')) return; // [dungeon hook, Code 2] pick cards / dungeon HUD
  renderQuestRows($('hud-quest'), v);
  renderBuildGoal(v);
  const st = starsFor(v.delivered, v.quest);
  if (st > lastStars) { sfx.star(); lastStars = st; }
  // day bar: the sun rides left -> right; dusk in the last 20 s
  const day = Math.max(0, Math.min(1, 1 - v.time / ROUND_SECONDS));
  document.querySelector<HTMLElement>('#hud-day .dfill')!.style.clipPath = `inset(0 ${100 - day * 100}% 0 0)`;
  document.querySelector<HTMLElement>('#hud-day .sun')!.style.left = `calc(9px + (100% - 18px) * ${day.toFixed(4)})`;
  $('hud-day').classList.toggle('dusk', v.time < 20);
  let changed = false;
  for (const k of RES) {
    const t = String(v.bank[k]);
    if ($('bank-' + k).textContent !== t) { $('bank-' + k).textContent = t; changed = true; }
  }
  if (changed) { $('hud-bank').classList.remove('pop'); void $('hud-bank').offsetWidth; $('hud-bank').classList.add('pop'); }
  renderBuildPanel(v);
  const me = v.players.find((p) => p.id === session?.myId);
  // action button: the tool of the nearest node in reach, else dash
  if (session && treesFor.seed !== session.seed) treesFor = { seed: session.seed, trees: makeTrees(session.seed) };
  const node = me && v.phase === 'play' ? toolNode(treesFor.trees, (i) => v.nodes[i] ?? 0, me.x, me.y) : -1;
  controls.setTool(node >= 0 ? nodeTool(treesFor.trees[node].kind) : null);
  controls.setCooldown(!!me && me.dashCd > 0);
  renderMini(v);
  if (v.phase === 'end' && !endShown) {
    endShown = true;
    // Bärregn result under the quest rows
    show('end-mini', !!v.miniResult);
    if (v.miniResult) {
      $('end-mini-n').textContent = String(v.miniResult.caught);
      $('end-mini-stars').replaceChildren(...[0, 1, 2].map((i) => { const im = new Image(); im.src = `art/gather/star${i < v.miniResult!.stars ? '' : '-empty'}.png`; im.className = 'star'; im.alt = ''; return im; }));
    }
    $('end-stars').replaceChildren(...[0, 1, 2].map((i) => {
      const img = new Image(); img.src = `art/gather/star${i < st ? '' : '-empty'}.png`; img.alt = ''; img.className = 'star' + (i < st ? ' on' : '');
      return img;
    }));
    $('end-rows').innerHTML = QUEST_ROWS();
    renderQuestRows($('end-rows'), v);
    show('btn-again', isHost); show('end-wait', !isHost);
    show('end');
    if (st) sfx.star();
  }
}

let session: Session | null = null;

// ---------- map pick (lobby): two big picture cards; only the host can choose ----------
function renderMapPick(chosen: Biome, isHostPick: boolean, onPick?: (b: Biome) => void) {
  document.querySelectorAll<HTMLButtonElement>('#map-pick .mapcard').forEach((c) => {
    const b = cleanBiome(c.dataset.map);
    c.classList.toggle('on', b === chosen);
    c.setAttribute('aria-pressed', String(b === chosen));
    c.disabled = !isHostPick;
    if (onPick) c.onclick = () => onPick(b);
  });
  show('map-pick');
}

// ---------- host ----------
async function hostGame() {
  unlockAudio();
  isHost = true;
  const net = new HostNet();
  $('menu-msg').textContent = t('menu.creating');
  try { await net.open(); } catch (e) { $('menu-msg').textContent = friendlyError(String(e)); return; }
  const myId = net.peer.id;
  infos = new Map([[myId, { id: myId, ...myInfo() }]]);
  net.onInfo = () => {
    const me = infos.get(myId);
    if (!me) return null;
    return { name: me.name, look: clampLook(me), players: infos.size, max: MAX_PLAYERS, started: !!state, v: __APP_VERSION__ };
  };
  // Show up in friends' Joina list. Keep retrying until it works (STUN can be slow or blocked).
  const LAN_OK = '';
  const advertise = async () => {
    if (net.peer.destroyed) return;
    const ns = await lanNamespace();
    const slot = ns ? await net.openSlot(ns) : 0;
    $('lobby-lan').innerHTML = slot ? LAN_OK : t('lobby.noWifi');
    $('lobby-lan').classList.toggle('warn', !slot);
    if (!slot) setTimeout(() => void advertise(), 5000);
  };
  void advertise();
  let state: State | null = null;
  let seed = 0;
  const inputs = new Map<string, Input>();
  const localFx: FxEvent[] = [];
  let netFx: FxEvent[] = [];
  let acc = 0, netAcc = 0;

  // map: the host picks Äng / Snö in the lobby (remembered on this phone), joiners see the choice
  let biome: Biome = cleanBiome(store.get('map'));
  const lobbyMsg = (): ToClient => ({ t: 'lobby', players: [...infos.values()], map: biome });
  renderMapPick(biome, true, (b) => { biome = b; store.set('map', b); renderMapPick(biome, true); net.broadcast(lobbyMsg()); });
  net.onHello = (id, info) => {
    if (!infos.has(id) && infos.size >= MAX_PLAYERS) return false;
    const p = sanitize(id, info);
    const used = new Set([...infos.values()].filter((q) => q.id !== id).map((q) => q.color));
    if (used.has(p.color)) p.color = COLORS.find((c) => !used.has(c)) ?? p.color; // keep blobz tellable apart
    infos.set(id, p);
    renderLobby();
    setTimeout(() => {
      net.broadcast(lobbyMsg());
      if (state) { addPlayer(state, p); net.conns.get(id)?.send({ t: 'start', seed, map: state.biome } satisfies ToClient); }
    }, 50);
    return true;
  };
  net.onInput = (id, inp) => inputs.set(id, inp);
  net.onPick = (id, w) => { if (state) pickWeapon(state, id, w); }; // [dungeon hook]
  net.onBuild = (id, k) => { if (state) requestBuild(state, id, k as BuildKind | 'cottage'); };
  sendBuild = (k) => { if (state) requestBuild(state, myId, k); };
  setPicker((w) => { if (state) pickWeapon(state, myId, w); });
  net.onLeave = (id) => {
    infos.delete(id); inputs.delete(id);
    if (state) removePlayer(state, id);
    renderLobby();
    net.broadcast(lobbyMsg());
  };

  const newRound = () => {
    seed = Math.floor(Math.random() * 1e9);
    state = createState([...infos.values()], seed, loadVillage(), biome);
    // Test hook (?debug): lets Playwright place blobz on plates etc. Never set in normal play.
    if (DEBUG) (window as unknown as { __blobz: unknown }).__blobz = { state };
    if (roundSecs) state.time = roundSecs;
    acc = 0; netAcc = 0; localFx.length = 0; netFx = [];
    net.broadcast({ t: 'start', seed, map: biome });
    session = {
      role: 'host', myId, seed, biome,
      infos: () => infos,
      readInput: () => controls.read(),
      tick(dt, input) {
        if (!state) return;
        inputs.set(myId, input);
        acc += dt;
        while (acc >= 1 / 60) {
          step(state, inputs, 1 / 60);
          // keep the village saved on this (host) phone whenever it changes
          // (bank changes often: at most every 2 s, and always at sunset)
          if (BUILDING_ENABLED && state.villageDirty && (performance.now() - savedAt > 2000 || state.phase === 'end')) {
            state.villageDirty = false; savedAt = performance.now();
            store.set('village', JSON.stringify(villageOf(state)));
          }
          localFx.push(...state.fx); netFx.push(...state.fx); state.fx = [];
          acc -= 1 / 60;
        }
        netAcc += dt;
        if (netAcc >= 1 / 15) {
          netAcc = 0;
          state.fx = netFx;
          net.broadcast({ t: 's', s: snapshot(state) });
          state.fx = []; netFx = [];
        }
      },
      view: () => (state ? viewFromState(state) : null),
      drainFx: () => localFx.splice(0),
    };
    startScene(session);
  };

  renderLobby();
  show('btn-start'); show('lobby-wait', false);
  show('menu', false); show('lobby');
  $('btn-start').onclick = () => { unlockAudio(); newRound(); };
  $('btn-skip-mini').onclick = () => { if (state) finishMini(state); };
  if (BUILDING_ENABLED) renderVillage($('lobby-village')); else $('lobby-village').replaceChildren();
  show('btn-newvillage', BUILDING_ENABLED);
  // "Ny by": confirmed in the page (no browser dialog)
  $('btn-newvillage').onclick = () => { show('newvillage-ask'); show('btn-newvillage', false); };
  $('btn-newvillage-no').onclick = () => { show('newvillage-ask', false); show('btn-newvillage'); };
  $('btn-newvillage-yes').onclick = () => {
    try { localStorage.removeItem('blobz.village'); } catch { /* private mode */ }
    show('newvillage-ask', false); show('btn-newvillage');
    // a fresh little cottage with a sparkle = "new village"
    const fresh = [A('base/cottage-1'), A('icons/sparkle')].map((src, i) => { const im = new Image(); im.src = src; im.alt = ''; im.className = i ? 'vb' : 'vcot'; return im; });
    $('lobby-village').replaceChildren(...fresh);
    $('lobby-village').setAttribute('aria-label', t('lobby.newVillageDone'));
  };
  $('btn-again').onclick = () => newRound();
}

// ---------- join ----------
let joining = false;
/** Join a room from the Wi-Fi list (`target` = the host's slot peer id). */
async function joinGame(target: string, row?: HTMLButtonElement) {
  unlockAudio();
  if (joining) return;
  joining = true;
  isHost = false;
  const net = new ClientNet();
  $('join-msg').textContent = t('join.connecting');
  row?.classList.add('busy');
  stopScan(); // free the probing peer; a failed join restarts the list
  let latest: Snapshot | null = null;
  const fx: FxEvent[] = [];
  let sendAcc = 0;
  let lastSent = '';

  net.onMessage = (m) => {
    if (m.t === 'lobby') {
      if (m.map) renderMapPick(cleanBiome(m.map), false);
      infos = new Map(m.players.map((p) => [p.id, p]));
      renderLobby();
    } else if (m.t === 's') {
      latest = m.s;
      fx.push(...m.s.fx);
    } else if (m.t === 'start') {
      latest = null; fx.length = 0;
      sendBuild = (k) => net.send({ t: 'build', k });
      session = {
        role: 'client', myId: net.id, seed: m.seed, biome: cleanBiome(m.map),
        infos: () => infos,
        readInput: () => controls.read(),
        tick(dt, input) {
          sendAcc += dt;
          const key = `${input.x},${input.y},${input.dash},${input.atk ?? 0}`;
          if (key !== lastSent || sendAcc > 0.25) {
            const prev = lastSent.split(',');
            // button presses go out at once; stick moves at most 30x a second
            if (sendAcc >= 1 / 30 || input.dash !== Number(prev[2]) || (input.atk ?? 0) !== Number(prev[3])) {
              net.send({ t: 'in', ...input });
              lastSent = key; sendAcc = 0;
            }
          }
        },
        view: () => (latest ? viewFromSnapshot(latest) : null),
        drainFx: () => fx.splice(0),
      };
      startScene(session);
    }
  };
  net.onClose = () => { alert(t('err.hostLeft')); location.reload(); };
  setPicker((w) => net.send({ t: 'pick', w })); // [dungeon hook]

  try {
    await net.join(target, myInfo());
  } catch (e) {
    joining = false;
    const why = String(e);
    const msg = why.startsWith('version:') ? t('err.version', { host: why.slice(8), me: __APP_VERSION__ })
      : why === 'full' ? t('err.full')
      : why === 'timeout' ? t('err.timeout')
      : friendlyError(why);
    startScan(); // panel('join') would clear the message, so restart the list directly
    $('join-msg').textContent = msg;
    return;
  }
  show('btn-start', false); show('lobby-wait');
  show('menu', false); show('lobby');
}

$('btn-host').onclick = () => void hostGame();
// Warm up the Wi-Fi namespace (STUN) so the Joina list and host slot are ready sooner.
void lanNamespace();
$('btn-leave').onclick = () => location.reload();
$('btn-menu').onclick = () => location.reload();

const DEBUG = new URLSearchParams(location.search).has('debug');
// Optional round length for quick games/tests: ?t=60
const roundSecs = Math.max(0, Math.min(600, Number(new URLSearchParams(location.search).get('t')) || 0));

