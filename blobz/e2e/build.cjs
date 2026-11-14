// E2E base building: 3 players build from the team bank, the village (+ bank) persists into the next
// round on the host, "Ny by" resets it. Usage: npm run build && npx vite preview --port 4173 &  node e2e/build.cjs [baseUrl] [shotDir]
const { LANDSCAPE, ok, startGame, sim, place, view } = require('./helpers.cjs');
const base = process.argv[2] || 'http://localhost:4173/';
const shots = process.argv[3] || '';

const card = (page, k) => page.locator(`#build-cards .bcard[data-kind="${k}"]`);
const goHome = (host, i) => sim(host, (s, i) => Object.assign(s.players[i], { x: 640 + (i - 1) * 30, y: 520, vx: 0, vy: 0 }), i);
const openPanel = async (page) => { await page.waitForSelector('#btn-build:not(.hidden)', { timeout: 5000 }); await page.click('#btn-build'); await page.waitForSelector('#build-panel:not(.hidden)'); };

(async () => {
  const { browser, pages } = await startGame(base, ['Stefan', 'Ada', 'Bo'], [undefined, undefined, LANDSCAPE]);
  const [host, ada, bo] = pages;
  try {
    // a clean map: nothing to stand on around the cottage, no ghosts or price signs
    await sim(host, (s) => { s.players.forEach((p, i) => Object.assign(p, { x: 600 + i * 40, y: 330, vx: 0, vy: 0 })); });
    await ada.waitForTimeout(1200);
    ok(await ada.isHidden('#btn-build'), 'away from the cottage: no "Bygg" button');
    if (shots) await ada.screenshot({ path: `${shots}/base-clean-portrait.png` });

    // Ada at home -> hammer button -> panel with picture cards; 5 of 6 wood: Förråd is red and disabled
    await sim(host, (s) => { s.bank = { wood: 5, stone: 0, berry: 0 }; });
    await goHome(host, 1);
    await openPanel(ada);
    ok(await card(ada, 'storage').isDisabled(), 'build panel: Förråd needs 6 wood, the bank has 5 -> card disabled, cost red');
    ok((await ada.locator('#build-cards .bcard').count()) === 7, 'build panel: 6 buildings + the cottage upgrade');
    await sim(host, (s) => { s.bank.wood = 7; });
    await ada.waitForFunction(() => !document.querySelector('#build-cards .bcard[data-kind="storage"]').disabled, null, { timeout: 4000 });
    if (shots) await ada.screenshot({ path: `${shots}/base-panel-portrait.png` });
    await card(ada, 'storage').click();
    await bo.waitForFunction(() => window.__blobzView.builds.find((b) => b.kind === 'storage').state === 2, null, { timeout: 5000 });
    const v = await view(bo);
    ok(v.bank.wood === 1 && v.builtNow.includes('storage'), 'tap the card: Förråd built on every phone, bank 7 -> 1');
    await ada.waitForFunction(() => document.querySelector('#build-cards .bcard[data-kind="storage"]').classList.contains('built'), null, { timeout: 3000 });
    ok(true, 'the card now says "Byggd"');
    await ada.click('#btn-build-close');
    await ada.waitForSelector('#q-build:not(.hidden)', { timeout: 3000 });
    ok((await ada.textContent('#q-build span')) === 'Byggt: Förråd', 'quest card shows "Byggt: Förråd"');

    // Bo (landscape) builds the bridge from his own panel; then walks over the water
    await sim(host, (s) => { s.bank = { wood: 12, stone: 8, berry: 0 }; });
    await goHome(host, 2);
    await openPanel(bo);
    if (shots) await bo.screenshot({ path: `${shots}/base-panel-landscape.png` });
    await card(bo, 'bridge').click();
    await bo.waitForFunction(() => window.__blobzView.builds.find((b) => b.kind === 'bridge').state === 2, null, { timeout: 5000 });
    ok(true, 'Bro built from the panel (12 wood + 8 stone)');
    await bo.click('#btn-build-close');
    const w = await sim(host, (s) => s.water);
    await place(host, 2, w.bridge.x + (w.area.x0 === 0 ? 70 : -70), w.bridge.y);
    await bo.waitForTimeout(900);
    if (shots) await bo.screenshot({ path: `${shots}/base-bridge-landscape.png` });

    await sim(host, (s) => { s.bank = { wood: 20, stone: 15, berry: 10 }; });

    // cottage level 2 from the host's own panel
    await goHome(host, 0);
    await openPanel(host);
    await card(host, 'cottage').click();
    await ada.waitForFunction(() => window.__blobzView.cottage.level === 2, null, { timeout: 5000 });
    ok(true, 'cottage level 2 from the panel (20/15/10)');
    await host.click('#btn-build-close');
    await sim(host, (s) => { s.bank = { wood: 4, stone: 3, berry: 2 }; s.players.forEach((p, i) => Object.assign(p, { x: 600 + i * 40, y: 330, vx: 0, vy: 0 })); });
    await ada.waitForTimeout(1200);
    if (shots) await ada.screenshot({ path: `${shots}/base-built-portrait.png` });
    if (shots) await bo.screenshot({ path: `${shots}/base-built-landscape.png` });

    // sunset, Bärregn skipped, then "Spela igen": the village + bank continue, the quest restarts
    await sim(host, (s) => { s.villageDirty = true; s.time = 0.05; });
    await host.waitForSelector('#btn-skip-mini:not(.hidden)', { timeout: 5000 });
    await host.click('#btn-skip-mini');
    await host.waitForSelector('#end:not(.hidden)', { timeout: 5000 });
    await host.click('#btn-again');
    await ada.waitForFunction(() => window.__blobzView.time > 170, null, { timeout: 8000 });
    const n = await view(ada);
    ok(n.builds.filter((b) => b.state === 2).map((b) => b.kind).sort().join() === 'bridge,storage' && n.cottage.level === 2,
      'next round: Förråd + Bro + cottage level 2 are still there');
    ok(JSON.stringify(n.bank) === '{"wood":4,"stone":3,"berry":2}' && n.delivered.wood === 0, 'the bank was saved, the quest restarted');
    console.log('ALL PASSED (round 2 continues)');
  } finally {
    await browser.close();
  }

  // "Ny by" in a fresh host lobby: in-page confirm, then the village is gone
  const { chromium } = require('playwright');
  const b2 = await chromium.launch();
  try {
    const p = await (await b2.newContext({ locale: 'sv-SE', viewport: { width: 390, height: 844 } })).newPage();
    await p.addInitScript(() => {
      localStorage.setItem('blobz.name', 'Stefan');
      if (!sessionStorage.getItem('seeded')) {
        sessionStorage.setItem('seeded', '1');
        localStorage.setItem('blobz.village', JSON.stringify({ v: 2, cottage: 2, builds: { storage: true, workshop: false, garden: false, well: false, watchtower: false, bridge: true }, bank: { wood: 3, stone: 0, berry: 0 } }));
      }
    });
    await p.goto(base + '?lan=e2e-ny&debug');
    await p.click('#btn-host');
    await p.waitForSelector('#lobby:not(.hidden)');
    ok((await p.textContent('#lobby-village')).includes('stuga nivå 2'), 'host lobby shows the saved village: ' + (await p.textContent('#lobby-village')));
    await p.click('#btn-newvillage');
    ok(await p.isVisible('#newvillage-ask') && (await p.textContent('#newvillage-ask p')) === 'Riv byn och börja om?', 'in-page confirm "Riv byn och börja om?"');
    if (shots) await p.screenshot({ path: `${shots}/base-nyby-portrait.png` });
    await p.click('#btn-newvillage-yes');
    ok(await p.evaluate(() => localStorage.getItem('blobz.village')) === null, '"Ja, riv": the saved village is gone');
    await p.click('#btn-start');
    await p.waitForFunction(() => !!window.__blobzView, null, { timeout: 8000 });
    const v = await p.evaluate(() => window.__blobzView);
    ok(v.builds.every((b) => b.state === 0) && v.cottage.level === 1, 'new round starts with an empty village');
    console.log('ALL PASSED');
  } finally {
    await b2.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
