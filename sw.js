/* Service worker for the Stuck Not Broken guided-practice player.
   Strategy: "cache as you go".
   - App shell (HTML/UI/icons/captions) is precached → instant load + installable + works offline.
   - Audio clips are cached the first time they play, with HTTP Range support so iOS/Safari
     <audio> can seek/stream from cache → repeated sessions become offline-capable, no big
     upfront download.
   Bump SHELL_VERSION whenever index.html / sw.js change to roll the shell cache. */
const SHELL_VERSION = 'v3-pwa-5';
const SHELL = 'snb-shell-' + SHELL_VERSION;
const AUDIO = 'snb-audio-v1';
const FONTS = 'snb-fonts-v1';

const SHELL_ASSETS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'icon-192.png',
  'icon-512.png',
  'icon-maskable-512.png',
  'icon-180.png',
  'clips/captions.json',
  'clips/captions-timed.json'
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
    await Promise.all(keys.filter(k => ![SHELL, AUDIO, FONTS].includes(k)).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch (_) { return; }

  // audio clips → cache-first with Range support
  if (url.pathname.includes('/clips/') && url.pathname.endsWith('.mp3')) {
    e.respondWith(audioHandler(req, url));
    return;
  }
  // google fonts → stale-while-revalidate
  if (url.hostname.indexOf('fonts.googleapis.com') >= 0 || url.hostname.indexOf('fonts.gstatic.com') >= 0) {
    e.respondWith(staleWhileRevalidate(req, FONTS));
    return;
  }
  // same-origin shell → cache-first, refresh in background, offline fallback to app
  if (url.origin === self.location.origin) {
    e.respondWith(shellHandler(req));
    return;
  }
});

async function shellHandler(req) {
  const cache = await caches.open(SHELL);
  const cached = await cache.match(req, { ignoreSearch: true });
  if (cached) {
    fetch(req).then(r => { if (r && r.status === 200) cache.put(req, r.clone()); }).catch(() => {});
    return cached;
  }
  try {
    const net = await fetch(req);
    if (net && net.status === 200) cache.put(req, net.clone());
    return net;
  } catch (err) {
    if (req.mode === 'navigate') {
      const fallback = await cache.match('index.html') || await cache.match('./');
      if (fallback) return fallback;
    }
    throw err;
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const net = fetch(req).then(r => {
    if (r && (r.status === 200 || r.type === 'opaque')) cache.put(req, r.clone());
    return r;
  }).catch(() => cached);
  return cached || net;
}

/* Serve clips from cache; on first play fetch the FULL file (200), store it, then satisfy the
   browser's Range request by synthesizing a 206 from the cached bytes. */
async function audioHandler(req, url) {
  const cache = await caches.open(AUDIO);
  const key = new Request(url.origin + url.pathname); // strip query/range from the cache key
  let full = await cache.match(key);
  if (!full) {
    try {
      const net = await fetch(key);
      if (net && net.status === 200) { await cache.put(key, net.clone()); full = net; }
      else return fetch(req);
    } catch (err) {
      return full ? full : fetch(req);
    }
  }
  const range = req.headers.get('range');
  if (!range) return full.clone();

  const buf = await full.clone().arrayBuffer();
  const size = buf.byteLength;
  const m = /bytes=(\d*)-(\d*)/.exec(range) || [];
  let start = m[1] ? parseInt(m[1], 10) : 0;
  let end = m[2] ? parseInt(m[2], 10) : size - 1;
  if (isNaN(start)) start = 0;
  if (isNaN(end) || end > size - 1) end = size - 1;
  if (start > end || start >= size) {
    return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + size } });
  }
  const chunk = buf.slice(start, end + 1);
  return new Response(chunk, {
    status: 206,
    headers: {
      'Content-Type': 'audio/mpeg',
      'Content-Range': 'bytes ' + start + '-' + end + '/' + size,
      'Accept-Ranges': 'bytes',
      'Content-Length': String(chunk.byteLength)
    }
  });
}
