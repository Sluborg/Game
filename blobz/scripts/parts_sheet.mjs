// Render a contact sheet of every blob part (eyes, mouths, hats) to a PNG for art review.
// usage (from blobz/): node scripts/parts_sheet.mjs [out.png] [--all]
//   default: each part on 3 shape/color combos; --all: each part on all 6 shapes.
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

const COMBOS = all
  ? [0, 1, 2, 3, 4, 5].map((shape, i) => ({ shape, color: [0x5ec8ff, 0xffc93c, 0xff6b8b, 0xe63946, 0x7ddc5a, 0xf2f2f2][i] }))
  : [{ shape: 0, color: 0x5ec8ff }, { shape: 4, color: 0xffc93c }, { shape: 5, color: 0xff6b8b }];

const page = `<!doctype html><meta charset="utf-8"><style>
body{margin:0;padding:16px;background:#6abf3a;font:12px monospace;color:#1b1018}
h2{margin:12px 0 6px;font-size:16px}.grid{display:flex;flex-wrap:wrap;gap:8px}
.cell{background:#7ccf4a;padding:4px;border-radius:6px;text-align:center}
canvas{image-rendering:pixelated;display:inline-block}</style><body><script type="module">
${lib.replace(/export\s*\{[^}]*\};?\s*$/, '')}
const combos = ${JSON.stringify(COMBOS)};
const base = { eyes: 0, mouth: 1, hat: 0 };
for (const [title, key, names] of [['Eyes', 'eyes', EYES], ['Mouths', 'mouth', MOUTHS], ['Hats', 'hat', HATS]]) {
  const h = document.createElement('h2'); h.textContent = title; document.body.append(h);
  const grid = document.createElement('div'); grid.className = 'grid'; document.body.append(grid);
  names.forEach((name, i) => {
    const cell = document.createElement('div'); cell.className = 'cell';
    for (const c of combos) cell.append(blobCanvas({ ...base, ...c, [key]: i }, 3));
    const label = document.createElement('div'); label.textContent = i + ' ' + name; cell.append(label);
    grid.append(cell);
  });
}
document.body.dataset.done = '1';
</script>`;

const browser = await chromium.launch();
const p = await browser.newPage({ viewport: { width: all ? 1500 : 1200, height: 800 } });
await p.setContent(page);
await p.waitForSelector('body[data-done]');
await p.screenshot({ path: out, fullPage: true });
await browser.close();
console.log('wrote', out);
