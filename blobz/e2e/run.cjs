// Runs every e2e script against ONE local `vite preview` of the current build, several specs at a time.
// Usage: npm run build && npm run e2e [-- shotDir]      env: E2E_JOBS (parallel specs, default 3),
//        E2E_SPEC_TIMEOUT (seconds per spec, default 300), E2E_ONLY (comma list of spec names to run)
// Each spec runs in its own node process with its own browser; its output is buffered and printed as one block
// when it finishes, so the log stays grouped. A summary with the times comes last; exit 1 if any spec failed.
// Specs are independent: every one uses its own random `?lan=` namespace, so parallel runs never see each other.
const { spawn } = require('node:child_process');
const path = require('node:path');
const PORT = 4179;
const shots = process.argv[2] || '';
const JOBS = Math.max(1, Number(process.env.E2E_JOBS) || 3);
const SPEC_TIMEOUT = (Number(process.env.E2E_SPEC_TIMEOUT) || 300) * 1000;
// longest first, so the slow ones do not end up alone at the tail
const ALL = ['dungeon-map.cjs', 'dungeon-map-deep.cjs', 'dungeon-map-boss.cjs', 'blobfit.cjs', 'dungeon.cjs', 'gather.cjs', 'build.cjs', 'dungeon-weapons.cjs', 'lan-join.cjs', 'i18n.cjs',
  'dungeon-i18n.cjs', 'dungeon-solo.cjs', 'dungeon-layout.cjs', 'puzzles.cjs', 'designer.cjs', 'noread.cjs',
  'face.cjs', 'snow.cjs', 'mini.cjs'];
const only = (process.env.E2E_ONLY || '').split(',').map((s) => s.trim()).filter(Boolean);
const scripts = only.length ? ALL.filter((s) => only.includes(s) || only.includes(s.replace('.cjs', ''))) : ALL;

function runSpec(s) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const chunks = [];
    const child = spawn(process.execPath, [path.join(__dirname, s), `http://localhost:${PORT}/`, shots], { stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.on('data', (d) => chunks.push(d));
    child.stderr.on('data', (d) => chunks.push(d));
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, SPEC_TIMEOUT);
    child.on('close', (code) => {
      clearTimeout(timer);
      const out = Buffer.concat(chunks).toString().split('\n').filter((l) => !/GL Driver Message/.test(l)).join('\n').trimEnd();
      const ok = code === 0 && !timedOut;
      resolve({ s, ok, secs: (Date.now() - t0) / 1000, out: out + (timedOut ? `\nFAIL: timed out after ${SPEC_TIMEOUT / 1000} s` : '') });
    });
  });
}

(async () => {
  const t0 = Date.now();
  const vite = spawn(process.execPath, [path.join(__dirname, '..', 'node_modules', 'vite', 'bin', 'vite.js'), 'preview', '--port', String(PORT), '--strictPort'], { cwd: path.join(__dirname, '..'), stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 2500));
  const queue = [...scripts];
  const results = [];
  const worker = async () => {
    while (queue.length) {
      const r = await runSpec(queue.shift());
      results.push(r);
      console.log(`\n=== ${r.s}  (${r.ok ? 'ok' : 'FAILED'}, ${r.secs.toFixed(0)} s)\n${r.out}`);
    }
  };
  await Promise.all(Array.from({ length: Math.min(JOBS, scripts.length) }, worker));
  vite.kill();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n--- summary (${JOBS} at a time, ${((Date.now() - t0) / 1000).toFixed(0)} s total)`);
  for (const r of [...results].sort((a, b) => b.secs - a.secs)) console.log(`${r.ok ? 'ok    ' : 'FAILED'} ${r.secs.toFixed(0).padStart(4)} s  ${r.s}`);
  console.log(failed.length ? `\n${failed.length} e2e script(s) FAILED: ${failed.map((r) => r.s).join(', ')}` : '\nall e2e scripts passed');
  process.exit(failed.length ? 1 : 0);
})();
