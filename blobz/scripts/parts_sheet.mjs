// Render a contact sheet of every blob part (eyes, mouths, hats) to a PNG for art review.
// usage (from blobz/): node scripts/parts_sheet.mjs [out.png] [--all]
//   default: eyes/mouths on 3 shape/color combos, hats on all 6 shapes; --all: everything on all 6.
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Playwright is preinstalled globally (not a project dependency): resolve it via CommonJS require.
const { chromium } = createRequire(import.meta.url)('playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const all = args.includes('--all');
const out = path.resolve(args.find((a) => !a.startsWith('--')) ?? path.join(root, 'docs/art-review/parts-sheet.png'));

const lib = (await build({ entryPoints: [path.join(root, 'src/blob.ts')], bundle: true, format: 'esm', write: false })).outputFiles[0].text;

const ALL6 = [0, 1, 2, 3, 4, 5].map((shape, i) => ({ shape, color: [0x5ec8ff, 0xffc93c, 0xff6b8b, 0xe63946, 0x7ddc5a, 0xf2f2f2][i] }));
const COMBOS = all ? ALL6 : [{ shape: 0, color: 0x5ec8ff }, { shape: 4, color: 0xffc93c }, { shape: 5, color: 0xff6b8b }];
// hats always on all 6 shapes (head fit is shape-dependent)

const page = `<!doctype html><meta charset="utf-8"><style>
body{margin:0;padding:16px;background:#6abf3a;font:12px monospace;color:#1b1018}
h2{margin:12px 0 6px;font-size:16px}.grid{display:flex;flex-wrap:wrap;gap:8px}
.cell{background:#7ccf4a;padding:4px;border-radius:6px;text-align:center}
canvas{image-rendering:pixelated;display:inline-block}</style><body><script type="module">
${lib.replace(/export\s*\{[^}]*\};?\s*$/, '')}
const combos = ${JSON.stringify(COMBOS)};
const all6 = ${JSON.stringify(ALL6)};
const base = { eyes: 0, mouth: 1, hat: 0 };
for (const [title, key, names] of [['Eyes', 'eyes', EYES], ['Mouths', 'mouth', MOUTHS], ['Hats', 'hat', HATS]]) {
  const h = document.createElement('h2'); h.textContent = title; document.body.append(h);
  const grid = document.createElement('div'); grid.className = 'grid'; document.body.append(grid);
  names.forEach((name, i) => {
    const cell = document.createElement('div'); cell.className = 'cell';
    for (const c of key === 'hat' ? all6 : combos) cell.append(blobCanvas({ ...base, ...c, [key]: i }, 3));
    const label = document.createElement('div'); label.textContent = i + ' ' + name; cell.append(label);
    grid.append(cell);
  });
}
{ // dungeon class hats (blobGrid classHat), all 6 shapes
  const h = document.createElement('h2'); h.textContent = 'Class hats'; document.body.append(h);
  const grid = document.createElement('div'); grid.className = 'grid'; document.body.append(grid);
  CLASS_HATS.forEach((name, i) => {
    const cell = document.createElement('div'); cell.className = 'cell';
    for (const c of all6) cell.append(blobCanvas({ ...base, ...c }, 3, i));
    const label = document.createElement('div'); label.textContent = 'class ' + i + ' ' + name; cell.append(label);
    grid.append(cell);
  });
}
document.body.dataset.done = '1';
</script>`;

const browser = await chromium.launch();
const p = await browser.newPage({ viewport: { width: 1500, height: 800 } });
await p.setContent(page);
await p.waitForSelector('body[data-done]');
await p.screenshot({ path: out, fullPage: true });
await browser.close();
console.log('wrote', out);
