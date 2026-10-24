/** LUQI public-file offline cache. Account/API traffic is network-only.
 * CacheStorage does not enforce HTTP Cache-Control, so this worker must.
 * No credentials, private responses, query URLs, retries or request replay.
 */
const CACHE_NAME = 'luqi-public-static-v2';
const RETIRED_CACHES = new Set(['luqi-ai-v1', 'luqi-ai-2026-09-06-fix1']);
const MAX_ENTRIES = 96;
const SHELL_PATHS = new Set(['/', '/index.html']);
const FIXED_FILES = new Map([
  ['/', 'html'], ['/index.html', 'html'], ['/manifest.json', 'json'],
  ['/luqi-mark.svg', 'svg'], ['/icon.svg', 'svg'], ['/icon-maskable.svg', 'svg'],
  ['/icon-192.png', 'png'], ['/icon-512.png', 'png'], ['/icon-maskable-512.png', 'png'],
]);
const MIME_TYPES = {
  html: ['text/html'], json: ['application/json', 'application/manifest+json'],
  js: ['text/javascript', 'application/javascript', 'application/ecmascript', 'text/ecmascript'],
  css: ['text/css'], svg: ['image/svg+xml'], png: ['image/png'],
  jpg: ['image/jpeg'], jpeg: ['image/jpeg'], webp: ['image/webp'], avif: ['image/avif'],
  woff: ['font/woff', 'application/font-woff'], woff2: ['font/woff2'],
};
const restrictive = value => /(?:^|,)\s*(?:no-store|private|no-cache|must-revalidate)(?:\s*(?:=|,|$))/i.test(value || '');
const header = (headers, name) => headers?.get(name) || '';
let cacheWrites = Promise.resolve();

function publicFile(request, url) {
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.search) return null;
  if (header(request.headers, 'authorization') || header(request.headers, 'range') ||
      restrictive(header(request.headers, 'cache-control')) ||
      ['no-store', 'no-cache', 'only-if-cached'].includes(request.cache)) return null;
  // Keep these explicit for deployment probes; the allowlist below also denies
  // bare prefixes, encoded paths, admin pages and any future unreviewed route.
  if (url.pathname.startsWith('/v1/') || url.pathname.startsWith('/api/') ||
      url.pathname.startsWith('/auth/') || url.pathname.startsWith('/trpc/') || url.pathname === '/health') return null;
  if (FIXED_FILES.has(url.pathname)) return FIXED_FILES.get(url.pathname);
  const asset = url.pathname.match(/^\/assets\/[A-Za-z0-9_-]+-[A-Za-z0-9_-]{8,}\.(js|css|svg|png|jpe?g|webp|avif|woff2?)$/);
  return asset ? asset[1] : null;
}

function publicResponse(response, kind) {
  if (!response || response.status !== 200 || response.type !== 'basic' || response.redirected) return false;
  if (restrictive(header(response.headers, 'cache-control')) || header(response.headers, 'set-cookie')) return false;
  const vary = header(response.headers, 'vary').split(',').map(value => value.trim().toLowerCase());
  if (vary.some(value => ['*', 'authorization', 'cookie'].includes(value))) return false;
  const mime = header(response.headers, 'content-type').split(';')[0].trim().toLowerCase();
  return MIME_TYPES[kind]?.includes(mime) === true;
}

function remember(request, response, kind) {
  const copy = response.clone();
  cacheWrites = cacheWrites.then(async () => {
    const cache = await caches.open(CACHE_NAME);
    // An explicitly non-cacheable replacement also removes an older copy.
    if (!publicResponse(copy, kind)) { await cache.delete(request); return; }
    await cache.put(request, copy);
    const keys = await cache.keys();
    let excess = keys.length - MAX_ENTRIES;
    for (const key of keys) {
      if (excess <= 0) break;
      if (SHELL_PATHS.has(new URL(key.url).pathname)) continue;
      if (await cache.delete(key)) excess--;
    }
  }).catch(() => {}); // Quota/private-mode failures must not break a valid network response.
  return cacheWrites;
}

function offline() {
  return new Response('This public file is unavailable offline. Reconnect and reload when ready.', {
    status: 503, statusText: 'Offline',
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

async function serve(request, kind) {
  try {
    const response = await fetch(request);
    return { response, maintenance: remember(request, response, kind) };
  } catch {
    try {
      await cacheWrites;
      const cache = await caches.open(CACHE_NAME);
      const stored = await cache.match(request);
      if (publicResponse(stored, kind)) return { response: stored };
      if (stored) await cache.delete(request);
      // Never use HTML as an API, admin, JS, image or arbitrary navigation fallback.
      if (SHELL_PATHS.has(new URL(request.url).pathname)) {
        const shell = await cache.match(new URL('/index.html', self.location.origin).href);
        if (publicResponse(shell, 'html')) return { response: shell };
      }
    } catch {} // Storage may be unavailable; return a real, public-safe Response.
    return { response: offline() };
  }
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    // Anonymous requests to fixed public files only. Each failure is independent.
    for (const path of ['/', '/index.html', '/manifest.json']) {
      try {
        const request = new Request(new URL(path, self.location.origin), {
          credentials: 'omit', cache: 'reload', redirect: 'error',
        });
        await remember(request, await fetch(request), FIXED_FILES.get(path));
      } catch {}
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    try {
      for (const name of await caches.keys()) {
        if (RETIRED_CACHES.has(name)) await caches.delete(name);
      }
    } catch {}
    // Do not delete unrelated applications' caches, localStorage or IndexedDB.
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const kind = publicFile(event.request, new URL(event.request.url));
  if (!kind) return;
  const result = serve(event.request, kind);
  event.respondWith(result.then(value => value.response));
  // Register lifetime protection synchronously, including asynchronous cache writes.
  event.waitUntil(result.then(value => value.maintenance).catch(() => {}));
});
