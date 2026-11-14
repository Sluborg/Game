// LAN multiplayer over WebRTC (PeerJS). One phone hosts the authoritative sim;
// joiners send inputs and render the host's snapshots. The public PeerJS broker
// is only used to pair phones; game traffic flows peer-to-peer on the Wi-Fi.
import Peer, { DataConnection } from 'peerjs';
import type { Input, PlayerInfo, Snapshot } from './sim';
import { slotId, SLOTS, type RoomInfo } from './discovery';
import { t } from './i18n';

export const PREFIX = 'blobz-v1-';
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

export type ToHost =
  | { t: 'hello'; info: Omit<PlayerInfo, 'id'>; v?: string }
  | { t: 'info?' }
  | { t: 'pick'; w: string }
  | { t: 'build'; k: string }
  | { t: 'in'; x: number; y: number; dash: number; atk?: number };
export type ToClient =
  | { t: 'welcome'; id: string }
  | { t: 'full' }
  | { t: 'version'; v: string }
  | { t: 'info'; info: RoomInfo }
  | { t: 'lobby'; players: PlayerInfo[]; map?: string }
  | { t: 'start'; seed: number; map?: string }
  | { t: 's'; s: Snapshot };

/** Random part of the host's own (never shown) PeerJS id `blobz-v1-XXXX`. */
export function randomCode() {
  return Array.from({ length: 4 }, () => LETTERS[Math.floor(Math.random() * LETTERS.length)]).join('');
}

export function friendlyError(type: string): string {
  switch (type) {
    case 'peer-unavailable': return t('err.gone');
    case 'network':
    case 'server-error':
    case 'socket-error':
    case 'socket-closed': return t('err.server');
    case 'browser-incompatible': return t('err.browser');
    default: return t('err.other', { type });
  }
}

export class HostNet {
  peer!: Peer;
  code = '';
  conns = new Map<string, DataConnection>();
  onHello: (id: string, info: Omit<PlayerInfo, 'id'>) => boolean = () => true;
  onInput: (id: string, inp: Input) => void = () => {};
  onLeave: (id: string) => void = () => {};
  onPick: (id: string, w: string) => void = () => {};
  onBuild: (id: string, kind: string) => void = () => {};
  onInfo: () => RoomInfo | null = () => null;
  /** Second peer on `blobz-v2-<ns>-<slot>` so same-Wi-Fi phones find the room without a code. */
  slotPeer: Peer | null = null;
  slot = 0;

  /** Claim the first free slot 1..8 in the namespace. Resolves the slot, or 0 if none could be had. */
  openSlot(ns: string): Promise<number> {
    if (this.slotPeer && !this.slotPeer.destroyed) return Promise.resolve(this.slot);
    return new Promise((resolve) => {
      const attempt = (slot: number) => {
        if (slot > SLOTS || !this.peer || this.peer.destroyed) { resolve(0); return; }
        const peer = new Peer(slotId(ns, slot), { debug: 0 });
        let opened = false;
        peer.on('open', () => { opened = true; this.slotPeer = peer; this.slot = slot; resolve(slot); });
        peer.on('error', (e) => {
          const type = (e as { type?: string }).type ?? 'unknown';
          if (opened) return; // later errors (e.g. a probe to a gone peer) are harmless
          peer.destroy();
          if (type === 'unavailable-id') attempt(slot + 1); else resolve(0);
        });
        peer.on('connection', (c) => this.accept(c));
      };
      attempt(1);
    });
  }

  open(): Promise<string> {
    return new Promise((resolve, reject) => {
      const attempt = (tries: number) => {
        this.code = randomCode();
        const peer = new Peer(PREFIX + this.code, { debug: 0 });
        peer.on('open', () => { this.peer = peer; resolve(this.code); });
        peer.on('error', (e) => {
          const type = (e as { type?: string }).type ?? 'unknown';
          if (type === 'unavailable-id' && tries < 5) { peer.destroy(); attempt(tries + 1); }
          else if (!this.peer) reject(type);
        });
        peer.on('connection', (c) => this.accept(c));
      };
      attempt(0);
    });
  }

  private accept(c: DataConnection) {
    c.on('data', (raw) => {
      const m = raw as ToHost;
      if (m?.t === 'info?') {
        const info = this.onInfo();
        if (info) c.send({ t: 'info', info } satisfies ToClient);
        setTimeout(() => c.close(), 1000); // the prober closes first; this is the safety net
        return;
      }
      if (m.t === 'hello') {
        // different app versions cannot play together (snapshot format changes between versions)
        if (String(m.v ?? '') !== __APP_VERSION__) { c.send({ t: 'version', v: __APP_VERSION__ } satisfies ToClient); setTimeout(() => c.close(), 300); return; }
        if (!this.onHello(c.peer, m.info)) { c.send({ t: 'full' } satisfies ToClient); setTimeout(() => c.close(), 300); return; }
        this.conns.set(c.peer, c);
        c.send({ t: 'welcome', id: c.peer } satisfies ToClient);
      } else if (m.t === 'in') {
        this.onInput(c.peer, { x: +m.x || 0, y: +m.y || 0, dash: +m.dash || 0, atk: +(m.atk ?? 0) || 0 });
      } else if (m.t === 'build') {
        this.onBuild(c.peer, String(m.k));
      } else if (m.t === 'pick') {
        this.onPick(c.peer, String(m.w));
      }
    });
    const leave = () => { if (this.conns.delete(c.peer)) this.onLeave(c.peer); };
    c.on('close', leave);
    c.on('error', leave);
  }

  broadcast(m: ToClient) {
    for (const c of this.conns.values()) if (c.open) c.send(m);
  }

  close() { this.slotPeer?.destroy(); this.peer?.destroy(); }
}

export class ClientNet {
  peer!: Peer;
  conn!: DataConnection;
  id = '';
  onMessage: (m: ToClient) => void = () => {};
  onClose: () => void = () => {};

  /** `target` is the host's slot peer id from the Wi-Fi list. */
  join(target: string, info: Omit<PlayerInfo, 'id'>): Promise<string> {
    return new Promise((resolve, reject) => {
      const peer = new Peer({ debug: 0 });
      let done = false;
      const fail = (why: string) => { if (!done) { done = true; peer.destroy(); reject(why); } };
      const timer = setTimeout(() => fail('timeout'), 15000);
      peer.on('error', (e) => fail((e as { type?: string }).type ?? 'unknown'));
      peer.on('open', () => {
        this.peer = peer;
        const conn = peer.connect(target, { reliable: true, serialization: 'json' });
        this.conn = conn;
        conn.on('open', () => conn.send({ t: 'hello', info, v: __APP_VERSION__ } satisfies ToHost));
        conn.on('data', (raw) => {
          const m = raw as ToClient;
          if (m.t === 'welcome' && !done) { done = true; clearTimeout(timer); this.id = m.id; resolve(m.id); }
          else if (m.t === 'full') fail('full');
          else if (m.t === 'version') fail('version:' + String(m.v).slice(0, 12));
          this.onMessage(m);
        });
        conn.on('close', () => { if (done) this.onClose(); else fail('closed'); });
      });
    });
  }

  send(m: ToHost) { if (this.conn?.open) this.conn.send(m); }
  close() { this.peer?.destroy(); }
}
