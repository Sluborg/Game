// E2E (Code 2): nameplates survive worst-case names: 5 players all named "WWWWWWWWWW" (10 chars) side by side in a
// 360 px wide room. Every plate ([class icon] name) is at most 76 px wide (13 px text, else 12 px, else "…"), plates
// never overlap each other, and each stays below its own blob.
// Usage: npm run build && npx vite preview --port 4173 &  node e2e/dungeon-plates.cjs [baseUrl] [shotDir]
const { chromium } = require('playwright');
const { ok, sim } = require('./helpers.cjs');
const base = process.argv[2] || 'http://localhost:4173/';
const shots = process.argv[3] || '';
const NAME = 'WWWWWWWWWW';

(async () => {
  const browser = await chromium.launch();
  try {
    const lan = 'e2e-pl-' + Math.random().toString(36).slice(2);
    const mk = async (dsf) => {
      const ctx = await browser.newContext({ locale: 'sv-SE', viewport: { width: 360, height: 780 }, deviceScaleFactor: dsf, hasTouch: true, isMobile: true });
      await ctx.addInitScript((n) => localStorage.setItem('blobz.name', n), NAME);
      return ctx.newPage();
    };
    const host = await mk(shots ? 2 : 1);
    await host.goto(`${base}?lan=${lan}&debug`);
    await host.click('#btn-host');
    await host.waitForSelector('#lobby:not(.hidden)', { timeout: 20000 });
    const pages = [host];
    for (let i = 0; i < 4; i++) {
      const p = await mk(1);
      await p.goto(`${base}?lan=${lan}&debug`);
      await p.click('#btn-show-join');
      await p.locator('.lanrow').first().click({ timeout: 25000 });
      await p.waitForSelector('#lobby:not(.hidden)', { timeout: 20000 });
      pages.push(p);
    }
    await host.waitForFunction(() => document.querySelectorAll('#lobby-list li').length === 5, null, { timeout: 15000 });
    await host.click('#btn-start');
    for (const p of pages) await p.waitForSelector('#hud:not(.hidden)', { timeout: 15000 });
    await sim(host, (s) => { const e = s.entrance; s.players.forEach((q, i) => { q.x = e.x + i * 6; q.y = e.y; }); });
    for (const p of pages) await p.waitForSelector('#weapon-pick:not(.hidden) .wcard', { timeout: 8000 });
    for (const [i, p] of pages.entries()) await p.click(`.wcard[data-w="${['marksman', 'healer', 'tank', 'rogue', 'marksman'][i]}"]`);
    await host.waitForFunction(() => window.__blobzView.mode === 'dungeon');
    await host.waitForSelector('#dg-loading', { state: 'hidden', timeout: 8000 });
    // five blobz shoulder to shoulder across the room, no monsters
    await sim(host, (s) => {
      const m = s.dg.map, T = m.dt; s.dg.enemies = []; s.dg.pending = []; s.dg.wave = m.waves.length;
      s.players.forEach((q, i) => { q.x = (1.5 + i * ((m.gw - 3) / 4)) * T; q.y = (m.gh - 5) * T; q.vx = 0; q.vy = 0; }); // the bottom rows never have columns
    });
    await host.waitForTimeout(900);
    const r = await host.evaluate(() => {
      const sc = window.__dgScene;
      return [...sc.heroes.values()].map((b) => {
        const l = b.label.getBounds(), ic = b.icon.getBounds(), body = b.body.getBounds();
        return { text: b.label.text, size: b.label.style.fontSize, x0: Math.min(l.x, ic.x), x1: Math.max(l.right, ic.right), y0: Math.min(l.y, ic.y), y1: Math.max(l.bottom, ic.bottom), bodyBottom: body.bottom, bx: b.x };
      });
    });
    ok(r.length === 5, '5 nameplates');
    for (const q of r) ok(q.x1 - q.x0 <= 76.5, `plate "${q.text}" (${q.size}) is ${(q.x1 - q.x0).toFixed(0)} px wide (<= 76)`);
    const hit = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
    const pairs = r.flatMap((a, i) => r.slice(i + 1).filter((b) => hit(a, b)).map((b) => `${a.bx.toFixed(0)}/${b.bx.toFixed(0)}`));
    ok(pairs.length === 0, `no two plates overlap (${pairs.join(', ') || 'none'})`);
    ok(r.every((q) => q.y0 >= q.bodyBottom - 6), 'every plate sits below its own blob');
    if (shots) await host.screenshot({ path: `${shots}/plates-worst-case.png` });
    console.log('\nall dungeon-plates checks passed');
  } catch (e) {
    console.error(e.message || e);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
