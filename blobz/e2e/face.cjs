// E2E face direction: a blob's face looks where it glides, on every phone (FACE_DIRS index from faceIndex()).
// 0 = straight ahead (slow), 1 N, 2 NE, 3 E, 4 SE, 5 S, 6 SW, 7 W, 8 NW. Reads window.__blobzFace (?debug).
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
      window.__hold = null;
      setInterval(() => { const h = window.__hold; if (h) Object.assign(window.__blobz.state.players[1], { x: 640, y: 680, vx: h[0], vy: h[1] }); }, 5);
    });
    for (const [name, vx, vy, want] of [['still', 0, 0, 0], ['north', 0, -150, 1], ['east', 150, 0, 3], ['south-east', 110, 110, 4], ['west', -150, 0, 7], ['slow drift', 20, 0, 0]]) {
      await host.evaluate((h) => { window.__hold = h; }, [vx, vy]);
      await ada.waitForFunction(([id, w]) => window.__blobzFace?.[id] === w, [adaId, want], { timeout: 4000 })
        .catch(() => {});
      const got = await ada.evaluate((id) => window.__blobzFace?.[id], adaId);
      const onHost = await host.evaluate((id) => window.__blobzFace?.[id], adaId);
      ok(got === want && onHost === want, `${name}: face ${want} on both phones (Ada sees ${got}, host sees ${onHost})`);
    }
    console.log('ALL PASSED');
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e.message); process.exit(1); });
