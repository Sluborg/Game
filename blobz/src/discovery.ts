// Code-free joining on the same Wi-Fi ("Joina Stefan").
// Browsers cannot do LAN discovery and the public PeerJS broker has listing disabled, so phones
// behind the same router meet in a namespace derived from their shared public IP:
//   1. learn the public IP locally from a STUN server-reflexive (srflx) ICE candidate,
//   2. hash it (SHA-256, first 10 hex chars) so the raw IP never leaves the device,
//   3. hosts register PeerJS id `blobz-v2-<hash>-<slot>` for the first free slot 1..8,
//   4. joiners probe those 8 ids and ask each host for an `info` card.
import Peer, { DataConnection } from 'peerjs';
import type { BlobLook } from './blob';

export const SLOT_PREFIX = 'blobz-v2-';
export const SLOTS = 8;
export const STUN = 'stun:stun.l.google.com:19302';

/** What a host tells a probing phone (`info?` -> `info`). */
export interface RoomInfo { name: string; look: BlobLook; players: number; max: number; started: boolean }

export function slotId(ns: string, slot: number) { return `${SLOT_PREFIX}${ns}-${slot}`; }
export function slotIds(ns: string) { return Array.from({ length: SLOTS }, (_, i) => slotId(ns, i + 1)); }
/** Slot number from a slot peer id, or 0 when it is not one. */
export function slotOf(id: string): number {
  const m = /^blobz-v2-[0-9a-f]{10}-([1-8])$/.exec(id);
  return m ? Number(m[1]) : 0;
}

/** Public address from an ICE candidate line, only for server-reflexive candidates. */
export function srflxAddress(candidate: string): string | null {
  // "candidate:<foundation> <component> <proto> <prio> <address> <port> typ <type> ..."
  const f = candidate.replace(/^a=/, '').trim().split(/\s+/);
  const typ = f.indexOf('typ');
  if (typ < 0 || f[typ + 1] !== 'srflx') return null;
  const addr = f[4];
  return addr && !addr.endsWith('.local') ? addr : null;
}

/** SHA-256 of the namespace seed, first 10 hex chars. */
export async function hashNs(seed: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('blobz:' + seed));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 10);
}

/** Public IP via STUN, or null after `ms` (strict NAT, IPv6-only, UDP blocked). Never sent anywhere. */
export function publicIp(ms = 4000): Promise<string | null> {
  return new Promise((resolve) => {
    let pc: RTCPeerConnection | null = null;
    const done = (ip: string | null) => { clearTimeout(timer); try { pc?.close(); } catch { /* closed */ } pc = null; resolve(ip); };
    const timer = setTimeout(() => done(null), ms);
    try {
      pc = new RTCPeerConnection({ iceServers: [{ urls: STUN }] });
      pc.createDataChannel('ns');
      pc.onicecandidate = (e) => {
        if (!e.candidate) return; // gathering finished without srflx: wait for the timer
        const ip = srflxAddress(e.candidate.candidate);
        if (ip) done(ip);
      };
      pc.createOffer().then((o) => pc?.setLocalDescription(o)).catch(() => done(null));
    } catch { done(null); }
  });
}

let nsPromise: Promise<string | null> | null = null;
/** Namespace hash for this Wi-Fi. A found hash is cached; a miss is retried on the next call.
 *  `?lan=x` overrides the IP (tests, networks without UDP). */
export function lanNamespace(): Promise<string | null> {
  if (!nsPromise) {
    const override = new URLSearchParams(location.search).get('lan');
    const p = (override ? Promise.resolve(override) : publicIp()).then((seed) => (seed ? hashNs(seed) : null));
    nsPromise = p;
    void p.then((ns) => { if (!ns && nsPromise === p) nsPromise = null; });
  }
  return nsPromise;
}

/** Validate an untrusted info card from the network. */
export function cleanInfo(raw: unknown, clampLook: (l: Partial<BlobLook>) => BlobLook): RoomInfo | null {
  const r = raw as Partial<RoomInfo> | null;
  if (!r || typeof r !== 'object') return null;
  const max = Math.max(1, Math.min(8, Math.floor(Number(r.max)) || 5));
  return {
    name: String(r.name ?? 'Blob').slice(0, 10) || 'Blob',
    look: clampLook(r.look ?? {}),
    players: Math.max(0, Math.min(max, Math.floor(Number(r.players)) || 0)),
    max,
    started: !!r.started,
  };
}

export interface FoundRoom extends RoomInfo { slot: number; peerId: string }

/** Polls the 8 slots of a namespace and reports the rooms that answer. */
export class Scanner {
  private peer: Peer | null = null;
  private timer = 0;
  private stopped = false;
  private misses = new Map<number, number>();
  private rooms = new Map<number, FoundRoom>();
  onUpdate: (rooms: FoundRoom[]) => void = () => {};

  constructor(private ns: string, private clamp: (l: Partial<BlobLook>) => BlobLook, private every = 3000) {}

  start() {
    const peer = new Peer({ debug: 0 });
    this.peer = peer;
    peer.on('open', () => void this.round());
    // peer-unavailable just means an empty slot; a lost broker connection is retried by the next round
    peer.on('error', () => {});
  }

  stop() {
    this.stopped = true;
    clearTimeout(this.timer);
    this.peer?.destroy();
    this.peer = null;
  }

  private probe(slot: number): Promise<FoundRoom | null> {
    return new Promise((resolve) => {
      const peer = this.peer;
      if (!peer || peer.destroyed || peer.disconnected) { resolve(null); return; }
      const peerId = slotId(this.ns, slot);
      let conn: DataConnection;
      let settled = false;
      const end = (r: FoundRoom | null) => {
        if (settled) return;
        settled = true; clearTimeout(t);
        try { conn?.close(); } catch { /* gone */ }
        resolve(r);
      };
      const t = setTimeout(() => end(null), 2500);
      try { conn = peer.connect(peerId, { reliable: true, serialization: 'json' }); } catch { end(null); return; }
      conn.on('open', () => conn.send({ t: 'info?' }));
      conn.on('data', (raw) => {
        const m = raw as { t?: string; info?: unknown };
        if (m?.t !== 'info') return;
        const info = cleanInfo(m.info, this.clamp);
        end(info ? { ...info, slot, peerId } : null);
      });
      conn.on('close', () => end(null));
      conn.on('error', () => end(null));
    });
  }

  private async round() {
    if (this.stopped) return;
    if (this.peer?.disconnected && !this.peer.destroyed) this.peer.reconnect();
    const found = await Promise.all(Array.from({ length: SLOTS }, (_, i) => this.probe(i + 1)));
    if (this.stopped) return;
    found.forEach((r, i) => {
      const slot = i + 1;
      if (r) { this.rooms.set(slot, r); this.misses.set(slot, 0); }
      else {
        // one missed probe can be a slow handshake: drop the row after two in a row
        const n = (this.misses.get(slot) ?? 0) + 1;
        this.misses.set(slot, n);
        if (n >= 2) this.rooms.delete(slot);
      }
    });
    this.onUpdate([...this.rooms.values()].sort((a, b) => a.slot - b.slot));
    this.timer = window.setTimeout(() => void this.round(), this.every);
  }
}
