// COMPANY Portal — service worker (required for PWA installability).
// The fetch handler must exist for Chrome to show the install prompt,
// but we intentionally do NOT call e.respondWith() so the browser
// handles every request natively — nothing is intercepted or cached.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {
  // Intentionally empty — do not intercept any requests.
});
