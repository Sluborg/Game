import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

// Version shown on the start screen: the short release number in ./VERSION (v017, v017b, ...).
// The git commit is kept as a tooltip for debugging.
function buildVersion() {
  const v = readFileSync(new URL('./VERSION', import.meta.url), 'utf8').trim();
  let sha = 'dev';
  try { sha = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { /* no git */ }
  return { v, sha };
}
const VERSION = buildVersion();

// Relative base so the build works at any Pages path (/Game/, /Game/dev/, ...).
export default defineConfig({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(VERSION.v), __APP_COMMIT__: JSON.stringify(VERSION.sha) },
  build: { chunkSizeWarningLimit: 2000 },
});
