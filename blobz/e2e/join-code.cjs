// E2E (Stefan 2026-11-16, live bug: two phones on one Wi-Fi showed different network codes and never found each
// other). (1) Join by room code works across DIFFERENT network codes (two faked namespaces). (2) The network code is
// not stale: a different public IP gives a new code without a reload (faked STUN answers), the same /64 IPv6 gives
// the same code, and no STUN answer says "Kan inte avgöra nätverk".
// Usage: npm run build && npx vite preview --port 4173 &  node e2e/join-code.cjs [baseUrl]
const { chromium } = require('playwright');
const { ok } = require('./helpers.cjs');
const base = process.argv[2] || 'http://localhost:4173/';
const rnd = () => Math.random().toString(36).slice(2);

(async () => {
  const browser = await chromium.launch();
  try {
    const mk = async (name, q, init) => {
      const ctx = await browser.newContext({ locale: 'sv-SE', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
      await ctx.addInitScript((n) => localStorage.setItem('blobz.name', n), name);
      if (init) await ctx.addInitScript(init);
      const p = await ctx.newPage();
      p.on('pageerror', (e) => console.log(`[${name}] pageerror`, e.message));
      await p.goto(`${base}?${q}&debug`);
      await p.waitForSelector('#loading.hidden', { state: 'attached', timeout: 15000 });
      return p;
    };
    // (1) different networks: the list cannot see the host, the room code can
    const host = await mk('Stefan', `lan=e2e-a-${rnd()}`);
    await host.click('#btn-host'); await host.waitForSelector('#room-code:not(.hidden)', { timeout: 20000 });
    const code = (await host.textContent('#room-code b')).trim();
    ok(/^[A-Z]{4}$/.test(code), `host lobby shows room code ${code} and its network code (${(await host.textContent('#room-code')).replace(/\s+/g, ' ')})`);
    const ada = await mk('Ada', `lan=e2e-b-${rnd()}`);
    await ada.click('#btn-show-join');
    await ada.waitForFunction(() => /Nätverkskod [0-9A-F]{4}/.test(document.querySelector('#net-code').textContent), null, { timeout: 10000 });
    const netA = (await host.textContent('#room-code')).match(/nätverk (\w{4})/)[1], netB = (await ada.textContent('#net-code')).match(/Nätverkskod (\w{4})/)[1];
    ok(netA !== netB, `the two phones have different network codes (${netA} / ${netB}), as on Stefan's phones`);
    await ada.fill('#code-input', code.toLowerCase());
    await ada.click('#btn-code-join');
    await ada.waitForSelector('#lobby:not(.hidden)', { timeout: 20000 });
    await host.waitForFunction(() => document.querySelectorAll('#lobby-list li.seat').length === 2, null, { timeout: 15000 });
    ok(true, `Ada types "${code.toLowerCase()}" -> in the host's lobby (2 players) across network codes`);

    // (2) the network code follows the network without a reload (faked STUN answers)
    const fake = () => {
      window.__ips = ['203.0.113.7'];
      window.RTCPeerConnection = class extends EventTarget { // EventTarget: PeerJS's webrtc-adapter wraps its methods
        createDataChannel() {} close() {}
        createOffer() { return Promise.resolve({ type: 'offer', sdp: '' }); }
        setLocalDescription() {
          setTimeout(() => {
            for (const ip of window.__ips) this.onicecandidate?.({ candidate: { candidate: `candidate:1 1 udp 1 ${ip} 5000 typ srflx raddr 0.0.0.0 rport 0` } });
            if (window.__ips.length) this.onicecandidate?.({ candidate: null });
          }, 30);
          return Promise.resolve();
        }
      };
    };
    const bo = await mk('Bo', 'x=1', fake);
    const codeNow = async () => { await bo.click('#btn-join-back').catch(() => {}); await bo.click('#btn-show-join'); await bo.waitForFunction(() => /\[(stun|none)/.test(document.querySelector('#net-code').textContent), null, { timeout: 12000 }); return bo.textContent('#net-code'); };
    const c1 = await codeNow();
    await bo.evaluate(() => { window.__ips = ['198.51.100.9']; window.dispatchEvent(new Event('online')); });
    const c2 = await codeNow();
    ok(c1 !== c2 && /stun-v4/.test(c2), `new public IP -> new network code without a reload (${c1} -> ${c2})`);
    await bo.evaluate(() => { window.__ips = ['2001:db8:aa:bb::1']; });
    const c3 = await codeNow();
    await bo.evaluate(() => { window.__ips = ['2001:db8:aa:bb:9:8:7:6']; });
    const c4 = await codeNow();
    ok(c3 === c4 && /stun-v6/.test(c3), `IPv6 phones on one /64 share a code (${c3})`);
    await bo.evaluate(() => { window.__ips = []; });
    const c5 = await codeNow();
    ok(/Kan inte avgöra nätverk/.test(c5) && /\[none\]/.test(c5), `no STUN answer -> "${c5}"`);
    console.log('ALL PASSED');
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
