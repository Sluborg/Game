// E2E (Code 2): the rooms camera at DPR 1, 2 and 2.625 (DPR canvas): the view never shows a band outside the room,
// and the room change only ever moves the camera UP while anything is visible: the cut to the next room's entrance
// happens under a fully dark wipe.
// Usage: npm run build && npx vite preview --port 4173 &  node e2e/dungeon-camera.cjs [baseUrl]
const { chromium } = require('playwright');
const { ok, sim } = require('./helpers.cjs');
const base = process.argv[2] || 'http://localhost:4173/';

(async () => {
  const browser = await chromium.launch();
  try {
    for (const dpr of [1, 2, 2.625]) {
      const ctx = await browser.newContext({ locale: 'sv-SE', viewport: { width: 390, height: 844 }, deviceScaleFactor: dpr, hasTouch: true, isMobile: true });
      await ctx.addInitScript(() => localStorage.setItem('blobz.name', 'Stefan'));
      const p = await ctx.newPage();
      const errors = []; p.on('pageerror', (e) => errors.push(e.message));
      await p.goto(`${base}?lan=e2e-cam-${Math.random().toString(36).slice(2)}&debug`);
      await p.click('#btn-host'); await p.waitForSelector('#lobby:not(.hidden)', { timeout: 20000 });
      await p.click('#btn-start'); await p.waitForSelector('#hud:not(.hidden)', { timeout: 15000 });
      await p.waitForFunction(() => !!window.__blobz?.state);
      await sim(p, (s) => { const e = s.entrance; s.players[0].x = e.x; s.players[0].y = e.y; });
      await p.waitForSelector('#weapon-pick:not(.hidden) .wcard', { timeout: 8000 });
      await p.click('.wcard[data-w="tank"]');
      await p.waitForFunction(() => window.__blobzView.mode === 'dungeon');
      await p.waitForSelector('#dg-loading', { state: 'hidden', timeout: 8000 });
      await p.waitForTimeout(600);
      const inRoom = () => p.evaluate(() => { const c = window.__dgScene.cameras.main, m = window.__blobz.state.dg.map; return { bottom: c.worldView.bottom, H: m.gh * m.dt, zoom: c.zoom }; });
      let v = await inRoom();
      ok(v.bottom <= v.H + 0.5, `DPR ${dpr} room 1: the view ends inside the room (bottom ${v.bottom.toFixed(0)} <= ${v.H}, zoom ${v.zoom.toFixed(3)})`);
      // clear the room, walk into the door, watch the change frame by frame
      // Lead's case: a loot item taken right before the door (its "won" card is still up when the team walks through)
      await sim(p, (s) => { s.dg.enemies = []; s.dg.pending = []; s.dg.wave = s.dg.map.waves.length; for (const h of Object.values(s.dg.heroes)) { h.pending = 0; h.offer = []; } s.dg.lootQ.push('helm'); });
      await p.waitForSelector('#dg-roll:visible', { timeout: 8000 });
      await p.click('#dg-roll');
      await sim(p, (s) => { const q = s.players[0], m = s.dg.map; q.x = m.stairs.x; q.y = m.stairs.y + 10; });
      const res = await p.evaluate(() => new Promise((done) => {
        const sc = window.__dgScene, c = sc.cameras.main;
        let last = c.midPoint.y, floor = window.__blobzView.dungeon.floor, downVisible = 0, cutWipe = -1, frames = 0, after = 0, below = 0;
        const tick = () => {
          frames++;
          const d = window.__blobzView.dungeon, y = c.midPoint.y, w = window.__dgWipe ?? 0, m = window.__blobz.state.dg.map;
          if (y > last + 0.5 && w < 0.99) downVisible = Math.max(downVisible, y - last);
          if (d.floor !== floor && cutWipe < 0) cutWipe = w;
          if (d.floor !== floor && w < 0.99) below = Math.max(below, c.worldView.bottom - m.gh * m.dt); // never a band below the new room
          if (d.floor !== floor && d.walkIn <= 0 && w <= 0) after++;
          last = y;
          if (after > 150 || frames > 1500) return done({ downVisible, cutWipe, frames, below }); // ~2.5 s after the fade-in too
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }));
      ok(res.cutWipe >= 0.99, `DPR ${dpr}: the cut to room 2 happens under a fully dark wipe (${res.cutWipe.toFixed(2)})`);
      ok(res.downVisible <= 0.5, `DPR ${dpr}: nothing visibly scrolls down during the change or the 2.5 s after it (max ${res.downVisible.toFixed(1)} px)`);
      ok(res.below <= 0.5, `DPR ${dpr}: every visible frame after the cut ends inside room 2 (max ${res.below.toFixed(1)} px below)`);
      v = await inRoom();
      ok(v.bottom <= v.H + 0.5, `DPR ${dpr} room 2: the view ends inside the room (bottom ${v.bottom.toFixed(0)} <= ${v.H})`);
      ok(errors.length === 0, `DPR ${dpr}: no page errors (${errors.join(' | ') || 'none'})`);
      await ctx.close();
    }
    console.log('\nall dungeon-camera checks passed');
  } catch (e) {
    console.error(e.message || e);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
