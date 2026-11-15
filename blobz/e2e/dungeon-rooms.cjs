// E2E (Code 2): the Archero rooms are the default dungeon (?classic = the old one). The host also has ?noweapons (test
// toggle); the joiner opens the plain URL and must follow into the same 0x72 room (432 px wide, wave HUD) with the
// toggle synced, no page errors.
// Usage: npm run build && npx vite preview --port 4173 &  node e2e/dungeon-rooms.cjs [baseUrl]
const { ok, phone, sim } = require('./helpers.cjs');
const { chromium } = require('playwright');
const base = process.argv[2] || 'http://localhost:4173/';

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  try {
    const lan = 'e2e-rm-' + Math.random().toString(36).slice(2);
    const host = await phone(browser, 'Stefan', { width: 412, height: 915 }); // integer scale: a 412 px and a 360 px phone
    host.on('pageerror', (e) => errors.push('host: ' + e.message));
    await host.goto(`${base}?lan=${lan}&debug`); // rooms by default
    await host.click('#btn-host');
    await host.waitForSelector('#lobby:not(.hidden)', { timeout: 20000 });
    const ada = await phone(browser, 'Ada', { width: 360, height: 780 });
    ada.on('pageerror', (e) => errors.push('ada: ' + e.message));
    await ada.goto(`${base}?lan=${lan}&debug`); // no flags on the joiner (debug only exposes the view)
    await ada.click('#btn-show-join');
    await ada.locator('.lanrow', { hasText: 'Joina Stefan' }).click({ timeout: 25000 });
    await ada.waitForSelector('#lobby:not(.hidden)', { timeout: 20000 });
    await host.waitForFunction(() => document.querySelectorAll('#lobby-list li').length === 2, null, { timeout: 10000 });
    await host.click('#btn-start');
    for (const p of [host, ada]) await p.waitForSelector('#hud:not(.hidden)', { timeout: 15000 });
    await host.waitForFunction(() => !!window.__blobz?.state);
    const ent = await host.evaluate(() => window.__blobz.state.entrance);
    await sim(host, (s, e) => { s.players[0].x = e.x - 14; s.players[0].y = e.y; s.players[1].x = e.x + 14; s.players[1].y = e.y; }, ent);
    for (const p of [host, ada]) await p.waitForSelector('#weapon-pick:not(.hidden) .wcard', { timeout: 8000 });
    await host.click('.wcard[data-w="marksman"]');
    await ada.click('.wcard[data-w="healer"]');
    for (const p of [host, ada]) await p.waitForFunction(() => window.__blobzView.mode === 'dungeon' && !!window.__blobzView.dungeon, null, { timeout: 8000 });
    const m = await host.evaluate(() => { const m = window.__blobz.state.dg.map; return { w: m.gw * m.dt, rooms: window.__blobz.state.dg.rooms }; });
    ok(m.rooms && m.w === 336, `host (no flag) runs the rooms by default, as wide as the narrowest phone (360 px): ${m.w} px = 7 tiles of 48`);
    await ada.waitForSelector('#dg-loading', { state: 'hidden', timeout: 8000 });
    for (const [p, w] of [[host, 412], [ada, 360]]) {
      const c = await p.evaluate(() => { const cam = window.__dgScene.cameras.main; return { zoom: cam.zoom, x: cam.worldView.x, w: cam.worldView.width }; });
      ok(c.zoom === 1 && Math.abs(c.x - (336 - w) / 2) < 1, `${w} px phone: exactly 3x (zoom ${c.zoom}), the room centred (view x ${c.x.toFixed(1)}, margin ${((w - 336) / 2).toFixed(0)} px each side)`);
    }
    const st = await host.evaluate(() => { const s = window.__blobz.state, m = s.dg.map; return { ys: s.players.map((p) => p.y), floor: (m.gh - 2) * m.dt, cols: (m.columns ?? []).length }; });
    ok(st.ys.every((y) => y >= st.floor - 20), `everyone starts in the entrance at the bottom (y ${st.ys.map(Math.round).join(', ')} >= ${st.floor - 20}), not held at the meadow's edge`);
    ok(st.cols >= 2 && st.cols <= 3, `room 1 (arena) has ${st.cols} columns as cover`);
    ok((await ada.evaluate(() => window.__blobzView.dungeon.rooms)) === true, 'joiner follows into the rooms (snapshot)');
    await ada.waitForSelector('#dg-loading', { state: 'hidden', timeout: 8000 });
    await ada.waitForFunction(() => /Rum 1\/10/.test(document.getElementById('dg-floor').textContent), null, { timeout: 8000 });
    ok(true, `joiner HUD reads "${(await ada.textContent('#dg-floor')).trim()}"`);
    // rotate the joiner's phone (and back): canvas, camera and HUD follow the new size, my blob stays on screen
    const fit = (p) => p.evaluate(() => {
      const sc = window.__dgScene, cam = sc.cameras.main, c = document.querySelector('#game canvas');
      const me = window.__blobzView.players.find((q) => q.id === window.__blobzView.myId) ?? window.__blobzView.players[1];
      const sx = (me.x - cam.worldView.x) * cam.zoom, sy = (me.y - cam.worldView.y) * cam.zoom;
      const hud = document.getElementById('hud-dg').getBoundingClientRect();
      return { vw: innerWidth, vh: innerHeight, cw: c.clientWidth, ch: c.clientHeight, camW: cam.width, camH: cam.height, sx, sy, hudW: hud.width };
    });
    for (const [w, h] of [[844, 390], [390, 844]]) {
      await ada.setViewportSize({ width: w, height: h });
      await ada.waitForTimeout(900);
      const r = await fit(ada);
      ok(r.cw === w && r.ch === h && r.camW === w && r.camH === h && r.sx > 0 && r.sx < w && r.sy > 0 && r.sy < h && r.hudW > 0,
        `rotated to ${w}x${h}: canvas ${r.cw}x${r.ch}, camera ${r.camW}x${r.camH}, my blob on screen at ${Math.round(r.sx)},${Math.round(r.sy)}`);
    }
    ok(errors.length === 0, `no page errors (${errors.join(' | ') || 'none'})`);
    console.log('\nall dungeon-rooms checks passed');
  } catch (e) {
    console.error(e.message || e);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
