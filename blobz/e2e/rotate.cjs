// E2E: rotating / resizing never breaks the layout (Stefan 2026-11-15, "half the screen green"). Portrait -> landscape
// -> portrait in the menu and in the meadow: the Phaser canvas always matches the viewport, landscape on a phone shows
// the "turn your phone" overlay (input paused), turning back hides it and the game runs on, no page errors.
// Usage: npm run build && npx vite preview --port 4173 &  node e2e/rotate.cjs [baseUrl] [shotDir]
const { chromium } = require('playwright');
const { ok, sim } = require('./helpers.cjs');
const base = process.argv[2] || 'http://localhost:4173/';
const shots = process.argv[3] || '';
const P = { width: 390, height: 844 }, L = { width: 844, height: 390 };

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  try {
    const ctx = await browser.newContext({ locale: 'sv-SE', viewport: P, isMobile: true, hasTouch: true });
    await ctx.addInitScript(() => { localStorage.setItem('blobz.name', 'Stefan'); localStorage.setItem('blobz.rotateTest', '1'); });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errors.push(e.message));
    await p.goto(`${base}?lan=e2e-rot-${Math.random().toString(36).slice(2)}&debug`);
    await p.waitForSelector('#loading.hidden', { state: 'attached', timeout: 15000 });
    const overlay = () => p.isVisible('#rotate');
    // menu: landscape covers it, portrait shows it again
    await p.setViewportSize(L); await p.waitForTimeout(400);
    ok(await overlay(), 'menu in landscape: the "turn your phone" overlay is up');
    ok((await p.textContent('#rotate')).includes('Vänd telefonen'), 'overlay says "Vänd telefonen"');
    await p.setViewportSize(P); await p.waitForTimeout(400);
    ok(!(await overlay()) && await p.isVisible('#btn-host'), 'menu back in portrait: overlay gone, menu usable');
    // meadow
    await p.click('#btn-host'); await p.waitForSelector('#lobby:not(.hidden)'); await p.click('#btn-start');
    await p.waitForFunction(() => !!window.__blobzView, null, { timeout: 15000 });
    await p.waitForSelector('#loading.hidden', { state: 'attached', timeout: 15000 });
    const canvas = () => p.evaluate(() => { const c = document.querySelector('#game canvas'); const r = c.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), vw: innerWidth, vh: innerHeight }; });
    let c = await canvas();
    ok(c.w === c.vw && c.h === c.vh, `portrait: canvas ${c.w}x${c.h} matches the viewport ${c.vw}x${c.vh}`);
    await sim(p, (s) => { Object.assign(s.players[0], { x: 640, y: 700, vx: 0, vy: 0 }); });
    await p.setViewportSize(L); await p.waitForTimeout(500);
    c = await canvas();
    ok(c.w === c.vw && c.h === c.vh, `landscape: canvas ${c.w}x${c.h} matches the viewport ${c.vw}x${c.vh}`);
    ok(await overlay(), 'meadow in landscape: overlay up');
    // the host keeps simulating under the overlay: a gliding blob keeps moving (input is paused, momentum is not)
    const x0 = await sim(p, (st) => { Object.assign(st.players[0], { x: 600, y: 700, vx: 120, vy: 0 }); return st.players[0].x; });
    await p.waitForTimeout(500);
    const x1 = await sim(p, (st) => st.players[0].x);
    ok(x1 > x0 + 5, `the game keeps running under the overlay (blob glided ${Math.round(x1 - x0)} px)`);
    if (shots) await p.screenshot({ path: `${shots}/rotate-landscape.png` });
    await p.setViewportSize(P); await p.waitForTimeout(500);
    c = await canvas();
    ok(c.w === c.vw && c.h === c.vh, `back to portrait: canvas ${c.w}x${c.h} matches ${c.vw}x${c.vh}`);
    ok(!(await overlay()) && await p.isVisible('#hud'), 'back to portrait: overlay gone, HUD shown');
    // a resize while hidden (switching apps) settles too
    await p.setViewportSize({ width: 360, height: 780 }); await p.waitForTimeout(400);
    c = await canvas();
    ok(c.w === 360 && c.h === 780, `resized to 360x780: canvas follows (${c.w}x${c.h})`);
    ok(errors.length === 0, `no page errors (${errors.join(' | ') || 'none'})`);
    console.log('\nrotate e2e passed');
  } catch (e) {
    console.error(e.message || e); process.exitCode = 1;
  } finally { await browser.close(); }
})();
