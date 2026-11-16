// E2E (Code 2): playing the dungeon alone. Health is a bar with numbers; loot has no dice ("Använd" takes it);
// level-up cards and the loot card show each effect as a number.
// Usage: npm run build && npx vite preview --port 4173 &  node e2e/dungeon-solo.cjs [baseUrl] [shotDir]
const { ok, startGame, sim } = require('./helpers.cjs');
const base = process.argv[2] || 'http://localhost:4173/';
const shots = process.argv[3] || '';

(async () => {
  const { browser, pages } = await startGame(base, ['Stefan']);
  const [p] = pages;
  try {
    await sim(p, (s) => { const e = s.entrance; s.players[0].x = e.x; s.players[0].y = e.y; });
    await p.waitForSelector('#weapon-pick:not(.hidden) .wcard', { timeout: 6000 });
    await p.click('.wcard[data-w="marksman"]');
    await p.waitForSelector('#hud-dg:not(.hidden)', { timeout: 8000 });
    await p.waitForFunction(() => /80\/80/.test(document.querySelector('#dg-hearts .hpnum')?.textContent ?? ''), null, { timeout: 4000 });
    ok(await p.isVisible('#dg-hearts .hpbar'), 'health is a bar with numbers (80/80 for Skytt)');
    await sim(p, (s) => { s.dg.enemies = []; s.dg.heroes[s.players[0].id].hp = 20; });
    await p.waitForFunction(() => document.querySelector('#dg-hearts .hpbar i')?.classList.contains('low'), null, { timeout: 4000 });
    ok(/20\/80/.test(await p.textContent('#dg-hearts')), 'bar drops with damage and turns red when low (20/80)');
    // loot alone: one button "Använd", no dice
    await sim(p, (s) => { s.dg.lootQ.push('helm'); });
    await p.waitForSelector('#dg-loot:not(.hidden) #dg-roll', { timeout: 6000 });
    ok((await p.textContent('#dg-roll')).trim() === 'Använd', 'alone: the loot button says "Använd"');
    ok((await p.textContent('#dg-loot')).includes('+30 hälsa'), 'the item card shows its effect (+30 hälsa)');
    if (shots) await p.screenshot({ path: `${shots}/dg-solo-loot-portrait.png` });
    await p.click('#dg-roll');
    await p.waitForFunction(() => { const v = window.__blobzView.dungeon; return Object.values(v.heroes)[0].items.includes('helm'); }, null, { timeout: 4000 });
    await p.waitForFunction(() => /\/110/.test(document.querySelector('#dg-hearts .hpnum')?.textContent ?? ''), null, { timeout: 4000 });
    ok(true, 'taken at once; max health 80 -> 110');
    // level-up cards: numbers on every card
    await sim(p, (s) => { s.dg.lootQ = []; s.dg.loot = null; s.dg.lootLast = null; s.dg.xp = 4; const q = s.players[0]; s.dg.enemies.push({ id: s.dg.nextId++, kind: 0, x: q.x + 60, y: q.y, vx: 0, vy: 0, hp: 1, mx: 20, awake: true, stun: 9, slamT: 99, slam: null }); });
    // rooms: the cards wait for a clear room (Stefan 2026-11-15)
    await p.waitForFunction(() => window.__blobz.state.dg.level > 1, null, { timeout: 6000 });
    const early = await p.evaluate(() => { const d = window.__blobz.state.dg; return { open: !!document.querySelector('#dg-cards:not(.hidden)'), busy: d.enemies.length > 0 || (d.pending?.length ?? 0) > 0 || d.wave < d.map.waves.length }; });
    ok(!early.busy || !early.open, `level-up mid-room: the cards wait (${early.busy ? 'room busy, no cards' : 'room already clear'})`);
    // the pulsing level-up button in the HUD shows the count; tapping it opens the cards mid-room
    await p.waitForSelector('#dg-lvlup:not(.hidden)', { timeout: 6000 });
    ok(Number(await p.textContent('#dg-lvlup b')) >= 1, `HUD level-up button shows ${await p.textContent('#dg-lvlup b')} unspent`);
    await p.click('#dg-lvlup', { force: true }); // it pulses (never 'stable' for Playwright)
    await p.waitForSelector('#dg-cards:not(.hidden) .skcard', { timeout: 6000 });
    const fx = await p.$$eval('#dg-cards .skcard .skfx', (els) => els.map((e) => e.textContent));
    ok(fx.length === 3 && fx.every((t) => /\d/.test(t)), `every skill card shows a number (${fx.join(' | ')})`);
    if (shots) await p.screenshot({ path: `${shots}/dg-solo-skills-portrait.png` });
    console.log('ALL PASSED');
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e.message); process.exit(1); });
