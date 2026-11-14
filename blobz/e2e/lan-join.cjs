// E2E: code-free joining on the same Wi-Fi. 1 host + 2 joiners in separate browser contexts.
// Usage: npm run build && npx vite preview --port 4173 &  node e2e/lan-join.cjs [baseUrl] [shotDir]
// `?lan=<seed>` stands in for the public IP (CI sandboxes often block STUN/UDP); contexts on one
// machine would share the real public IP anyway, so this exercises the same namespace path.
const { chromium } = require('playwright');
const base = process.argv[2] || 'http://localhost:4173/';
const shots = process.argv[3] || '';
const lan = 'e2e-' + Math.random().toString(36).slice(2);
const url = (extra = '') => `${base}?lan=${lan}&t=40${extra}`;

async function phone(browser, name, size = { width: 390, height: 844 }) {
  const ctx = await browser.newContext({ viewport: size, hasTouch: true, isMobile: true });
  await ctx.addInitScript((n) => { localStorage.setItem('blobz.name', n); }, name);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log(`[${name}] pageerror`, e.message));
  return page;
}
const ok = (cond, msg) => { if (!cond) throw new Error('FAIL: ' + msg); console.log('ok -', msg); };

(async () => {
  const browser = await chromium.launch();
  try {
    const host = await phone(browser, 'Stefan');
    await host.goto(url());
    await host.click('#btn-host');
    await host.waitForSelector('#lobby:not(.hidden)', { timeout: 20000 });
    ok((await host.locator('#lobby-code, #hud-code, #code').count()) === 0, 'no room code anywhere in the UI');
    await host.waitForFunction(() => !document.querySelector('#lobby-lan.warn') && /Joina/.test(document.querySelector('#lobby-lan').textContent), null, { timeout: 20000 });
    ok(true, 'host lobby says friends on the same Wi-Fi can tap Joina');

    const joiners = [];
    for (const [i, name] of ['Ada', 'Bo'].entries()) {
      const p = await phone(browser, name, i === 1 ? { width: 844, height: 390 } : undefined);
      await p.goto(url());
      await p.click('#btn-show-join');
      ok(await p.isVisible('#lan-status'), `${name} sees "Letar efter spel..." while scanning`);
      const row = p.locator('.lanrow', { hasText: 'Joina Stefan' });
      await row.waitFor({ timeout: 25000 });
      ok(true, `${name} sees "Joina Stefan" without typing a code (${await row.innerText().then((t) => t.replace(/\s+/g, ' '))})`);
      if (shots) await p.screenshot({ path: `${shots}/joina-list-${i ? 'landscape' : 'portrait'}.png` });
      await row.click();
      await p.waitForSelector('#lobby:not(.hidden)', { timeout: 20000 });
      ok(true, `${name} is in the lobby`);
      joiners.push(p);
    }
    await host.waitForFunction(() => document.querySelectorAll('#lobby-list li').length === 3, null, { timeout: 10000 });
    ok(true, 'host lobby lists 3 players');
    if (shots) await host.screenshot({ path: `${shots}/joina-lobby-host.png` });

    await host.click('#btn-start');
    for (const p of [host, ...joiners]) await p.waitForSelector('#hud:not(.hidden)', { timeout: 15000 });
    ok(true, 'game started for host and both joiners');

    // A late phone sees the running game marked "pågår" (late join allowed).
    const late = await phone(browser, 'Cy');
    await late.goto(url());
    await late.click('#btn-show-join');
    const lateRow = late.locator('.lanrow', { hasText: 'Joina Stefan' });
    await lateRow.waitFor({ timeout: 25000 });
    ok(/3\/5.*pågår/s.test(await lateRow.innerText()), 'late phone sees "3/5 · pågår"');
    if (shots) await late.screenshot({ path: `${shots}/joina-pagar.png` });

    // Host leaves: the row disappears from the list.
    await host.context().close();
    await late.locator('.lanrow').waitFor({ state: 'detached', timeout: 30000 });
    ok(true, 'row disappears after the host leaves');
    console.log('ALL PASSED');
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
