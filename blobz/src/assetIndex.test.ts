// Every image under public/ must be listed in docs/ASSET_INDEX.md (regenerate: python3 scripts/asset_index.py).
// Own files need their own row; Ninja Adventure files are covered by the per-folder rows. Uses Vite's glob + ?raw
// (no Node types in this project's tsconfig).
import { describe, expect, it } from 'vitest';
import md from '../docs/ASSET_INDEX.md?raw';

const files = Object.keys(import.meta.glob('/public/**/*.{png,gif,jpg,jpeg,webp,svg,PNG}')).map((p) => p.replace(/^\/public\//, ''));

describe('asset index', () => {
  it('lists every image under public/', () => {
    const folders = [...md.matchAll(/`(assets\/ninja-adventure\/[^`*]+)\/\*\*`/g)].map((m) => m[1] + '/');
    expect(files.length).toBeGreaterThan(300);
    const missing = files.filter((f) => !md.includes('`' + f + '`') && !folders.some((d) => f.startsWith(d)));
    expect(missing, 'run python3 scripts/asset_index.py').toEqual([]);
  });
});
