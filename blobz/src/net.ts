// LAN multiplayer over WebRTC (PeerJS). One phone hosts the authoritative sim;
// joiners send inputs and render the host's snapshots. The public PeerJS broker
// is only used to pair phones; game traffic flows peer-to-peer on the Wi-Fi.
import Peer, { DataConnection } from 'peerjs';
import type { Input, PlayerInfo, Snapshot } from './sim';

const PREFIX = 'blobz-v1-';
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

export type ToHost =
  | { t: 'hello'; info: Omit<PlayerInfo, 'id'> }
  | { t: 'in'; x: number; y: number; dash: number };
export type ToClient =
  | { t: 'welcome'; id: string }
  | { t: 'full' }
  | { t: 'lobby'; players: PlayerInfo[] }
  | { t: 'start'; seed: number }
  | { t: 's'; s: Snapshot };

export function randomCode() {
  return Array.from({ length: 4 }, () => LETTERS[Math.floor(Math.random() * LETTERS.length)]).join('');
}

export function friendlyError(type: string): string {
  switch (type) {
    case 'peer-unavailable': return 'Hittar inget rum med den koden.';
    case 'network':
    case 'server-error':
    case 'socket-error':
    case 'socket-closed': return 'Ingen kontakt med servern. Kolla internet.';
    case 'browser-incompatible': return 'Webbläsaren stöds inte.';
    default: return 'Något gick fel (' + type + ').';
  }
}

export class HostNet {
  peer!: Peer;
  code = '';
  conns = new Map<string, DataConnection>();
  onHello: (id: string, info: Omit<PlayerInfo, 'id'>) => boolean = () => true;
  onInput: (id: string, inp: Input) => void = () => {};
  onLeave: (id: string) => void = () => {};

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
      if (m.t === 'hello') {
        if (!this.onHello(c.peer, m.info)) { c.send({ t: 'full' } satisfies ToClient); setTimeout(() => c.close(), 300); return; }
        this.conns.set(c.peer, c);
        c.send({ t: 'welcome', id: c.peer } satisfies ToClient);
      } else if (m.t === 'in') {
        this.onInput(c.peer, { x: +m.x || 0, y: +m.y || 0, dash: +m.dash || 0 });
      }
    });
    const leave = () => { if (this.conns.delete(c.peer)) this.onLeave(c.peer); };
    c.on('close', leave);
    c.on('error', leave);
  }

  broadcast(m: ToClient) {
    for (const c of this.conns.values()) if (c.open) c.send(m);
  }

  close() { this.peer?.destroy(); }
}

export class ClientNet {
  peer!: Peer;
  conn!: DataConnection;
  id = '';
  onMessage: (m: ToClient) => void = () => {};
  onClose: () => void = () => {};

  join(code: string, info: Omit<PlayerInfo, 'id'>): Promise<string> {
    return new Promise((resolve, reject) => {
      const peer = new Peer({ debug: 0 });
      let done = false;
      const fail = (why: string) => { if (!done) { done = true; peer.destroy(); reject(why); } };
      const timer = setTimeout(() => fail('timeout'), 15000);
      peer.on('error', (e) => fail((e as { type?: string }).type ?? 'unknown'));
      peer.on('open', () => {
        this.peer = peer;
        const conn = peer.connect(PREFIX + code.toUpperCase().trim(), { reliable: true, serialization: 'json' });
        this.conn = conn;
        conn.on('open', () => conn.send({ t: 'hello', info } satisfies ToHost));
        conn.on('data', (raw) => {
          const m = raw as ToClient;
          if (m.t === 'welcome' && !done) { done = true; clearTimeout(timer); this.id = m.id; resolve(m.id); }
          else if (m.t === 'full') fail('full');
          this.onMessage(m);
        });
        conn.on('close', () => { if (done) this.onClose(); else fail('closed'); });
      });
    });
  }

  send(m: ToHost) { if (this.conn?.open) this.conn.send(m); }
  close() { this.peer?.destroy(); }
}
