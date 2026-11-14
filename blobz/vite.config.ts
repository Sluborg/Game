import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

// Version shown on the start screen: package version + git commit + build time (Stockholm).
function buildVersion() {
  const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };
  let sha = 'dev';
  try { sha = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { /* no git */ }
  const when = new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Stockholm', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  return `v${pkg.version} · ${sha} · ${when}`;
}

// Relative base so the build works at any Pages path (/Game/, /Game/dev/, ...).
export default defineConfig({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(buildVersion()) },
  build: { chunkSizeWarningLimit: 2000 },
});
