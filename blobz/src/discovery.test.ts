import { describe, expect, it } from 'vitest';
import { cleanInfo, hashNs, slotId, slotIds, slotOf, srflxAddress, SLOTS } from './discovery';

const clamp = (l: Partial<{ color: number }>) => ({ color: l.color ?? 1, shape: 0, eyes: 0, mouth: 0, hat: 0 });

describe('discovery helpers', () => {
  it('builds and parses slot ids 1..8', () => {
    expect(slotId('0123456789', 3)).toBe('blobz-v2-0123456789-3');
    const ids = slotIds('abcdef0123');
    expect(ids).toHaveLength(SLOTS);
    expect(ids.map(slotOf)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(slotOf('blobz-v1-ABCD')).toBe(0);
    expect(slotOf('blobz-v2-abcdef0123-9')).toBe(0);
    expect(slotOf('blobz-v2-short-1')).toBe(0);
  });

  it('reads the public address only from srflx candidates', () => {
    expect(srflxAddress('candidate:1 1 udp 1677729535 81.2.3.4 50123 typ srflx raddr 192.168.1.5 rport 50123 generation 0')).toBe('81.2.3.4');
    expect(srflxAddress('a=candidate:1 1 udp 1677729535 2a00::1 50123 typ srflx raddr :: rport 0')).toBe('2a00::1');
    expect(srflxAddress('candidate:2 1 udp 2113937151 abc.local 39872 typ host generation 0')).toBeNull();
    expect(srflxAddress('candidate:3 1 udp 33562623 1.2.3.4 3478 typ relay')).toBeNull();
    expect(srflxAddress('garbage')).toBeNull();
  });

  it('hashes to 10 hex chars, stable, never containing the ip', async () => {
    const a = await hashNs('81.2.3.4');
    expect(a).toMatch(/^[0-9a-f]{10}$/);
    expect(await hashNs('81.2.3.4')).toBe(a);
    expect(await hashNs('81.2.3.5')).not.toBe(a);
    expect(slotOf(slotId(a, 8))).toBe(8);
  });

  it('cleans untrusted info cards', () => {
    expect(cleanInfo(null, clamp)).toBeNull();
    const i = cleanInfo({ name: 'Stefan the great', look: { color: 7 }, players: 99, max: 5, started: 1 }, clamp)!;
    expect(i).toMatchObject({ name: 'Stefan the', players: 5, max: 5, started: true });
    expect(i.look.color).toBe(7);
    expect(cleanInfo({}, clamp)).toMatchObject({ name: 'Blob', players: 0, max: 5, started: false });
  });
});

import { networkKey, pickSeed } from './discovery';
describe('network key', () => {
  it('IPv6 phones on one Wi-Fi share the /64 prefix', () => {
    expect(networkKey('2001:db8:aa:bb:1111:2222:3333:4444')).toBe(networkKey('2001:db8:aa:bb:9:8:7:6'));
    expect(networkKey('2001:db8::1')).toBe('2001:db8:0:0::/64');
  });
  it('IPv4 wins over IPv6', () => {
    expect(pickSeed(['2001:db8:aa:bb::5', '203.0.113.7'])).toBe('203.0.113.7');
    expect(pickSeed(['2001:db8:aa:bb::5'])).toBe('2001:db8:aa:bb::/64');
    expect(pickSeed([])).toBeNull();
  });
});
