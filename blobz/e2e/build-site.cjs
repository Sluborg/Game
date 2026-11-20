// E2E (Lead 2026-11-21, N-31): buying a building shows the scaffold on its plot first (the building stays hidden), then
// the scaffold goes and the building drops in. Visual only: the sim has the building at once.
// Usage: npm run build && npx vite preview --port 4173 &  node e2e/build-site.cjs [baseUrl]
const { chromium } = require('playwright');
const { ok, sim } = require('./helpers.cjs');
const base = process.argv[2] || 'http://localhost:4173/';

(async () => {
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ locale: 'sv-SE', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await ctx.addInitScript(() => localStorage.setItem('blobz.name', 'Stefan'));
    const p = await ctx.newPage();
    p.on('pageerror', (e) => console.log('pageerror', e.message));
    await p.goto(`${base}?lan=e2e-site-${Math.random().toString(36).slice(2)}&debug&seed=424242`);
    await p.waitForSelector('#loading.hidden', { state: 'attached', timeout: 15000 });
    await p.click('#btn-host'); await p.waitForSelector('#lobby:not(.hidden)'); await p.click('#btn-start');
    await p.waitForFunction(() => !!window.__blobzScene, null, { timeout: 15000 });
    await sim(p, (s) => { s.bank = { wood: 60, stone: 0, berry: 30 }; Object.assign(s.players[0], { x: 700, y: 420, vx: 0, vy: 0 }); });
    await p.waitForSelector('#btn-build:not(.hidden)', { timeout: 5000 }); await p.click('#btn-build');
    await p.waitForSelector('#build-panel:not(.hidden)');
    const state = () => p.evaluate(() => { const sc = window.__blobzScene; return { site: sc.children.list.filter((o) => o.type === 'Image' && /^site-/.test(o.texture.key) && o.visible).length, built: sc.bgfx.get('storage').img.visible }; });
    await p.click('#build-cards .bcard[data-kind="storage"]');
    await p.waitForFunction(() => window.__blobz.state.builds.find((b) => b.kind === 'storage').state === 2, null, { timeout: 5000 });
    ok(true, 'the sim has the storage at once');
    const mid = await state();
    ok(mid.site === 1 && !mid.built, `while building: the scaffold stands on the plot and the building is hidden (${JSON.stringify(mid)})`);
    await p.waitForFunction(() => { const sc = window.__blobzScene; return sc.bgfx.get('storage').img.visible; }, null, { timeout: 15000 });
    const end = await state();
    ok(end.site === 0 && end.built, `after the build time: scaffold gone, the building stands (${JSON.stringify(end)})`);
    console.log('ALL PASSED');
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
