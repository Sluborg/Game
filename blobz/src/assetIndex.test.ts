// Every image under public/ must be listed in docs/ASSET_INDEX.md (regenerate: python3 scripts/asset_index.py).
// Own files need their own row; Ninja Adventure files are covered by the per-folder rows.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PUB = join(ROOT, 'public');
const IMG = /\.(png|gif|jpe?g|webp|svg)$/i;

function walk(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (IMG.test(f)) out.push(relative(PUB, p).split(sep).join('/'));
  }
  return out;
}

describe('asset index', () => {
  it('lists every image under public/', () => {
    const md = readFileSync(join(ROOT, 'docs', 'ASSET_INDEX.md'), 'utf8');
    const folders = [...md.matchAll(/`(assets\/ninja-adventure\/[^`*]+)\/\*\*`/g)].map((m) => m[1] + '/');
    const missing = walk(PUB).filter((f) => !md.includes('`' + f + '`') && !folders.some((d) => f.startsWith(d)));
    expect(missing, 'run python3 scripts/asset_index.py').toEqual([]);
  });
});
