#!/usr/bin/env node
/* Which images are actually IN GAME? Runs the whole e2e suite (home, designer tabs, lobby, join, meadow gather/build/
 * puzzles, Bärregn, end screen, dungeon class pick / floors / boss / loot) with a hook in every page that logs:
 *   - requested: every image URL fetched over the network
 *   - shown:     every image actually on screen: visible DOM <img> / CSS background-image / border-image, and every
 *                WebGL texture (uploaded from an image) that is bound while Phaser issues a draw call
 * Writes docs/asset-runtime.json; scripts/asset_index.py reads it for the RUNTIME column.
 *
 * usage (from blobz/): npm run build && node scripts/asset_runtime.cjs && python3 scripts/asset_index.py
 * (the same file is also the per-process preload: node -r scripts/asset_runtime.cjs, ASSET_RT_LOG set)
 */
const fs = require('fs');
const path = require('path');

const PAGE_HOOK = `(() => {
  const seen = new Set();
  // Phaser loads images by XHR as Blobs and shows them via blob: URLs: map those back to the real file
  const blobUrl = new WeakMap(), objUrl = new Map();
  const xo = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (m, u, ...r) {
    this.addEventListener('load', () => { try { if (this.response instanceof Blob) blobUrl.set(this.response, new URL(u, location.href).href); } catch (e) { /* ignore */ } });
    return xo.call(this, m, u, ...r);
  };
  const co = URL.createObjectURL;
  URL.createObjectURL = function (o) { const r = co.call(URL, o); if (blobUrl.has(o)) objUrl.set(r, blobUrl.get(o)); return r; };
  const real = (u) => (typeof u === 'string' && u.startsWith('blob:') ? objUrl.get(u) : u);
  const add = (u) => {
    if (Array.isArray(u)) { u.forEach(add); return; }
    u = real(u);
    if (!u || u.startsWith('data:') || u.startsWith('blob:')) return;
    try { u = decodeURIComponent(new URL(u, location.href).pathname); } catch (e) { return; }
    if (seen.has(u)) return; seen.add(u); if (window.__rtShown) window.__rtShown(u);
  };
  for (const C of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
    if (!C) continue;
    const p = C.prototype, src = new WeakMap();
    const at = p.activeTexture, bt = p.bindTexture, ti = p.texImage2D, de = p.drawElements, da = p.drawArrays;
    p.activeTexture = function (u) { this.__u = u; return at.call(this, u); };
    p.bindTexture = function (t, tex) { if (t === this.TEXTURE_2D) (this.__b ||= {})[this.__u || 0] = tex; return bt.call(this, t, tex); };
    p.texImage2D = function (...a) {
      const img = a.find((x) => x && typeof x === 'object' && (('src' in x && x.src) || x.__srcs));
      const tex = (this.__b || {})[this.__u || 0];
      if (img && tex) src.set(tex, img.__srcs ? [...img.__srcs] : (img.currentSrc || img.src));
      return ti.apply(this, a);
    };
    const mark = (gl) => { for (const tex of Object.values(gl.__b || {})) { const s = tex && src.get(tex); if (s) add(s); } };
    p.drawElements = function (...a) { try { mark(this); } catch (e) { /* never break the game */ } return de.apply(this, a); };
    p.drawArrays = function (...a) { try { mark(this); } catch (e) { /* never break the game */ } return da.apply(this, a); };
  }
  const di = CanvasRenderingContext2D.prototype.drawImage; // DOM icons cut from sheets (Kenney tileCanvas, etc.)
  CanvasRenderingContext2D.prototype.drawImage = function (img, ...a) {
    // remember what went into this canvas (baked ground, sheet cuts) so a later upload/draw of the canvas counts
    const from = img && (img.__srcs ? [...img.__srcs] : img.src ? [real(img.currentSrc || img.src)] : []);
    if (from && from.length && this.canvas) { (this.canvas.__srcs ||= new Set()); from.forEach((f) => f && this.canvas.__srcs.add(f)); }
    if (img && img.__srcs && this.canvas && this.canvas.isConnected) add([...img.__srcs]);
    if (img && img.src && this.canvas && this.canvas.isConnected) add(img.currentSrc || img.src);
    else if (img && img.src && this.canvas) { const c = this.canvas, s2 = img.currentSrc || img.src; setTimeout(() => { if (c.isConnected && c.getClientRects().length) add(s2); }, 300); }
    return di.call(this, img, ...a);
  };
  const urls = (s) => { const out = []; String(s).replace(/url\\(["']?([^"')]+)["']?\\)/g, (_, u) => { out.push(u); return ''; }); return out; };
  setInterval(() => {
    for (const el of document.querySelectorAll('body *')) {
      if (!el.getClientRects().length) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || cs.opacity === '0') continue;
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth) add(el.currentSrc || el.src);
      for (const v of [cs.backgroundImage, cs.borderImageSource]) if (v && v !== 'none') urls(v).forEach(add);
    }
  }, 400);
})();`;

