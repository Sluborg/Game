// E2E two languages: an English phone hosts, a Swedish phone joins; each phone keeps its own UI language.
// SV | EN toggle on the home card (saved across reloads), and no Swedish text leaks on the English main screens
// (home, designer, join, lobby, HUD, build panel, Bärregn, end screen).
// Usage: npm run build && npx vite preview --port 4173 &  node e2e/i18n.cjs [baseUrl] [shotDir]
const { chromium } = require('playwright');
const { LANDSCAPE, PORTRAIT, ok, sim } = require('./helpers.cjs');
const base = process.argv[2] || 'http://localhost:4173/';
const shots = process.argv[3] || '';

const SWEDISH = /[åäöÅÄÖ]|\b(Nytt spel|Joina|Starta|Lobby väntar|Väntar|Samla|Bygg|Tillbaka|Spela igen|Ny by|Slumpa|Klar|Namn|Hatt|Mun|Ögon|Laddar|Letar|Solen)\b/;
/** Visible text of the page (innerText skips display:none), minus player names. */
const visible = (p) => p.evaluate(() => document.body.innerText.replace(/\b(Stefan|Ada)\b/g, ''));
async function noSwedish(p, where) {
  const txt = await visible(p);
  const m = SWEDISH.exec(txt);
  ok(!m, `EN ${where}: no Swedish text${m ? ` (found "${m[0]}")` : ''}`);
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
  const url = `${base}?lan=e2e-i18n-${Math.random().toString(36).slice(2)}&debug`;
  try {
    // a Swedish phone: Swedish by default, toggles to English, keeps it after a reload, and back
    const sv = await phone(browser, 'Ada', 'sv-SE');
    await sv.goto(url);
    ok((await sv.textContent('#btn-host')).trim() === 'Nytt spel', 'sv-SE browser starts in Swedish ("Nytt spel")');
    await sv.click('#lang-toggle [data-lang="en"]');
    ok((await sv.textContent('#btn-host')).trim() === 'New game' && (await sv.textContent('#btn-show-join')).trim() === 'Join', 'tap EN: home in English ("New game", "Join")');
    await sv.reload();
    ok((await sv.textContent('#btn-host')).trim() === 'New game', 'the pick survives a reload (localStorage blobz.lang)');
    ok(await sv.evaluate(() => localStorage.getItem('blobz.lang')) === 'en', 'saved as blobz.lang = en');
    await sv.click('#lang-toggle [data-lang="sv"]');
    ok((await sv.textContent('#btn-host')).trim() === 'Nytt spel', 'tap SV: back to Swedish');

    // an English phone: English by default; designer + join panel without Swedish
    const en = await phone(browser, 'Stefan', 'en-US');
    await en.goto(url);
    ok(await en.getAttribute('html', 'lang') === 'en' && await en.isVisible('#lang-toggle [data-lang="en"].on'), 'en-US browser starts in English, EN chip lit');
    await en.waitForSelector('#loading.hidden', { state: 'attached', timeout: 15000 });
    await noSwedish(en, 'home');
    if (shots) await en.screenshot({ path: `${shots}/i18n-home-en.png` });
    await en.click('#me');
    await en.waitForSelector('#custom:not(.hidden)');
    await noSwedish(en, 'blob designer');
    ok(await en.getAttribute('#opts .opt >> nth=0', 'title') === 'Dome', 'designer option names in English (tooltip "Dome")');
    await en.click('#btn-custom-done');
    await en.click('#btn-show-join');
    await en.waitForSelector('#join:not(.hidden)');
    await noSwedish(en, 'join panel');
    await en.click('#btn-join-back');

    // English host, Swedish joiner: each in their own language
    await en.click('#btn-host');
    await en.waitForSelector('#lobby:not(.hidden)', { timeout: 20000 });
    await sv.click('#btn-show-join');
    await sv.locator('.lanrow', { hasText: 'Joina Stefan' }).click({ timeout: 25000 });
    await sv.waitForSelector('#lobby:not(.hidden)', { timeout: 20000 });
    await en.waitForFunction(() => document.querySelectorAll('#lobby-list li').length === 2, null, { timeout: 10000 });
    ok((await en.textContent('#btn-start')).trim() === 'Start' && !(await en.isVisible('#map-pick')), 'host lobby in English ("Start"), no map picker (snow map archived)');
    ok((await sv.textContent('#lobby-wait')).includes('Väntar på att värden startar'), 'joiner lobby stays Swedish');
    await noSwedish(en, 'lobby');
    if (shots) await en.screenshot({ path: `${shots}/i18n-lobby-en.png` });

    // HUD + build panel
    await en.click('#btn-start');
    for (const p of [en, sv]) await p.waitForSelector('#hud:not(.hidden)', { timeout: 15000 });
    await en.waitForFunction(() => !!window.__blobzView, null, { timeout: 10000 });
    ok((await en.getAttribute('#hud-quest .qtitle', 'aria-label')) === 'Bring to the base', 'HUD quest title in English');
    ok((await sv.getAttribute('#hud-quest .qtitle', 'aria-label')) === 'Samla till basen', 'joiner HUD in Swedish');
    await sim(en, (s) => { s.bank = { wood: 12, stone: 8, berry: 4 }; Object.assign(s.players[0], { x: 640, y: 530, vx: 0, vy: 0 }); });
    await en.waitForSelector('#btn-build:not(.hidden)');
    await en.click('#btn-build');
    await en.waitForSelector('#build-panel:not(.hidden)');
    await en.waitForFunction(() => document.querySelector('#build-cards .bname')?.textContent === 'Bridge');
    ok((await en.textContent('#build-cards')).includes('Storage') && (await en.textContent('#build-cards')).includes('Cottage level 2'), 'build cards in English ("Storage", "Cottage level 2")');
    await noSwedish(en, 'HUD + build panel');
    if (shots) await en.screenshot({ path: `${shots}/i18n-build-en.png` });
    await en.click('#btn-build-close');

    // Bärregn + end screen
    await sim(en, (s) => { s.time = 0.05; });
    await en.waitForSelector('#mini-hud:not(.hidden)', { timeout: 6000 });
    ok((await en.textContent('#mini-hud .mtitle')).trim() === 'Berry Rain!' && (await en.textContent('#btn-skip-mini')).trim() === 'Skip', 'Berry Rain HUD in English ("Berry Rain!", "Skip")');
    await noSwedish(en, 'Berry Rain');
    await en.click('#btn-skip-mini');
    await en.waitForSelector('#end:not(.hidden)', { timeout: 6000 });
    await sv.waitForSelector('#end:not(.hidden)', { timeout: 6000 });
    ok((await en.textContent('#end-title')).trim() === 'The sun went down!', 'end screen in English');
    ok((await sv.textContent('#end-title')).trim() === 'Solen gick ner!', 'joiner end screen in Swedish');
    await noSwedish(en, 'end screen');
    if (shots) await en.screenshot({ path: `${shots}/i18n-end-en.png` });

    // landscape home: the toggle fits
    const ls = await phone(browser, 'Bo', 'en-US', LANDSCAPE);
    await ls.goto(url);
    await ls.waitForSelector('#loading.hidden', { state: 'attached', timeout: 15000 });
    const box = await ls.locator('#lang-toggle').boundingBox();
    ok(box && box.y + box.height <= 390 && box.x >= 0 && box.x + box.width <= 844, 'landscape home: SV | EN toggle on screen');
    if (shots) await ls.screenshot({ path: `${shots}/i18n-home-landscape.png` });
    console.log('ALL PASSED');
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e.message); process.exit(1); });
