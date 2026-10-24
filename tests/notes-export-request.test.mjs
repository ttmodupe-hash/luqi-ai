import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { requestNotesExport, MAX_NOTES_DOWNLOAD_BYTES, NOTES_EXPORT_TIMEOUT_MS } from '../src/lib/notes-export-request.ts';

const token = 'synthetic-token';
const flush = async () => { for (let i = 0; i < 16; i++) await Promise.resolve(); };
const response = (source, headers = {}) => new Response(new ReadableStream(source), {
  headers: { 'Content-Type': 'application/json', ...headers },
});
const call = (r, signal) => requestNotesExport(async () => r, token, signal);

test('both source trees keep export transport and client identical', async () => {
  for (const name of ['notes-export-request.ts', 'private-conversations.ts']) {
    assert.equal(await readFile(new URL('../src/lib/' + name, import.meta.url), 'utf8'),
      await readFile(new URL('../app/src/lib/' + name, import.meta.url), 'utf8'));
  }
});
test('one fixed same-origin GET with only explicit token and no cookies, cache or redirects', async () => {
  let calls = 0;
  const result = await requestNotesExport(async (path, init) => {
    calls++; assert.equal(path, '/api/v1/companion/conversations/export');
    assert.equal(init.method, 'GET'); assert.equal(init.credentials, 'omit');
    assert.equal(init.cache, 'no-store'); assert.equal(init.redirect, 'error');
    assert.equal(init.body, undefined);
    assert.deepEqual(init.headers, { Authorization: 'Bearer synthetic-token', Accept: 'application/json' });
    return Response.json({ fixture: true });
  }, token);
  assert.deepEqual(result, { ok: true, status: 200, body: { fixture: true } }); assert.equal(calls, 1);
});
for (const value of ['', 'x'.repeat(4097)]) {
  test(`invalid token length ${value.length} sends no request`, async () => {
    let calls = 0;
    await assert.rejects(requestNotesExport(async () => { calls++; }, value), { message: 'Invalid notes export request' });
    assert.equal(calls, 0);
  });
}
test('pre-aborted export does not invoke transport', async () => {
  const c = new AbortController(); c.abort(); let calls = 0;
  await assert.rejects(requestNotesExport(async () => { calls++; }, token, c.signal), { name: 'AbortError' });
  assert.equal(calls, 0);
});
test('independent deadline settles a fetch which ignores abort, without retry', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] }); let child, calls = 0;
  const pending = requestNotesExport(async (_path, init) => {
    child = init.signal; calls++; return new Promise(() => {});
  }, token);
  const rejected = assert.rejects(pending, { name: 'AbortError', message: 'Export cancelled' });
  t.mock.timers.tick(NOTES_EXPORT_TIMEOUT_MS); await rejected;
  assert.equal(child.aborted, true); assert.equal(calls, 1);
});
test('explicit abort settles a fetch which ignores its signal', async () => {
  const c = new AbortController(); let child;
  const pending = requestNotesExport(async (_path, init) => {
    child = init.signal; return new Promise(() => {});
  }, token, c.signal);
  const rejected = assert.rejects(pending, { name: 'AbortError' }); c.abort(); await rejected;
  assert.equal(child.aborted, true);
});
test('deadline releases stalled body even if underlying cancellation never settles', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] }); let cancelled = 0;
  const r = response({ cancel() { cancelled++; return new Promise(() => {}); } });
  const pending = call(r); const rejected = assert.rejects(pending, { name: 'AbortError' });
  await flush(); t.mock.timers.tick(NOTES_EXPORT_TIMEOUT_MS); await rejected; await flush();
  assert.equal(cancelled, 1); assert.equal(r.body.locked, false);
});
test('caller cancellation drops partial document without exposing it', async () => {
  const c = new AbortController(); let cancelled = 0;
  const r = response({ start(s) { s.enqueue(new TextEncoder().encode('{"note":"private-fixture')); },
    cancel() { cancelled++; return new Promise(() => {}); } });
  const pending = call(r, c.signal); const rejected = assert.rejects(pending, { name: 'AbortError' });
  await flush(); c.abort(); await rejected; await flush();
  assert.equal(cancelled, 1); assert.equal(r.body.locked, false);
});
for (const cause of ['abort', 'timeout']) {
  test(`late response after ${cause} is cancelled, never parsed`, async t => {
    t.mock.timers.enable({ apis: ['setTimeout'] }); const c = new AbortController();
    let finish, cancelled = 0;
    const pending = requestNotesExport(() => new Promise(r => { finish = r; }), token, c.signal);
    const rejected = assert.rejects(pending, { name: 'AbortError' });
    if (cause === 'abort') c.abort(); else t.mock.timers.tick(NOTES_EXPORT_TIMEOUT_MS);
    await rejected;
    const r = response({ cancel() { cancelled++; } }); const getReader = t.mock.method(r.body, 'getReader');
    finish(r); await flush();
    assert.equal(cancelled, 1); assert.equal(getReader.mock.callCount(), 0);
  });
}
for (const status of [400, 401, 403, 422, 429, 500, 503]) {
  test(`HTTP ${status} preserves status, discards body, never waits for cancel`, async t => {
    let cancelled = 0;
    const r = new Response(new ReadableStream({ cancel() { cancelled++; return new Promise(() => {}); } }), { status });
    const getReader = t.mock.method(r.body, 'getReader');
    assert.deepEqual(await call(r), { ok: false, status });
    assert.equal(getReader.mock.callCount(), 0); assert.equal(cancelled, 1);
  });
}
for (const [name, make] of [
  ['missing media type', () => new Response(new Uint8Array([123, 125]))],
  ['text media type', () => new Response('{}')],
  ['malformed JSON', () => new Response('{"private-fixture":', { headers: { 'Content-Type': 'application/json' } })],
  ['invalid UTF-8', () => new Response(new Uint8Array([34, 0xc3, 0x28, 34]), { headers: { 'Content-Type': 'application/json' } })],
  ['missing body', () => new Response(null, { headers: { 'Content-Type': 'application/json' } })],
  ['redirected response', () => { const r = Response.json({}); Object.defineProperty(r, 'redirected', { value: true }); return r; }],
]) {
  test(`rejects ${name} using fixed diagnostics`, async () => {
    await assert.rejects(call(make()), { message: 'Invalid notes export' });
  });
}
for (const length of ['-1', 'NaN', 'Infinity', '1.5', '9007199254740992']) {
  test(`rejects malformed declared length ${length} before consuming`, async t => {
    let cancelled = 0;
    const r = response({ cancel() { cancelled++; return new Promise(() => {}); } }, { 'Content-Length': length });
    const getReader = t.mock.method(r.body, 'getReader');
    await assert.rejects(call(r), { message: 'Invalid notes export' });
    assert.equal(cancelled, 1); assert.equal(getReader.mock.callCount(), 0);
  });
}
test('rejects oversized advertised body without waiting for cancellation', async t => {
  let cancelled = 0;
  const r = response({ cancel() { cancelled++; return new Promise(() => {}); } }, { 'Content-Length': String(MAX_NOTES_DOWNLOAD_BYTES + 1) });
  const getReader = t.mock.method(r.body, 'getReader');
  await assert.rejects(call(r), { message: 'Notes export exceeds the download limit' });
  assert.equal(cancelled, 1); assert.equal(getReader.mock.callCount(), 0);
});
test('enforces actual streamed limit despite dishonest header and hanging cancel', async () => {
  let cancelled = 0;
  const r = response({ start(c) { c.enqueue(new Uint8Array(MAX_NOTES_DOWNLOAD_BYTES + 1)); },
    cancel() { cancelled++; return new Promise(() => {}); } }, { 'Content-Length': '2' });
  await assert.rejects(call(r), { message: 'Notes export exceeds the download limit' });
  assert.equal(cancelled, 1); assert.equal(r.body.locked, false);
});
test('accepts exact byte boundary while growing the buffer across network chunks', async () => {
  let remaining = MAX_NOTES_DOWNLOAD_BYTES - 2, started = false;
  const r = response({ pull(c) {
    if (!started) { started = true; c.enqueue(new Uint8Array([34])); return; }
    if (remaining) { const count = Math.min(262_144, remaining); remaining -= count;
      c.enqueue(new Uint8Array(count).fill(97)); return; }
    c.enqueue(new Uint8Array([34])); c.close();
  } }, { 'Content-Length': String(MAX_NOTES_DOWNLOAD_BYTES) });
  assert.equal((await call(r)).body.length, MAX_NOTES_DOWNLOAD_BYTES - 2);
  assert.equal(r.body.locked, false);
});
test('strict UTF-8 decoding handles multibyte characters split across chunks', async () => {
  const bytes = new TextEncoder().encode('{"text":"Dumelang 🌍"}');
  const r = response({ start(c) { for (const byte of bytes) c.enqueue(new Uint8Array([byte])); c.close(); } },
    { 'Content-Type': 'Application/JSON; charset=utf-8' });
  assert.deepEqual((await call(r)).body, { text: 'Dumelang 🌍' });
});
test('stream failures reveal no raw notes or transport diagnostics', async () => {
  const r = response({ pull(c) { c.error(new Error('private-fixture-details')); } });
  await assert.rejects(call(r), { message: 'Notes export request failed' });
  assert.equal(r.body.locked, false);
});
test('rejected transport is redacted and never retried', async () => {
  let calls = 0;
  await assert.rejects(requestNotesExport(async () => { calls++; throw new Error('private-fixture-details'); }, token),
    { message: 'Notes export request failed' });
  assert.equal(calls, 1);
});
for (const status of [200, 401]) {
  test(`completion ${status} clears deadline and caller listener`, async t => {
    t.mock.timers.enable({ apis: ['setTimeout'] }); const c = new AbortController(); let child;
    const remove = t.mock.method(c.signal, 'removeEventListener');
    await requestNotesExport(async (_path, init) => { child = init.signal; return Response.json({}, { status }); }, token, c.signal);
    assert.equal(remove.mock.callCount(), 1);
    c.abort(); t.mock.timers.tick(NOTES_EXPORT_TIMEOUT_MS);
    assert.equal(child.aborted, false);
  });
}
