// E2E milestone 50: goo waves steal from carriers, shields protect, a dash splats them. 3 players.
// Usage: npm run build && npx vite preview --port 4173 &  node e2e/goo.cjs [baseUrl] [shotDir]
const { LANDSCAPE, ok, startGame, sim, place, view } = require('./helpers.cjs');
const base = process.argv[2] || 'http://localhost:4173/';
const shots = process.argv[3] || '';

/** Spawn a goo in the host sim. */
const spawn = (host, kind, x, y, loot = []) => sim(host, (s, a) => {
  s.goos.push({ id: s.nextId++, kind: a.kind, x: a.x, y: a.y, vx: 0, vy: 0, hp: [1, 2, 5][a.kind], loot: a.loot, stun: 0, cd: {} });
}, { kind, x, y, loot });
const tap = async (page) => { await page.locator('#dash').dispatchEvent('pointerdown'); await page.locator('#dash').dispatchEvent('pointerup'); };
/** A clear spot (no node within 120 px) away from the base. */
const clearSpot = (host) => sim(host, (s) => {
  for (let y = 280; y < 700; y += 20) for (let x = 260; x < 1020; x += 20) {
    if (Math.hypot(x - 640, y - 480) < 260) continue;
    if (s.trees.every((t) => Math.hypot(t.x - x, t.y - y) > 100) && s.layout.every((l) => x < l.zone.x0 - 60 || x > l.zone.x1 + 60 || y < l.zone.y0 - 60 || y > l.zone.y1 + 60)) return { x, y };
  }
});

(async () => {
  const { browser, pages } = await startGame(base, ['Stefan', 'Ada', 'Bo'], [undefined, undefined, LANDSCAPE]);
  const [host, ada, bo] = pages;
  try {
    // the first wave on the daylight clock: banner on every phone, goo from the edge
    await sim(host, (s) => { s.time = 150.2; });
    await ada.waitForSelector('#wave-banner:not(.hidden)', { timeout: 5000 });
    await bo.waitForSelector('#wave-banner:not(.hidden)', { timeout: 5000 });
    const n = (await view(ada)).goos.length;
    ok(n === 4, `wave 1 for 3 players: banner "Goo-våg!" and ${n} goo on every phone`);
    await sim(host, (s) => { s.goos = []; });

    // Ada carries wood; a goo robs her
    const c = await clearSpot(host);
    await place(host, 0, c.x - 300, c.y); await place(host, 2, c.x + 300, c.y);
    await sim(host, (s, c) => { const p = s.players[1]; Object.assign(p, { x: c.x, y: c.y, vx: 0, vy: 0, carry: ['wood', 'stone'] }); }, c);
    await spawn(host, 0, c.x + 60, c.y);
    await ada.waitForFunction(() => window.__blobzView.goos[0]?.loot.length === 1, null, { timeout: 5000 });
    ok((await view(ada)).players[1].carry.length === 1, 'goo touches Ada: steals 1 of her 2 items');

    // goo right above Ada: the button is a dash, one tap splats the small goo and the loot drops
    await sim(host, (s, c) => { const g = s.goos[0]; Object.assign(g, { x: c.x, y: c.y - 46, vx: 0, vy: 0, stun: 5 }); const p = s.players[1]; Object.assign(p, { x: c.x, y: c.y, vx: 0, vy: 0, dashCd: 0 }); }, c);
    await ada.waitForFunction(() => !document.querySelector('#dash').classList.contains('tool'), null, { timeout: 3000 });
    await tap(ada);
    await ada.waitForFunction(() => window.__blobzView.goos.length === 0, null, { timeout: 4000 });
    ok(true, 'Ada taps dash: the small goo splats');
    await ada.waitForFunction(() => window.__blobzView.items.length > 0 || window.__blobzView.players[1].carry.length === 2, null, { timeout: 3000 });
    ok(true, 'the stolen item drops back (or is picked straight up)');

    // Bo has a shield charge: the goo bounces off, nothing stolen
    await sim(host, (s, c) => { const p = s.players[2]; Object.assign(p, { x: c.x + 200, y: c.y, vx: 0, vy: 0, carry: ['berry'], shield: 1 }); }, c);
    await spawn(host, 1, c.x + 250, c.y);
    await bo.waitForFunction(() => window.__blobzView.players[2].shield === 0, null, { timeout: 5000 });
    const v = await view(bo);
    ok(v.players[2].carry.length === 1 && v.goos[0].loot.length === 0, 'shield charge pops: Bo keeps his berries');
    await bo.waitForTimeout(300);
    if (shots) await bo.screenshot({ path: `${shots}/m50-shield-landscape.png` });

    // the boss wave in the last minute
    await sim(host, (s) => { s.goos = []; s.wave = 2; s.time = 58.2; });
    await ada.waitForFunction(() => window.__blobzView.goos.some((g) => g.kind === 2), null, { timeout: 5000 });
    ok((await ada.textContent('#wave-banner')) === 'Jätte-goo!', 'boss wave in the last minute: "Jätte-goo!" banner + boss goo');
    // park the boss next to Ada so the screenshot shows it with its 5 hp pips
    await sim(host, (s, c) => { const b = s.goos.find((g) => g.kind === 2); Object.assign(b, { x: c.x + 90, y: c.y - 10, stun: 30 }); s.goos = [b]; const p = s.players[1]; Object.assign(p, { x: c.x, y: c.y, vx: 0, vy: 0 }); }, c);
    await ada.waitForTimeout(2600); // camera catches up, banner fades
    const vb = await view(ada);
    console.log('  boss at', vb.goos.map((g) => [g.kind, Math.round(g.x), Math.round(g.y)]), 'Ada at', Math.round(vb.players[1].x), Math.round(vb.players[1].y));
    if (shots) await ada.screenshot({ path: `${shots}/m50-boss-portrait.png` });
    console.log('ALL PASSED');
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
