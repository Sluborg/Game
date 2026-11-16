// E2E: the canvas renders at device resolution with whole device px per art px (pixelScale.ts). A Pixel-like phone
// (412 px wide, ratio 2.625) gets a 1082 px canvas; ?dpr=2 (phone testing, Lead 2026-11-15) renders it at 2x instead;
// either way one art px is a whole number of device px.
// Usage: npm run build && npx vite preview --port 4173 &  node e2e/dpr.cjs [baseUrl]
const { chromium } = require('playwright');
const { ok } = require('./helpers.cjs');
const base = process.argv[2] || 'http://localhost:4173/';

(async () => {
  const browser = await chromium.launch();
  try {
    for (const [q, want] of [['', 2.625], ['&dpr=2', 2], ['&dpr=9', 3]]) {
      const ctx = await browser.newContext({ locale: 'sv-SE', viewport: { width: 412, height: 892 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2.625 });
      await ctx.addInitScript(() => localStorage.setItem('blobz.name', 'Stefan'));
      const p = await ctx.newPage();
      await p.goto(`${base}?lan=e2e-dpr-${Math.random().toString(36).slice(2)}&debug${q}`);
      await p.waitForSelector('#loading.hidden', { state: 'attached', timeout: 15000 });
      await p.click('#btn-host'); await p.waitForSelector('#lobby:not(.hidden)'); await p.click('#btn-start');
      await p.waitForFunction(() => !!window.__blobzScene && !!window.__blobzView, null, { timeout: 15000 });
      await p.waitForTimeout(800);
      const m = await p.evaluate(() => { const sc = window.__blobzScene, c = sc.game.canvas; return { w: c.width, css: Math.round(c.getBoundingClientRect().width), art: sc.cameras.main.zoom * 3 }; });
      ok(m.w === Math.round(412 * want) && m.css === 412, `${q || 'no ?dpr'}: canvas ${m.w} px for 412 css px (ratio ${want})`);
      ok(Math.abs(m.art - Math.round(m.art)) < 1e-6, `${q || 'no ?dpr'}: one art px = ${m.art} whole device px`);
      await ctx.close();
    }
    console.log('ALL PASSED');
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
