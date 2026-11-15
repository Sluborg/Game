// E2E (Code 2): the dungeon map has no black holes where you can walk, and the camera follows everywhere.
// For floors 1-5 (the boss floor last) on two phone sizes (390x844, 360x780): stand in every room (middle + its lowest row), check the baked
// map pixel under the blob is floor (not the dark rock), and that the camera keeps the blob centred (also in rooms at
// the map's bottom edge). Usage: npm run build && npx vite preview --port 4173 &  node e2e/dungeon-map.cjs [baseUrl] [shotDir]
const { chromium } = require('playwright');
const { ok, sim } = require('./helpers.cjs');
const base = process.argv[2] || 'http://localhost:4173/';
const shots = process.argv[3] || '';

(async () => {
  const browser = await chromium.launch();
  try {
    const SIZES = [{ width: 390, height: 844 }, { width: 360, height: 780 }];
    for (const vp of SIZES) {
      const ctx = await browser.newContext({ locale: 'sv-SE', viewport: vp, hasTouch: true, isMobile: true });
      await ctx.addInitScript(() => localStorage.setItem('blobz.name', 'Stefan'));
      const p = await ctx.newPage();
      p.on('pageerror', (e) => console.log('pageerror', e.message));
      await p.goto(`${base}?lan=e2e-dgmap-${Math.random().toString(36).slice(2)}&debug`);
      await p.click('#btn-host'); await p.waitForSelector('#lobby:not(.hidden)', { timeout: 20000 });
      await p.click('#btn-start'); await p.waitForSelector('#hud:not(.hidden)', { timeout: 15000 });
      await p.waitForFunction(() => !!window.__blobz?.state);
      await sim(p, (s) => { const e = s.entrance; s.players[0].x = e.x; s.players[0].y = e.y; });
      await p.waitForSelector('#weapon-pick:not(.hidden) .wcard', { timeout: 6000 });
      await p.click('.wcard[data-w="tank"]');
      await p.waitForFunction(() => window.__blobzView.mode === 'dungeon', null, { timeout: 8000 });
      const FLOORS = 5; // one dungeon = 5 floors
      for (let floor = 1; floor <= FLOORS; floor++) {
        if (floor > 1) {
          await sim(p, (s, a) => { s.dg.floor = a.f - 1; }, { f: floor }); // the next enterFloor takes us to `floor`
          await sim(p, (s) => { const q = s.players[0], st = s.dg.map.stairs; s.dg.enemies = []; q.x = st.x; q.y = st.y; q.vx = 0; q.vy = 0; });
          await p.waitForFunction((f) => window.__blobzView.dungeon?.floor === f, floor, { timeout: 10000 });
        }
        await p.waitForTimeout(600);
        const rooms = await p.evaluate(() => window.__blobz.state.dg.map.rooms);
        let holes = 0, offCentre = 0, worst = 0;
        for (const [i, r] of rooms.entries()) {
          for (const spot of [{ x: (r.x + r.w / 2) * 32, y: (r.y + r.h / 2) * 32 }, { x: (r.x + r.w / 2) * 32, y: (r.y + r.h - 0.5) * 32 }]) {
            await sim(p, (s, a) => { const q = s.players[0], h = s.dg.heroes[q.id]; s.dg.enemies = []; h.hp = h.maxHp; q.x = a.x; q.y = a.y; q.vx = 0; q.vy = 0; }, spot);
            await p.waitForTimeout(900); // the camera eases there
            const res = await p.evaluate((a) => {
              const sc = window.__dgScene, cam = sc.cameras.main;
              const key = Object.keys(sc.textures.list).find((k) => k.startsWith('dgmap-') && k.endsWith('-' + window.__blobzView.dungeon.floor) && k.includes('-' + window.__blobzView.dungeon.seed + '-'));
              const img = sc.textures.get(key).getSourceImage();
              const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
              const g = c.getContext('2d'); g.drawImage(img, 0, 0);
              const px = g.getImageData(Math.floor(a.x), Math.floor(a.y), 1, 1).data;
              const rock = px[0] < 30 && px[1] < 35 && px[2] < 35; // the dark void colour
              return { rock, dx: cam.midPoint.x - a.x, dy: cam.midPoint.y - a.y };
            }, spot);
            if (res.rock) holes++;
            const d = Math.hypot(res.dx, res.dy);
            worst = Math.max(worst, d);
            if (d > 40) offCentre++;
          }
          if (shots && floor === 1 && i === rooms.length - 1) await p.screenshot({ path: `${shots}/dg-map-${vp.width}x${vp.height}.png` });
        }
        ok(holes === 0, `${vp.width}x${vp.height} floor ${floor}: every room (${rooms.length}) has floor under the blob (no black holes)`);
        ok(offCentre === 0, `${vp.width}x${vp.height} floor ${floor}: the camera keeps the blob centred in every room, also at the map edge (worst ${worst.toFixed(0)} px off)`);
      }
      if (vp === SIZES[0]) {
        // the boss floor: the boss is gone -> everyone on the exit stairs 1.5 s -> the boss counts as beaten -> back on the
        // meadow with Dungeon 2 unlocked (saved with the village) -> the entrance leads into Dungeon 2
        ok((await p.evaluate(() => window.__blobzView.dungeon.floor)) === FLOORS, `on the boss floor (${FLOORS})`);
        await sim(p, (s) => { const q = s.players[0], st = s.dg.map.stairs; s.dg.enemies = []; q.x = st.x; q.y = st.y; q.vx = 0; q.vy = 0; });
        await p.waitForFunction(() => window.__blobzView.dungeon?.done > 0 && window.__blobzView.dungeon.why === 'boss', null, { timeout: 10000 });
        await p.waitForFunction(() => window.__blobzView.mode === 'meadow', null, { timeout: 15000 });
        ok(await p.evaluate(() => window.__blobz.state.dungeon) === 2, 'beating the boss unlocks Dungeon 2');
        await p.waitForFunction(() => JSON.parse(localStorage.getItem('blobz.village') ?? '{}').dungeon === 2, null, { timeout: 15000 });
        const saved = await p.evaluate(() => JSON.parse(localStorage.getItem('blobz.village') ?? '{}').dungeon);
        ok(saved === 2, 'the unlock is saved with the village on the host (localStorage blobz.village)');
        await sim(p, (s) => { const e = s.entrance; s.players[0].x = e.x; s.players[0].y = e.y; s.players[0].vx = 0; s.players[0].vy = 0; });
        await p.waitForSelector('#weapon-pick:not(.hidden) .wcard', { timeout: 10000 });
        await p.click('.wcard[data-w="tank"]');
        await p.waitForFunction(() => window.__blobzView.mode === 'dungeon', null, { timeout: 8000 });
        await p.waitForFunction(() => /Grotta 2 · Våning 1\/5/.test(document.getElementById('dg-floor')?.textContent ?? ''), null, { timeout: 10000 });
        ok(true, `re-entry: the HUD shows "Grotta 2 · Våning 1/5" (village saved with dungeon ${saved})`);
      }
      await ctx.close();
    }
    console.log('ALL PASSED');
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e.message); process.exit(1); });
