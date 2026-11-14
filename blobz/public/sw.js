// Minimal service worker so Android installs Blobz as a real app (own icon, no browser badge).
// Pass-through only: always loads the latest version from the network, caches nothing.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => { /* network as usual */ });
