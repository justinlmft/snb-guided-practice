/* Service worker for the Stuck Not Broken app — scoped to /app/.
   Network-first for the app shell so updates propagate; offline falls back to
   cache (and to the cached index.html for navigations). Audio lives OUTSIDE this
   scope (/clips, /packs at the repo root) and streams from the network — we never
   intercept it. Bump SHELL_VERSION on any shell change to roll the cache. */
const SHELL_VERSION = 'snb-app-shell-v78';

const SHELL = [
  './',
  './index.html',
  './app.css',
  './app.js?v=10',
  './icons.js',
  './current.js',
  './config.js',
  './store.js',
  './from-justin.js',
  './player.html',
  './manifest.webmanifest',
  '../assets/logo/snb-mark-ink.svg'
];

// the path this SW controls, derived from its own scope (e.g. /snb-guided-practice/app/)
const SCOPE_PATH = new URL(self.registration.scope).pathname;

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(SHELL_VERSION).then((c) => c.addAll(SHELL).catch(() => {})));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== SHELL_VERSION).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // only handle same-origin requests inside the app scope; let audio / cross-origin pass through untouched
  if (url.origin !== location.origin) return;
  if (!url.pathname.startsWith(SCOPE_PATH)) return;

  e.respondWith((async () => {
    try {
      const fresh = await fetch(req);
      if (fresh && fresh.ok) {
        const cache = await caches.open(SHELL_VERSION);
        cache.put(req, fresh.clone());
      }
      return fresh;
    } catch (err) {
      const cached = await caches.match(req);
      if (cached) return cached;
      if (req.mode === 'navigate') {
        const idx = await caches.match('./index.html');
        if (idx) return idx;
      }
      throw err;
    }
  })());
});
