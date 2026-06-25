/* Service worker for the Stuck Not Broken app (snb app), scoped to /app/.
   Strategy: network-first for the app shell (always fresh online, works offline as fallback).
   Audio clips live OUTSIDE this scope (../clips/) and stream from the network; they are
   not handled here. Bump SHELL_VERSION whenever any shell file changes. */
const SHELL_VERSION = 'snbapp-v1';
const SHELL = 'snbapp-shell-' + SHELL_VERSION;

const SHELL_ASSETS = [
  './',
  'index.html',
  'app.css',
  'current.js',
  'config.js',
  'store.js',
  'app.js',
  'practice.html',
  'snb-mark-ink.svg',
  'manifest.webmanifest'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(SHELL).then(c => Promise.allSettled(
    SHELL_ASSETS.map(a => c.add(a).catch(() => {}))
  )));
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== SHELL && k.startsWith('snbapp-')).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch (_) { return; }
  // only handle same-origin requests inside this SW's scope; let clips/fonts/CDN pass through
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith(new URL('./', self.location).pathname)) return;

  e.respondWith((async () => {
    const cache = await caches.open(SHELL);
    try {
      const net = await fetch(req);
      if (net && net.status === 200) cache.put(req, net.clone());
      return net;
    } catch (err) {
      const cached = await cache.match(req, { ignoreSearch: true });
      if (cached) return cached;
      if (req.mode === 'navigate') {
        const fallback = await cache.match('index.html') || await cache.match('./');
        if (fallback) return fallback;
      }
      throw err;
    }
  })());
});
