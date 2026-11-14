// E2E test dungeon v1 (Code 2): 3 phones enter together, pick weapons, auto-attack kills goo,
// special attack, gold, stairs down to floor 2, "Dungeon klar!" and back to the meadow.
// Usage: npm run build && npx vite preview --port 4173 &  node e2e/dungeon.cjs [baseUrl] [shotDir]
const { LANDSCAPE, ok, startGame, sim, place, view } = require('./helpers.cjs');
const base = process.argv[2] || 'http://localhost:4173/';
const shots = process.argv[3] || '';

const dg = (page) => page.evaluate(() => window.__blobzView.dungeon);
/** Put a goo right next to player #i (host sim). */
const gooAt = (host, i, kind, dx, dy) => sim(host, (s, a) => {
  const p = s.players[a.i], d = s.dg;
  d.enemies.push({ id: d.nextId++, kind: a.kind, x: p.x + a.dx, y: p.y + a.dy, vx: 0, vy: 0, hp: [1, 3, 15][a.kind], awake: true, stun: 0.5, slamT: 99, slam: null });
}, { i, kind, dx, dy });

(async () => {
  const { browser, pages } = await startGame(base, ['Stefan', 'Ada', 'Bo'], [undefined, undefined, LANDSCAPE]);
  const [host, ada, bo] = pages;
  try {
    const ent = await host.evaluate(() => window.__blobz.state.entrance);
    // two of three on the entrance: bubble shows 2/3, nothing happens
    await place(host, 0, ent.x - 14, ent.y);
    await place(host, 1, ent.x + 14, ent.y);
    await place(host, 2, ent.x + 160, ent.y + 120);
    await ada.waitForTimeout(1800);
    ok((await view(ada)).mode === 'meadow', '2/3 on the entrance: still on the meadow');
    if (shots) await ada.screenshot({ path: `${shots}/dg-entrance-portrait.png` });
    // all three: weapon cards on every phone
    await place(host, 2, ent.x, ent.y + 16);
    for (const p of pages) await p.waitForSelector('#weapon-pick:not(.hidden)', { timeout: 6000 });
    ok(true, 'everyone on the entrance 1.5 s -> weapon cards on all 3 phones');
    await host.click('.wcard[data-w="sword"]');
    await ada.click('.wcard[data-w="hammer"]');
    if (shots) { await ada.waitForTimeout(300); await ada.screenshot({ path: `${shots}/dg-pick-portrait.png` }); await bo.screenshot({ path: `${shots}/dg-pick-landscape.png` }); }
    await bo.click('.wcard[data-w="spear"]');
    for (const p of pages) await p.waitForFunction(() => window.__blobzView.mode === 'dungeon' && !!window.__blobzView.dungeon, null, { timeout: 6000 });
    for (const p of pages) await p.waitForSelector('#hud-dg:not(.hidden)', { timeout: 6000 });
    const ids = await host.evaluate(() => window.__blobz.state.players.map((p) => p.id));
    let d = await dg(bo);
    ok(d.floor === 1 && d.heroes[ids[0]].weapon === 'sword' && d.heroes[ids[1]].weapon === 'hammer' && d.heroes[ids[2]].weapon === 'spear',
      'down together: floor 1, weapons sword / hammer / spear on every phone');
    ok(await bo.isVisible('#attack') && await host.isVisible('#attack'), 'special button shows underground');

    // quiet floor around the start: remove goo, keep everyone at the start
    await sim(host, (s) => { s.dg.enemies = []; s.players.forEach((p, i) => { p.x = s.dg.map.start.x - 40 + i * 40; p.y = s.dg.map.start.y; p.vx = 0; p.vy = 0; }); });
    // auto-attack: a small goo next to Stefan dies without any button
    await gooAt(host, 0, 0, 34, 0);
    await bo.waitForFunction(() => window.__blobzView.dungeon.kills >= 1, null, { timeout: 5000 });
    ok(true, 'auto-attack: the sword kills a small goo with no button pressed');
    await bo.waitForFunction(() => window.__blobzView.dungeon.gold >= 1, null, { timeout: 5000 });
    ok(true, `coins picked up: team gold ${(await dg(bo)).gold}`);

    // special attack: Ada's hammer slam hits medium goo all around
    await sim(host, (s) => { s.dg.heroes[s.players[1].id].atkCd = 99; });
    await gooAt(host, 1, 1, -60, 0);
    await gooAt(host, 1, 1, 0, 64);
    if (shots) { await ada.waitForTimeout(300); await ada.screenshot({ path: `${shots}/dg-fight-portrait.png` }); }
    await ada.click('#attack');
    await ada.waitForFunction((id) => window.__blobzView.dungeon.heroes[id].spCd > 0, ids[1], { timeout: 3000 });
    const after = await host.evaluate(() => ({ hp: window.__blobz.state.dg.enemies.map((e) => e.hp), kills: window.__blobz.state.dg.kills }));
    ok(after.kills === 3 || (after.hp.length === 2 && after.hp.every((h) => h < 3)), `hammer slam hits both goo (kills ${after.kills}); cooldown ring runs`);
    await ada.waitForTimeout(200);
    if (shots) await ada.screenshot({ path: `${shots}/dg-special-portrait.png` });
    await sim(host, (s) => { s.dg.heroes[s.players[1].id].atkCd = 0; });

    // spear charge (Bo) and sword spin (Stefan) + Stefan's sidestep: Art's fx sprites show
    await gooAt(host, 2, 0, 90, 0);
    await bo.click('#attack');
    await bo.waitForTimeout(120);
    if (shots) await bo.screenshot({ path: `${shots}/dg-charge-landscape.png` });
    await host.click('#attack');
    await host.click('#dash');
    await host.waitForTimeout(120);
    if (shots) await host.screenshot({ path: `${shots}/dg-spin-portrait.png` });
    const sp = await bo.evaluate((id) => Object.values(window.__blobzView.dungeon.heroes).map((h) => h.spCd > 0), ids);
    ok(sp.every(Boolean), 'all three specials on cooldown (spin, slam, charge)');

    // a mini boss for Bo (spear): telegraphed slam ring shows
    await gooAt(host, 2, 2, 150, 0);
    await sim(host, (s) => { const e = s.dg.enemies.find((q) => q.kind === 2); e.slamT = 0.1; });
    await bo.waitForFunction(() => window.__blobzView.dungeon.enemies.some((e) => e.slam), null, { timeout: 4000 });
    if (shots) await bo.screenshot({ path: `${shots}/dg-boss-landscape.png` });
    ok(true, 'boss slam is telegraphed on the phones');
    await sim(host, (s) => { s.dg.enemies = []; });

    // stairs: everyone on them -> floor 2
    await sim(host, (s) => { const st = s.dg.map.stairs; s.players.forEach((p, i) => { p.x = st.x - 12 + i * 12; p.y = st.y; p.vx = 0; p.vy = 0; }); });
    for (const p of pages) await p.waitForFunction(() => window.__blobzView.dungeon?.floor === 2, null, { timeout: 6000 });
    ok(true, 'all on the stairs 1.5 s -> floor 2 on every phone');
    await ada.waitForTimeout(2600);
    if (shots) { await ada.screenshot({ path: `${shots}/dg-floor2-portrait.png` }); await bo.screenshot({ path: `${shots}/dg-floor2-landscape.png` }); }

    // run ends (time) -> summary on all phones -> back on the meadow
    await sim(host, (s) => { s.dg.time = 0.05; });
    for (const p of pages) await p.waitForSelector('#dg-end:not(.hidden)', { timeout: 5000 });
    const endGold = await ada.textContent('#dg-end-gold');
    ok(Number(endGold) >= 1, `"Dungeon klar!" on every phone (gold ${endGold}, splatted ${await ada.textContent('#dg-end-kills')})`);
    if (shots) { await ada.screenshot({ path: `${shots}/dg-end-portrait.png` }); await bo.screenshot({ path: `${shots}/dg-end-landscape.png` }); }
    for (const p of pages) await p.waitForFunction(() => window.__blobzView.mode === 'meadow', null, { timeout: 10000 });
    for (const p of pages) await p.waitForSelector('#dg-end', { state: 'hidden', timeout: 3000 });
    ok(!(await ada.isVisible('#attack')) && await ada.isVisible('#hud-quest'), 'back on the meadow: meadow HUD back, special button hidden');
    await ada.waitForTimeout(800);
    if (shots) await ada.screenshot({ path: `${shots}/dg-back-portrait.png` });
    d = await dg(ada);
    ok(d === null, 'dungeon state cleared after the run');
    console.log('\ndungeon e2e passed');
  } catch (e) {
    console.error(e.message);
    if (shots) for (const [i, p] of pages.entries()) await p.screenshot({ path: `${shots}/dg-fail-${i}.png` }).catch(() => {});
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
