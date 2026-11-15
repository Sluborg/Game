// E2E "Bärregn" mini game between rounds: 3 phones. Sunset -> everyone in the field, berries land on blobz
// (shared basket), a bomb stuns, goal stars, berries into the bank, end screen; the host can skip.
// Usage: npm run build && npx vite preview --port 4173 &  node e2e/mini.cjs [baseUrl] [shotDir]
const { LANDSCAPE, ok, startGame, sim, view } = require('./helpers.cjs');
const base = process.argv[2] || 'http://localhost:4173/';
const shots = process.argv[3] || '';

(async () => {
  const { browser, pages } = await startGame(base, ['Stefan', 'Ada', 'Bo'], [undefined, undefined, LANDSCAPE]);
  const [host, ada, bo] = pages;
  try {
    await sim(host, (s) => { s.delivered = { ...s.quest }; });
    for (const p of pages) await p.waitForSelector('#mini-hud:not(.hidden)', { timeout: 6000 });
    ok(true, 'sunset: Bärregn starts on all three phones');
    ok(await host.isVisible('#btn-skip-mini') && !(await ada.isVisible('#btn-skip-mini')), 'only the host has "Hoppa över"');
    const goal = (await view(ada)).mini.goal;
    ok(goal[0] < goal[1] && goal[1] < goal[2], `goal bar for 3 players: ${goal.join(' / ')} berries for 1 / 2 / 3 stars`);

    // stop the random rain, then drop berries right on Ada and Stefan: the shared basket counts both
    await sim(host, (s) => { s.mini.berryT = 99; s.mini.bombT = 99; s.mini.drops = []; });
    const at = await sim(host, (s) => s.players.map((p) => ({ x: p.x, y: p.y })));
    await sim(host, (s, at) => {
      s.mini.drops.push({ id: 900, kind: 'berry', x: at[1].x, y: at[1].y, z: 40 }, { id: 901, kind: 'berry', x: at[0].x, y: at[0].y, z: 60 });
      s.players.forEach((p) => { p.vx = 0; p.vy = 0; });
    }, at);
    await bo.waitForFunction(() => window.__blobzView.mini.caught === 2, null, { timeout: 4000 });
    await ada.waitForFunction(() => document.getElementById('mini-caught').textContent === '2', null, { timeout: 4000 });
    ok(true, 'two berries landed on blobz: the shared basket shows 2 on a joiner');

    // a bomb lands next to Bo: stunned, and a berry on him is lost
    await sim(host, (s) => { const b = s.players[2]; s.mini.drops.push({ id: 902, kind: 'bomb', x: b.x + 20, y: b.y, z: 20 }); });
    await bo.waitForFunction(() => window.__blobzView.mini.stunned.length > 0, null, { timeout: 4000 });
    const stunnedId = (await view(bo)).mini.stunned[0];
    ok(stunnedId === (await view(bo)).players[2].id, 'the bomb stuns Bo (stars over his head)');
    if (shots) { await bo.waitForTimeout(200); await bo.screenshot({ path: `${shots}/mini-bomb-landscape.png` }); }

    // a busy moment for the portrait screenshot: a few berries + a bomb in the air
    await sim(host, (s) => { const c = { x: 640, y: 490 }; [[-120, -40, 150], [60, 40, 90], [180, -60, 200], [-40, 80, 120]].forEach(([dx, dy, z], i) => s.mini.drops.push({ id: 910 + i, kind: i === 3 ? 'bomb' : 'berry', x: c.x + dx, y: c.y + dy, z })); });
    await ada.waitForTimeout(250);
    if (shots) await ada.screenshot({ path: `${shots}/mini-rain-portrait.png` });

    // reach one star, let the time run out: end screen with the Bärregn line, berries into the bank
    const bank0 = (await view(ada)).bank.berry;
    await sim(host, (s) => { s.mini.caught = s.mini.goal[0]; s.mini.t = 0.3; });
    await ada.waitForSelector('#end:not(.hidden)', { timeout: 6000 });
    const v = await view(ada);
    ok(v.miniResult.stars === 1 && v.bank.berry === bank0 + v.miniResult.caught, `end: ${v.miniResult.caught} berries, 1 star, bank ${bank0} -> ${v.bank.berry}`);
    await ada.waitForFunction((n) => document.getElementById('end-mini-n').textContent === String(n), v.miniResult.caught, { timeout: 4000 });
    ok(await ada.isVisible('#end-mini'), 'end screen shows "Bärregn: N bär" with stars');
    if (shots) { await ada.waitForTimeout(700); await ada.screenshot({ path: `${shots}/mini-end-portrait.png` }); }

    // next round, sunset again: the host skips
    await host.click('#btn-again');
    await ada.waitForFunction(() => window.__blobzView.phase === 'play' && window.__blobzView.time > 170, null, { timeout: 8000 });
    await sim(host, (s) => { s.delivered = { ...s.quest }; });
    await host.waitForSelector('#btn-skip-mini:not(.hidden)', { timeout: 5000 });
    await host.click('#btn-skip-mini');
    await bo.waitForSelector('#end:not(.hidden)', { timeout: 5000 });
    ok(true, '"Hoppa över": straight to the end screen on every phone');
    console.log('ALL PASSED');
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
