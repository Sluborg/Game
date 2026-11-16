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
export interface RoomInfo { name: string; look: BlobLook; players: number; max: number; started: boolean; v: string }

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

/** IPv6 addresses are unique per phone; phones on one Wi-Fi share the /64 prefix. IPv4 is shared as is. */
export function networkKey(addr: string): string {
  if (!addr.includes(':')) return addr;
  const [head, tail = ''] = addr.toLowerCase().split('::');
  const h = head ? head.split(':') : [];
  const t = tail ? tail.split(':') : [];
  const full = [...h, ...Array(Math.max(0, 8 - h.length - t.length)).fill('0'), ...t];
  return full.slice(0, 4).map((x) => x.replace(/^0+(?=.)/, '')).join(':') + '::/64';
}

/** Pick the namespace seed from all srflx addresses: any IPv4 wins, else the IPv6 /64 prefix. */
export function pickSeed(addrs: string[]): string | null {
  const v4 = addrs.filter((a) => !a.includes(':')).sort();
  if (v4.length) return v4[0];
  const v6 = addrs.filter((a) => a.includes(':')).map(networkKey).sort();
  return v6[0] ?? null;
}

/** Public network via STUN, or null after `ms` (strict NAT, UDP blocked). Collects every srflx
 *  candidate for a short while (phones often report IPv6 first) before choosing. Never sent anywhere. */
export function publicIp(ms = 4000): Promise<string | null> {
  return new Promise((resolve) => {
    let pc: RTCPeerConnection | null = null;
    const found: string[] = [];
    let settle = 0;
    const done = () => {
      clearTimeout(timer); clearTimeout(settle);
      try { pc?.close(); } catch { /* closed */ }
      pc = null; resolve(pickSeed(found));
    };
    const timer = window.setTimeout(done, ms);
    try {
      pc = new RTCPeerConnection({ iceServers: [{ urls: [STUN, 'stun:stun1.l.google.com:19302'] }] });
      pc.createDataChannel('ns');
      pc.onicecandidate = (e) => {
        if (!e.candidate) { if (found.length) done(); return; } // gathering finished
        const ip = srflxAddress(e.candidate.candidate);
        if (!ip || found.includes(ip)) return;
        found.push(ip);
        if (!ip.includes(':')) { done(); return; } // IPv4 is the best key, stop now
        clearTimeout(settle); settle = window.setTimeout(done, 1500); // give IPv4 a moment to show up
      };
      pc.createOffer().then((o) => pc?.setLocalDescription(o)).catch(() => done());
    } catch { done(); }
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
    v: String(r.v ?? '').slice(0, 12), // '' = a host from before version checks
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
  /** Slots whose host the broker knows but whose WebRTC link is still connecting (phones can take 3-6 s). */
  pending = new Set<number>();
  /** When each pending slot first went pending (ms): a host the broker knows but no WebRTC link ever opens to
   *  (different networks / mobile CGNAT: ICE fails) would otherwise show "ansluter..." for ever (Stefan 2026-11-16). */
  pendingSince = new Map<number, number>();
  /** Last ICE state seen on a probe (debug line: new / checking / connected / failed). */
  ice = '';
  private unavailable = new Set<string>();
  onUpdate: (rooms: FoundRoom[]) => void = () => {};

  constructor(private ns: string, private clamp: (l: Partial<BlobLook>) => BlobLook, private every = 3000) {}

  start() {
    const peer = new Peer({ debug: 0 });
    this.peer = peer;
    peer.on('open', () => void this.round());
    // peer-unavailable = an empty slot (the message names the id): end that probe right away.
    // A lost broker connection is retried by the next round.
    peer.on('error', (e) => {
      const err = e as { type?: string; message?: string };
      if (err.type !== 'peer-unavailable') return;
      const m = /blobz-v2-[0-9a-f]{10}-[1-8]/.exec(err.message ?? '');
      if (m) this.unavailable.add(m[0]);
    });
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
      // real phones need several seconds for ICE (mDNS / TURN); empty slots are cut short below
      const t = setTimeout(() => end(null), 9000);
      this.unavailable.delete(peerId);
      const poll = setInterval(() => {
        if (settled) { clearInterval(poll); return; }
        if (this.unavailable.has(peerId)) { clearInterval(poll); this.pendingSince.delete(slot); end(null); return; }
        const st = (conn as DataConnection & { peerConnection?: RTCPeerConnection })?.peerConnection?.iceConnectionState;
        if (st && st !== this.ice) { this.ice = st; this.onUpdate([...this.rooms.values()]); }
      }, 150);
      // no "unavailable" after 1.5 s: the broker knows this host, show "ansluter..." meanwhile
      setTimeout(() => { if (!settled && !this.unavailable.has(peerId)) { this.pending.add(slot); if (!this.pendingSince.has(slot)) this.pendingSince.set(slot, Date.now()); this.onUpdate([...this.rooms.values()]); } }, 1500);
      try { conn = peer.connect(peerId, { reliable: true, serialization: 'json' }); } catch { end(null); return; }
      conn.on('open', () => conn.send({ t: 'info?' }));
      conn.on('data', (raw) => {
        const m = raw as { t?: string; info?: unknown };
        if (m?.t !== 'info') return;
        const info = cleanInfo(m.info, this.clamp);
        this.pending.delete(slot); this.pendingSince.delete(slot);
        end(info ? { ...info, slot, peerId } : null);
      });
      conn.on('close', () => { this.pending.delete(slot); end(null); });
      conn.on('error', () => { this.pending.delete(slot); end(null); });
    });
  }

  private async round() {
    if (this.stopped) return;
    if (this.peer?.disconnected && !this.peer.destroyed) this.peer.reconnect();
    const found = await Promise.all(Array.from({ length: SLOTS }, (_, i) => this.probe(i + 1)));
    found.forEach((r, i) => { if (!r) this.pending.delete(i + 1); });
    this.onUpdate([...this.rooms.values()]); // re-check the stuck timer even when nothing changed
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
