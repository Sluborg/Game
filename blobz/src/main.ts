import Phaser from 'phaser';
import '@fontsource/pixelify-sans/400.css';
import '@fontsource/pixelify-sans/700.css';
import { loadArt, pixelText, tileCanvas } from './art';
import { blobEl, clampLook, COLORS, EYES, HATS, MOUTHS, randomLook, SHAPES, type BlobLook } from './blob';
import { Controls } from './controls';
import { GameScene, type Session } from './game';
import { ClientNet, HostNet, friendlyError, type ToClient } from './net';
import { sfx, unlockAudio } from './sfx';
import {
  addPlayer, createState, MAX_PLAYERS, removePlayer, snapshot, starsFor, step, viewFromSnapshot, viewFromState,
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
let part: Part = 'shape';
const PART_OPTS: Record<Exclude<Part, 'color'>, string[]> = { shape: SHAPES, eyes: EYES, mouth: MOUTHS, hat: HATS };

function renderPicker() {
  $('preview').replaceChildren(blobEl(profile.look));
  $('preview2').replaceChildren(blobEl(profile.look));
  $('me-name').textContent = nameInput.value.trim() || 'Blob';
  document.querySelectorAll<HTMLButtonElement>('.tab').forEach((t) => {
    t.classList.toggle('on', t.dataset.part === part);
    t.setAttribute('aria-selected', String(t.dataset.part === part));
  });
  const choose = (patch: Partial<BlobLook>) => { profile.look = { ...profile.look, ...patch }; saveLook(); renderPicker(); };
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
      b.append(blobEl({ ...profile.look, [key]: i }), document.createTextNode(label));
      b.onclick = () => choose({ [key]: i });
      return b;
    }));
  }
}
document.querySelectorAll<HTMLButtonElement>('.tab').forEach((t) => {
  t.onclick = () => { part = t.dataset.part as Part; renderPicker(); };
});
$('btn-random').onclick = () => { profile.look = randomLook(); saveLook(); renderPicker(); };
saveLook();

// ---------- Kenney UI icons ----------
const GEM = () => tileCanvas('pp', 67, 4); // Pixel Platformer diamond = "star"
let roomCode = '';
function renderIcons() {
  const logo = $('logo');
  // AI-generated logo (public/art/logo.png); Kenney pixel letters if it fails to load
  const img = new Image();
  img.src = 'art/logo.png'; img.alt = 'Blobz'; img.className = 'logo-img';
  img.onerror = () => logo.replaceChildren(pixelText('BLOBZ', 4));
  logo.replaceChildren(img);
  ['s1', 's2', 's3'].forEach((c) => document.querySelector('#starbar .' + c)!.replaceChildren(GEM()));
  $('dash').replaceChildren(tileCanvas('battle', 43, 4)); // Tiny Battle arrow
  $('hint-dash').replaceChildren(tileCanvas('battle', 43, 2));
  if (roomCode) $('lobby-code').replaceChildren(pixelText(roomCode, 4, 0));
}
function setRoomCode(code: string) {
  roomCode = code;
  $('lobby-code').dataset.code = code;
  $('lobby-code').setAttribute('aria-label', 'Rumskod ' + code.split('').join(' '));
  $('lobby-code').replaceChildren(pixelText(code, 4, 0));
}

// ---------- menu panels: home -> (customize | join) ----------
function panel(id: 'home' | 'custom' | 'join') {
  for (const p of ['home', 'custom', 'join']) show(p, p === id);
  $('menu-msg').textContent = ''; $('join-msg').textContent = '';
  if (id === 'join') setTimeout(() => $<HTMLInputElement>('code').focus(), 50);
}
$('me').onclick = () => panel('custom');
$('btn-custom-done').onclick = () => { myInfo(); renderPicker(); panel('home'); };
nameInput.addEventListener('input', () => { $('me-name').textContent = nameInput.value.trim() || 'Blob'; });
nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') nameInput.blur(); });
$('btn-show-join').onclick = () => panel('join');
$('btn-join-back').onclick = () => panel('home');
const codeInput = $<HTMLInputElement>('code');
codeInput.addEventListener('input', () => {
  codeInput.value = codeInput.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
  if (codeInput.value.length === 4) void joinGame(); // auto-join on the 4th letter
});

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
      render: { antialias: true, pixelArt: false },
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

function onView(v: View) {
  $('score').textContent = String(v.score);
  const max = v.stars[2];
  $('starfill').style.width = Math.min(100, (v.score / max) * 100) + '%';
  const st = starsFor(v.score, v.stars);
  ['s1', 's2', 's3'].forEach((c, i) => {
    const el = document.querySelector<HTMLElement>('#starbar .' + c)!;
    el.style.left = (v.stars[i] / max) * 100 + '%';
    el.classList.toggle('on', st > i);
  });
  if (st > lastStars) { sfx.star(); lastStars = st; }
  $('hud-time').textContent = fmtTime(v.time);
  $('hud-time').classList.toggle('low', v.time < 20);
  const me = v.players.find((p) => p.id === session?.myId);
  controls.setCooldown(!!me && me.dashCd > 0);
  if (v.phase === 'end' && !endShown) {
    endShown = true;
    $('end-stars').replaceChildren(...[0, 1, 2].map((i) => { const g = GEM(); g.classList.add(i < st ? 'on' : 'off'); return g; }));
    $('end-score').textContent = `Lagets poäng: ${v.score}`;
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
  let code: string;
  try { code = await net.open(); } catch (e) { $('menu-msg').textContent = friendlyError(String(e)); return; }
  const myId = net.peer.id;
  infos = new Map([[myId, { id: myId, ...myInfo() }]]);
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

  setRoomCode(code);
  $('hud-code').textContent = 'Kod ' + code;
  renderLobby();
  show('btn-start'); show('lobby-wait', false);
  show('menu', false); show('lobby');
  $('btn-start').onclick = () => { unlockAudio(); newRound(); };
  $('btn-again').onclick = () => newRound();
}

// ---------- join ----------
async function joinGame() {
  unlockAudio();
  const code = $<HTMLInputElement>('code').value.trim().toUpperCase();
  if (code.length !== 4) { $('join-msg').textContent = 'Skriv rummets 4 bokstäver.'; return; }
  if ($<HTMLButtonElement>('btn-join').disabled) return;
  isHost = false;
  const net = new ClientNet();
  $('join-msg').textContent = 'Ansluter...';
  $<HTMLButtonElement>('btn-join').disabled = true;
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
    await net.join(code, myInfo());
  } catch (e) {
    $<HTMLButtonElement>('btn-join').disabled = false;
    const why = String(e);
    $('join-msg').textContent = why === 'full' ? 'Rummet är fullt (max 5).' : why === 'timeout' ? 'Ingen svarade. Rätt kod?' : friendlyError(why);
    return;
  }
  setRoomCode(code);
  $('hud-code').textContent = '';
  show('btn-start', false); show('lobby-wait');
  show('menu', false); show('lobby');
}

$('btn-host').onclick = () => void hostGame();
$('btn-join').onclick = () => void joinGame();
codeInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') void joinGame(); });
$('btn-leave').onclick = () => location.reload();
$('btn-menu').onclick = () => location.reload();

// Optional round length for quick games/tests: ?t=60
const roundSecs = Math.max(0, Math.min(600, Number(new URLSearchParams(location.search).get('t')) || 0));

// Join link support: ?room=ABCD prefills the code.
const room = new URLSearchParams(location.search).get('room');
if (room) { codeInput.value = room.slice(0, 4).toUpperCase(); panel('join'); }