if (process.env.ASSET_RT_LOG) {
  // preload mode: patch Playwright so every page of every e2e script gets the hook and reports back
  const LOG = process.env.ASSET_RT_LOG;
  const put = (kind, u) => fs.appendFileSync(LOG, kind + '\t' + u + '\n');
  const pw = require(require.resolve('playwright', { paths: [process.cwd(), path.join(__dirname, '..')] }));
  const launch = pw.chromium.launch.bind(pw.chromium);
  pw.chromium.launch = async (...a) => {
    const b = await launch(...a);
    const wire = async (ctx) => {
      if (ctx.__rt) return; ctx.__rt = true;
      await ctx.exposeBinding('__rtShown', (_s, u) => put('shown', u));
      await ctx.addInitScript(PAGE_HOOK);
      ctx.on('request', (r) => { if (r.resourceType() === 'image' || /\.(png|gif|jpe?g|webp|svg)(\?|$)/i.test(r.url())) {
        try { put('requested', decodeURIComponent(new URL(r.url()).pathname)); } catch (e) { /* ignore */ } } });
    };
    const nc = b.newContext.bind(b);
    b.newContext = async (...x) => { const c = await nc(...x); await wire(c); return c; };
    const np = b.newPage.bind(b);
    b.newPage = async (...x) => { const c = await nc(...x); await wire(c); return c.newPage(); };
    return b;
  };
} else if (require.main === module) {
  const { spawnSync } = require('child_process');
  const ROOT = path.join(__dirname, '..');
  const log = path.join(ROOT, 'docs', '.asset-runtime.log');
  fs.writeFileSync(log, '');
  const r = spawnSync(process.execPath, [path.join(ROOT, 'e2e', 'run.cjs')], {
    cwd: ROOT, stdio: ['inherit', 'pipe', 'inherit'], maxBuffer: 1 << 28,
    env: { ...process.env, ASSET_RT_LOG: log, NODE_OPTIONS: `${process.env.NODE_OPTIONS || ''} -r ${__filename}` },
  });
  const text = r.stdout.toString();
  process.stdout.write(text);
  const sections = text.split('\n=== ').slice(1);
  const failed = sections.filter((sec) => /^FAIL|\nFAIL/.test(sec)).map((sec) => sec.split('\n')[0].trim());
  const res = { requested: new Set(), shown: new Set() };
  for (const line of fs.readFileSync(log, 'utf8').split('\n')) {
    const [k, u] = line.split('\t');
    if (u && res[k]) res[k].add(u.replace(/^\/(Game\/(dev\/)?)?(blobz\/)?/, ''));
  }
  fs.unlinkSync(log);
  const out = { e2e: failed.length ? `${sections.length - failed.length}/${sections.length} scripts passed (failed: ${failed.join(', ')})` : `all ${sections.length} scripts passed`, date: new Date().toISOString().slice(0, 10),
    requested: [...res.requested].sort(), shown: [...res.shown].sort() };
  fs.writeFileSync(path.join(ROOT, 'docs', 'asset-runtime.json'), JSON.stringify(out, null, 1) + '\n');
  console.log(`asset runtime: e2e ${out.e2e}, ${out.requested.length} requested, ${out.shown.length} shown`);
  process.exit(0); // a failed e2e check is reported in the json, the asset data is still valid
}
