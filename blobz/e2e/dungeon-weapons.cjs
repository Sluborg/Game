// E2E (Code 2): every weapon is held at the body edge and attacks TOWARD the goo it hits.
// Two phones (portrait host, landscape joiner); for each weapon a goo sits in a different direction and
// the rendered weapon angle must point within 30 degrees of it. Screenshots mid-attack per weapon.
// Usage: npm run build && npx vite preview --port 4173 &  node e2e/dungeon-weapons.cjs [baseUrl] [shotDir]
const { LANDSCAPE, ok, startGame, sim } = require('./helpers.cjs');
const base = process.argv[2] || 'http://localhost:4173/';
const shots = process.argv[3] || '';
const CLS = { dagger: 'rogue', sword: 'rogue', hammer: 'rogue', spear: 'rogue', staff: 'healer', bow: 'marksman', shield: 'tank' };
// goo direction per weapon (deg, screen y down) so every one is checked at a different angle
const DIRS = { dagger: -80, sword: 30, hammer: 150, spear: -35, staff: 200, bow: -140, shield: 90 };
const angDiff = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

(async () => {
  const { browser, pages } = await startGame(base, ['Stefan', 'Ada'], [undefined, LANDSCAPE], '&hitbox'); // screenshots show the sim's circles
  const [host, ada] = pages;
  try {
    await host.evaluate(() => { const s = window.__blobz.state; s.players.forEach((p, i) => { p.x = s.entrance.x + i * 10; p.y = s.entrance.y; }); });
    for (const p of pages) await p.waitForSelector('#weapon-pick:not(.hidden)', { timeout: 6000 });
    for (const p of pages) { await p.click('.wcard[data-w="rogue"]'); await p.click('.wcard[data-w="sword"]'); }
    for (const p of pages) await p.waitForFunction(() => window.__blobzView.mode === 'dungeon', null, { timeout: 6000 });
    const ids = await host.evaluate(() => window.__blobz.state.players.map((p) => p.id));
    await host.waitForTimeout(2200); // floor banner gone
    for (const w of Object.keys(CLS)) {
      const deg = DIRS[w], ranged = w === 'bow';
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
        // a fresh attack after the switch (2 more swings, so none is left over from the last weapon)
        const n0 = await p.evaluate((id) => window.__dgWeapon?.[id]?.n ?? 0, ids[i]);
        const res = await p.waitForFunction(([id, w, n0]) => {
          const g = window.__dgWeapon?.[id];
          return g && g.swing && g.w === w && g.n >= n0 + 2 ? g : null;
        }, [ids[i], w, n0], { timeout: 8000 }).then((h) => h.jsonValue());
        const want = await host.evaluate(([i]) => { const s = window.__blobz.state, q = s.players[i], e = s.dg.enemies[0]; return Math.atan2(e.y - q.y, e.x - q.x); }, [i]);
        // the shield stays upright: it must sit on the body's edge toward the goo; everything else must point at it
        // slashing weapons (and the Riddare's sword) sweep across the line: the swing is aimed at the goo and the blade
        // stays within its arc; the daggers stab along the line (both sai point at it); spear / crossbow point at it
        const got = res.slash ? res.aim : res.a;
        const off = (angDiff(got, want) * 180) / Math.PI;
        const blade = (angDiff(res.a, want) * 180) / Math.PI;
        const held = Math.hypot(res.x - res.bx, res.y - res.by);
        const where = i ? 'joiner (landscape)' : 'host (portrait)';
        if (w === 'dagger') {
          const off2 = (angDiff(res.a2, want) * 180) / Math.PI, held2 = Math.hypot(res.x2 - res.bx, res.y2 - res.by);
          ok(off <= 30 && off2 <= 30 && held >= 18 && held <= 56 && held2 >= 18 && held2 <= 56, `dagger on ${where}: two sai stab at the goo (${off.toFixed(0)} / ${off2.toFixed(0)} deg off, <= 30), hovering ${held.toFixed(0)} / ${held2.toFixed(0)} px, stab #${res.stab}`);
        } else {
          ok(off <= 30 && (!res.slash || blade <= 75) && held >= 18 && held <= 56, `${w} on ${where}: ${res.slash ? `slashes across the goo (aim ${off.toFixed(0)} deg off, blade ${blade.toFixed(0)} deg into its arc)` : `points ${off.toFixed(0)} deg off the goo`} (<= 30), hovering ${held.toFixed(0)} px from the body centre`);
        }
        if (shots) await p.screenshot({ path: `${shots}/dg-attack-${w}-${i ? 'landscape' : 'portrait'}.png` });
      }
    }
    // blobz v2: the body mirrors with the glide (left = flipX), keeps its facing when gliding straight down or
    // standing still, and shows the glide frame (1) while moving, the idle frame (0) when still
    for (const [vx, vy, facing, frame] of [[160, 0, 'right', 1], [-160, 0, 'left', 1], [0, 160, 'left', 1], [0, 0, 'left', 0], [160, 0, 'right', 1]]) {
      await sim(host, (s) => { s.dg.enemies = []; s.players.forEach((q) => { const h = s.dg.heroes[q.id]; h.atkCd = 1e9; }); });
      for (let k = 0; k < 8; k++) { await sim(host, (s, a) => { const q = s.players[0]; q.x = s.dg.map.start.x; q.y = s.dg.map.start.y; q.vx = a.vx; q.vy = a.vy; }, { vx, vy }); await host.waitForTimeout(40); }
      const f = await host.evaluate((id) => window.__dgFace?.[id], ids[0]);
      const g = await ada.evaluate((id) => window.__dgFace?.[id], ids[0]);
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
