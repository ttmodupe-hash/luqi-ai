/** Public-assets-only offline cache. Never an account or AI response store. */
const CACHE_NAME = 'luqi-ai-public-v2';
const MAX_ENTRIES = 64;
const MAX_ENTRY_BYTES = 1024 * 1024;
const SHELL = ['/', '/index.html', '/manifest.json'];
let writes = Promise.resolve();

function assetKind(path) {
  if (path === '/' || path === '/index.html') return 'html';
  if (path === '/manifest.json') return 'json';
  if (path === '/luqi-mark.svg') return 'svg';
  if (path === '/favicon.ico') return 'ico';
  if (['/icon-192.png', '/icon-512.png', '/icon-maskable-512.png'].includes(path)) return 'png';
  const match = path.match(/^\/assets\/[A-Za-z0-9_-]+-[A-Za-z0-9_-]+\.(js|css|png|jpg|jpeg|svg|webp|woff|woff2)$/);
  return match ? match[1] : null;
}
function cacheable(response, kind) {
  if (!response || response.status !== 200 || response.redirected ||
      !['basic', 'default'].includes(response.type)) return false;
  if (/\b(?:no-store|no-cache|private)\b/i.test(response.headers.get('cache-control') || '')) return false;
  if ((response.headers.get('vary') || '').split(',').some(value => /^(?:\*|authorization|cookie)$/i.test(value.trim()))) return false;
  const type = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  const types = { html: ['text/html'], json: ['application/json', 'application/manifest+json'],
    js: ['text/javascript', 'application/javascript'], css: ['text/css'], png: ['image/png'],
    jpg: ['image/jpeg'], jpeg: ['image/jpeg'], svg: ['image/svg+xml'], webp: ['image/webp'],
    ico: ['image/x-icon', 'image/vnd.microsoft.icon'], woff: ['font/woff'], woff2: ['font/woff2'] };
  return types[kind]?.includes(type) === true;
}
async function boundedCopy(response) {
  if (!response.body) return null;
  const reader = response.body.getReader();
  let bytes = 0; const parts = [];
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      bytes += next.value.byteLength;
      if (bytes > MAX_ENTRY_BYTES) return null;
      parts.push(next.value);
    }
    const body = new Uint8Array(bytes); let offset = 0;
    for (const part of parts) { body.set(part, offset); offset += part.byteLength; }
    const headers = new Headers(response.headers);
    // Fetch decodes the body; do not describe the stored bytes as compressed.
    headers.delete('content-encoding'); headers.delete('content-length');
    return new Response(body, { status: 200, headers });
  } finally {
    // A cloned response can be a tee: cancellation must not wait for its peer.
    void reader.cancel().catch(() => {});
  }
}
function store(request, response, kind) {
  const candidate = cacheable(response, kind) ? response.clone() : null;
  const operation = async () => {
    const cache = await caches.open(CACHE_NAME);
    const copy = candidate ? await boundedCopy(candidate) : null;
    if (!copy) { await cache.delete(request); return; }
    await cache.put(request, copy);
    const keys = await cache.keys();
    for (const key of keys.slice(0, Math.max(0, keys.length - MAX_ENTRIES))) await cache.delete(key);
  };
  // Serialize maintenance so concurrent downloads cannot defeat the entry cap.
  writes = writes.then(operation).catch(() => {});
  return writes;
}
function offline() {
  return new Response('Offline. Reconnect to load this public resource.', {
    status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
async function cached(request, kind) {
  try {
    const cache = await caches.open(CACHE_NAME);
    const match = await cache.match(request);
    if (cacheable(match, kind)) return match;
    if (kind === 'html' && request.mode === 'navigate') {
      const shell = await cache.match('/index.html');
      if (cacheable(shell, 'html')) return shell;
    }
  } catch { /* Storage may be disabled or full. Always return a valid response. */ }
  return offline();
}
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    for (const path of SHELL) {
      try {
        const request = new Request(new URL(path, self.location.origin), { credentials: 'omit', cache: 'reload' });
        await store(request, await fetch(request), assetKind(path));
      } catch { /* An offline install must not make network access less reliable. */ }
    }
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    try {
      const names = await caches.keys();
      await Promise.all(names.filter(name => name.startsWith('luqi-ai-') && name !== CACHE_NAME).map(name => caches.delete(name)));
    } catch { /* Do not delete unrelated origin caches or prevent activation. */ }
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request; const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.search ||
      request.headers?.has('authorization') || request.headers?.has('range') ||
      /\b(?:no-store|no-cache)\b/i.test(request.headers?.get('cache-control') || '') ||
      ['no-store', 'no-cache'].includes(request.cache)) return;
  // Retain the explicit server-route boundary; the allowlist below is stricter.
  if (url.pathname.startsWith('/v1/') || url.pathname === '/health' ||
      url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/') ||
      url.pathname.startsWith('/trpc/')) return;
  const kind = assetKind(url.pathname);
  if (!kind) return;
  const network = fetch(request);
  // When a new deployment removes an old hashed chunk, a tab that already
  // downloaded that EXACT public JS/CSS file may still need its former import.
  // Use only the pre-validated same-URL, same-type cached 200 response; never
  // guess a substitute filename, cache a denial or fall back to the app shell.
  // Keep the existing v2 namespace: rotating it would discard those assets.
  const priorChunk = (kind === 'js' || kind === 'css') &&
    /^\/assets\/[A-Za-z0-9_-]+-[A-Za-z0-9_-]+\.(js|css)$/.test(url.pathname);
  const removedChunk = response => priorChunk && !response.redirected &&
    (response.status === 404 || response.status === 410);
  // Do not delete an exact, previously verified public asset merely because
  // its origin now returns 404/410. For any other response, retain the
  // existing cache privacy/size/revalidation rules and no automatic retries.
  event.waitUntil(network.then(response =>
    removedChunk(response) ? undefined : store(request, response, kind)
  ).catch(() => {}));
  event.respondWith(network.then(async response => {
    if (removedChunk(response)) {
      try {
        const old = await (await caches.open(CACHE_NAME)).match(request);
        if (cacheable(old, kind)) return old;
      } catch { /* Failed storage is not evidence of a usable old asset. */ }
    }
    return response;
  }).catch(() => cached(request, kind)));
});
