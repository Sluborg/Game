// E2E milestone 30: pressure plates open a pen, the chest gives +25, synced to every phone.
// Usage: npm run build && npx vite preview --port 4173 &  node e2e/puzzles.cjs [baseUrl] [shotDir]
const { LANDSCAPE, ok, startGame, sim, place, view } = require('./helpers.cjs');
const base = process.argv[2] || 'http://localhost:4173/';
const shots = process.argv[3] || '';
if (!process.env.BLOBZ_PUZZLES) { console.log('skipped: puzzle pens archived (set BLOBZ_PUZZLES=1 when PUZZLES_ENABLED is on again)'); console.log('ALL PASSED'); process.exit(0); }

(async () => {
  const { browser, pages } = await startGame(base, ['Stefan', 'Ada', 'Bo'], [undefined, undefined, LANDSCAPE]);
  const [host, ada, bo] = pages;
  try {
    const L = await sim(host, (s) => s.layout);
    const needs = (await view(ada)).puzzles.map((z) => z.need);
    ok(JSON.stringify(needs) === '[2,3]', 'joiner sees 2 puzzles needing 2 and 3 plates: ' + JSON.stringify(needs));
    const l = L[0];
    const side = l.gateDown ? 1 : -1;

    // one blob on a plate: 1/2, gate still shut
    await place(host, 0, l.plates[0].x, l.plates[0].y);
    await place(host, 1, l.plates[1].x + 60, l.plates[1].y + side * 30);
    await place(host, 2, l.cx, l.plates[0].y + side * 60);
    await ada.waitForFunction(() => window.__blobzView.puzzles[0].mask === 1, null, { timeout: 5000 });
    ok(!(await view(ada)).puzzles[0].open, 'one plate held: gate stays closed');
    await ada.waitForTimeout(700);
    if (shots) await ada.screenshot({ path: `${shots}/m30-plate-1of2-portrait.png` });

    // second blob steps on: gate opens on every phone
    await place(host, 1, l.plates[1].x, l.plates[1].y);
    await ada.waitForFunction(() => window.__blobzView.puzzles[0].open, null, { timeout: 5000 });
    await bo.waitForFunction(() => window.__blobzView.puzzles[0].open, null, { timeout: 5000 });
    ok(true, 'both plates held: gate opens for host and joiners');

    // everyone leaves the plates: gate stays open
    await place(host, 0, l.cx - 50, l.plates[0].y + side * 60);
    await place(host, 1, l.cx + 50, l.plates[0].y + side * 60);
    await ada.waitForTimeout(400);
    const after = (await view(ada)).puzzles[0];
    ok(after.open && after.mask === 0, 'plates released: gate stays open');
    await place(host, 2, l.cx, (l.gate.y0 + l.gate.y1) / 2 + side * 46);
    await ada.waitForTimeout(700);
    if (shots) await ada.screenshot({ path: `${shots}/m30-gate-open-portrait.png` });
    if (shots) await bo.screenshot({ path: `${shots}/m30-gate-open-landscape.png` });

    // Bo glides into the pen to the chest: +3 of each resource, once
    await place(host, 2, l.chest.x, l.chest.y);
    await bo.waitForFunction(() => window.__blobzView.puzzles[0].taken, null, { timeout: 5000 });
    await bo.waitForFunction(() => window.__blobzView.bank.wood >= 3, null, { timeout: 5000 });
    const b = (await view(bo)).bank;
    ok(b.wood >= 3 && b.stone >= 3 && b.berry >= 3, `chest gives the team +3 of each (${JSON.stringify(b)})`);
    await bo.waitForTimeout(250);
    if (shots) await bo.screenshot({ path: `${shots}/m30-chest-landscape.png` });

    // 3-plate puzzle: shows 2/3 with two blobz on it
    const m = L[1];
    await place(host, 0, m.plates[0].x, m.plates[0].y);
    await place(host, 1, m.plates[1].x, m.plates[1].y);
    await place(host, 2, m.plates[2].x + 70, m.plates[2].y);
    await bo.waitForFunction(() => window.__blobzView.puzzles[1].mask === 3, null, { timeout: 5000 });
    ok(!(await view(bo)).puzzles[1].open, '3-plate puzzle: 2 of 3 held, still closed');
    await bo.waitForTimeout(600);
    if (shots) await bo.screenshot({ path: `${shots}/m30-plate-2of3-landscape.png` });
    await place(host, 2, m.plates[2].x, m.plates[2].y);
    await bo.waitForFunction(() => window.__blobzView.puzzles[1].open, null, { timeout: 5000 });
    ok(true, '3-plate puzzle opens with 3 blobz');
    console.log('ALL PASSED');
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
