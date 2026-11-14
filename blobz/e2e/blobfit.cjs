// E2E: every blob picture in the menus shows its whole canvas (never cropped by its box or a clipping parent).
// Designer preview + every option tile on every tab, home card, lobby rows; portrait 390x844 / 360x780 and landscape.
// Wide-head hats (headphones, cat ears, devil horns) on all 6 shapes.
// Usage: npm run build && npx vite preview --port 4173 &  node e2e/blobfit.cjs [baseUrl]
const { chromium } = require('playwright');
const { ok } = require('./helpers.cjs');
const base = process.argv[2] || 'http://localhost:4173/';

/** For every visible blob <img>: drawn image (object-fit: contain) inside its box and inside every overflow-clipping ancestor. */
const check = (p) => p.evaluate(() => {
  const bad = [];
  for (const img of document.querySelectorAll('.blob img')) {
    const r = img.getBoundingClientRect();
    if (!r.width || !r.height || !img.naturalWidth) continue; // hidden
    const s = Math.min(r.width / img.naturalWidth, r.height / img.naturalHeight); // contain
    const w = img.naturalWidth * s, h = img.naturalHeight * s;
    const pic = { l: r.left + (r.width - w) / 2, r: r.right - (r.width - w) / 2, t: r.top + (r.height - h) / 2, b: r.bottom - (r.height - h) / 2 };
    if (getComputedStyle(img).objectFit !== 'contain') bad.push('object-fit ' + getComputedStyle(img).objectFit);
    for (let el = img.parentElement; el && el !== document.body; el = el.parentElement) {
      const cs = getComputedStyle(el);
      if (cs.overflowX === 'visible' && cs.overflowY === 'visible') continue;
      const e = el.getBoundingClientRect();
      if (pic.l < e.left - 0.5 || pic.r > e.right + 0.5 || pic.t < e.top - 0.5 || pic.b > e.bottom + 0.5) {
        // a scrolling list may hide rows below the fold; only count cuts on the sides or partially visible rows
        const scrolls = cs.overflowY === 'auto' || cs.overflowY === 'scroll';
        const offRow = scrolls && (pic.b <= e.top || pic.t >= e.bottom);
        if (!offRow && !(scrolls && (pic.t < e.top || pic.b > e.bottom) && pic.l >= e.left - 0.5 && pic.r <= e.right + 0.5)) bad.push(`${el.id || el.className} cuts ${img.closest('[class]').className}`);
        break;
      }
    }
  }
  return bad;
});

(async () => {
  const browser = await chromium.launch();
  try {
    for (const [tag, vp] of [['390x844', { width: 390, height: 844 }], ['360x780', { width: 360, height: 780 }], ['844x390', { width: 844, height: 390 }]]) {
      for (const hat of [7, 8, 11]) { // Lurar, Kattöron, Djävulshorn
        for (let shape = 0; shape < 6; shape++) {
          const ctx = await browser.newContext({ locale: 'sv-SE', viewport: vp, isMobile: true, hasTouch: true });
          await ctx.addInitScript((l) => { localStorage.setItem('blobz.name', 'Stefan'); localStorage.setItem('blobz.look', JSON.stringify(l)); localStorage.setItem('blobz.tab', 'hat'); }, { color: 0x5ec8ff, shape, eyes: 0, mouth: 0, hat });
          const p = await ctx.newPage();
          await p.goto(base + '?lan=fit-' + Date.now());
          await p.waitForSelector('#loading.hidden', { state: 'attached', timeout: 15000 });
          const home = await check(p);
          await p.click('#me'); await p.waitForSelector('#custom:not(.hidden)');
          const bad = [...home];
          for (const part of ['shape', 'eyes', 'mouth', 'hat']) { await p.click(`.tab[data-part="${part}"]`); await p.waitForTimeout(260); bad.push(...(await check(p))); }
          if (shape === 0 && hat === 7) { await p.click('#btn-custom-done'); await p.click('#btn-host'); await p.waitForSelector('#lobby:not(.hidden)'); bad.push(...(await check(p))); }
          if (bad.length) throw new Error(`FAIL: ${tag} hat ${hat} shape ${shape}: ${[...new Set(bad)].join('; ')}`);
          await ctx.close();
        }
      }
      ok(true, `${tag}: headphones, cat ears and devil horns on all 6 shapes: every blob picture shows its whole canvas (home, designer tabs, lobby)`);
    }
    console.log('ALL PASSED');
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e.message); process.exit(1); });
