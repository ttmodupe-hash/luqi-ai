import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { requestAccountJson, ACCOUNT_REQUEST_TIMEOUT_MS, MAX_ACCOUNT_RESPONSE_BYTES } from '../src/lib/account-request.ts';
const login = '/api/v1/auth/login', register = '/api/v1/auth/register';
const credentials = { email: 'fixture@example.invalid', password: 'Synthetic-Only-Password!' };
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
const jsonStream = (source, headers = {}) => new Response(new ReadableStream(source), {
  headers: { 'Content-Type': 'application/json', ...headers },
});
const call = (response, signal) => requestAccountJson(async () => response, login, credentials, signal);
const failed = { message: 'Account request failed' };

test('both browser transport copies are identical', async () => {
  assert.equal(await readFile(new URL('../src/lib/account-request.ts', import.meta.url), 'utf8'),
    await readFile(new URL('../app/src/lib/account-request.ts', import.meta.url), 'utf8'));
});
for (const route of [login, register]) {
  test(`one same-origin POST containing only credentials: ${route}`, async () => {
    let calls = 0;
    const result = await requestAccountJson(async (path, init) => {
      calls++; assert.equal(path, route); assert.equal(init.method, 'POST');
      assert.equal(init.cache, 'no-store'); assert.equal(init.credentials, 'omit');
      assert.equal(init.redirect, 'error'); assert.equal(init.headers.Accept, 'application/json');
      assert.deepEqual(JSON.parse(init.body), credentials);
      return Response.json({ token: 'synthetic' }, { status: route === register ? 201 : 200 });
    }, route, { ...credentials, userId: 123, role: 'admin' });
    assert.equal(calls, 1); assert.equal(result.ok, true);
    assert.deepEqual(result.body, { token: 'synthetic' });
  });
  test(`deadline settles an abort-ignoring fetch: ${route}`, async t => {
    t.mock.timers.enable({ apis: ['setTimeout'] }); let child; let calls = 0;
    const pending = requestAccountJson(async (_path, init) => {
      calls++; child = init.signal; return new Promise(() => {});
    }, route, credentials);
    const rejected = assert.rejects(pending, { name: 'AbortError', message: 'Account request interrupted' });
    t.mock.timers.tick(ACCOUNT_REQUEST_TIMEOUT_MS); await rejected;
    assert.equal(child.aborted, true); assert.equal(calls, 1);
  });
}
test('pre-aborted request sends no credentials', async () => {
  const parent = new AbortController(); parent.abort(); let calls = 0;
  await assert.rejects(requestAccountJson(async () => { calls++; }, login, credentials, parent.signal), { name: 'AbortError' });
  assert.equal(calls, 0);
});
test('refuses non-reviewed path without issuing a request', async () => {
  let calls = 0;
  await assert.rejects(requestAccountJson(async () => { calls++; }, 'https://other.invalid', credentials));
  assert.equal(calls, 0);
});
test('caller cancellation settles fetch that ignores abort', async () => {
  const parent = new AbortController(); let child;
  const pending = requestAccountJson(async (_path, init) => {
    child = init.signal; return new Promise(() => {});
  }, login, credentials, parent.signal);
  const rejected = assert.rejects(pending, { name: 'AbortError' }); parent.abort(); await rejected;
  assert.equal(child.aborted, true);
});
test('stalled body is interrupted even when cancellation hangs', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] }); let cancelled = 0;
  const response = jsonStream({ cancel() { cancelled++; return new Promise(() => {}); } });
  const pending = call(response); const rejected = assert.rejects(pending, { name: 'AbortError' });
  await flush(); t.mock.timers.tick(ACCOUNT_REQUEST_TIMEOUT_MS); await rejected; await flush();
  assert.equal(cancelled, 1); assert.equal(response.body.locked, false);
});
test('caller cancellation drops partial session text', async () => {
  let cancelled = 0; const parent = new AbortController();
  const response = jsonStream({ start(c) { c.enqueue(new TextEncoder().encode('{"token":"partial-fixture')); },
    cancel() { cancelled++; } });
  const pending = call(response, parent.signal); const rejected = assert.rejects(pending, { name: 'AbortError' });
  await flush(); parent.abort(); await rejected; await flush();
  assert.equal(cancelled, 1); assert.equal(response.body.locked, false);
});
test('late response is discarded after explicit cancellation', async () => {
  const parent = new AbortController(); let resolve; let cancelled = 0;
  const pending = requestAccountJson(() => new Promise(r => { resolve = r; }), register, credentials, parent.signal);
  const rejected = assert.rejects(pending, { name: 'AbortError' }); parent.abort(); await rejected;
  resolve(jsonStream({ cancel() { cancelled++; } })); await flush();
  assert.equal(cancelled, 1);
});
for (const status of [400, 401, 403, 409, 500, 503]) {
  test(`HTTP ${status} discards diagnostics without awaiting cancellation`, async () => {
    let cancelled = 0;
    const response = new Response(new ReadableStream({ cancel() { cancelled++; return new Promise(() => {}); } }), { status });
    assert.deepEqual(await call(response), { ok: false, status });
    assert.equal(cancelled, 1);
  });
}
for (const [raw, expected] of [['1', 1], ['3600', 3600], ['117', 117], ['0', 30], ['3601', 30],
  ['-1', 30], ['1.5', 30], ['999999', 30], ['private-fixture', 30]]) {
  test(`bounded Retry-After: ${raw}`, async () => {
    const response = new Response('must not parse', { status: 429, headers: { 'Retry-After': raw } });
    assert.deepEqual(await call(response), { ok: false, status: 429, retryAfter: expected });
  });
}
for (const [name, make] of [
  ['non-JSON', () => new Response('{}')],
  ['malformed JSON', () => new Response('{"token":"synthetic', { headers: { 'Content-Type': 'application/json' } })],
  ['missing body', () => new Response(null, { headers: { 'Content-Type': 'application/json' } })],
  ['invalid UTF-8', () => new Response(new Uint8Array([34, 0xc3, 0x28, 34]), { headers: { 'Content-Type': 'application/json' } })],
  ['redirected response', () => { const r = Response.json({}); Object.defineProperty(r, 'redirected', { value: true }); return r; }],
]) {
  test(`rejects ${name} without raw diagnostic disclosure`, async () => { await assert.rejects(call(make()), failed); });
}
for (const length of ['-1', '1.5', 'unknown', '9007199254740992', '32769']) {
  test(`rejects advertised length ${length} before reading the body`, async () => {
    let cancelled = 0;
    const response = jsonStream({ cancel() { cancelled++; return new Promise(() => {}); } }, { 'Content-Length': length });
    await assert.rejects(call(response), failed); assert.equal(cancelled, 1);
  });
}
test('counts streamed bytes despite a false short Content-Length', async () => {
  let cancelled = 0;
  const response = jsonStream({ start(c) { c.enqueue(new Uint8Array(MAX_ACCOUNT_RESPONSE_BYTES + 1)); },
    cancel() { cancelled++; return new Promise(() => {}); } }, { 'Content-Length': '2' });
  await assert.rejects(call(response), failed); assert.equal(cancelled, 1); assert.equal(response.body.locked, false);
});
test('accepts exact byte limit with a case-insensitive JSON media type', async () => {
  const text = JSON.stringify('a'.repeat(MAX_ACCOUNT_RESPONSE_BYTES - 2));
  const result = await call(new Response(text, { headers: { 'Content-Type': 'Application/JSON; charset=utf-8',
    'Content-Length': String(MAX_ACCOUNT_RESPONSE_BYTES) } }));
  assert.equal(result.body.length, MAX_ACCOUNT_RESPONSE_BYTES - 2);
});
test('handles valid multibyte UTF-8 across chunk boundaries', async () => {
  const bytes = new TextEncoder().encode('{"text":"Dumelang 🌍"}');
  const result = await call(jsonStream({ start(c) { for (const byte of bytes) c.enqueue(new Uint8Array([byte])); c.close(); } }));
  assert.deepEqual(result.body, { text: 'Dumelang 🌍' });
});
test('network rejection is redacted and never retried', async () => {
  let calls = 0;
  await assert.rejects(requestAccountJson(async () => { calls++; throw new Error('private-fixture'); }, login, credentials), failed);
  assert.equal(calls, 1);
});
test('successful completion removes caller listener and timer', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] }); const parent = new AbortController(); let child;
  const remove = t.mock.method(parent.signal, 'removeEventListener');
  await requestAccountJson(async (_path, init) => { child = init.signal; return Response.json({}); }, login, credentials, parent.signal);
  assert.equal(remove.mock.callCount(), 1); parent.abort(); t.mock.timers.tick(ACCOUNT_REQUEST_TIMEOUT_MS);
  assert.equal(child.aborted, false);
});
