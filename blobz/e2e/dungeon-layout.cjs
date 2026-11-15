// E2E (Code 2): cards never cover a control. Portrait (390x844) and landscape (844x390): the loot card, the level-up
// cards, the KO banner and the boss strip must not intersect the round buttons (#attack, #dash).
// Usage: npm run build && npx vite preview --port 4173 &  node e2e/dungeon-layout.cjs [baseUrl] [shotDir]
const { chromium } = require('playwright');
const { ok, sim } = require('./helpers.cjs');
const base = process.argv[2] || 'http://localhost:4173/';
const shots = process.argv[3] || '';

const rect = (p, sel) => p.evaluate((s) => { const e = document.querySelector(s); if (!e || e.offsetParent === null) return null; const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, r: r.right, b: r.bottom }; }, sel);
const hit = (a, b) => !!a && !!b && a.x < b.r && b.x < a.r && a.y < b.b && b.y < a.b;

(async () => {
  const browser = await chromium.launch();
  try {
    for (const [name, vp] of [['portrait', { width: 390, height: 844 }], ['landscape', { width: 844, height: 390 }]]) {
      const ctx = await browser.newContext({ locale: 'sv-SE', viewport: vp, hasTouch: true, isMobile: true });
      await ctx.addInitScript(() => localStorage.setItem('blobz.name', 'Stefan'));
      const p = await ctx.newPage();
      p.on('pageerror', (e) => console.log('pageerror', e.message));
      await p.goto(`${base}?lan=e2e-layout-${Math.random().toString(36).slice(2)}&debug`);
      await p.click('#btn-host'); await p.waitForSelector('#lobby:not(.hidden)', { timeout: 20000 });
      await p.click('#btn-start'); await p.waitForSelector('#hud:not(.hidden)', { timeout: 15000 });
      await p.waitForFunction(() => !!window.__blobz?.state);
      await sim(p, (s) => { const e = s.entrance; s.players[0].x = e.x; s.players[0].y = e.y; });
      await p.waitForSelector('#weapon-pick:not(.hidden) .wcard', { timeout: 8000 });
      await p.click('.wcard[data-w="rogue"]');
      await p.waitForFunction(() => window.__blobzView.mode === 'dungeon', null, { timeout: 8000 });
      await p.waitForSelector('#attack:not(.hidden)', { timeout: 8000 });
      await p.waitForSelector('#dg-loading', { state: 'hidden', timeout: 8000 }); // the dusk cave entry screen is gone
      // everything at once: level-up cards, a loot card, the boss strip (a boss on the floor)
      await sim(p, (s) => {
        const q = s.players[0], h = s.dg.heroes[q.id]; h.inv = 999; s.dg.enemies = [];
        h.offer = ['rogue-rage', 'rogue-power', 'rogue-lifesteal'];
        s.dg.lootQ.push('helm');
        s.dg.enemies.push({ id: s.dg.nextId++, kind: 2, x: q.x + 600, y: q.y + 600, vx: 0, vy: 0, hp: 200, mx: 200, awake: false, stun: 999, slamT: 99, slam: null, cd: 99 });
      });
      await p.waitForSelector('#dg-cards:not(.hidden)', { timeout: 15000 });
      await p.waitForSelector('#dg-loot:not(.hidden)', { timeout: 15000 });
      await p.waitForTimeout(500); // pop-in animations done
      const btns = { attack: await rect(p, '#attack'), dash: await rect(p, '#dash') };
      ok(btns.attack && btns.dash, `${name}: both round buttons are on screen`);
      ok(await rect(p, '#dg-boss') === null, `${name}: the boss strip steps aside while I pick a level-up card`);
      for (const card of ['#dg-cards', '#dg-loot']) {
        const r = await rect(p, card);
        ok(r && !hit(r, btns.attack) && !hit(r, btns.dash), `${name}: ${card} does not cover the round buttons (${JSON.stringify(r && { x: Math.round(r.x), y: Math.round(r.y), r: Math.round(r.r), b: Math.round(r.b) })})`);
      }
      ok(!hit(await rect(p, '#dg-cards'), await rect(p, '#dg-loot')), `${name}: the level-up cards and the loot card do not overlap each other`);
      if (shots) await p.screenshot({ path: `${shots}/dg-layout-${name}.png` });
      // after the pick: the boss strip is back and clear of the buttons too
      await sim(p, (s) => { s.dg.heroes[s.players[0].id].offer = []; });
      await p.waitForSelector('#dg-boss:not(.hidden)', { timeout: 8000 });
      const bs = await rect(p, '#dg-boss');
      ok(!hit(bs, btns.attack) && !hit(bs, btns.dash) && !hit(bs, await rect(p, '#dg-loot')), `${name}: the boss strip covers no button and not the loot card`);
      // the KO banner too
      await sim(p, (s) => { const q = s.players[0], h = s.dg.heroes[q.id]; h.ko = 4; h.kx = q.x; h.ky = q.y; });
      await p.waitForSelector('#dg-ko:not(.hidden)', { timeout: 8000 });
      const ko = await rect(p, '#dg-ko');
      ok(!hit(ko, btns.attack) && !hit(ko, btns.dash), `${name}: the KO banner does not cover the round buttons`);
      await ctx.close();
    }
    console.log('\ndungeon layout e2e passed');
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
