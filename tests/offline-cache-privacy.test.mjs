import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';

const origin = 'https://luqi.example';
const current = 'luqi-public-static-v2';
const asset = '/assets/index-12345678.js';
const key = value => new URL(typeof value === 'string' ? value : value.url, origin).href;
function response(text = 'PUBLIC', options = {}, flags = {}) {
  const decorate = value => {
    Object.defineProperty(value, 'type', { value: flags.type || 'basic' });
    Object.defineProperty(value, 'redirected', { value: flags.redirected || false });
    const clone = value.clone.bind(value);
    value.clone = () => decorate(clone());
    return value;
  };
  return decorate(new Response(text, { status: 200, headers: { 'Content-Type': 'application/javascript' }, ...options }));
}
async function harness(path) {
  const listeners = {}, stores = new Map(), calls = [], deleted = [];
  let offline = false, storageFailure = false, fetched = () => response();
  let claims = 0, skips = 0;
  function store(name) { if (!stores.has(name)) stores.set(name, new Map()); return stores.get(name); }
  const caches = {
    async open(name) {
      if (storageFailure) throw new Error('PRIVATE-STORAGE-DIAGNOSTIC');
      const data = store(name);
      return {
        async match(request) { return data.get(key(request))?.clone(); },
        async put(request, value) { data.set(key(request), value.clone()); },
        async delete(request) { return data.delete(key(request)); },
        async keys() { return [...data.keys()].map(url => new Request(url)); },
      };
    },
    async keys() { if (storageFailure) throw Error('unavailable'); return [...stores.keys()]; },
    async delete(name) { deleted.push(name); return stores.delete(name); },
    match() { throw Error('Never use unscoped CacheStorage.match'); },
  };
  runInNewContext(await readFile(new URL('../' + path, import.meta.url), 'utf8'), {
    URL, Request, Response, Headers, caches,
    self: { location: { origin }, addEventListener(name, handler) { listeners[name] = handler; },
      async skipWaiting() { skips++; }, clients: { async claim() { claims++; } } },
    async fetch(request) { calls.push(request); if (offline) throw Error('PRIVATE-NETWORK-DIAGNOSTIC'); return fetched(request); },
  });
  return {
    calls, stores, deleted, store,
    setOffline(value) { offline = value; },
    setStorageFailure(value) { storageFailure = value; },
    respond(fn) { fetched = fn; },
    async lifecycle(name) {
      let task; listeners[name]({ waitUntil(promise) { task = promise; } }); await task;
      return { claims, skips };
    },
    async get(pathname, options = {}) {
      const request = new Request(new URL(pathname, origin), options);
      let pending; const tasks = [];
      listeners.fetch({ request, respondWith(promise) { pending = promise; }, waitUntil(promise) { tasks.push(promise); } });
      const value = pending ? await pending : undefined;
      await Promise.all(tasks);
      return value;
    },
  };
}

