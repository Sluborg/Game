import Phaser from 'phaser';
import { COLORS, HATS, previewInto } from './art';
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
const profile = {
  name: store.get('name') ?? '',
  color: Number(store.get('color') ?? COLORS[Math.floor(Math.random() * COLORS.length)]),
  hat: Number(store.get('hat') ?? 0),
};
if (!COLORS.includes(profile.color)) profile.color = COLORS[0];

const nameInput = $<HTMLInputElement>('name');
nameInput.value = profile.name;
function myInfo(): Omit<PlayerInfo, 'id'> {
  const name = nameInput.value.trim().slice(0, 10) || 'Blob';
  store.set('name', name);
  return { name, color: profile.color, hat: profile.hat };
}
function renderPicker() {
  previewInto($<HTMLCanvasElement>('preview'), profile.color, profile.hat);
  $('colors').replaceChildren(...COLORS.map((c) => {
    const b = document.createElement('button');
    b.className = 'swatch' + (c === profile.color ? ' on' : '');
    b.style.background = '#' + c.toString(16).padStart(6, '0');
    b.onclick = () => { profile.color = c; store.set('color', String(c)); renderPicker(); };
    return b;
  }));
  $('hats').replaceChildren(...HATS.map((h, i) => {
    const b = document.createElement('button');
    b.className = 'hatbtn' + (i === profile.hat ? ' on' : '');
    b.textContent = h;
    b.onclick = () => { profile.hat = i; store.set('hat', String(i)); renderPicker(); };
    return b;
  }));
}
renderPicker();

// ---------- shared game plumbing ----------
const controls = new Controls();
controls.onDash = () => sfx.dash();
let game: Phaser.Game | null = null;
let infos = new Map<string, PlayerInfo>();
let endShown = false;
let lastStars = 0;
let isHost = false;

function sanitize(id: string, i: Partial<PlayerInfo>): PlayerInfo {
  return {
    id,
    name: String(i.name ?? 'Blob').slice(0, 10) || 'Blob',
    color: COLORS.includes(Number(i.color)) ? Number(i.color) : COLORS[0],
    hat: Math.max(0, Math.min(HATS.length - 1, Number(i.hat) || 0)),
  };
}

function renderLobby() {
  $('lobby-list').replaceChildren(...[...infos.values()].map((p) => {
    const li = document.createElement('li');
    const c = document.createElement('canvas');
    c.width = 72; c.height = 72;
    previewInto(c, p.color, p.hat);
    li.append(c, document.createTextNode(p.name));
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
    $('end-stars').textContent = '★'.repeat(st) + '☆'.repeat(3 - st);
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

  $('lobby-code').textContent = code;
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
  if (code.length !== 4) { $('menu-msg').textContent = 'Skriv rummets 4 bokstäver.'; return; }
  isHost = false;
  const net = new ClientNet();
  $('menu-msg').textContent = 'Ansluter...';
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
    $('menu-msg').textContent = why === 'full' ? 'Rummet är fullt (max 5).' : why === 'timeout' ? 'Ingen svarade. Rätt kod?' : friendlyError(why);
    return;
  }
  $('lobby-code').textContent = code;
  $('hud-code').textContent = '';
  show('btn-start', false); show('lobby-wait');
  show('menu', false); show('lobby');
}

$('btn-host').onclick = () => void hostGame();
$('btn-join').onclick = () => void joinGame();
$<HTMLInputElement>('code').addEventListener('keydown', (e) => { if (e.key === 'Enter') void joinGame(); });
$('btn-leave').onclick = () => location.reload();
$('btn-menu').onclick = () => location.reload();

// Optional round length for quick games/tests: ?t=60
const roundSecs = Math.max(0, Math.min(600, Number(new URLSearchParams(location.search).get('t')) || 0));

// Join link support: ?room=ABCD prefills the code.
const room = new URLSearchParams(location.search).get('room');
if (room) $<HTMLInputElement>('code').value = room.slice(0, 4).toUpperCase();
