// E2E (Code 2): the dungeon in two languages. An English phone hosts, a Swedish phone joins; no Swedish
// leaks on the English dungeon screens (class/weapon cards, HUD, level-up cards, loot card, KO, summary)
// and the Swedish phone stays Swedish.
// Usage: npm run build && npx vite preview --port 4173 &  node e2e/dungeon-i18n.cjs [baseUrl] [shotDir]
const EXIT_EN = 'You climbed out of the cave.';
const { chromium } = require('playwright');
const { LANDSCAPE, PORTRAIT, ok, sim } = require('./helpers.cjs');
const base = process.argv[2] || 'http://localhost:4173/';
const shots = process.argv[3] || '';

const SWEDISH = /[åäöÅÄÖ]|\b(Välj|Väntar|Tryck|Tillbaka|Våning|Nivå|Guld|Knockad|Rulla|Passa|Inget|Helare|Riddare|Skytt|Svärd|Spjut|Hammare|Dolk|Skatt|klar)\b/;
const visible = (p) => p.evaluate(() => document.body.innerText.replace(/\b(Stefan|Ada)\b/g, ''));
async function noSwedish(p, where) {
  const m = SWEDISH.exec(await visible(p));
  ok(!m, `EN dungeon ${where}: no Swedish text${m ? ` (found "${m[0]}")` : ''}`);
}
async function phone(browser, name, locale, size = PORTRAIT) {
  const ctx = await browser.newContext({ locale, viewport: size, hasTouch: true, isMobile: true });
  await ctx.addInitScript((n) => { localStorage.setItem('blobz.name', n); }, name);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log(`[${name}] pageerror`, e.message));
  return page;
}

