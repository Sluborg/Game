// Runs every e2e script against a local `vite preview` of the current build.
// Usage: npm run build && npm run e2e [-- shotDir]
const { spawn, spawnSync } = require('node:child_process');
const path = require('node:path');
const PORT = 4179;
const shots = process.argv[2] || '';
const scripts = ['lan-join.cjs', 'puzzles.cjs', 'gather.cjs', 'designer.cjs', 'build.cjs', 'dungeon.cjs', 'dungeon-weapons.cjs', 'dungeon-i18n.cjs', 'snow.cjs', 'mini.cjs', 'i18n.cjs', 'noread.cjs', 'face.cjs'];

(async () => {
  const vite = spawn(process.execPath, [path.join(__dirname, '..', 'node_modules', 'vite', 'bin', 'vite.js'), 'preview', '--port', String(PORT), '--strictPort'], { cwd: path.join(__dirname, '..'), stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 2500));
  let failed = 0;
  for (const s of scripts) {
    console.log(`\n=== ${s}`);
    const r = spawnSync(process.execPath, [path.join(__dirname, s), `http://localhost:${PORT}/`, shots], { stdio: 'inherit' });
    if (r.status !== 0) failed++;
  }
  vite.kill();
  console.log(failed ? `\n${failed} e2e script(s) FAILED` : '\nall e2e scripts passed');
  process.exit(failed ? 1 : 0);
})();
