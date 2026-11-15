// Shared Playwright helpers for Blobz e2e scripts (host + joiners via the Wi-Fi list).
const { chromium } = require('playwright');

const PORTRAIT = { width: 390, height: 844 };
const LANDSCAPE = { width: 844, height: 390 };
const ok = (cond, msg) => { if (!cond) throw new Error('FAIL: ' + msg); console.log('ok -', msg); };

async function phone(browser, name, size = PORTRAIT) {
  const ctx = await browser.newContext({ locale: 'sv-SE', viewport: size, hasTouch: true, isMobile: true });
  await ctx.addInitScript((n) => { localStorage.setItem('blobz.name', n); }, name);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log(`[${name}] pageerror`, e.message));
  return page;
}

/** Host + joiners in the lobby, game started. `query` is appended to every URL. */
async function startGame(base, names, sizes = [], query = '') {
  const lan = 'e2e-' + Math.random().toString(36).slice(2);
  const url = `${base}?lan=${lan}&debug${query}`;
  const browser = await chromium.launch();
  const pages = [];
  for (const [i, name] of names.entries()) {
    const p = await phone(browser, name, sizes[i] || PORTRAIT);
    await p.goto(url);
    if (i === 0) {
      await p.click('#btn-host');
      await p.waitForSelector('#lobby:not(.hidden)', { timeout: 20000 });
    } else {
      await p.click('#btn-show-join');
      await p.locator('.lanrow', { hasText: 'Joina ' + names[0] }).click({ timeout: 25000 });
      await p.waitForSelector('#lobby:not(.hidden)', { timeout: 20000 });
    }
    pages.push(p);
  }
  await pages[0].waitForFunction((n) => document.querySelectorAll('#lobby-list li').length === n, names.length, { timeout: 10000 });
  await pages[0].click('#btn-start');
  for (const p of pages) await p.waitForSelector('#hud:not(.hidden)', { timeout: 15000 });
  for (const p of pages) await p.waitForFunction(() => !!window.__blobzView, null, { timeout: 10000 });
  return { browser, pages };
}

/** Run fn(state, arg) inside the host's sim (needs ?debug). */
const sim = (host, fn, arg) => host.evaluate(([src, a]) => new Function('s', 'a', `return (${src})(s, a)`)(window.__blobz.state, a), [fn.toString(), arg]);
/** Teleport player #i (join order) to x,y and stop it. */
const place = (host, i, x, y) => sim(host, (s, a) => { const p = s.players[a.i]; p.x = a.x; p.y = a.y; p.vx = 0; p.vy = 0; }, { i, x, y });
const view = (page) => page.evaluate(() => window.__blobzView);

/** Share (0..1) of a page's screenshot, outside `skip` (a rect, e.g. the card), made of flat single-colour cells:
 *  catches letterboxed art with a plain fill. Decoded in the browser itself (no PNG library needed). */
async function flatShare(page, skip) {
  const png = (await page.screenshot()).toString('base64');
  return page.evaluate(async ({ png, skip }) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + png; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0);
    const k = img.width / window.innerWidth, N = 12, cw = img.width / N, ch = img.height / N;
    let flat = 0, all = 0;
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const cx = (i + 0.5) * cw / k, cy = (j + 0.5) * ch / k;
      if (skip && cx > skip.x && cx < skip.x + skip.width && cy > skip.y && cy < skip.y + skip.height) continue;
      const d = x.getImageData(i * cw, j * ch, cw, ch).data;
      let mn = 765, mx = 0;
      for (let p = 0; p < d.length; p += 16) { const v = d[p] + d[p + 1] + d[p + 2]; mn = Math.min(mn, v); mx = Math.max(mx, v); }
      all++; if (mx - mn < 12) flat++;
    }
    return all ? flat / all : 0;
  }, { png, skip });
}

module.exports = { flatShare, PORTRAIT, LANDSCAPE, ok, phone, startGame, sim, place, view };
