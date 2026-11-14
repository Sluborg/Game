// E2E milestone 40: team bank + base totems (stand on a pad to buy), synced to every phone.
// Usage: npm run build && npx vite preview --port 4173 &  node e2e/totems.cjs [baseUrl] [shotDir]
const { LANDSCAPE, ok, startGame, sim, place, view } = require('./helpers.cjs');
const base = process.argv[2] || 'http://localhost:4173/';
const shots = process.argv[3] || '';

(async () => {
  const { browser, pages } = await startGame(base, ['Stefan', 'Ada', 'Bo'], [undefined, undefined, LANDSCAPE]);
  const [host, ada, bo] = pages;
  try {
    const pads = await host.evaluate(() => {
      const s = window.__blobz.state; // pads are fixed around the base: read from where blobz can stand
      return s.totems.map((_, i) => [[-1, -1], [1, -1], [-1, 1], [1, 1]][i]).map(([dx, dy]) => ({ x: 640 + dx * 88, y: 480 + dy * 88 }));
    });
    // deliver a full load at the base: bank and quest both go up
    await sim(host, (s) => { const p = s.players[1]; p.x = 640; p.y = 480; p.vx = 0; p.vy = 0; p.carry = ['wood', 'wood', 'stone']; });
    await ada.waitForFunction(() => window.__blobzView.bank.wood === 2 && window.__blobzView.delivered.stone === 1, null, { timeout: 5000 });
    ok((await ada.textContent('#bank-wood')) === '2', 'delivery fills the team bank; HUD shows 2 wood on a joiner');

    await sim(host, (s) => { s.bank = { wood: 20, stone: 4, berry: 4 }; });
    await place(host, 0, pads[0].x - 70, pads[0].y + 60);
    await place(host, 2, pads[1].x + 50, pads[1].y + 70);
    await place(host, 1, pads[0].x, pads[0].y); // Ada on the speed pad
    await ada.waitForFunction(() => window.__blobzView.totems[0].buy > 0.3, null, { timeout: 5000 });
    if (shots) await ada.screenshot({ path: `${shots}/m40-buying-portrait.png` });
    await ada.waitForFunction(() => window.__blobzView.totems[0].level === 1, null, { timeout: 5000 });
    await bo.waitForFunction(() => window.__blobzView.totems[0].level === 1, null, { timeout: 5000 });
    const v = await view(bo);
    ok(v.totems[0].level === 1 && v.bank.wood === 16, `speed totem level 1 costs 4 wood on every phone (20 -> ${v.bank.wood})`);
    await ada.waitForTimeout(1500);
    ok((await view(ada)).totems[0].level === 1, 'standing on longer does not buy level 2 by itself');
    await place(host, 1, pads[0].x + 60, pads[0].y + 60);
    await ada.waitForTimeout(300);
    await place(host, 1, pads[0].x, pads[0].y);
    await ada.waitForFunction(() => window.__blobzView.totems[0].level === 2, null, { timeout: 5000 });
    ok(true, 'step off and back on: level 2');
    await place(host, 1, pads[0].x + 40, pads[0].y + 70);
    await ada.waitForTimeout(800);
    if (shots) await ada.screenshot({ path: `${shots}/m40-totems-portrait.png` });

    // too poor: the timer never fills
    await sim(host, (s) => { s.bank.stone = 3; });
    await place(host, 2, pads[1].x, pads[1].y);
    await bo.waitForTimeout(1600);
    ok((await view(bo)).totems[1].level === 0, 'not enough stone: magnet totem not bought');

    // double: 2x badge on every phone
    await sim(host, (s) => { s.bank = { wood: 20, stone: 20, berry: 20 }; });
    await place(host, 2, pads[3].x, pads[3].y);
    await bo.waitForSelector('#hud-double:not(.hidden)', { timeout: 5000 });
    await ada.waitForSelector('#hud-double:not(.hidden)', { timeout: 5000 });
    ok(true, 'double totem: 2x badge with countdown on every phone');
    await place(host, 2, pads[3].x - 20, pads[3].y + 70);
    await place(host, 0, pads[2].x, pads[2].y); // shield
    await bo.waitForFunction(() => window.__blobzView.players.every((p) => p.shield > 0), null, { timeout: 5000 });
    ok(true, 'shield totem gives every blob a shield charge');
    await place(host, 0, pads[2].x - 50, pads[2].y + 70);
    await bo.waitForTimeout(700);
    if (shots) await bo.screenshot({ path: `${shots}/m40-totems-landscape.png` });
    console.log('ALL PASSED');
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
