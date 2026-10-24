import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { requestConversationJson, CONVERSATION_REQUEST_TIMEOUT_MS as TIMEOUT,
  MAX_CONVERSATION_RESPONSE_BYTES as MAX } from '../src/lib/conversation-request.ts';

const headers = { 'Content-Type': 'application/json' };
const response = data => new Response(JSON.stringify(data), { headers });
const init = { method: 'POST', cache: 'no-store', credentials: 'omit', redirect: 'error',
  headers: { Authorization: 'Bearer synthetic-token' }, body: '{"content":"retained draft"}' };
const flush = async () => { for (let n = 0; n < 10; n++) await Promise.resolve(); };

test('returns complete Unicode JSON in one request with unchanged authorization and body', async t => {
  const data = { id: 7, text: 'Sawubona 🧡', persisted: true };
  const request = t.mock.fn(async (path, options) => {
    assert.equal(path, '/api/v1/companion/conversations/1/messages');
    const { signal, ...rest } = options;
    assert.ok(signal instanceof AbortSignal); assert.equal(signal.aborted, false);
    assert.deepEqual(rest, init); return response(data);
  });
  assert.deepEqual(await requestConversationJson(request, '/api/v1/companion/conversations/1/messages', init),
    { ok: true, status: 200, body: data });
  assert.equal(request.mock.callCount(), 1);
});

for (const method of ['GET', 'POST', 'DELETE']) test(`${method}: stalled headers settle at the fixed deadline without a retry`, async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let signal;
  const request = t.mock.fn((_path, options) => { signal = options.signal; return new Promise(() => {}); });
  let settled = false;
  const pending = requestConversationJson(request, '/api/v1/companion/conversations', { ...init, method });
  const rejection = assert.rejects(pending, { name: 'AbortError', message: 'Notes request cancelled' });
  void pending.then(() => { settled = true; }, () => { settled = true; });
  t.mock.timers.tick(TIMEOUT - 1); await flush(); assert.equal(settled, false);
  t.mock.timers.tick(1); await rejection;
  assert.equal(signal.aborted, true); assert.equal(request.mock.callCount(), 1);
});

for (const stalledCancel of [false, true]) test(`stalled response body is bounded even when cancellation stalls=${stalledCancel}`, async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const cancelled = t.mock.fn(() => stalledCancel ? new Promise(() => {}) : undefined);
  const body = new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode('{"id":')); }, cancel: cancelled });
  const request = t.mock.fn(async () => new Response(body, { headers }));
  const rejection = assert.rejects(requestConversationJson(request, '/api/v1/companion/conversations', init), { name: 'AbortError' });
  await flush(); t.mock.timers.tick(TIMEOUT); await rejection;
  assert.equal(cancelled.mock.callCount(), 1); assert.equal(request.mock.callCount(), 1);
});

test('a response arriving after timeout is discarded and its body is cancelled', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let resolve;
  const cancelled = t.mock.fn();
  const request = t.mock.fn(() => new Promise(r => { resolve = r; }));
  const pending = requestConversationJson(request, '/api/v1/companion/conversations', init);
  const rejection = assert.rejects(pending, { name: 'AbortError' });
  t.mock.timers.tick(TIMEOUT); await rejection;
  resolve(new Response(new ReadableStream({ cancel: cancelled }), { headers }));
  await flush(); assert.equal(cancelled.mock.callCount(), 1); assert.equal(request.mock.callCount(), 1);
});

for (const status of [401, 404, 422, 429, 503]) test(`HTTP ${status} is returned without consuming diagnostics or waiting for a body`, async t => {
  const cancelled = t.mock.fn();
  const request = t.mock.fn(async () => new Response(new ReadableStream({ cancel: cancelled }), { status }));
  assert.deepEqual(await requestConversationJson(request, '/api/v1/companion/conversations', init), { ok: false, status });
  assert.equal(cancelled.mock.callCount(), 1); assert.equal(request.mock.callCount(), 1);
});

for (const length of [String(MAX + 1), 'invalid', '-1', '9007199254740993']) test(`rejects invalid or excessive declared size ${length}`, async t => {
  const cancelled = t.mock.fn();
  const request = t.mock.fn(async () => new Response(new ReadableStream({ cancel: cancelled }), {
    headers: { ...headers, 'Content-Length': length },
  }));
  await assert.rejects(requestConversationJson(request, '/api/v1/companion/conversations', init), /Invalid notes response/);
  assert.equal(cancelled.mock.callCount(), 1); assert.equal(request.mock.callCount(), 1);
});

for (const contentType of [null, 'text/html', 'text/plain']) test(`rejects non-JSON media type ${contentType}`, async t => {
  const request = t.mock.fn(async () => new Response('{}', { headers: contentType ? { 'Content-Type': contentType } : {} }));
  await assert.rejects(requestConversationJson(request, '/api/v1/companion/conversations', init), /Invalid notes response/);
  assert.equal(request.mock.callCount(), 1);
});

test('checks streamed bytes even when Content-Length understates them, without waiting for cancel', async t => {
  const cancelled = t.mock.fn(() => new Promise(() => {}));
  const stream = new ReadableStream({ start(c) { c.enqueue(new Uint8Array(MAX + 1)); }, cancel: cancelled });
  const request = t.mock.fn(async () => new Response(stream, { headers: { ...headers, 'Content-Length': '2' } }));
  await assert.rejects(requestConversationJson(request, '/api/v1/companion/conversations', init), /exceeds the limit/);
  assert.equal(cancelled.mock.callCount(), 1); assert.equal(request.mock.callCount(), 1);
});

test('accepts a complete response exactly at the byte ceiling', async () => {
  const encoded = '"' + 'x'.repeat(MAX - 2) + '"';
  const result = await requestConversationJson(async () => new Response(encoded, { headers }), '/api/v1/companion/conversations', init);
  assert.equal(result.ok, true); assert.equal(result.body.length, MAX - 2);
});

for (const payload of ['{"private":"SENSITIVE_BUT_SYNTHETIC"', new Uint8Array([0xff, 0xfe])]) test('malformed JSON or UTF-8 produces a fixed error without response text', async () => {
  await assert.rejects(requestConversationJson(async () => new Response(payload, { headers }), '/api/v1/companion/conversations', init),
    { name: 'Error', message: 'Invalid notes response' });
});

test('network failure is not retried', async t => {
  const request = t.mock.fn(async () => { throw new TypeError('Synthetic connection failure'); });
  await assert.rejects(requestConversationJson(request, '/api/v1/companion/conversations', init));
  assert.equal(request.mock.callCount(), 1);
});

test('success clears its timer and does not later abort the completed request', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let signal;
  await requestConversationJson(async (_p, opts) => { signal = opts.signal; return response({ ok: true }); }, '/api/v1/companion/conversations', init);
  t.mock.timers.tick(TIMEOUT + 1); assert.equal(signal.aborted, false);
});

test('both frontend copies retain the same bounded implementation', async () => {
  assert.equal(await readFile(new URL('../src/lib/conversation-request.ts', import.meta.url), 'utf8'), await readFile(new URL('../app/src/lib/conversation-request.ts', import.meta.url), 'utf8'));
});
