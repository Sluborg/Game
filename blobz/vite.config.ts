import { defineConfig } from 'vite';

// Relative base so the build works at any Pages path (/Game/, /Game/dev/, ...).
export default defineConfig({
  base: './',
  build: { chunkSizeWarningLimit: 2000 },
});
