import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

const origin = 'https://luqi.example';
const name = 'luqi-ai-public-v2';
const text = (value = 'public fixture', headers = {}) => new Response(value, {
  headers: { 'Content-Type': 'text/javascript', ...headers },
});
const sources = await Promise.all(['public/service-worker.js', 'app/public/sw.js'].map(async path =>
  [path, await readFile(new URL('../' + path, import.meta.url), 'utf8')]));

function harness(source, network = async () => text()) {
  const listeners = {}; const buckets = new Map(); const requests = []; const removed = [];
  let claimed = 0, skipped = 0, rejectStorage = false, rejectPut = false;
  const keyOf = request => new URL(typeof request === 'string' ? request : request.url, origin).href;
  const caches = {
    async open(key) {
      if (rejectStorage) throw new Error('synthetic storage failure');
      if (!buckets.has(key)) buckets.set(key, new Map());
      const data = buckets.get(key);
      return {
        async put(request, response) {
          if (rejectPut) throw new Error('synthetic quota failure');
          const key = keyOf(request); data.delete(key); data.set(key, response.clone());
        },
        async match(request) { return data.get(keyOf(request))?.clone(); },
        async keys() { return [...data.keys()].map(key => new Request(key)); },
        async delete(request) { return data.delete(keyOf(request)); },
      };
    },
    async keys() { if (rejectStorage) throw new Error('synthetic storage failure'); return [...buckets.keys()]; },
    async delete(key) { removed.push(key); return buckets.delete(key); },
  };
  runInNewContext(source, {
    self: { location: { origin }, addEventListener: (event, callback) => { listeners[event] = callback; },
      skipWaiting: async () => { skipped++; }, clients: { claim: async () => { claimed++; } } },
    URL, Request, Response, Headers, Uint8Array, caches,
    fetch: async request => { requests.push(request.url); return network(request); },
  });
  return {
    buckets, requests, removed, caches,
    storageUnavailable() { rejectStorage = true; }, putUnavailable() { rejectPut = true; },
    counts() { return { claimed, skipped }; },
    async lifecycle(type) {
      const jobs = []; listeners[type]({ waitUntil: promise => jobs.push(promise) });
      await Promise.all(jobs); assert.ok(jobs.length > 0);
    },
    async dispatch(path, options = {}) {
      const { mode, ...init } = options;
      const request = new Request(new URL(path, origin), init);
      if (mode) Object.defineProperty(request, 'mode', { value: mode });
      let response; const jobs = [];
      listeners.fetch({ request, respondWith: promise => { response = promise; }, waitUntil: promise => jobs.push(promise) });
      const received = response ? await response : undefined;
      await Promise.all(jobs);
      return received;
    },
  };
}
for (const [path, source] of sources) {
  for (const route of ['/api', '/api/v1/companion/conversations', '/v1', '/v1/readiness', '/v1/release',
    '/auth', '/auth/login', '/trpc', '/trpc/private', '/admin', '/admin/billing-ledger', '/health',
    '/security/diagnostics', '/private.json', '/private.png', '/unknown', '/?token=synthetic',
    '/assets/public-123.js?token=synthetic', 'https://other.example/assets/public-123.js']) {
    test(`${path}: never intercepts ${route}`, async () => {
      const h = harness(source); assert.equal(await h.dispatch(route), undefined);
      assert.equal(h.requests.length, 0); assert.equal(h.buckets.size, 0);
    });
  }
  for (const options of [{ method: 'POST', body: 'synthetic' }, { headers: { Authorization: 'Bearer synthetic' } },
    { headers: { Range: 'bytes=0-10' } }, { headers: { 'Cache-Control': 'no-store' } },
    { cache: 'no-store' }, { cache: 'no-cache' }]) {
    test(`${path}: bypasses private/partial/write request ${JSON.stringify(options)}`, async () => {
      const h = harness(source); assert.equal(await h.dispatch('/assets/public-123.js', options), undefined);
      assert.equal(h.requests.length, 0); assert.equal(h.buckets.size, 0);
    });
  }
  test(`${path}: caches public JS for an offline fallback in its own namespace`, async () => {
    let online = true; const h = harness(source, async () => { if (!online) throw new Error('offline'); return text(); });
    assert.equal(await (await h.dispatch('/assets/public-123.js')).text(), 'public fixture');
    assert.equal(h.buckets.get(name).size, 1); online = false;
    assert.equal(await (await h.dispatch('/assets/public-123.js')).text(), 'public fixture');
  });
  for (const headers of [{ 'Cache-Control': 'no-store' }, { 'Cache-Control': 'public, NO-CACHE' },
    { 'Cache-Control': 'private, max-age=300' }, { Vary: '*' }, { Vary: 'Accept-Encoding, Cookie' },
    { Vary: 'Authorization' }, { 'Content-Type': 'text/html' }]) {
    test(`${path}: never caches restrictive or wrong-type response ${JSON.stringify(headers)}`, async () => {
      const h = harness(source, async () => text('synthetic', headers));
      assert.equal((await h.dispatch('/assets/public-123.js')).status, 200);
      assert.equal(h.buckets.get(name)?.size ?? 0, 0);
    });
  }
  test(`${path}: removes a previously public entry when the server marks it private`, async () => {
    let mode = 0; const h = harness(source, async () => {
      if (mode === 2) throw new Error('offline');
      return text('synthetic', mode === 1 ? { 'Cache-Control': 'private' } : {});
    });
    await h.dispatch('/assets/public-123.js'); assert.equal(h.buckets.get(name).size, 1);
    mode = 1; await h.dispatch('/assets/public-123.js'); assert.equal(h.buckets.get(name).size, 0);
    mode = 2; assert.equal((await h.dispatch('/assets/public-123.js')).status, 503);
  });
  for (const variant of ['redirected', 'opaque', 'error']) {
    test(`${path}: does not cache ${variant} responses or replace HTTP errors`, async () => {
      const h = harness(source, async () => {
        const r = variant === 'error' ? new Response('synthetic failure', { status: 500 }) : text();
        if (variant === 'redirected') Object.defineProperty(r, 'redirected', { value: true });
        if (variant === 'opaque') Object.defineProperty(r, 'type', { value: 'opaque' });
        return r;
      });
      assert.equal((await h.dispatch('/assets/public-123.js')).status, variant === 'error' ? 500 : 200);
      assert.equal(h.buckets.get(name)?.size ?? 0, 0);
    });
  }
  test(`${path}: storage access and quota failures do not discard a live response`, async () => {
    for (const failure of ['storageUnavailable', 'putUnavailable']) {
      const h = harness(source); h[failure]();
      assert.equal(await (await h.dispatch('/assets/public-123.js')).text(), 'public fixture');
    }
  });
  test(`${path}: missing cache and denied storage always return a valid no-store 503`, async () => {
    for (const failure of [false, true]) {
      const h = harness(source, async () => { throw new Error('synthetic offline'); });
      if (failure) h.storageUnavailable();
      const r = await h.dispatch('/', { mode: 'navigate' });
      assert.ok(r instanceof Response); assert.equal(r.status, 503);
      assert.equal(r.headers.get('cache-control'), 'no-store');
    }
  });
  test(`${path}: never reads an old or unrelated cache`, async () => {
    const h = harness(source, async () => { throw new Error('offline'); });
    h.buckets.set('other-application', new Map([[origin + '/', new Response('do not serve', { headers: { 'Content-Type': 'text/html' } })]]));
    h.buckets.set('luqi-ai-v1', new Map([[origin + '/', new Response('old potentially private response')]]));
    assert.equal((await h.dispatch('/', { mode: 'navigate' })).status, 503);
  });
  test(`${path}: cached shell is fallback only for allowed HTML navigation`, async () => {
    const h = harness(source, async () => { throw new Error('offline'); });
    const cache = await h.caches.open(name);
    await cache.put('/index.html', new Response('<h1>public shell</h1>', { headers: { 'Content-Type': 'text/html' } }));
    assert.equal(await (await h.dispatch('/', { mode: 'navigate' })).text(), '<h1>public shell</h1>');
    assert.equal((await h.dispatch('/assets/missing-123.js')).status, 503);
    assert.equal(await h.dispatch('/auth', { mode: 'navigate' }), undefined);
  });
  test(`${path}: actual byte limit cannot be bypassed by absent or false Content-Length`, async () => {
    for (const headers of [{}, { 'Content-Length': '1' }]) {
      const h = harness(source, async () => text('x'.repeat(1024 * 1024 + 1), headers));
      assert.equal((await h.dispatch('/assets/large-123.js')).status, 200);
      assert.equal(h.buckets.get(name)?.size ?? 0, 0);
    }
  });
  test(`${path}: exact size limit is accepted and decompressed bytes are not labelled encoded`, async () => {
    const h = harness(source, async () => text('x'.repeat(1024 * 1024), { 'Content-Encoding': 'gzip', 'Content-Length': '4' }));
    await h.dispatch('/assets/limit-123.js');
    const r = await (await h.caches.open(name)).match('/assets/limit-123.js');
    assert.equal((await r.arrayBuffer()).byteLength, 1024 * 1024);
    assert.equal(r.headers.has('content-encoding'), false); assert.equal(r.headers.has('content-length'), false);
  });
  test(`${path}: concurrent public downloads cannot grow past 64 entries`, async () => {
    const h = harness(source);
    await Promise.all(Array.from({ length: 70 }, (_, i) => h.dispatch(`/assets/item-${i}.js`)));
    assert.equal(h.buckets.get(name).size, 64);
  });
  test(`${path}: activation removes only older LUQI caches and preserves unrelated data`, async () => {
    const h = harness(source);
    for (const key of ['luqi-ai-v1', 'luqi-ai-2026-09-06-fix1', name, 'other-application']) h.buckets.set(key, new Map());
    await h.lifecycle('activate'); assert.equal(h.counts().claimed, 1);
    assert.deepEqual([...h.buckets.keys()], [name, 'other-application']);
  });
  test(`${path}: install uses only public shell requests without credentials`, async () => {
    const h = harness(source, async request => {
      assert.equal(request.credentials, 'omit'); assert.equal(request.method, 'GET');
      return new Response('public fixture', { headers: { 'Content-Type': new URL(request.url).pathname.endsWith('.json') ? 'application/json' : 'text/html' } });
    });
    await h.lifecycle('install'); assert.equal(h.counts().skipped, 1);
    assert.deepEqual(h.requests, [origin + '/', origin + '/index.html', origin + '/manifest.json']);
    assert.equal(h.buckets.get(name).size, 3);
  });
}
test('both applications use the same public-cache contract', () => assert.equal(sources[0][1], sources[1][1]));