(async () => {
  const browser = await chromium.launch();
  const url = `${base}?lan=e2e-dgi18n-${Math.random().toString(36).slice(2)}&debug`;
  try {
    const en = await phone(browser, 'Stefan', 'en-US');
    const sv = await phone(browser, 'Ada', 'sv-SE', LANDSCAPE);
    await en.goto(url); await sv.goto(url);
    await en.click('#btn-host');
    await en.waitForSelector('#lobby:not(.hidden)', { timeout: 20000 });
    await sv.click('#btn-show-join');
    await sv.locator('.lanrow', { hasText: 'Stefan' }).click({ timeout: 25000 });
    await sv.waitForSelector('#lobby:not(.hidden)', { timeout: 20000 });
    await en.waitForFunction(() => document.querySelectorAll('#lobby-list li').length === 2, null, { timeout: 10000 });
    await en.click('#btn-start');
    for (const p of [en, sv]) await p.waitForSelector('#hud:not(.hidden)', { timeout: 15000 });
    await en.waitForFunction(() => !!window.__blobz?.state, null, { timeout: 10000 });

    // class + weapon cards
    await sim(en, (s) => { s.players.forEach((p, i) => { p.x = s.entrance.x + i * 10; p.y = s.entrance.y; p.vx = 0; p.vy = 0; }); });
    for (const p of [en, sv]) await p.waitForSelector('#weapon-pick:not(.hidden) .wcard', { timeout: 6000 });
    ok((await en.textContent('#weapon-pick h2')).trim() === 'Pick a class' && (await en.textContent('#weapon-cards')).includes('Healer'), 'EN class cards ("Pick a class", "Healer")');
    ok((await sv.textContent('#weapon-pick h2')).trim() === 'Välj klass' && (await sv.textContent('#weapon-cards')).includes('Helare'), 'SV joiner class cards ("Välj klass", "Helare")');
    await noSwedish(en, 'class cards');
    if (shots) await en.screenshot({ path: `${shots}/dg-i18n-class-en.png` });
    ok((await en.textContent('#weapon-cards')).includes('Fast, one dagger'), 'EN class hint ("Fast, one dagger")');
    await en.click('.wcard[data-w="rogue"]'); // one weapon per class: the dagger is picked at once
    await sv.click('.wcard[data-w="tank"]');
    for (const p of [en, sv]) await p.waitForSelector('#hud-dg:not(.hidden)', { timeout: 8000 });

    // HUD
    await en.waitForFunction(() => /Floor 1\/3/.test(document.getElementById('dg-floor')?.textContent ?? ''), null, { timeout: 5000 });
    ok((await sv.textContent('#dg-floor')).includes('Våning 1/3'), 'HUD floor: "Floor 1/3" (EN) / "Våning 1/3" (SV)');
    ok(await en.getAttribute('#attack', 'aria-label') === 'Dagger whirl', 'special button aria-label in English ("Dagger whirl")');
    await noSwedish(en, 'HUD');

    // level-up cards + loot card at once
    await sim(en, (s) => { s.dg.enemies = []; s.dg.xp = 4; s.dg.level = 1; const p = s.players[0]; s.dg.enemies.push({ id: s.dg.nextId++, kind: 0, x: p.x + 30, y: p.y, vx: 0, vy: 0, hp: 1, mx: 1, awake: true, stun: 9, slamT: 99, slam: null }); s.dg.lootQ.push('ring'); });
    for (const p of [en, sv]) await p.waitForSelector('#dg-cards:not(.hidden) .skcard', { timeout: 6000 });
    for (const p of [en, sv]) await p.waitForSelector('#dg-loot:not(.hidden) #dg-roll', { timeout: 6000 });
    ok((await en.textContent('#dg-cards')).includes('Level 2! Pick one') && (await en.textContent('#dg-cards')).includes('You are safe'), 'EN level-up cards ("Level 2! Pick one")');
    ok((await en.textContent('#dg-loot')).includes('New treasure!') && (await en.textContent('#dg-roll')).trim() === 'Roll' && (await en.textContent('#dg-loot')).includes('Ruby ring'), 'EN loot card ("New treasure!", "Roll", "Ruby ring")');
    ok((await sv.textContent('#dg-loot')).includes('Ny skatt!') && (await sv.textContent('#dg-roll')).trim() === 'Rulla', 'SV loot card ("Ny skatt!", "Rulla")');
    await noSwedish(en, 'level-up + loot cards');
    if (shots) { await en.screenshot({ path: `${shots}/dg-i18n-cards-en.png` }); await sv.screenshot({ path: `${shots}/dg-i18n-cards-sv.png` }); }
    await en.click('#dg-roll'); await sv.click('#dg-pass');
    for (const p of [en, sv]) await p.click('#dg-cards .skcard');
    await en.waitForFunction(() => /got Ruby ring/.test(document.getElementById('dg-loot')?.textContent ?? ''), null, { timeout: 5000 });
    ok(true, 'EN loot result ("Stefan got Ruby ring!")');

    // knocked out banner
    await sim(en, (s) => { const h = s.dg.heroes[s.players[0].id]; h.ko = 4; h.kx = s.players[0].x; h.ky = s.players[0].y; });
    await en.waitForSelector('#dg-ko:not(.hidden)', { timeout: 4000 });
    ok((await en.textContent('#dg-ko')).includes('Knocked out! Back in'), 'EN KO banner ("Knocked out! Back in")');
    await noSwedish(en, 'KO banner');

    // summary
    await sim(en, (s) => { s.dg.done = 6; s.dg.why = 'exit'; }); // no clock any more: the run ends at the exit
    for (const p of [en, sv]) await p.waitForSelector('#dg-end:not(.hidden)', { timeout: 6000 });
    ok((await en.textContent('#dg-end h2')).trim() === 'Dungeon done!' && (await en.textContent('#dg-end')).includes(EXIT_EN), `EN summary ("Dungeon done!", "${EXIT_EN}")`);
    ok((await sv.textContent('#dg-end h2')).trim() === 'Dungeon klar!', 'SV summary ("Dungeon klar!")');
    await noSwedish(en, 'summary');
    if (shots) await en.screenshot({ path: `${shots}/dg-i18n-end-en.png` });
    console.log('ALL PASSED');
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e.message); process.exit(1); });
