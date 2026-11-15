// E2E (Code 2): no weapon sprites (Stefan 2026-11-15): every class attacks with an FX from the blob itself (slash,
// cut, arrow, magic missile), projectiles start at the blob's edge, and no weapon sprite is drawn on any phone.
// Two phones (portrait host, landscape joiner); a goo sits in a different direction per weapon.
// Usage: npm run build && npx vite preview --port 4173 &  node e2e/dungeon-weapons.cjs [baseUrl] [shotDir]
const { LANDSCAPE, ok, startGame, sim } = require('./helpers.cjs');
const base = process.argv[2] || 'http://localhost:4173/';
const shots = process.argv[3] || '';
const CLS = { dagger: 'rogue', sword: 'rogue', hammer: 'rogue', spear: 'rogue', staff: 'healer', bow: 'marksman', shield: 'tank' };
// goo direction per weapon (deg, screen y down) so every one is checked at a different angle
const DIRS = { dagger: -80, sword: 30, hammer: 150, spear: -35, staff: 200, bow: -140, shield: 90 };

(async () => {
  const { browser, pages } = await startGame(base, ['Stefan', 'Ada'], [undefined, LANDSCAPE], '&hitbox'); // screenshots show the sim's circles
  const [host, ada] = pages;
  try {
    await host.evaluate(() => { const s = window.__blobz.state; s.players.forEach((p, i) => { p.x = s.entrance.x + i * 10; p.y = s.entrance.y; }); });
    for (const p of pages) await p.waitForSelector('#weapon-pick:not(.hidden)', { timeout: 6000 });
    for (const p of pages) await p.click('.wcard[data-w="rogue"]'); // one weapon per class: the rogue gets the dagger at once
    for (const p of pages) await p.waitForFunction(() => window.__blobzView.mode === 'dungeon', null, { timeout: 6000 });
    const ids = await host.evaluate(() => window.__blobz.state.players.map((p) => p.id));
    await host.waitForTimeout(2200); // floor banner gone
    for (const w of Object.keys(CLS)) {
      const deg = DIRS[w], ranged = w === 'bow' || w === 'staff'; // the healer's wand shoots bolts
      for (const [i, p] of pages.entries()) {
        // this phone's blob gets one heavy goo in direction `deg`; the other blob holds still (no attacks)
        await sim(host, (s, a) => {
          const st = s.dg.map.start, t = (a.deg * Math.PI) / 180;
          s.dg.enemies = []; s.dg.coins = [];
          s.players.forEach((q, k) => {
            const h = s.dg.heroes[q.id];
            h.weapon = a.w; h.cls = a.cls; h.inv = 99; h.spT = 0; h.offer = []; h.atkCd = k === a.i ? 0.3 : 1e9;
            q.x = st.x - (k === a.i ? 0 : Math.cos(t) * 50); q.y = st.y - (k === a.i ? 0 : Math.sin(t) * 40); q.vx = 0; q.vy = 0;
          });
          // a boss-size goo barely moves when hit, so it stays in reach
          const r = a.ranged ? 90 : 17 + 34 + 6, me = s.players[a.i];
          s.dg.enemies.push({ id: s.dg.nextId++, kind: 2, x: me.x + Math.cos(t) * r, y: me.y + Math.sin(t) * r, vx: 0, vy: 0, hp: 999, mx: 999, awake: true, stun: 99, slamT: 99, slam: null });
        }, { w, cls: CLS[w], deg, ranged, i });
        // no weapon sprite anywhere (host + joiner); each attack plays its FX from the blob, projectiles from its edge
        const FX = { dagger: 'fx-cut', spear: 'fx-cut', sword: 'fx-slash', hammer: 'fx-slash', shield: 'fx-slash', bow: 'arrow', staff: 'fx-magic' }[w];
        const n0 = await p.evaluate((k) => window.__dgAtkFx?.[k] ?? 0, FX);
        await p.waitForFunction(([k, n0]) => (window.__dgAtkFx?.[k] ?? 0) >= n0 + 2, [FX, n0], { timeout: 8000 });
        const where = i ? 'joiner (landscape)' : 'host (portrait)';
        for (const q of pages) {
          const r = await q.evaluate(() => ({
            sprites: window.__dgScene.children.list.filter((o) => o.visible && typeof o.texture?.key === 'string' && o.texture.key.startsWith('w-')).length,
            flags: Object.values(window.__dgWeapon ?? {}).filter((g) => g.sprite).length,
            edge: window.__dgAtkFx?.edge ?? 0,
          }));
          ok(r.sprites === 0 && r.flags === 0 && (!ranged || r.edge >= 28), `${w} (${CLS[w]}) on ${where}: attacks show ${FX}, no weapon sprite on ${q === host ? 'host' : 'joiner'}${ranged ? `, the projectile starts ${r.edge} px out (blob edge)` : ''}`);
        }
        if (shots) await p.screenshot({ path: `${shots}/dg-attack-${w}-${i ? 'landscape' : 'portrait'}.png` });
      }
    }
    // blobz v2: the body mirrors with the glide (left = flipX), keeps its facing when gliding straight down or
    // standing still, and shows the glide frame (1) while moving, the idle frame (0) when still
    for (const [vx, vy, facing, frame] of [[160, 0, 'right', 1], [-160, 0, 'left', 1], [0, 160, 'left', 1], [0, 0, 'left', 0], [160, 0, 'right', 1]]) {
      await sim(host, (s) => { s.dg.enemies = []; s.players.forEach((q) => { const h = s.dg.heroes[q.id]; h.atkCd = 1e9; }); });
      // keep it gliding and poll (up to ~1 s after the first 8 ticks) until both phones show the expected facing + frame,
      // instead of sampling once (a single sample could land on frame 0 of the walk cycle)
      let f, g;
      for (let k = 0; k < 33; k++) {
        await sim(host, (s, a) => { const q = s.players[0]; q.x = s.dg.map.start.x; q.y = s.dg.map.start.y; q.vx = a.vx; q.vy = a.vy; }, { vx, vy });
        await host.waitForTimeout(40);
        if (k < 7) continue;
        f = await host.evaluate((id) => window.__dgFace?.[id], ids[0]);
        g = await ada.evaluate((id) => window.__dgFace?.[id], ids[0]);
        if (f?.facing === facing && g?.facing === facing && f?.frame === frame && g?.frame === frame) break;
      }
      ok(f?.facing === facing && g?.facing === facing && f?.frame === frame && g?.frame === frame, `blob v${vx},${vy}: faces ${facing}, frame ${frame} (host ${JSON.stringify(f)}, joiner ${JSON.stringify(g)})`);
    }
    console.log('\ndungeon weapons e2e passed');
  } catch (e) {
    console.error(e.message);
    if (shots) for (const [i, p] of pages.entries()) await p.screenshot({ path: `${shots}/dg-fail-w${i}.png` }).catch(() => {});
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
