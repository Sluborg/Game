// E2E "no reading needed": pictures instead of words in the meadow loop (2 phones, one landscape).
// Arrow home when the bank can pay for a building, the build goal as a picture, a pulsing Build button, icon rows on
// the build cards, the Bärregn picture intro before the rain, and the sunset + numbers-only Bärregn line at the end.
// Usage: npm run build && npx vite preview --port 4173 &  node e2e/noread.cjs [baseUrl] [shotDir]
const { flatShare, LANDSCAPE, ok, place, sim, startGame } = require('./helpers.cjs');
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
    ok((await ada.getAttribute('#q-build .qbimg', 'src')).endsWith('ninja/storage.png') && (await ada.getAttribute('#q-build .qbico', 'src')).includes('hammer-16.png'),
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
    const badges = await ada.$$eval('#build-cards .bcard', (cs) => cs.map((c) => (c.querySelector('.bstate')?.getAttribute('src') ?? '').replace(/.*\//, '')));
    ok(badges.length === 7 && badges.every((b) => /^(can-build|lock|done)-16\.png$/.test(b)) && badges.includes('can-build-16.png') && badges.includes('lock-16.png'),
      `every build card carries a state badge: can-build / lock (${badges.join(',')})`);
    const scroll = await ada.evaluate(() => { const p = document.getElementById('build-panel'); return p.scrollHeight - p.clientHeight; });
    ok(scroll <= 0, 'landscape build panel with icon rows still fits without scrolling');
    if (shots) await ada.screenshot({ path: `${shots}/noread-panel-landscape.png` });
    await ada.click('#btn-build-close');
    await place(host, 0, 640, 540);
    if (shots) await host.screenshot({ path: `${shots}/noread-hud-portrait.png` });

    // quest complete: straight to the end screen (Bärregn archived)
    await sim(host, (s) => { s.phase = 'end'; }); // long game: ended by choice (endRound)
    await ada.waitForSelector('#end:not(.hidden)', { timeout: 6000 });
    ok(!(await ada.locator('#end .endsun').count()) && (await ada.evaluate(() => getComputedStyle(document.getElementById('end')).backgroundImage)).includes('victory.png'),
      'end screen: no sunset; the N-6 victory picture (blobz cheering with their haul) behind the card');
    const title = await ada.locator('#end-title').boundingBox();
    ok(title && title.width <= 1 && (await ada.textContent('#end-title')).trim() === 'Uppdraget klart!', 'end title is picture-only (words kept for screen readers)');
    ok(!(await ada.isVisible('#end-mini')), 'no Bärregn line on the end screen (archived)');
    // landscape end screen: the victory art fills the screen (no letterboxed strip with a flat green fill)
    await ada.waitForTimeout(600);
    const flat = await flatShare(ada, await ada.locator('#end .card').boundingBox());
    ok(flat < 0.15, `landscape end screen: the art covers the screen (flat cells ${(flat * 100).toFixed(0)}%)`);
    if (shots) await host.screenshot({ path: `${shots}/noread-end-portrait.png` });
    console.log('ALL PASSED');
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e.message); process.exit(1); });
