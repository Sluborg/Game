// E2E (Stefan 2026-11-16, live bug): a joiner whose WebRTC link can never open (other network / mobile CGNAT, no
// TURN) used to see "Hittade ett spel, ansluter..." for ever. Simulated by a joiner that may only use relay
// candidates and has no relay server, so ICE always fails. Within ~12 s it must say "Kunde inte koppla upp..." and
// offer "Leta igen"; a normal joiner on the same host still gets in.
// Usage: npm run build && npx vite preview --port 4173 &  node e2e/join-fail.cjs [baseUrl]
const { chromium } = require('playwright');
const { ok } = require('./helpers.cjs');
const base = process.argv[2] || 'http://localhost:4173/';
const lan = 'e2e-jf-' + Math.random().toString(36).slice(2);

(async () => {
  const browser = await chromium.launch();
  try {
    const mk = async (name, noLink) => {
      const ctx = await browser.newContext({ locale: 'sv-SE', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
      await ctx.addInitScript(([n, block]) => {
        localStorage.setItem('blobz.name', n);
        if (block) { // relay-only with no relay server: no ICE candidate ever, the link never opens
          const Real = window.RTCPeerConnection;
          window.RTCPeerConnection = function (cfg) { return new Real({ ...(cfg || {}), iceServers: [], iceTransportPolicy: 'relay' }); };
          window.RTCPeerConnection.prototype = Real.prototype;
        }
      }, [name, noLink]);
      const p = await ctx.newPage();
      p.on('pageerror', (e) => console.log(`[${name}] pageerror`, e.message));
      await p.goto(`${base}?lan=${lan}&debug`);
      return p;
    };
    const host = await mk('Stefan', false);
    await host.click('#btn-host'); await host.waitForSelector('#lobby:not(.hidden)', { timeout: 20000 });
    await host.waitForFunction(() => document.querySelector('#lobby-lan').textContent === '', null, { timeout: 20000 });

    const bad = await mk('Ada', true);
    await bad.click('#btn-show-join');
    await bad.waitForFunction(() => /ansluter/.test(document.querySelector('#lan-status').textContent), null, { timeout: 20000 });
    ok(true, 'blocked joiner: the broker finds the host ("Hittade ett spel, ansluter...")');
    const t0 = Date.now();
    await bad.waitForFunction(() => /Kunde inte koppla upp/.test(document.querySelector('#lan-status').textContent), null, { timeout: 25000 });
    ok(await bad.isVisible('#btn-rescan'), `after ${Math.round((Date.now() - t0) / 1000) + 1.5} s: "Kunde inte koppla upp. Prova samma wifi eller byt värd." + "Leta igen" (not stuck)`);
    const line = await bad.textContent('#lan-status');
    ok(/\[ICE: \w+\]/.test(line), `debug line shows the ICE state (${line.match(/\[ICE: \w+\]/)?.[0]})`);

    const good = await mk('Bo', false);
    await good.click('#btn-show-join');
    await good.locator('.lanrow', { hasText: 'Joina Stefan' }).click({ timeout: 25000 });
    await good.waitForSelector('#lobby:not(.hidden)', { timeout: 20000 });
    ok(true, 'a joiner with a working link still gets into the lobby');
    console.log('ALL PASSED');
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