for (const worker of ['public/service-worker.js', 'app/public/sw.js']) {
  test(`${worker}: denies every non-public route before fetch or cache access`, async () => {
    const h = await harness(worker);
    for (const path of ['/api', '/api/v1/companion/conversations/export', '/v1', '/v1/readiness', '/v1/release',
      '/auth', '/auth/login', '/trpc', '/trpc/ping', '/health', '/admin', '/admin/billing-ledger',
      '/security/diagnostics', '/admin.html', '/login.html', '/customer-report.json', '/companion',
      '/assets/export.json', '/assets/plain.js', '/assets/nested/index-12345678.js', '/assets/%69ndex-12345678.js',
      '/?token=PRIVATE', asset + '?token=PRIVATE', 'https://other.example' + asset]) {
      assert.equal(await h.get(path), undefined, path);
    }
    assert.equal(h.calls.length, 0); assert.equal(h.stores.size, 0);
  });
  test(`${worker}: credentials, ranges, no-store requests and all writes bypass caching`, async () => {
    const h = await harness(worker);
    for (const options of [{ method: 'POST', body: 'PRIVATE' }, { method: 'PUT', body: 'PRIVATE' },
      { method: 'DELETE' }, { method: 'HEAD' }, { headers: { Authorization: 'Bearer PRIVATE' } },
      { headers: { Range: 'bytes=0-8' } }, { headers: { 'Cache-Control': 'no-store' } },
      { cache: 'no-store' }, { cache: 'no-cache' }, { cache: 'only-if-cached', mode: 'same-origin' }]) {
      assert.equal(await h.get(asset, options), undefined);
    }
    assert.equal(h.calls.length, 0); assert.equal(h.stores.size, 0);
  });
  test(`${worker}: public hashed JavaScript works offline only after a validated successful fetch`, async () => {
    const h = await harness(worker);
    assert.equal(await (await h.get(asset)).text(), 'PUBLIC');
    h.setOffline(true);
    assert.equal(await (await h.get(asset)).text(), 'PUBLIC');
    assert.equal(h.calls.length, 2);
  });
  for (const cc of ['no-store', 'private', 'public, NO-STORE', 'max-age=60, private="Set-Cookie"', 'no-cache', 'must-revalidate']) {
    test(`${worker}: ${cc} is never stored and invalidates a former public copy`, async () => {
      const h = await harness(worker);
      await h.get(asset);
      h.respond(() => response('PRIVATE', { headers: { 'Content-Type': 'application/javascript', 'Cache-Control': cc } }));
      assert.equal(await (await h.get(asset)).text(), 'PRIVATE');
      assert.equal(h.store(current).size, 0);
      h.setOffline(true);
      const result = await h.get(asset);
      assert.equal(result.status, 503); assert.doesNotMatch(await result.text(), /PRIVATE/);
      assert.equal(result.headers.get('Cache-Control'), 'no-store');
    });
  }
  for (const [label, options, flags] of [
    ['redirected', {}, { redirected: true }], ['opaque', {}, { type: 'opaque' }],
    ['JSON masquerading as script', { headers: { 'Content-Type': 'application/json' } }, {}],
    ['HTML masquerading as script', { headers: { 'Content-Type': 'text/html' } }, {}],
    ['Vary cookie', { headers: { 'Content-Type': 'application/javascript', Vary: 'Accept-Encoding, Cookie' } }, {}],
    ['Vary authorization', { headers: { 'Content-Type': 'application/javascript', Vary: 'Authorization' } }, {}],
    ['Vary wildcard', { headers: { 'Content-Type': 'application/javascript', Vary: '*' } }, {}],
    ['sets cookie', { headers: { 'Content-Type': 'application/javascript', 'Set-Cookie': 'PRIVATE' } }, {}],
    ['server failure', { status: 503 }, {}], ['missing file', { status: 404 }, {}],
  ]) {
    test(`${worker}: refuses ${label} responses`, async () => {
      const h = await harness(worker); h.respond(() => response('PRIVATE', options, flags));
      const network = await h.get(asset); assert.equal(network.status, options.status || 200);
      assert.equal(h.store(current).size, 0);
      h.setOffline(true); assert.equal((await h.get(asset)).status, 503);
    });
  }
  test(`${worker}: HTTP errors do not silently fall back to a cached success`, async () => {
    const h = await harness(worker); await h.get(asset);
    h.respond(() => response('Not found', { status: 404 }));
    assert.equal((await h.get(asset)).status, 404); assert.equal(h.store(current).size, 0);
  });
  test(`${worker}: corrupt/forbidden entries cannot be served from the current cache`, async () => {
    const h = await harness(worker);
    h.store(current).set(key(asset), response('PRIVATE', { headers: { 'Content-Type': 'application/javascript', 'Cache-Control': 'no-store' } }));
    h.setOffline(true);
    assert.equal((await h.get(asset)).status, 503); assert.equal(h.store(current).size, 0);
  });
  test(`${worker}: offline with no cache always returns a Response, never undefined`, async () => {
    const h = await harness(worker); h.setOffline(true);
    for (const path of ['/', '/index.html', asset]) {
      const value = await h.get(path); assert.ok(value instanceof Response); assert.equal(value.status, 503);
    }
  });
  test(`${worker}: only the fixed public shell can use an index fallback`, async () => {
    const h = await harness(worker);
    h.respond(() => response('<html>PUBLIC SHELL</html>', { headers: { 'Content-Type': 'text/html' } }));
    await h.get('/index.html'); h.setOffline(true);
    assert.match(await (await h.get('/')).text(), /PUBLIC SHELL/);
    assert.equal((await h.get(asset)).status, 503);
    assert.equal(await h.get('/admin'), undefined);
  });
  test(`${worker}: quota/storage failures preserve successful online loads and fail safely offline`, async () => {
    const h = await harness(worker); h.setStorageFailure(true);
    assert.equal(await (await h.get(asset)).text(), 'PUBLIC');
    h.setOffline(true); assert.equal((await h.get(asset)).status, 503);
  });
  test(`${worker}: cache growth is limited and never deletes unrelated caches`, async () => {
    const h = await harness(worker); h.store('unrelated-app').set(key('/secret'), response('UNRELATED'));
    await Promise.all(Array.from({ length: 110 }, (_, i) => h.get(`/assets/tool-${String(i).padStart(8, '0')}.js`)));
    assert.equal(h.store(current).size, 96); assert.equal(h.store('unrelated-app').size, 1);
  });
  test(`${worker}: activation purges only the two known retired LUQI caches`, async () => {
    const h = await harness(worker);
    for (const name of ['luqi-ai-v1', 'luqi-ai-2026-09-06-fix1', current, 'unrelated-app', 'luqi-other-data']) h.store(name);
    assert.deepEqual(await h.lifecycle('activate'), { claims: 1, skips: 0 });
    assert.deepEqual(h.deleted.sort(), ['luqi-ai-2026-09-06-fix1', 'luqi-ai-v1']);
    assert.equal(h.stores.has('unrelated-app'), true); assert.equal(h.stores.has('luqi-other-data'), true);
  });
  test(`${worker}: installation fetches only anonymous canonical public files, with independent failures`, async () => {
    const h = await harness(worker);
    h.respond(request => {
      const path = new URL(request.url).pathname;
      if (path === '/') throw Error('PRIVATE-NETWORK-DIAGNOSTIC');
      return response(path, { headers: { 'Content-Type': path.endsWith('.json') ? 'application/manifest+json' : 'text/html' } });
    });
    assert.deepEqual(await h.lifecycle('install'), { claims: 0, skips: 1 });
    assert.deepEqual(h.calls.map(value => new URL(value.url).pathname), ['/', '/index.html', '/manifest.json']);
    assert.ok(h.calls.every(value => value.credentials === 'omit' && value.redirect === 'error'));
    assert.equal(h.store(current).size, 2);
  });
}
test('web and standalone workers enforce identical policy', async () => {
  assert.equal(await readFile(new URL('../public/service-worker.js', import.meta.url), 'utf8'),
    await readFile(new URL('../app/public/sw.js', import.meta.url), 'utf8'));
});
