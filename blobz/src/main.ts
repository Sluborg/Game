import { onViewport, watchViewport } from './viewport';
import { dpr, intFit, snapAll } from './pixelScale';
import Phaser from 'phaser';
import '@fontsource/fredoka/500.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/fredoka/700.css';
import { blobEl, clampLook, COLORS, EYES, HAT_CHOICES, HATS, MOUTHS, randomLook, SHAPES, type BlobLook } from './blob';
import { Controls } from './controls';
import { dungeonUi, setPicker } from './dungeonUi'; // [dungeon hook]
import { GameScene, type Session } from './game';
import { ClientNet, HostNet, friendlyError, PREFIX, type ToClient } from './net';
import { MINI_SECONDS } from './mini';
import { building, DATA_ICON, NI } from './ninjaArt';
import { partTile } from './partArt';
import { alive, blobWipe } from './alive';
/** Blob-wipe between screens in my own colour, carrying my blob (alive.ts). */
const wipe = () => blobWipe(profile.look.color, profile.look);
import { applyI18n, lang, lookName, setLang, t, type Key } from './i18n';
import { lanNamespace, nsInfo, Scanner, type FoundRoom } from './discovery';
import { sfx, unlockAudio } from './sfx';
import {
  addPlayer, affordable, atHome, BUILD_KINDS, COTTAGE_COST, COTTAGE_MAX, requestBuild, endRound, LONG_GAME, carryMaxOf, type BuildKind, BUILDING_ENABLED, DAY_CYCLE_ENABLED, STONE_ENABLED, finishMini, cleanBiome, type Biome, SNOW_MAP_ENABLED, BUILD_COST, canAfford, cleanVillage, createState, makeTrees, villageOf, MAX_PLAYERS, nodeTool, pickWeapon, removePlayer, RES, ROUND_SECONDS, snapshot, starsFor, step,
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
/** The option indices the designer shows for a part (hats: no ears, HAT_CHOICES). */
const shownOpts = (key: Exclude<Part, 'color'>) => (key === 'hat' ? HAT_CHOICES : PART_OPTS[key].map((_, i) => i));

function renderPicker() {
  $('preview').replaceChildren(alive(blobEl(profile.look), profile.look));
  const big = blobEl(profile.look);
  if (boing) { big.classList.add('boing'); boing = false; }
  $('preview2').replaceChildren(big);
  $('me-name').textContent = nameInput.value.trim() || 'Blob';
  document.querySelectorAll<HTMLButtonElement>('.tab').forEach((t) => {
    t.classList.toggle('on', t.dataset.part === part);
    t.setAttribute('aria-selected', String(t.dataset.part === part));
  });
  const choose = (patch: Partial<BlobLook>) => { profile.look = { ...profile.look, ...patch }; saveLook(); boing = true; renderPicker(); };
  let all: HTMLButtonElement[];
  if (part === 'color') {
    all = (COLORS.map((c) => {
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
    all = shownOpts(key).map((i) => {
      const label = lookName(key, i, PART_OPTS[key][i]);
      const b = document.createElement('button');
      b.className = 'opt' + (profile.look[key] === i ? ' on' : '');
      b.append(partTile(profile.look, key, i)); // only the item (eyes alone, hat alone...), shape = neutral face
      b.setAttribute('aria-label', label); b.title = label;
      b.onclick = () => choose({ [key]: i });
      return b;
    });
  }
  // paging instead of clipping/scrolling: a fixed grid, page arrows when the part has more options
  const size = pageSize(), pages = Math.max(1, Math.ceil(all.length / size));
  page = Math.max(0, Math.min(pages - 1, page));
  $('opts').replaceChildren(...all.slice(page * size, page * size + size));
  show('opts-pager', pages > 1);
  $('pg-dots').replaceChildren(...Array.from({ length: pages }, (_, i) => { const d = document.createElement('i'); if (i === page) d.className = 'on'; return d; }));
  ($('pg-prev') as HTMLButtonElement).disabled = page === 0;
  ($('pg-next') as HTMLButtonElement).disabled = page >= pages - 1;
}
/** Options per page: 4 x 2 in portrait, 6 x 1 in a short landscape screen. */
const pageSize = () => (matchMedia('(orientation: landscape) and (max-height: 520px)').matches ? 6 : 8);
let page = 0;
/** The page that holds the chosen option of the current part. */
function chosenPage() {
  const i = part === 'color' ? COLORS.indexOf(profile.look.color) : shownOpts(part).indexOf(profile.look[part]);
  return Math.floor(Math.max(0, i) / pageSize());
}
function turnPage(d: number) {
  const n = part === 'color' ? COLORS.length : shownOpts(part).length;
  const next = page + d;
  if (next < 0 || next * pageSize() >= n) return false;
  page = next; renderPicker();
  const opts = $('opts'); opts.classList.remove('from-left', 'from-right'); void opts.offsetWidth; opts.classList.add(d > 0 ? 'from-right' : 'from-left');
  return true;
}
/** Switch tab: slide the options in from the side we came from, keep the chosen tile in view. */
function setPart(next: Part) {
  if (next === part) return;
  slide = PARTS.indexOf(next) > PARTS.indexOf(part) ? 'from-right' : 'from-left';
  part = next;
  store.set('tab', part);
  page = chosenPage();
  renderPicker();
  const opts = $('opts');
  opts.classList.remove('from-left', 'from-right'); void opts.offsetWidth;
  if (slide) opts.classList.add(slide);
  slide = '';
  showChosen();
}
/** Scroll the option grid so the selected tile is visible (only the grid scrolls, never the page). */
function showChosen() {
  if (page !== chosenPage()) { page = chosenPage(); renderPicker(); }
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
    swipedAt = performance.now();
    if (turnPage(dx < 0 ? 1 : -1)) return; // swipe turns the page first, then the tab
    const i = PARTS.indexOf(part) + (dx < 0 ? 1 : -1);
    if (i < 0 || i >= PARTS.length) return;
    setPart(PARTS[i]);
  });
  // a swipe must not also pick the tile it started on
  opts.addEventListener('click', (e) => { if (performance.now() - swipedAt < 400) { e.stopPropagation(); e.preventDefault(); } }, true);
}
$('pg-prev').onclick = () => turnPage(-1);
$('pg-next').onclick = () => turnPage(1);
$('btn-random').onclick = () => { profile.look = randomLook(); saveLook(); boing = true; renderPicker(); };
saveLook();

// ---------- Kenney UI icons ----------
/** data-icon picture (Ninja, ninjaArt.ts DATA_ICON), crisp at any size. */
const icon = (name: string, cls = '') => { const i = new Image(); i.src = DATA_ICON[name] ?? NI.check; i.alt = ''; i.className = 'icon ' + cls; i.draggable = false; return i; };
document.querySelectorAll<HTMLElement>('[data-icon]').forEach((el) => el.replaceWith(icon(el.dataset.icon!)));
function renderIcons() {
  const logo = $('logo');
  // AI-generated logo (public/art/logo.png); plain text if it fails to load
  const img = new Image();
  img.src = 'art/logo.png'; img.alt = 'Blobz'; img.className = 'logo-img';
  img.onerror = () => { const t = document.createElement('span'); t.className = 'logo-text'; t.textContent = 'BLOBZ'; logo.replaceChildren(t); };
  logo.replaceChildren(img);
}

// ---------- menu panels: home -> (customize | join) ----------
function panel(id: 'home' | 'custom' | 'join') {
  if ($(id).classList.contains('hidden')) wipe();
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
  show('lan-search', true); // the N-20 searching blob keeps looking (friendly empty state), also after 'nothing yet'
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
  let first = true;
  $('net-code').textContent = ''; // filled again by the fresh lookup below
  const tryNs = () => void lanNamespace(first).then((ns) => {
    first = false;
    if (gen !== scanGen) return; // left the panel meanwhile
    showNetCode(ns);
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
const CONNECT_GIVE_UP = 12000;
/** The network code (first 4 of the namespace hash) on the join screen and the start screen's version line, so two
 *  phones can compare (Stefan 2026-11-16). ?debug adds how it was made (stun-v4 / stun-v6 / none / override). */
const netCodeOf = (ns: string | null) => (ns ? ns.slice(0, 4).toUpperCase() : '?');
function showNetCode(ns: string | null) {
  const dbg = DEBUG ? ` [${nsInfo.how || '...'}]` : '';
  $('net-code').textContent = (ns ? t('join.netCode', { code: netCodeOf(ns) }) : t('join.netUnknown')) + dbg;
  $('net-code').classList.toggle('warn', !ns);
  $('version').textContent = `${versionText()} (${netCodeOf(ns)})`;
}
function joinByCode() {
  const code = ($('code-input') as HTMLInputElement).value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
  ($('code-input') as HTMLInputElement).value = code;
  if (code.length !== 4) { $('join-msg').textContent = t('join.codeAria') + ': ABCD'; return; }
  void joinGame(PREFIX + code);
}
function stopScan() { scanGen++; clearTimeout(retryTimer); scanner?.stop(); scanner = null; }
function renderRooms(rooms: FoundRoom[]) {
  const connecting = scanner?.pending.size ?? 0;
  // a host is known but no link opened for 12 s (other network / mobile data, ICE failed): say so instead of
  // "ansluter..." for ever, with "Leta igen"; scanning goes on, so a link that opens later still shows its row
  const stuck = !rooms.length && [...(scanner?.pendingSince.values() ?? [])].some((t0) => Date.now() - t0 > CONNECT_GIVE_UP);
  show('lan-status', rooms.length === 0);
  emptyRounds = rooms.length || connecting ? 0 : emptyRounds + 1;
  // ~10 s without a game: hint at the usual cause, still scanning
  const ice = DEBUG && scanner?.ice ? ` [ICE: ${scanner.ice}]` : '';
  if (stuck) lanStatus(t('err.noLink') + ice, true);
  else lanStatus((connecting && !rooms.length ? t('join.connectingFound') : emptyRounds >= 3 ? NOTHING() : SEARCHING()) + ice, emptyRounds >= 3 && !connecting);
  show('lan-search', rooms.length === 0);
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
void lanNamespace().then((ns) => { if (ns) $('version').textContent = `${versionText()} (${netCodeOf(ns)})`; });
$('btn-code-join').onclick = joinByCode;
$('code-input').addEventListener('keydown', (e) => { if ((e as KeyboardEvent).key === 'Enter') joinByCode(); });
$('version').title = __APP_COMMIT__;
renderPicker();
// First visit: pick your blob before anything else.
if (!store.get('name')) panel('custom');
new Promise((r) => (document.readyState === 'complete' ? r(null) : window.addEventListener('load', () => r(null), { once: true })))
  .then(() => { setLoad(0.7); loading(false); });
queueMicrotask(() => { renderLobby(); renderIcons(); }); // after the module has set up everything below

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

/** Lobby (PLAN step 3): five seats on the N-20 party platform; joined blobz stand on it, free seats show the waiting
 *  silhouette. Players stay <li> (tests count them), free seats are plain spans. */
function renderLobby() {
  const players = [...infos.values()].map((p) => {
    const li = document.createElement('li');
    li.className = 'seat';
    const name = document.createElement('span'); name.className = 'seatname'; name.textContent = p.name;
    li.append(alive(blobEl(clampLook(p)), clampLook(p)), name);
    return li;
  });
  const free = Array.from({ length: Math.max(0, MAX_PLAYERS - players.length) }, () => {
    const s = document.createElement('span');
    s.className = 'seat free';
    // lobby v4 (Stefan 2026-11-15): "a friend can stand here", not a boulder: a dashed blob outline, empty inside, with
    // three waiting dots (CSS .freeblob)
    const blob = document.createElement('span'); blob.className = 'freeblob';
    blob.append(...[0, 1, 2].map(() => document.createElement('i')));
    s.append(blob);
    return s;
  });
  $('lobby-list').replaceChildren(...players, ...free);
  requestAnimationFrame(fitSeatNames);
}
/** Long names (Stefan 2026-11-15): a lobby name tag never reaches its neighbour's. It is at most its seat column wide
 *  (CSS max-width); a name that does not fit shrinks from 14 px down to 12 px, then ends in an ellipsis. */
function fitSeatNames() {
  for (const el of document.querySelectorAll<HTMLElement>('#lobby-list .seatname')) {
    el.style.fontSize = '';
    for (let fs = 13; el.scrollWidth > el.clientWidth && fs >= 12; fs--) el.style.fontSize = fs + 'px';
  }
}
onViewport(fitSeatNames);

function startScene(session: Session) {
  wipe();
  if (DEBUG) (window as unknown as { __blobzBiome?: string }).__blobzBiome = session.biome ?? 'meadow';
  endShown = false; lastStars = 0; goalsShown = 0; builtSeen = '';
  show('menu', false); show('lobby', false); show('end', false); show('hud');
  try { (navigator as Navigator & { wakeLock?: { request(t: string): Promise<unknown> } }).wakeLock?.request('screen').catch(() => {}); } catch { /* optional */ }
  if (!game) {
    game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: 'game',
      backgroundColor: '#2b6b3a',
      // device-pixel canvas (pixelScale.ts): game size = CSS size x dpr, shown at 1 / dpr; the viewport watcher keeps it
      scale: { mode: Phaser.Scale.NONE, width: Math.round(window.innerWidth * dpr()), height: Math.round(window.innerHeight * dpr()), zoom: 1 / dpr() },
      render: { pixelArt: true, antialias: false, roundPixels: true },
      scene: [],
    });
    game.scene.add('game', GameScene, false);
    // every settled resize / rotation / return to the app: the canvas follows the viewport (and the camera via the
    // scale 'resize' event); a canvas left at an old size was the "half the screen green" bug
    const g = game;
    onViewport((w, h) => {
      const d = dpr(), gw = Math.round(w * d), gh = Math.round(h * d);
      if (g.scale.width !== gw || g.scale.height !== gh) g.scale.resize(gw, gh);
      if (Math.abs(g.scale.zoom - 1 / d) > 1e-6) g.scale.setZoom(1 / d); else g.scale.refresh();
    });
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
      row.querySelector<HTMLImageElement>('.qstar')!.src = done ? NI.star : NI.starEmpty;
    }
  });
}
/** The HUD quest rows (wood/stone/berry) as HTML for the end screen; finished rows carry "qrow done", so copy the
 *  elements instead of splitting the markup on the class string. */
const QUEST_ROWS = () => [...$('hud-quest').querySelectorAll<HTMLElement>('.qrow')].map((r) => r.outerHTML).join('');
let savedAt = 0;
let treesFor = { seed: -1, trees: [] as ReturnType<typeof makeTrees> };

// ---------- build panel: the one place to build (hammer button when your blob is at home) ----------
let sendBuild: (k: BuildKind | 'cottage') => void = () => {};
/** Host only: end the meadow round by choice (LONG_GAME: it never ends by itself). */
let hostEndRound: () => void = () => {};
$('btn-gohome').onclick = () => hostEndRound();
let panelOpen = false;
const COST_ICON: Record<string, string> = { wood: NI.wood, stone: NI.stone, berry: NI.berry };
const STATE_ICON = { can: 'art/icons/state/can-build-16.png', lock: 'art/icons/state/lock-16.png', done: 'art/icons/state/tick-green-16.png' }; // ChatGPT N-18 (built = the green tick, like the designer)
const buildName = (k: BuildKind) => t(`build.name.${k}` as Key);
/** Building picture box in the build cards (css px); pictures use the largest whole scale that fits. */
const BIMG_BOX = 64;
function buildCard(kind: BuildKind | 'cottage'): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'bcard'; b.dataset.kind = kind;
  // PLAN step 3: name on top, the building in a fixed box (largest whole scale that fits), a short line, the cost strip
  // at the bottom; N-18 badge top-left: can-build / lock / done. No icon row.
  b.innerHTML = '<b class="bname"></b><span class="bimg"><img alt="" /></span><span class="beff"></span><span class="bcost"></span><img class="bstate" alt="" />';
  const im = b.querySelector<HTMLImageElement>('.bimg img')!;
  im.onload = () => {
    // largest WHOLE number of device px per art px that fits the box (pixelScale.ts), centred by the box's flex
    const { w, h } = intFit(im.naturalWidth, im.naturalHeight, BIMG_BOX, BIMG_BOX);
    im.style.width = w + 'px'; im.style.height = h + 'px';
  };
  b.onclick = () => { if (!b.disabled) { b.classList.remove('tap'); void b.offsetWidth; b.classList.add('tap'); sendBuild(kind); } };
  return b;
}
function markPanelScroll() {
  const p = $('build-panel');
  p.classList.toggle('scrolls', p.scrollHeight > p.clientHeight + 2);
  p.classList.toggle('atend', p.scrollTop + p.clientHeight >= p.scrollHeight - 2);
}
function setupBuildPanel() {
  const grid = $('build-cards');
  if (grid.childElementCount) return;
  grid.append(...[...BUILD_KINDS, 'cottage' as const].map(buildCard));
  $('btn-build').onclick = () => {
    panelOpen = true; show('build-panel');
    requestAnimationFrame(markPanelScroll);
  };
  // the scroll hint (fade + arrow) shows while more cards wait below
  $('build-panel').addEventListener('scroll', markPanelScroll, { passive: true });
  onViewport(markPanelScroll);
  $('btn-build-close').onclick = () => { panelOpen = false; show('build-panel', false); };
}
/** A building's effect in words, with the real numbers where it has them (carry 3 -> 4). */
function effText(kind: BuildKind | 'cottage', v: View) {
  const lvl = v.cottage?.level ?? 1, now = carryMaxOf(v.builds, lvl);
  if (kind === 'cottage') return lvl < COTTAGE_MAX ? t(`build.eff.cottage${lvl + 1}` as Key, { now, to: now + 1 }) : t('build.done');
  const done = v.builds.find((b) => b.kind === kind)?.state === 2;
  return t(`build.eff.${kind}` as Key, { now: done ? now - 1 : now, to: done ? now : now + 1 });
}
/** Built-this-round tracking for the "X byggd! <effect>" toast. */
let builtSeen = '';
function toastBuilt(v: View) {
  const now = [...v.builds.filter((b) => b.state === 2).map((b) => b.kind), `c${v.cottage?.level ?? 1}`].join(',');
  if (now === builtSeen) return;
  const before = builtSeen; builtSeen = now;
  if (!before) return; // first view of the round: what is already standing is no news
  const fresh = v.builds.find((b) => b.state === 2 && !before.split(',').includes(b.kind));
  const cot = !before.split(',').includes(`c${v.cottage?.level ?? 1}`);
  if (!fresh && !cot) return;
  const name = fresh ? buildName(fresh.kind) : t('build.cottage', { lvl: v.cottage.level }).replace('\n', ' ');
  const eff = fresh ? effText(fresh.kind, v) : t(`build.eff.cottage${v.cottage.level}` as Key, { now: carryMaxOf(v.builds, v.cottage.level) - 1, to: carryMaxOf(v.builds, v.cottage.level) });
  showToast(t('build.built.toast', { name, eff }), building(fresh ? fresh.kind : `cottage-${v.cottage.level}`));
}
/** The toast under the quest box (milestones, buildings): a picture + one line, gone after 2.6 s. */
function showToast(text: string, img: string) {
  const tt = $('goal-toast');
  tt.querySelector('img')!.setAttribute('src', img); tt.querySelector('span')!.textContent = text;
  show('goal-toast'); tt.classList.remove('pop'); void tt.offsetWidth; tt.classList.add('pop');
  clearTimeout(goalToastT); goalToastT = window.setTimeout(() => show('goal-toast', false), 2600);
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
    const img = isCot ? building(`cottage-${Math.min(3, lvl + (lvl >= COTTAGE_MAX ? 0 : 1))}`) : building(kind);
    const eff = effText(kind, v);
    const can = !built && !!cost && canAfford(v.bank, cost);
    const key = `${built}|${can}|${name}|${cost ? RES.map((k) => cost[k] + ':' + (v.bank[k] >= cost[k] ? 1 : 0)).join(',') : ''}`;
    if (card.dataset.key === key) return;
    card.dataset.key = key;
    card.disabled = built || !can;
    card.classList.toggle('built', !!built);
    card.classList.toggle('can', can);
    const pic = card.querySelector<HTMLImageElement>('.bimg img')!;
    if (!pic.src.endsWith(img)) pic.src = img;
    card.querySelector<HTMLImageElement>('.bstate')!.src = built ? STATE_ICON.done : can ? STATE_ICON.can : STATE_ICON.lock;
    card.querySelector('.bname')!.textContent = name;
    card.querySelector('.beff')!.textContent = built ? t('build.built') : eff;
    card.setAttribute('aria-label', `${name.replace('\n', ' ')}: ${built ? t('build.built') : eff}`);
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
  const name = k === 'cottage' ? t('build.cottage', { lvl: lvl + 1 }).replace('\n', ' ') : buildName(k);
  const text = doneK ? t('build.goalDone', { name }) : t('build.goal', { name });
  if (row.getAttribute('aria-label') === text) return;
  row.setAttribute('aria-label', text); row.title = text;
  row.classList.toggle('done', !!doneK);
  row.querySelector<HTMLImageElement>('.qbimg')!.src = k === 'cottage' ? building(`cottage-${Math.min(COTTAGE_MAX, lvl + 1)}`) : building(k);
  row.querySelector<HTMLImageElement>('.qbico')!.src = doneK ? NI.check : NI.build;
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
    img(building(`cottage-${v.cottage}`), 'vcot'),
    ...BUILD_KINDS.filter((k) => v.builds[k]).map((k) => img(building(k), 'vb')),
    res(NI.wood, v.bank.wood), ...(STONE_ENABLED ? [res(NI.stone, v.bank.stone)] : []), res(NI.berry, v.bank.berry), // stone archived: no "0" stone
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
    if (im.classList.contains('on') !== on) { im.classList.toggle('on', on); im.src = on ? NI.star : NI.starEmpty; }
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
let goalToastT = 0;
let goalsShown = 0; // milestones already toasted this round

function onView(v: View) {
  if (loadPending) { loadPending = false; loading(false); }
  if (DEBUG) (window as unknown as { __blobzView: View }).__blobzView = v;
  if (dungeonUi(v, session?.myId, controls, (id) => infos.get(id)?.name ?? '?')) return; // [dungeon hook, Code 2] pick cards / dungeon HUD
  renderQuestRows($('hud-quest'), v);
  renderBuildGoal(v);
  toastBuilt(v);
  show('btn-gohome', isHost && LONG_GAME && v.phase === 'play');
  if (v.goal > goalsShown) { // a milestone (LONG_GAME): toast + star, the bars start on the next goal
    goalsShown = v.goal; lastStars = 0; sfx.star();
    showToast(t('hud.goal'), NI.star);
  }
  const st = starsFor(v.delivered, v.quest);
  if (st > lastStars) { sfx.star(); lastStars = st; }
  // day bar (archived, DAY_CYCLE_ENABLED): the sun rides left -> right; dusk in the last 20 s
  document.body.classList.toggle('noday', !DAY_CYCLE_ENABLED);
  document.body.classList.toggle('nostone', !STONE_ENABLED); // stone archived: no stone rows / counters
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
      $('end-mini-stars').replaceChildren(...[0, 1, 2].map((i) => { const im = new Image(); im.src = i < v.miniResult!.stars ? NI.star : NI.starEmpty; im.className = 'star'; im.alt = ''; return im; }));
    }
    // long game: the end stars are the milestones reached (max 3), not the half-filled goal of the moment
    const es = LONG_GAME ? Math.min(3, v.goal) : st;
    $('end-stars').replaceChildren(...[0, 1, 2].map((i) => {
      const img = new Image(); img.src = i < es ? NI.star : NI.starEmpty; img.alt = ''; img.className = 'star' + (i < es ? ' on' : '');
      return img;
    }));
    // the team that did it: every blob, cheering (staggered hops)
    $('end-team').replaceChildren(...[...infos.values()].map((p, i) => { const b = alive(blobEl(clampLook(p)), clampLook(p)); b.style.animationDelay = `${i * 0.12}s`; return b; }));
    $('end-rows').innerHTML = QUEST_ROWS();
    renderQuestRows($('end-rows'), v);
    show('btn-again', isHost); show('end-wait', !isHost);
    wipe(); show('end');
    if (es) sfx.star();
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
  show('map-pick', SNOW_MAP_ENABLED); // archived snow map: no picker, the meadow is the only map
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
    const ns = await lanNamespace(true);
    const slot = ns ? await net.openSlot(ns) : 0;
    // the room code: friends on another network (or a phone whose network code differs) type it on the join screen
    $('room-code').innerHTML = t('lobby.roomCode', { code: net.code, net: netCodeOf(ns) }) + (DEBUG ? ` [${nsInfo.how}]` : '');
    show('room-code');
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
  hostEndRound = () => { if (state) endRound(state); };
  setPicker((w) => { if (state) pickWeapon(state, myId, w); });
  net.onLeave = (id) => {
    infos.delete(id); inputs.delete(id);
    if (state) removePlayer(state, id);
    renderLobby();
    net.broadcast(lobbyMsg());
  };

  const newRound = () => {
    seed = DEBUG && new URLSearchParams(location.search).has('seed') ? Number(new URLSearchParams(location.search).get('seed')) : Math.floor(Math.random() * 1e9); // ?debug&seed= pins the map (screenshots)
    state = createState([...infos.values()], seed, loadVillage(), biome);
    // Test hook (?debug): lets Playwright place blobz on plates etc. Never set in normal play.
    if (DEBUG) (window as unknown as { __blobz: unknown }).__blobz = { state };
    if (roundSecs) state.time = roundSecs;
    acc = 0; netAcc = 0; localFx.length = 0; netFx = [];
    net.broadcast({ t: 'start', seed, map: biome });
    session = {
      role: 'host', myId, seed, biome,
      infos: () => infos,
      readInput: () => ({ ...controls.read(), sw: Math.min(innerWidth, innerHeight) }), // [dungeon hook (Code 2)] portrait width -> room width
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
  wipe(); show('menu', false); show('lobby');
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
    const fresh = [building('cottage-1'), NI.sparkle].map((src, i) => { const im = new Image(); im.src = src; im.alt = ''; im.className = i ? 'vb' : 'vcot'; return im; });
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
        readInput: () => ({ ...controls.read(), sw: Math.min(innerWidth, innerHeight) }), // [dungeon hook (Code 2)] portrait width -> room width
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
      : why === 'timeout' ? t('err.noLink')
      : friendlyError(why);
    startScan(); // panel('join') would clear the message, so restart the list directly
    $('join-msg').textContent = msg;
    return;
  }
  show('btn-start', false); show('lobby-wait');
  wipe(); show('menu', false); show('lobby');
}

$('btn-host').onclick = () => void hostGame();
// Warm up the Wi-Fi namespace (STUN) so the Joina list and host slot are ready sooner.
void lanNamespace();
$('btn-leave').onclick = () => location.reload();
$('btn-menu').onclick = () => location.reload();

if (new URLSearchParams(location.search).get('demo') === 'monsters' || new URLSearchParams(location.search).has('dgdemo')) void import('./dungeonDemo').then((m) => m.runDemo()); // [dungeon hook] Ninja monster demo
const UIKIT = new URLSearchParams(location.search).get('uikit'); // UI-kit comparison pages (Lead/Stefan pick)
if (UIKIT === '2') void import('./uikit2').then((m) => m.showUiKit2());
else if (UIKIT !== null) void import('./uikit').then((m) => m.showUiKit());
const DEBUG = new URLSearchParams(location.search).has('debug');
// Optional round length for quick games/tests: ?t=60
const roundSecs = Math.max(0, Math.min(600, Number(new URLSearchParams(location.search).get('t')) || 0));


// viewport watcher + the "turn your phone" overlay (landscape is parked); the overlay shows the player's own blob
watchViewport();
// whole-device-pixel sizing of the DOM pixel art (pixelScale.ts SNAP rules): on every layout change and a light poll
onViewport(() => snapAll());
setInterval(() => snapAll(), 300);
onViewport(() => {
  if (!document.body.classList.contains('rotate-block')) return;
  const slot = $('rotate-blob');
  const key = JSON.stringify(profile.look);
  if (slot.dataset.look !== key) { slot.dataset.look = key; slot.replaceChildren(blobEl(clampLook(profile.look))); }
});
