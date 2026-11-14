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
  d.enemies.push({ id: d.nextId++, kind: a.kind, x: p.x + a.dx, y: p.y + a.dy, vx: 0, vy: 0, hp: [20, 50, 300, 30][a.kind], mx: [20, 50, 300, 30][a.kind], awake: true, stun: 0.5, slamT: 99, slam: null });
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
    ok(true, 'everyone on the entrance 1.5 s -> class cards on all 3 phones');
    // Stefan: Krigare -> weapon step -> Svärd; Ada: Präst; Bo: Bågskytt (one weapon each, picked at once)
    await host.click('.wcard[data-w="rogue"]');
    await host.waitForSelector('.wcard[data-w="sword"]', { timeout: 3000 });
    if (shots) { await ada.screenshot({ path: `${shots}/dg-class-portrait.png` }); await host.screenshot({ path: `${shots}/dg-weapon-portrait.png` }); await bo.screenshot({ path: `${shots}/dg-class-landscape.png` }); }
    await host.click('.wcard[data-w="sword"]');
    await ada.click('.wcard[data-w="healer"]');
    await bo.click('.wcard[data-w="marksman"]');
    for (const p of pages) await p.waitForFunction(() => window.__blobzView.mode === 'dungeon' && !!window.__blobzView.dungeon, null, { timeout: 6000 });
    for (const p of pages) await p.waitForSelector('#hud-dg:not(.hidden)', { timeout: 6000 });
    const ids = await host.evaluate(() => window.__blobz.state.players.map((p) => p.id));
    let d = await dg(bo);
    const hs = ids.map((id) => d.heroes[id]);
    ok(d.floor === 1 && hs[0].cls === 'rogue' && hs[0].weapon === 'sword' && hs[1].cls === 'healer' && hs[2].cls === 'marksman',
      'down together: Krigare (svärd) / Präst / Bågskytt on every phone');
    ok(hs[2].maxHp === 80 && hs[0].maxHp === 100, 'health follows the class (Skytt 80, Rogue 100)');
    ok(d.bossMax === 660, `boss health scales with 3 players (${d.bossMax})`);
    ok(await bo.isVisible('#attack') && await host.isVisible('#attack'), 'special button shows underground');

    // quiet floor around the start: remove goo, keep everyone at the start
    // no level-up before the card step below (an open card freezes that blob until it picks)
    await sim(host, (s) => { s.dg.xp = -1000; });
    await sim(host, (s) => { s.dg.enemies = []; s.players.forEach((p, i) => { p.x = s.dg.map.start.x - 40 + i * 40; p.y = s.dg.map.start.y; p.vx = 0; p.vy = 0; }); });
    // auto-attack: a small goo next to Stefan dies without any button
    await gooAt(host, 0, 0, 34, 0);
    await bo.waitForFunction(() => window.__blobzView.dungeon.kills >= 1, null, { timeout: 5000 });
    ok(true, 'auto-attack: the sword kills a small goo with no button pressed');
    await bo.waitForFunction(() => window.__blobzView.dungeon.gold >= 1, null, { timeout: 5000 });
    ok(true, `coins picked up: team gold ${(await dg(bo)).gold}`);
    // ranged: Bo's bow shoots a goo 130 px away
    const k0 = (await dg(bo)).kills;
    // a floor spot 110-170 px from Bo with a clear line (the start room can be small)
    await sim(host, (s) => {
      const p = s.players[2], m = s.dg.map, wall = (x, y) => m.solid[Math.floor(y / 32) * 40 + Math.floor(x / 32)] !== 0;
      for (let r = 170; r >= 110; r -= 20) for (let a = 0; a < 16; a++) {
        const x = p.x + Math.cos(a * Math.PI / 8) * r, y = p.y + Math.sin(a * Math.PI / 8) * r;
        let clear = true;
        for (let i = 1; i <= 20; i++) if (wall(p.x + (x - p.x) * i / 20, p.y + (y - p.y) * i / 20)) clear = false;
        if (!clear || [-16, 16].some((o) => wall(x + o, y) || wall(x, y + o))) continue;
        s.dg.enemies.push({ id: s.dg.nextId++, kind: 0, x, y, vx: 0, vy: 0, hp: 1, mx: 1, awake: true, stun: 9, slamT: 99, slam: null });
        return;
      }
    });
    await bo.waitForFunction((k) => window.__blobzView.dungeon.kills > k, k0, { timeout: 5000 });
    ok(true, 'Bågskytt: auto-arrow kills a goo at range');

    // Präst special heals a hurt friend
    await sim(host, (s) => { const h = s.dg.heroes[s.players[0].id]; h.hp = 30; s.players[0].x = s.players[1].x + 40; s.players[0].y = s.players[1].y; });
    await ada.click('#attack');
    await bo.waitForFunction((id) => window.__blobzView.dungeon.heroes[id].hp > 30, ids[0], { timeout: 4000 });
    ok(true, 'Präst special (Läkljus) heals Stefan on every phone');
    await ada.waitForTimeout(120);
    if (shots) await ada.screenshot({ path: `${shots}/dg-heal-portrait.png` });
    // Bågskytt volley + Krigare spin
    await gooAt(host, 2, 1, 90, 30); await gooAt(host, 2, 1, -90, 40);
    await bo.click('#attack');
    await bo.waitForTimeout(150);
    if (shots) await bo.screenshot({ path: `${shots}/dg-volley-landscape.png` });
    await host.click('#attack');
    await host.click('#dash');
    const sp = await bo.evaluate(() => Object.values(window.__blobzView.dungeon.heroes).map((h) => h.spCd > 0));
    ok(sp.every(Boolean), 'all three class specials on cooldown (spin, heal, volley)');
    await sim(host, (s) => { s.dg.enemies = []; });

    // level-up: 1 of 3 skill cards on every phone, from each one's own class
    await sim(host, (s) => { s.dg.xp = 4; s.dg.level = 1; });
    await gooAt(host, 0, 0, 34, 0);
    for (const p of pages) await p.waitForSelector('#dg-cards:not(.hidden) .skcard', { timeout: 6000 });
    const offers = (await dg(bo)).heroes;
    ok(offers[ids[0]].offer.every((x) => x.startsWith('rogue-')) && offers[ids[1]].offer.every((x) => x.startsWith('healer-')) && offers[ids[2]].offer.every((x) => x.startsWith('marksman-')),
      'level 2: 3 cards per phone from the own class pool');
    if (shots) { await ada.screenshot({ path: `${shots}/dg-skills-portrait.png` }); await bo.screenshot({ path: `${shots}/dg-skills-landscape.png` }); }
    // no timer: after 11 s the cards are still open; the blob stands still and takes no damage
    const before = await host.evaluate(() => { const s = window.__blobz.state, p = s.players[1]; return { x: p.x, y: p.y, h: s.dg.heroes[p.id].hp }; });
    await sim(host, (s) => { const p = s.players[1]; s.dg.enemies.push({ id: s.dg.nextId++, kind: 0, x: p.x + 20, y: p.y, vx: 0, vy: 0, hp: 99, mx: 99, awake: true, stun: 0, slamT: 99, slam: null }); });
    await ada.waitForTimeout(11000);
    const after = await host.evaluate(() => { const s = window.__blobz.state, p = s.players[1]; return { x: p.x, y: p.y, h: s.dg.heroes[p.id].hp, open: s.dg.heroes[p.id].offer.length }; });
    ok(after.open === 3 && Math.hypot(after.x - before.x, after.y - before.y) < 1 && after.h === before.h, 'cards wait with no timer; the picking blob is frozen and safe from goo');
    await sim(host, (s) => { s.dg.enemies = []; });
    for (const p of pages) await p.click('#dg-cards .skcard');
    await bo.waitForFunction((ids) => ids.every((id) => window.__blobzView.dungeon.heroes[id].skills.length === 1), ids, { timeout: 4000 });
    for (const p of pages) await p.waitForSelector('#dg-cards', { state: 'hidden', timeout: 3000 });
    ok(true, 'each phone picked a skill card; cards close');

    // rare loot (boss/chest): roll/pass card on every phone ("Rulla" / "Avstå"), highest roll wears it
    await sim(host, (s) => { s.dg.lootQ.push('ring'); });
    for (const p of pages) await p.waitForSelector('#dg-loot:not(.hidden) #dg-roll', { timeout: 6000 });
    ok((await ada.textContent('#dg-roll')).trim() === 'Rulla' && (await ada.textContent('#dg-pass')).trim() === 'Avstå' && (await ada.textContent('#dg-loot')).includes('+20% skada'), 'loot card: Rulla / Avstå, the item shows its effect (+20% skada)');
    if (shots) { await ada.screenshot({ path: `${shots}/dg-loot-portrait.png` }); await bo.screenshot({ path: `${shots}/dg-loot-landscape.png` }); }
    await host.click('#dg-roll'); await ada.click('#dg-pass'); await bo.click('#dg-pass');
    await bo.waitForFunction((id) => !!window.__blobzView.dungeon.heroes[id].item, ids[0], { timeout: 5000 });
    ok(true, `loot: Stefan rolled, the others passed -> Stefan wears ${(await dg(bo)).heroes[ids[0]].item}`);
    await ada.waitForTimeout(400);
    if (shots) await ada.screenshot({ path: `${shots}/dg-loot-won-portrait.png` });
    await sim(host, (s) => { s.dg.lootQ = []; s.dg.loot = null; }); // a medium goo may have dropped another item
    await ada.waitForSelector('#dg-loot', { state: 'hidden', timeout: 5000 });

    // a mini boss for Bo (bow): telegraphed slam ring shows
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
