// E2E snow map: the host picks "Snö" in the lobby, joiners see it, everyone plays on snow: frozen ponds
// are slippery, the gather loop works. Usage: npm run build && npx vite preview --port 4173 &  node e2e/snow.cjs [baseUrl] [shotDir]
const { chromium } = require('playwright');
const { LANDSCAPE, PORTRAIT, ok, sim, view } = require('./helpers.cjs');
const base = process.argv[2] || 'http://localhost:4173/';
const shots = process.argv[3] || '';

(async () => {
  const browser = await chromium.launch();
  try {
    const lan = 'e2e-snow-' + Math.random().toString(36).slice(2);
    const url = `${base}?lan=${lan}&debug`;
    const pages = [];
    for (const [i, name] of ['Stefan', 'Ada', 'Bo'].entries()) {
      const ctx = await browser.newContext({ viewport: i === 2 ? LANDSCAPE : PORTRAIT, isMobile: true, hasTouch: true });
      await ctx.addInitScript((n) => { localStorage.setItem('blobz.name', n); localStorage.removeItem('blobz.map'); }, name);
      const p = await ctx.newPage();
      p.on('pageerror', (e) => console.log(`[${name}] pageerror`, e.message));
      await p.goto(url);
      if (i === 0) {
        await p.click('#btn-host');
        await p.waitForSelector('#lobby:not(.hidden)');
        ok(await p.isVisible('#map-pick') && (await p.getAttribute('.mapcard[data-map="meadow"]', 'class')).includes('on'), 'host lobby: map cards Äng / Snö, Äng chosen by default');
        await p.click('.mapcard[data-map="snow"]');
      } else {
        await p.click('#btn-show-join');
        await p.locator('.lanrow', { hasText: 'Joina Stefan' }).click({ timeout: 30000 });
        await p.waitForSelector('#lobby:not(.hidden)');
      }
      pages.push(p);
    }
    const [host, ada, bo] = pages;
    await ada.waitForSelector('.mapcard[data-map="snow"].on', { timeout: 5000 });
    ok(await ada.locator('.mapcard[data-map="snow"]').isDisabled(), 'joiner sees "Snö" chosen and cannot change it');
    if (shots) await ada.screenshot({ path: `${shots}/snow-lobby-portrait.png` });
    await host.waitForFunction(() => document.querySelectorAll('#lobby-list li').length === 3);
    await host.click('#btn-start');
    for (const p of pages) await p.waitForFunction(() => window.__blobzBiome === 'snow' && !!window.__blobzView, null, { timeout: 15000 });
    ok(true, 'the round starts on the snow map on all three phones');
    ok(await host.evaluate(() => window.__blobz.state.biome === 'snow' && window.__blobz.state.ice.length === 3), 'host sim: biome snow with 3 frozen ponds');

    // slippery: measure how fast a blob's speed decays (k in v = v0 * e^-kt), timed inside the page so a
    // slow frame or a busy machine cannot skew it (the old distance-after-500ms check flaked 1 in 5)
    const decay = (onIce) => host.evaluate(async (onIce) => {
      const s = window.__blobz.state;
      const pond = s.ice[0];
      const clear = (x, y) => s.trees.every((t) => Math.hypot(t.x - x, t.y - y) > 110) && !s.ice.some((i) => Math.hypot(i.x - x, i.y - y) < 160);
      let spot = { x: pond.x - 40, y: pond.y };
      if (!onIce) for (let y = 120; y < 840 && spot.y === pond.y; y += 20) for (let x = 120; x < 1160; x += 20) if (clear(x, y) && clear(x + 80, y)) { spot = { x, y }; break; }
      const p = s.players[1];
      Object.assign(p, spot, { vx: 120, vy: 0 });
      const t0 = performance.now();
      await new Promise((r) => setTimeout(r, 300));
      const t = (performance.now() - t0) / 1000;
      return -Math.log(Math.max(1, Math.hypot(p.vx, p.vy)) / 120) / t;
    }, onIce);
    const kIce = await decay(true), kSnow = await decay(false);
    ok(kIce < 1.2 && kSnow > 1.6, `frozen pond is slippery: speed decays at ${kIce.toFixed(2)}/s on ice vs ${kSnow.toFixed(2)}/s on snow`);

    // gather loop works on snow: chop a snowy tree with the real button, deliver
    const tree = await sim(host, (s) => s.trees.findIndex((t, j) => t.kind < 3 && s.trees.every((o, k) => k === j || Math.hypot(o.x - t.x, o.y - t.y) > 110)));
    const beside = () => sim(host, (s, n) => { const t = s.trees[n]; Object.assign(s.players[1], { x: t.x + 37, y: t.y, vx: 0, vy: 0 }); }, tree);
    await beside();
    await ada.waitForFunction(() => document.querySelector('#dash img').src.includes('btn-axe'), null, { timeout: 5000 });
    for (let h = 0; h < 3; h++) { await ada.locator('#dash').dispatchEvent('pointerdown'); await ada.locator('#dash').dispatchEvent('pointerup'); await ada.waitForTimeout(380); await beside(); }
    await ada.waitForFunction(() => window.__blobzView.players[1].carry.includes('wood'), null, { timeout: 5000 });
    await sim(host, (s) => Object.assign(s.players[1], { x: 640, y: 480, vx: 0, vy: 0 }));
    await bo.waitForFunction(() => window.__blobzView.delivered.wood >= 1, null, { timeout: 5000 });
    ok(true, 'snowy tree chopped (axe, 3 hits) and the wood delivered on the snow map');

    // screenshots: Ada next to a frozen pond, Bo in landscape near the base
    await sim(host, (s) => { const pond = [...s.ice].sort((a, b) => Math.hypot(a.x - 640, a.y - 480) - Math.hypot(b.x - 640, b.y - 480))[0]; Object.assign(s.players[1], { x: pond.x - 30, y: pond.y + 60, vx: 0, vy: 0 }); Object.assign(s.players[2], { x: 620, y: 600, vx: 0, vy: 0 }); Object.assign(s.players[0], { x: 680, y: 600, vx: 0, vy: 0 }); });
    await ada.waitForTimeout(2500);
    if (shots) { await ada.screenshot({ path: `${shots}/snow-pond-portrait.png` }); await bo.screenshot({ path: `${shots}/snow-base-landscape.png` }); }
    console.log('ALL PASSED');
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
