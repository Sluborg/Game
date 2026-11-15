// E2E batch A "gathering with tools": 3 players chop, mine and rake with the real action button,
// deliver to the base, the team bank fills and a quest row completes. Synced to every phone.
// Usage: npm run build && npx vite preview --port 4173 &  node e2e/gather.cjs [baseUrl] [shotDir]
const { LANDSCAPE, ok, startGame, sim, place, view } = require('./helpers.cjs');
const base = process.argv[2] || 'http://localhost:4173/';
const shots = process.argv[3] || '';

/** The most isolated node of the given kinds (so the tool is unambiguous; some seeds have no node
 *  with 110 px free around it, so take the best one rather than requiring a fixed gap). */
const pick = (host, kinds) => sim(host, (s, ks) => {
  let best = -1, gap = -1;
  s.trees.forEach((t, j) => {
    if (!ks.includes(t.kind) || t.x < 60 || t.y < 60 || t.x > 1220 || t.y > 900) return;
    const g = Math.min(...s.trees.filter((o, k) => k !== j).map((o) => Math.hypot(o.x - t.x, o.y - t.y)));
    if (g > gap) { gap = g; best = j; }
  });
  return best;
}, kinds);
/** Park player #i just right of node n (keep them there: blobz drift a little after a bump). */
const beside = (host, i, n) => sim(host, (s, a) => {
  const t = s.trees[a.n]; const p = s.players[a.i];
  p.x = t.x + (t.kind === 5 ? 0 : [15, 15, 15, 15, 28][t.kind]) + 22; p.y = t.y; p.vx = 0; p.vy = 0;
}, { i, n });
const carry = async (page, i) => (await view(page)).players[i].carry;
const tap = async (page) => { await page.locator('#dash').dispatchEvent('pointerdown'); await page.locator('#dash').dispatchEvent('pointerup'); };

