// E2E batch B "smooth designer": preview bounce, swipe tabs, remembered tab, readable scrolling
// landscape grid, selected tile kept in view. Usage: node e2e/designer.cjs [baseUrl] [shotDir]
const { chromium } = require('playwright');
const { ok, PORTRAIT, LANDSCAPE } = require('./helpers.cjs');
const base = process.argv[2] || 'http://localhost:4173/';
const shots = process.argv[3] || '';

const swipe = (p, dx) => p.evaluate((dx) => {
  const o = document.getElementById('opts'); const r = o.getBoundingClientRect();
  const x = r.left + r.width / 2, y = r.top + 40;
  o.dispatchEvent(new PointerEvent('pointerdown', { clientX: x, clientY: y, bubbles: true }));
  o.dispatchEvent(new PointerEvent('pointerup', { clientX: x + dx, clientY: y + 6, bubbles: true }));
}, dx);
const tab = (p) => p.getAttribute('.tab.on', 'data-part');

(async () => {
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ locale: 'sv-SE', viewport: PORTRAIT, isMobile: true, hasTouch: true });
    const p = await ctx.newPage();
    await p.goto(base);
    await p.waitForSelector('#custom:not(.hidden)');
    const box = await p.locator('#preview2').boundingBox();
    ok(box.width >= 120, `bigger live preview (${Math.round(box.width)}px wide)`);
    await p.click('.tab[data-part="eyes"]');
    await p.locator('#opts .opt').nth(3).click();
    ok(await p.locator('#preview2 .boing').count() === 1, 'choosing an option squash-bounces the preview');
    await swipe(p, -120);
    ok(await tab(p) === 'mouth', 'swipe left: next tab (Mun)');
    await swipe(p, 120); await swipe(p, 120);
    ok(await tab(p) === 'color', 'swipe right twice: back to Färg');
    const before = await p.evaluate(() => JSON.parse(localStorage.getItem('blobz.look')));
    await swipe(p, -15);
    const after = await p.evaluate(() => JSON.parse(localStorage.getItem('blobz.look')));
    ok(JSON.stringify(before) === JSON.stringify(after) && await tab(p) === 'color', 'a short drag does not switch tab');
    await p.click('.tab[data-part="hat"]');
    await p.locator('#opts .opt').nth(19).click();
    await p.click('.tab[data-part="shape"]'); await p.click('.tab[data-part="hat"]');
    const vis = await p.evaluate(() => { const o = document.getElementById('opts').getBoundingClientRect(); const t = document.querySelector('#opts .opt.on').getBoundingClientRect(); return t.top >= o.top - 2 && t.bottom <= o.bottom + 2; });
    ok(vis, 'hat #20 chosen: switching back to Hatt scrolls it into view');
    if (shots) { await p.waitForTimeout(400); await p.screenshot({ path: `${shots}/b-designer-portrait.png` }); }
    await p.reload();
    await p.click('#me').catch(() => {});
    await p.waitForSelector('#custom:not(.hidden)');
    ok(await tab(p) === 'hat', 'last tab (Hatt) remembered after reload');

    const lp = await (await browser.newContext({ locale: 'sv-SE', viewport: LANDSCAPE, isMobile: true, hasTouch: true })).newPage();
    await lp.goto(base);
    await lp.waitForSelector('#custom:not(.hidden)');
    await lp.click('.tab[data-part="hat"]');
    const tiles = await lp.evaluate(() => [...document.querySelectorAll('#opts .opt')].slice(0, 16).map((t) => Math.round(t.getBoundingClientRect().height)));
    ok(tiles.every((h) => h >= 56 && h === tiles[0]), `landscape: every hat tile is the same readable height (${tiles[0]}px)`);
    const perRow = await lp.evaluate(() => { const t = [...document.querySelectorAll('#opts .opt')]; return t.filter((x) => Math.abs(x.offsetTop - t[0].offsetTop) < 2).length; });
    ok(perRow >= 6 && perRow <= 8, `landscape: ${perRow} tiles per row`);
    const scrolls = await lp.evaluate(() => { const o = document.getElementById('opts'); return o.scrollHeight > o.clientHeight; });
    ok(scrolls, 'landscape: the hat grid scrolls instead of squeezing');
    if (shots) await lp.screenshot({ path: `${shots}/b-designer-landscape.png` });
    console.log('ALL PASSED');
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
