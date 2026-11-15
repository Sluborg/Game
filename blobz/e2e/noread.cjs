// E2E "no reading needed": pictures instead of words in the meadow loop (2 phones, one landscape).
// Arrow home when the bank can pay for a building, the build goal as a picture, a pulsing Build button, icon rows on
// the build cards, the Bärregn picture intro before the rain, and the sunset + numbers-only Bärregn line at the end.
// Usage: npm run build && npx vite preview --port 4173 &  node e2e/noread.cjs [baseUrl] [shotDir]
const { LANDSCAPE, ok, place, sim, startGame, view } = require('./helpers.cjs');
const base = process.argv[2] || 'http://localhost:4173/';
const shots = process.argv[3] || '';

(async () => {
  const { browser, pages } = await startGame(base, ['Stefan', 'Ada'], [undefined, LANDSCAPE]);
  const [host, ada] = pages;
  try {
    // far from home with enough wood for the storage: house arrow + build goal picture (building + hammer)
    await place(host, 1, 120, 120);
    await sim(host, (s) => { s.bank = { wood: 6, stone: 0, berry: 0 }; });
    await ada.waitForFunction(() => getComputedStyle(document.querySelector('#edge-arrows [data-k="home"]')).display === 'flex'
      && !document.getElementById('edge-arrows').classList.contains('hidden'), null, { timeout: 4000 });
    ok(true, 'bank covers a building, house off-screen: an orange arrow points home');
    ok((await ada.getAttribute('#q-build .qbimg', 'src')).endsWith('ninja/storage.png') && (await ada.getAttribute('#q-build .qbico', 'src')).includes('Repair.png'),
      'quest card: storage picture + hammer (no words)');
    ok(await ada.getAttribute('#hud-quest .qtitle', 'aria-label') === 'Samla till basen' && (await ada.textContent('#hud-quest .qtitle')).trim() === '',
      'quest header is a house icon (text only for screen readers)');
    if (shots) await ada.screenshot({ path: `${shots}/noread-arrow-landscape.png` });

    // at home: arrow gone, Build button pulses, cards carry icon rows
    await place(host, 1, 640, 540);
    await ada.waitForSelector('#btn-build.can:not(.hidden)', { timeout: 4000 });
    await ada.waitForFunction(() => getComputedStyle(document.querySelector('#edge-arrows [data-k="home"]')).display === 'none'
      || document.getElementById('edge-arrows').classList.contains('hidden'), null, { timeout: 4000 });
    ok(true, 'at home: the arrow is gone and the Build button pulses');
    await ada.click('#btn-build');
    await ada.waitForSelector('#build-panel:not(.hidden)');
    const icons = await ada.$$eval('#build-cards .bcard', (cs) => cs.map((c) => c.querySelectorAll('.bicons img').length));
    ok(icons.length === 7 && icons.every((n) => n >= 1), `every build card shows what it does as icons (${icons.join(',')})`);
    const scroll = await ada.evaluate(() => { const p = document.getElementById('build-panel'); return p.scrollHeight - p.clientHeight; });
    ok(scroll <= 0, 'landscape build panel with icon rows still fits without scrolling');
    if (shots) await ada.screenshot({ path: `${shots}/noread-panel-landscape.png` });
    await ada.click('#btn-build-close');
    await place(host, 0, 640, 540);
    if (shots) await host.screenshot({ path: `${shots}/noread-hud-portrait.png` });

    // sunset: picture intro with my own blob, no drops yet; then the rain starts
    await sim(host, (s) => { s.delivered = { ...s.quest }; // quest complete ends the round (day cycle archived) });
    await ada.waitForSelector('#mini-intro:not(.hidden)', { timeout: 6000 });
    await host.waitForSelector('#mini-intro:not(.hidden)', { timeout: 6000 });
    ok(await ada.locator('#mini-intro .mi-blob .blob').count() === 2, 'Bärregn intro: berry -> my blob (check), bomb -> dizzy blob (cross)');
    ok((await view(host)).mini.drops.length === 0, 'no rain during the intro');
    if (shots) { await host.waitForTimeout(700); await host.screenshot({ path: `${shots}/noread-intro-portrait.png` }); await ada.screenshot({ path: `${shots}/noread-intro-landscape.png` }); }
    await ada.waitForSelector('#mini-intro.hidden', { state: 'attached', timeout: 5000 });
    await host.waitForFunction(() => window.__blobzView.mini.drops.length > 0, null, { timeout: 4000 });
    ok(true, 'intro goes away by itself and the rain starts');

    // end: sunset picture, Bärregn line is icon + number + stars
    await host.click('#btn-skip-mini');
    await ada.waitForSelector('#end:not(.hidden)', { timeout: 6000 });
    ok(await ada.isVisible('#end .endsun'), 'end screen shows a setting sun');
    const title = await ada.locator('#end-title').boundingBox();
    ok(title && title.width <= 1 && (await ada.textContent('#end-title')).trim() === 'Solen gick ner!', 'end title is picture-only (words kept for screen readers)');
    const line = (await ada.textContent('#end-mini')).trim();
    ok(/^\d+$/.test(line), `Bärregn line has no words, only the number ("${line}")`);
    if (shots) await host.screenshot({ path: `${shots}/noread-end-portrait.png` });
    console.log('ALL PASSED');
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e.message); process.exit(1); });