(async () => {
  const { browser, pages } = await startGame(base, ['Stefan', 'Ada', 'Bo'], [undefined, undefined, LANDSCAPE]);
  const [host, ada, bo] = pages;
  try {
    const v0 = await view(ada);
    ok(v0.items.length === 0, 'no random items on the map');
    const stoneOn = v0.quest.stone > 0; // stone archived (STONE_ENABLED=false): no stone goal, no rocks
    ok(stoneOn ? JSON.stringify(v0.quest) === '{"wood":14,"stone":9,"berry":7}' : JSON.stringify(v0.quest) === '{"wood":14,"stone":0,"berry":7}',
      `quest for 3 players: 14 wood, ${stoneOn ? '9 stone, ' : ''}7 berries`);
    if (!stoneOn) {
      ok(!(await ada.isVisible('#hud-quest .qrow[data-k="stone"]')) && !(await ada.isVisible('#bank-stone')), 'stone archived: no stone row or counter in the HUD');
      ok(!(await sim(host, (s) => s.trees.some((t) => t.kind === 3 || t.kind === 4))), 'stone archived: no rock nodes on the meadow');
    }
    ok(await ada.isHidden('#time') && await ada.isHidden('#hud-day'), 'no countdown text, no day bar (day cycle archived)');

    // the meadow action button (Stefan 2026-11-15): hidden away from resources (no dash on the meadow), shown with the
    // right tool icon next to a node
    const far = await sim(host, (st) => { // an open spot with no node within 120 px
      for (let y = 560; y < 900; y += 20) for (let x = 120; x < 1160; x += 20)
        if (st.trees.every((t) => Math.hypot(t.x - x, t.y - y) > 120)) return { x, y };
      return { x: 640, y: 700 };
    });
    await place(host, 1, far.x, far.y);
    await ada.waitForFunction(() => !document.querySelector('#dash').getClientRects().length, null, { timeout: 5000 });
    ok(await ada.isHidden('#dash'), 'Ada away from resources: no action button (no dash on the meadow)');

    // Ada chops a tree with three taps on the real button
    const tree = await pick(host, [0, 1, 2]);
    await beside(host, 1, tree);
    await place(host, 0, 640, 420); await place(host, 2, 700, 420);
    await ada.waitForFunction(() => document.querySelector('#dash img').src.includes('Tool/Axe.png'), null, { timeout: 5000 });
    ok(await ada.isVisible('#dash'), 'Ada next to a tree: action button visible and shows the axe');
    for (let h = 0; h < 3; h++) {
      await tap(ada);
      if (h === 1 && shots) { await ada.waitForTimeout(230); await ada.screenshot({ path: `${shots}/a-chop-portrait.png` }); }
      if (h === 1) {
        await ada.waitForTimeout(120); // mid-swing: the axe is out
        const covers = await ada.evaluate(() => Object.values(window.__blobzCovers || {}).flatMap((f) => f()));
        ok(covers.length === 0, `mid-swing: no nameplate is covered by the tool or anything else (${covers.join(',') || 'none'})`);
      }
      await ada.waitForTimeout(380); await beside(host, 1, tree);
    }
    await ada.waitForFunction(() => window.__blobzView.players[1].carry.includes('wood'), null, { timeout: 5000 });
    ok(true, '3 axe hits -> Ada carries 1 wood');

    // Bo holds the button (repeats every 0.35 s): mines a rock, or (stone archived) chops another tree
    const node2 = stoneOn ? await pick(host, [3, 4]) : (await sim(host, (s, t) => s.trees.findIndex((n, i) => i !== t && n.kind < 3 && n.left > 0), tree));
    await beside(host, 2, node2);
    await bo.waitForFunction((src) => document.querySelector('#dash img').src.includes(src), stoneOn ? 'Tool/Pickaxe.png' : 'Tool/Axe.png', { timeout: 5000 });
    await bo.locator('#dash').dispatchEvent('pointerdown');
    await bo.waitForFunction((k) => window.__blobzView.players[2].carry.includes(k), stoneOn ? 'stone' : 'wood', { timeout: 6000 });
    await bo.locator('#dash').dispatchEvent('pointerup');
    ok(true, `holding the button -> Bo carries ${stoneOn ? 'stone (pickaxe)' : 'wood (axe)'}`);
    await bo.waitForTimeout(200);
    if (shots) await bo.screenshot({ path: `${shots}/a-mine-landscape.png` });

    // Stefan (host) rakes a berry bush with the keyboard
    const bush = await pick(host, [5]);
    await beside(host, 0, bush);
    await host.waitForFunction(() => document.querySelector('#dash img').src.includes('Tool/Hoe.png'), null, { timeout: 5000 });
    ok(await host.isVisible('#dash'), 'next to a berry bush: action button visible with the rake');
    for (let h = 0; h < 2; h++) { await host.keyboard.press('Space'); await host.waitForTimeout(380); await beside(host, 0, bush); }
    await host.waitForFunction(() => window.__blobzView.players[0].carry.includes('berry'), null, { timeout: 5000 });
    ok(true, '2 rake hits -> Stefan carries berries');

    // everyone home: the team bank fills on every phone
    await sim(host, (s) => s.players.forEach((p, i) => { p.x = 620 + i * 20; p.y = 480; p.vx = 0; p.vy = 0; }));
    await bo.waitForFunction((st) => { const v = window.__blobzView; return v.bank.wood >= 1 && (!st || v.bank.stone >= 1) && v.bank.berry >= 1; }, stoneOn, { timeout: 5000 });
    await ada.waitForFunction(() => document.getElementById('bank-wood').textContent !== '0', null, { timeout: 5000 });
    ok(true, 'bank counters show the delivery on a joiner');
    const coversHome = await ada.evaluate(() => Object.values(window.__blobzCovers || {}).flatMap((f) => f()));
    ok(coversHome.length === 0, `at home: no nameplate is covered by the base flag, the cottage or a tool (${coversHome.join(',') || 'none'})`);

    // finish the berry row: its star lights up
    await sim(host, (s) => { s.delivered.berry = s.quest.berry - 1; const p = s.players[1]; p.carry = ['berry']; p.x = 640; p.y = 480; });
    await ada.waitForSelector('#hud-quest .qrow[data-k="berry"].done', { timeout: 5000 });
    ok((await ada.getAttribute('#hud-quest .qrow[data-k="berry"] .qstar', 'src')).endsWith('star.png'), 'berry row complete -> star');
    await sim(host, (s) => s.players.forEach((p, i) => { p.x = 560 + i * 50; p.y = 600; }));
    await ada.waitForTimeout(500);
    if (shots) await ada.screenshot({ path: `${shots}/a-quest-portrait.png` });

    // no day cycle (archived): no sun bar; the round ends when all three goals are filled
    ok(!(await bo.isVisible('#hud-day')), 'no day bar in the HUD (day cycle archived)');
    await sim(host, (s) => { s.delivered = { ...s.quest }; });
    // the complete quest ends the round: straight to the end screen (Bärregn archived)
    await ada.waitForSelector('#end:not(.hidden)', { timeout: 5000 });
    ok((await ada.textContent('#end-title')) === 'Uppdraget klart!', 'end screen: "Uppdraget klart!"');
    const endStars = await ada.locator('#end-stars .star.on').count();
    ok((await ada.locator('#end-rows .qrow').count()) === 3 && endStars === 3, `end screen shows 3 rows and 3 stars (quest complete; got ${endStars})`);
    if (shots) { await ada.waitForTimeout(800); await ada.screenshot({ path: `${shots}/a-end-portrait.png` }); }
    console.log('ALL PASSED');
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
