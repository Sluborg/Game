// E2E blob facing (blobz v2): mirrored left/right by the glide direction, glide frame while moving, on every phone.
// Reads window.__blobzFace[id] = { facing, frame } (?debug).
// Usage: npm run build && npx vite preview --port 4173 &  node e2e/face.cjs [baseUrl] [shotDir]
const { ok, startGame } = require('./helpers.cjs');
const base = process.argv[2] || 'http://localhost:4173/';

(async () => {
  const { browser, pages } = await startGame(base, ['Stefan', 'Ada']);
  const [host, ada] = pages;
  try {
    const adaId = await ada.evaluate(() => window.__blobzView.players.find((p) => p.name === 'Ada')?.id
      ?? window.__blobzView.players[1].id);
    // hold Ada in a steady glide on the host (position + velocity every 5 ms), read her face on Ada's phone
    await host.evaluate(() => {
      // nothing to bounce off around the test spot (a seeded tree there flips vx on a collision)
      const st = window.__blobz.state;
      st.trees = st.trees.filter((t) => Math.hypot(t.x - 640, t.y - 680) > 160);
      window.__hold = null;
      setInterval(() => { const h = window.__hold; if (h) Object.assign(window.__blobz.state.players[1], { x: 640, y: 680, vx: h[0], vy: h[1] }); }, 5);
    });
    // blobz v2: mirrored (flipX) when facing left, frame 1 while gliding; facing is kept while still or going straight up/down
    for (const [name, vx, vy, facing, frame] of [['still', 0, 0, 'right', 0], ['east', 150, 0, 'right', 1], ['north (keeps right)', 0, -150, 'right', 1],
      ['west', -150, 0, 'left', 1], ['south (keeps left)', 0, 150, 'left', 1], ['slow drift (keeps left, idle)', 20, 0, 'left', 0], ['south-east', 110, 110, 'right', 1]]) {
      await host.evaluate((h) => { window.__hold = h; }, [vx, vy]);
      const same = (f) => f && f.facing === facing && f.frame === frame;
      await ada.waitForFunction(([id, fa, fr]) => { const f = window.__blobzFace?.[id]; return f && f.facing === fa && f.frame === fr; }, [adaId, facing, frame], { timeout: 4000 }).catch(() => {});
      const got = await ada.evaluate((id) => window.__blobzFace?.[id], adaId);
      const onHost = await host.evaluate((id) => window.__blobzFace?.[id], adaId);
      ok(same(got) && same(onHost), `${name}: ${facing}, frame ${frame} on both phones (Ada ${JSON.stringify(got)}, host ${JSON.stringify(onHost)})`);
    }
    console.log('ALL PASSED');
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e.message); process.exit(1); });
