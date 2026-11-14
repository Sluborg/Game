// E2E batch A "gathering with tools": 3 players chop, mine and rake with the real action button,
// deliver to the base, the team bank fills and a quest row completes. Synced to every phone.
// Usage: npm run build && npx vite preview --port 4173 &  node e2e/gather.cjs [baseUrl] [shotDir]
const { LANDSCAPE, ok, startGame, sim, place, view } = require('./helpers.cjs');
const base = process.argv[2] || 'http://localhost:4173/';
const shots = process.argv[3] || '';

/** Index of a node of the given kinds with no other node within 110 px (so the tool is unambiguous). */
const pick = (host, kinds) => sim(host, (s, ks) => s.trees.findIndex((t, j) => ks.includes(t.kind)
  && s.trees.every((o, k) => k === j || Math.hypot(o.x - t.x, o.y - t.y) > 110)), kinds);
/** Park player #i just right of node n (keep them there: blobz drift a little after a bump). */
const beside = (host, i, n) => sim(host, (s, a) => {
  const t = s.trees[a.n]; const p = s.players[a.i];
  p.x = t.x + (t.kind === 5 ? 0 : [15, 15, 15, 12, 24][t.kind]) + 22; p.y = t.y; p.vx = 0; p.vy = 0;
}, { i, n });
const carry = async (page, i) => (await view(page)).players[i].carry;
const tap = async (page) => { await page.locator('#dash').dispatchEvent('pointerdown'); await page.locator('#dash').dispatchEvent('pointerup'); };

(async () => {
  const { browser, pages } = await startGame(base, ['Stefan', 'Ada', 'Bo'], [undefined, undefined, LANDSCAPE]);
  const [host, ada, bo] = pages;
  try {
    const v0 = await view(ada);
    ok(v0.items.length === 0, 'no random items on the map');
    ok(JSON.stringify(v0.quest) === '{"wood":14,"stone":9,"berry":7}', 'quest for 3 players: 14 wood, 9 stone, 7 berries');
    ok(await ada.isHidden('#time') && await ada.isVisible('#hud-day .sun'), 'no countdown text, sun on the day bar');

    // Ada chops a tree with three taps on the real button
    const tree = await pick(host, [0, 1, 2]);
    await beside(host, 1, tree);
    await place(host, 0, 640, 420); await place(host, 2, 700, 420);
    await ada.waitForFunction(() => document.querySelector('#dash img').src.includes('btn-axe'), null, { timeout: 5000 });
    ok(true, 'Ada next to a tree: action button shows the axe');
    for (let h = 0; h < 3; h++) {
      await tap(ada);
      if (h === 1 && shots) { await ada.waitForTimeout(230); await ada.screenshot({ path: `${shots}/a-chop-portrait.png` }); }
      await ada.waitForTimeout(380); await beside(host, 1, tree);
    }
    await ada.waitForFunction(() => window.__blobzView.players[1].carry.includes('wood'), null, { timeout: 5000 });
    ok(true, '3 axe hits -> Ada carries 1 wood');

    // Bo mines a rock by holding the button (repeats every 0.35 s)
    const rock = await pick(host, [3, 4]);
    await beside(host, 2, rock);
    await bo.waitForFunction(() => document.querySelector('#dash img').src.includes('btn-pickaxe'), null, { timeout: 5000 });
    await bo.locator('#dash').dispatchEvent('pointerdown');
    await bo.waitForFunction(() => window.__blobzView.players[2].carry.includes('stone'), null, { timeout: 6000 });
    await bo.locator('#dash').dispatchEvent('pointerup');
    ok(true, 'holding the button with the pickaxe -> Bo carries stone');
    await bo.waitForTimeout(200);
    if (shots) await bo.screenshot({ path: `${shots}/a-mine-landscape.png` });

    // Stefan (host) rakes a berry bush with the keyboard
    const bush = await pick(host, [5]);
    await beside(host, 0, bush);
    await host.waitForFunction(() => document.querySelector('#dash img').src.includes('btn-rake'), null, { timeout: 5000 });
    for (let h = 0; h < 2; h++) { await host.keyboard.press('Space'); await host.waitForTimeout(380); await beside(host, 0, bush); }
    await host.waitForFunction(() => window.__blobzView.players[0].carry.includes('berry'), null, { timeout: 5000 });
    ok(true, '2 rake hits -> Stefan carries berries');

    // everyone home: the team bank fills on every phone
    await sim(host, (s) => s.players.forEach((p, i) => { p.x = 620 + i * 20; p.y = 480; p.vx = 0; p.vy = 0; }));
    await bo.waitForFunction(() => { const v = window.__blobzView; return v.bank.wood >= 1 && v.bank.stone >= 1 && v.bank.berry >= 1; }, null, { timeout: 5000 });
    ok((await ada.textContent('#bank-wood')) !== '0', 'bank counters show the delivery on a joiner');

    // finish the berry row: its star lights up
    await sim(host, (s) => { s.delivered.berry = s.quest.berry - 1; const p = s.players[1]; p.carry = ['berry']; p.x = 640; p.y = 480; });
    await ada.waitForSelector('#hud-quest .qrow[data-k="berry"].done', { timeout: 5000 });
    ok((await ada.getAttribute('#hud-quest .qrow[data-k="berry"] .qstar', 'src')).endsWith('star.png'), 'berry row complete -> star');
    await sim(host, (s) => s.players.forEach((p, i) => { p.x = 560 + i * 50; p.y = 600; }));
    await ada.waitForTimeout(500);
    if (shots) await ada.screenshot({ path: `${shots}/a-quest-portrait.png` });

    // sunset: dusk, then the end screen with rows + stars
    await sim(host, (s) => { s.time = 15; });
    await bo.waitForSelector('#hud-day.dusk', { timeout: 5000 });
    if (shots) await bo.screenshot({ path: `${shots}/a-dusk-landscape.png` });
    await sim(host, (s) => { s.time = 0.05; });
    await ada.waitForSelector('#end:not(.hidden)', { timeout: 5000 });
    ok((await ada.textContent('#end-title')) === 'Solen gick ner!', 'end screen: "Solen gick ner!"');
    ok((await ada.locator('#end-rows .qrow').count()) === 3 && (await ada.locator('#end-stars .star.on').count()) === 1, 'end screen shows 3 rows and 1 star');
    if (shots) { await ada.waitForTimeout(800); await ada.screenshot({ path: `${shots}/a-end-portrait.png` }); }
    console.log('ALL PASSED');
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
