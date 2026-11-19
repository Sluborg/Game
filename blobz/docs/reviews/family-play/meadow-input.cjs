// Run with the same Playwright installation as blobz/e2e: node meadow-input.cjs
// Optional: CHROMIUM_PATH=/path/to/chromium. Both pages are served from disk
// via Playwright routing, with a shared origin so reload uses browser storage.
const assert = require('node:assert/strict');
const { join } = require('node:path');
const { chromium } = require('playwright');

async function checkTargets(page) {
  const layout = await page.evaluate(() => {
    const buttons = [...document.querySelectorAll('button')].filter(button => button.getClientRects().length);
    return {
      fits: document.documentElement.scrollWidth <= innerWidth,
      small: buttons.filter(button => {
        const box = button.getBoundingClientRect();
        return box.width < 44 || box.height < 44;
      }).map(button => button.textContent)
    };
  });
  assert.ok(layout.fits, 'page overflows horizontally');
  assert.deepEqual(layout.small, [], 'button below 44 CSS pixels');
}

async function tabTo(page, target) {
  for (let step = 0; step < 16; step++) {
    if (await target.evaluate(button => button === document.activeElement)) return;
    await page.keyboard.press('Tab');
  }
  assert.fail('button unreachable with Tab: ' + await target.textContent());
}

async function run(browser, touch) {
  const context = await browser.newContext({
    viewport: touch ? { width: 360, height: 740 } : { width: 390, height: 844 },
    locale: 'sv-SE', hasTouch: touch, isMobile: touch
  });
  try {
    await context.route('**/*', route => {
      const filename = new URL(route.request().url()).pathname.slice(1);
      if (filename === 'art/discovery-tokens.png') {
        return route.fulfill({ path: join(__dirname, filename), contentType: 'image/png' });
      }
      if (!['glowcap.html', 'reed-pool.html', 'cottage-display.html'].includes(filename)) return route.abort();
      return route.fulfill({ path: join(__dirname, filename), contentType: 'text/html' });
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const button = name => page.getByRole('button', { name, exact: true });
    async function act(name, key = 'Enter') {
      const target = button(name);
      if (touch) return target.tap();
      await tabTo(page, target);
      await page.keyboard.press(key);
    }

    await page.goto('http://meadow.invalid/glowcap.html');
    await checkTargets(page);
    await act('Följ bågen');
    assert.match(await page.locator('#trail').innerText(), /mörkt/);
    for (const lamp of ['Ställ vid roten', 'Ställ vid stenen']) {
      await act(lamp, 'Space');
      const clue = await page.locator('#clue').innerText();
      assert.match(clue, /mot (bågen|klykan)/);
      const arch = clue.includes('mot bågen');
      await act(arch ? 'Följ klykan' : 'Följ bågen');
      assert.match(await page.locator('#trail').innerText(), /stubbe/);
      await act(arch ? 'Följ bågen' : 'Följ klykan');
    }
    await act('Sök under lövet');
    await checkTargets(page);
    await act('Leta igen');
    await page.reload();
    assert.match(await page.locator('#trail').innerText(), /Picknickplatsen finns kvar/);

    await page.goto('http://meadow.invalid/reed-pool.html');
    await checkTargets(page);
    await act('Släpp flotten');
    await button('Släpp flotten igen').waitFor({ timeout: 12000 });
    await act('Pilbryggan', 'Space');
    await act('Släpp flotten igen');
    await button('Plantera vid stranden').waitFor({ timeout: 12000 });
    await checkTargets(page);
    await act('Plantera vid stranden');
    assert.match(await page.locator('#flower').innerText(), /stranden/);
    await page.reload();
    assert.match(await page.locator('#flower').innerText(), /stranden/);

    await page.goto('http://meadow.invalid/cottage-display.html');
    await checkTargets(page);
    await act('Plant flower');
    assert.match(await page.locator('#recap').innerText(), /Clay tracks/);
    await act('Ring seed bell');
    await act('Find picnic');
    await checkTargets(page);
    await act('Lantern stepping stones Clay + Glow');
    assert.match(await page.locator('#project-status').innerText(), /Pinned: Lantern/);
    await page.reload();
    assert.equal(await page.locator('#clay').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('#glow').getAttribute('aria-pressed'), 'true');
    assert.match(await page.locator('#recap').innerText(), /Picnic clearing/);
    assert.deepEqual(errors, []);
    console.log(touch ? 'Touch emulation passed (360px)' : 'Keyboard passed (390px)');
  } finally {
    await context.close();
  }
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
  try {
    await run(browser, false);
    await run(browser, true);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
