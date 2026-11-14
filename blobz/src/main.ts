import Phaser from 'phaser';
import '@fontsource/pixelify-sans/400.css';
import '@fontsource/pixelify-sans/700.css';
import { loadArt, pixelText } from './art';
import { blobEl, clampLook, COLORS, EYES, HATS, MOUTHS, randomLook, SHAPES, type BlobLook } from './blob';
import { Controls } from './controls';
import { GameScene, type Session } from './game';
import { ClientNet, HostNet, friendlyError, type ToClient } from './net';
import { lanNamespace, Scanner, type FoundRoom } from './discovery';
import { sfx, unlockAudio } from './sfx';
import {
  addPlayer, createState, makeTrees, MAX_PLAYERS, nodeTool, removePlayer, RES, ROUND_SECONDS, snapshot, starsFor, step,
  toolNode, viewFromSnapshot, viewFromState,
} from './sim';
import type { FxEvent, Input, PlayerInfo, Snapshot, State, View } from './sim';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const show = (id: string, on = true) => $(id).classList.toggle('hidden', !on);

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
      b.setAttribute('aria-label', 'Färg');
      const i = document.createElement('i');
      i.style.background = '#' + c.toString(16).padStart(6, '0');
      b.append(i);
      b.onclick = () => choose({ color: c });
      return b;
    }));
  } else {
    const key = part;
    $('opts').replaceChildren(...PART_OPTS[key].map((label, i) => {
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
const SEARCHING = 'Letar efter spel på ditt Wi-Fi...';
const NOTHING = 'Hittar inga spel. Är ni på samma Wi-Fi?';
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
  lanStatus(SEARCHING);
  const tryNs = () => void lanNamespace().then((ns) => {
    if (gen !== scanGen) return; // left the panel meanwhile
    if (!ns) {
      // no public IP yet (strict NAT, no UDP): say so, keep trying in the background
      lanStatus(NOTHING, true);
      retryTimer = window.setTimeout(tryNs, 5000);
      return;
    }
    scanner = new Scanner(ns, clampLook);
    scanner.onUpdate = renderRooms;
    scanner.start();
  });
  tryNs();
}
function stopScan() { scanGen++; clearTimeout(retryTimer); scanner?.stop(); scanner = null; }
function renderRooms(rooms: FoundRoom[]) {
  show('lan-status', rooms.length === 0);
  emptyRounds = rooms.length ? 0 : emptyRounds + 1;
  // ~10 s without a game: hint at the usual cause, still scanning
  lanStatus(emptyRounds >= 3 ? NOTHING : SEARCHING, emptyRounds >= 3);
  $('lan-list').replaceChildren(...rooms.map((r) => {
    const li = document.createElement('li');
    const b = document.createElement('button');
    const full = r.players >= r.max;
    b.className = 'lanrow' + (full ? ' full' : '');
    b.disabled = full;
    b.dataset.slot = String(r.slot);
    const txt = document.createElement('span');
    txt.className = 'lantext';
    const title = document.createElement('b');
    title.textContent = 'Joina ' + r.name;
    const sub = document.createElement('span');
    sub.className = 'lansub';
    sub.textContent = `${r.players}/${r.max}` + (full ? ' · fullt' : r.started ? ' · pågår' : '');
    txt.append(title, sub);
    b.append(blobEl(r.look), txt);
    b.setAttribute('aria-label', `Joina ${r.name}, ${r.players} av ${r.max}` + (full ? ', fullt' : r.started ? ', pågår' : ''));
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

if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => { /* optional */ });
$('version').textContent = __APP_VERSION__ + (matchMedia('(prefers-color-scheme: dark)').matches ? ' D' : '');
$('version').title = __APP_COMMIT__;
renderPicker();
// First visit: pick your blob before anything else.
if (!store.get('name')) panel('custom');
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
  game.scene.start('game', { session });
  const sc = game.scene.getScene('game') as GameScene | null;
  if (sc) sc.onView = onView;
  else game.events.once('ready', () => { (game!.scene.getScene('game') as GameScene).onView = onView; });
}

function fmtTime(t: number) {
  const s = Math.ceil(t);
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
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
let treesFor = { seed: -1, trees: [] as ReturnType<typeof makeTrees> };

function onView(v: View) {
  if (DEBUG) (window as unknown as { __blobzView: View }).__blobzView = v;
  renderQuestRows($('hud-quest'), v);
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
  show('hud-double', (v.doubleT ?? 0) > 0);
  if (v.doubleT > 0) $('double-t').textContent = fmtTime(v.doubleT);
  const me = v.players.find((p) => p.id === session?.myId);
  // action button: the tool of the nearest node in reach, else dash
  if (session && treesFor.seed !== session.seed) treesFor = { seed: session.seed, trees: makeTrees(session.seed) };
  const node = me ? toolNode(treesFor.trees, (i) => v.nodes[i] ?? 0, me.x, me.y) : -1;
  controls.setTool(node >= 0 ? nodeTool(treesFor.trees[node].kind) : null);
  controls.setCooldown(!!me && me.dashCd > 0);
  if (v.phase === 'end' && !endShown) {
    endShown = true;
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

// ---------- host ----------
async function hostGame() {
  unlockAudio();
  isHost = true;
  const net = new HostNet();
  $('menu-msg').textContent = 'Skapar rum...';
  try { await net.open(); } catch (e) { $('menu-msg').textContent = friendlyError(String(e)); return; }
  const myId = net.peer.id;
  infos = new Map([[myId, { id: myId, ...myInfo() }]]);
  net.onInfo = () => {
    const me = infos.get(myId);
    if (!me) return null;
    return { name: me.name, look: clampLook(me), players: infos.size, max: MAX_PLAYERS, started: !!state };
  };
  // Show up in friends' Joina list. Keep retrying until it works (STUN can be slow or blocked).
  const LAN_OK = 'Kompisar på samma Wi-Fi trycker <b>Joina</b> och väljer ditt namn';
  const advertise = async () => {
    if (net.peer.destroyed) return;
    const ns = await lanNamespace();
    const slot = ns ? await net.openSlot(ns) : 0;
    $('lobby-lan').innerHTML = slot ? LAN_OK : 'Letar efter ditt Wi-Fi... Kompisarna ser inte spelet än.';
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

  const lobbyMsg = (): ToClient => ({ t: 'lobby', players: [...infos.values()] });
  net.onHello = (id, info) => {
    if (!infos.has(id) && infos.size >= MAX_PLAYERS) return false;
    const p = sanitize(id, info);
    const used = new Set([...infos.values()].filter((q) => q.id !== id).map((q) => q.color));
    if (used.has(p.color)) p.color = COLORS.find((c) => !used.has(c)) ?? p.color; // keep blobz tellable apart
    infos.set(id, p);
    renderLobby();
    setTimeout(() => {
      net.broadcast(lobbyMsg());
      if (state) { addPlayer(state, p); net.conns.get(id)?.send({ t: 'start', seed } satisfies ToClient); }
    }, 50);
    return true;
  };
  net.onInput = (id, inp) => inputs.set(id, inp);
  net.onLeave = (id) => {
    infos.delete(id); inputs.delete(id);
    if (state) removePlayer(state, id);
    renderLobby();
    net.broadcast(lobbyMsg());
  };

  const newRound = () => {
    seed = Math.floor(Math.random() * 1e9);
    state = createState([...infos.values()], seed);
    // Test hook (?debug): lets Playwright place blobz on plates etc. Never set in normal play.
    if (DEBUG) (window as unknown as { __blobz: unknown }).__blobz = { state };
    if (roundSecs) state.time = roundSecs;
    acc = 0; netAcc = 0; localFx.length = 0; netFx = [];
    net.broadcast({ t: 'start', seed });
    session = {
      role: 'host', myId, seed,
      infos: () => infos,
      readInput: () => controls.read(),
      tick(dt, input) {
        if (!state) return;
        inputs.set(myId, input);
        acc += dt;
        while (acc >= 1 / 60) {
          step(state, inputs, 1 / 60);
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
  $('join-msg').textContent = 'Ansluter...';
  row?.classList.add('busy');
  stopScan(); // free the probing peer; a failed join restarts the list
  let latest: Snapshot | null = null;
  const fx: FxEvent[] = [];
  let sendAcc = 0;
  let lastSent = '';

  net.onMessage = (m) => {
    if (m.t === 'lobby') {
      infos = new Map(m.players.map((p) => [p.id, p]));
      renderLobby();
    } else if (m.t === 's') {
      latest = m.s;
      fx.push(...m.s.fx);
    } else if (m.t === 'start') {
      latest = null; fx.length = 0;
      session = {
        role: 'client', myId: net.id, seed: m.seed,
        infos: () => infos,
        readInput: () => controls.read(),
        tick(dt, input) {
          sendAcc += dt;
          const key = `${input.x},${input.y},${input.dash}`;
          if (key !== lastSent || sendAcc > 0.25) {
            if (sendAcc >= 1 / 30 || input.dash !== Number(lastSent.split(',')[2])) {
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
  net.onClose = () => { alert('Värden lämnade spelet.'); location.reload(); };

  try {
    await net.join(target, myInfo());
  } catch (e) {
    joining = false;
    const why = String(e);
    const msg = why === 'full' ? 'Spelet är fullt (max 5).'
      : why === 'timeout' ? 'Ingen svarade. Försök igen.'
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

