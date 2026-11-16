// E2E (Lead 2026-11-16, v056b): the build panel's "Spara och gå hem" was cut off at the screen bottom (390x844) and
// hidden below the fold on small phones. At every phone size and pixel ratio it must lie inside the screen and inside
// the panel, be the element actually on top at its centre (not covered), and end the round when tapped.
// Usage: npm run build && npx vite preview --port 4173 &  node e2e/build-panel-fit.cjs [baseUrl]
const { chromium } = require('playwright');
const { ok, sim } = require('./helpers.cjs');
const base = process.argv[2] || 'http://localhost:4173/';

(async () => {
  const browser = await chromium.launch();
  try {
    for (const d of [1, 2, 2.625]) {
      const ctx = await browser.newContext({ locale: 'sv-SE', viewport: { width: 390, height: 844 }, deviceScaleFactor: d, isMobile: true, hasTouch: true });
      await ctx.addInitScript(() => localStorage.setItem('blobz.name', 'Stefan'));
      const p = await ctx.newPage();
      await p.goto(`${base}?lan=e2e-bp-${Math.random().toString(36).slice(2)}&debug`);
      await p.waitForSelector('#loading.hidden', { state: 'attached', timeout: 15000 });
      await p.click('#btn-host'); await p.waitForSelector('#lobby:not(.hidden)'); await p.click('#btn-start');
      await p.waitForFunction(() => !!window.__blobzView, null, { timeout: 15000 });
      await sim(p, (s) => Object.assign(s.players[0], { x: 640, y: 548, vx: 0, vy: 0 }));
      await p.waitForSelector('#btn-build:not(.hidden)', { timeout: 5000 }); await p.click('#btn-build');
      await p.waitForSelector('#build-panel:not(.hidden)');
      for (const [w, h] of [[360, 640], [360, 780], [390, 844], [412, 892], [412, 915], [430, 932]]) {
        await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(400);
        const r = await p.evaluate(() => {
          const b = document.getElementById('btn-gohome').getBoundingClientRect(), pn = document.getElementById('build-panel').getBoundingClientRect();
          const top = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
          const el = document.getElementById('build-panel');
          return { b: [b.top, b.bottom], pn: [pn.top, pn.bottom], vh: innerHeight, onTop: !!top?.closest('#btn-gohome'), sh: el.scrollHeight, ch: el.clientHeight, hint: el.classList.contains('scrolls') && !el.classList.contains('atend') };
        });
        // 390x844 and up fit without scrolling; smaller screens scroll and show the hint (Lead 2026-11-16)
        if (h >= 844) ok(r.sh <= r.ch + 2, `DPR ${d}, ${w}x${h}: the whole panel fits, no scrolling (${r.sh} <= ${r.ch})`);
        else if (r.sh > r.ch + 2) ok(r.hint, `DPR ${d}, ${w}x${h}: scrolls (${r.sh} > ${r.ch}) and shows the scroll hint`);
        ok(r.b[0] >= 0 && r.b[1] <= r.vh && r.b[0] >= r.pn[0] && r.b[1] <= r.pn[1] + 0.5 && r.onTop,
          `DPR ${d}, ${w}x${h}: "Spara och gå hem" fully on screen and in the panel (button ${r.b.map(Math.round).join('-')}, panel ${r.pn.map(Math.round).join('-')}, screen ${r.vh})`);
      }
      if (d === 2.625) { await p.click('#btn-gohome'); await p.waitForSelector('#end:not(.hidden)', { timeout: 5000 }); ok(true, 'tapping it ends the round (end screen)'); }
      await ctx.close();
    }
    console.log('ALL PASSED');
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
