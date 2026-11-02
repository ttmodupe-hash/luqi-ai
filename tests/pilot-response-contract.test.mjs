import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { requestPilotJson, pilotFailureCode, MAX_PILOT_RESPONSE_BYTES,
  PILOT_READINESS_TIMEOUT_MS, PILOT_REPLY_TIMEOUT_MS } from '../src/lib/pilot-request.ts';

const path = '/api/v1/luqi-core';
const encoder = new TextEncoder();
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
const jsonStream = (source, headers = {}) => new Response(new ReadableStream(source), {
  headers: { 'Content-Type': 'application/json', ...headers },
});
const call = (response, init = {}) => requestPilotJson(async () => response, path, init);

test('both browser source trees remain identical', async () => {
  assert.equal(await readFile(new URL('../src/lib/pilot-request.ts', import.meta.url), 'utf8'),
    await readFile(new URL('../app/src/lib/pilot-request.ts', import.meta.url), 'utf8'));
});
test('one same-origin request, no browser credentials, redirects, cache or retry', async () => {
  let calls = 0;
  const result = await requestPilotJson(async (url, init) => {
    calls++; assert.equal(url, path); assert.equal(init.method, 'POST');
    assert.equal(init.credentials, 'omit'); assert.equal(init.cache, 'no-store');
    assert.equal(init.redirect, 'error'); assert.equal(init.body, 'synthetic');
    return Response.json({ response: 'fixture' });
  }, path, { body: 'synthetic', credentials: 'include', redirect: 'follow' });
  assert.equal(calls, 1); assert.deepEqual(result, { ok: true, status: 200, body: { response: 'fixture' } });
});
test('readiness is a GET, never inference', async () => {
  const result = await requestPilotJson(async (url, init) => {
    assert.equal(url, '/v1/readiness'); assert.equal(init.method, 'GET'); return Response.json({ checks: {} });
  }, '/v1/readiness', {});
  assert.equal(result.status, 200);
});
test('pre-aborted caller sends nothing', async () => {
  const controller = new AbortController(); controller.abort(); let calls = 0;
  await assert.rejects(requestPilotJson(async () => { calls++; return Response.json({}); }, path,
    { signal: controller.signal }), { name: 'AbortError' });
  assert.equal(calls, 0);
});
test('rejects paths outside the two reviewed same-origin routes', async () => {
  let calls = 0;
  await assert.rejects(requestPilotJson(async () => { calls++; }, 'https://invalid.example/', {}));
  assert.equal(calls, 0);
});
for (const [route, timeout] of [['/v1/readiness', PILOT_READINESS_TIMEOUT_MS], [path, PILOT_REPLY_TIMEOUT_MS]]) {
  test(`independent deadline settles a fetch ignoring abort: ${route}`, async t => {
    t.mock.timers.enable({ apis: ['setTimeout'] }); let calls = 0; let signal;
    const pending = requestPilotJson(async (_url, init) => {
      calls++; signal = init.signal; return new Promise(() => {});
    }, route, {});
    const rejected = assert.rejects(pending, { name: 'AbortError' });
    t.mock.timers.tick(timeout); await rejected;
    assert.equal(calls, 1); assert.equal(signal.aborted, true);
  });
}
test('caller cancellation settles even if fetch ignores abort', async () => {
  const parent = new AbortController(); let child;
  const pending = requestPilotJson(async (_url, init) => {
    child = init.signal; return new Promise(() => {});
  }, path, { signal: parent.signal });
  const rejected = assert.rejects(pending, { name: 'AbortError' }); parent.abort(); await rejected;
  assert.equal(child.aborted, true);
});
test('deadline releases a stalled body even when cancellation never completes', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] }); let cancellations = 0;
  const response = jsonStream({ cancel() { cancellations++; return new Promise(() => {}); } });
  const pending = call(response); const rejected = assert.rejects(pending, { name: 'AbortError' });
  await flush(); t.mock.timers.tick(PILOT_REPLY_TIMEOUT_MS); await rejected; await flush();
  assert.equal(cancellations, 1); assert.equal(response.body.locked, false);
});
test('caller abort cancels a stalled stream and suppresses partial content', async () => {
  const parent = new AbortController(); let cancellations = 0;
  const response = jsonStream({ start(c) { c.enqueue(encoder.encode('{"private":"fixture')); },
    cancel() { cancellations++; } });
  const pending = call(response, { signal: parent.signal });
  const rejected = assert.rejects(pending, { name: 'AbortError' });
  await flush(); parent.abort(); await rejected; await flush();
  assert.equal(cancellations, 1); assert.equal(response.body.locked, false);
});
test('late fetch completion after cancellation is discarded', async () => {
  const parent = new AbortController(); let resolve; let cancellations = 0;
  const pending = requestPilotJson(() => new Promise(r => { resolve = r; }), path, { signal: parent.signal });
  const rejected = assert.rejects(pending, { name: 'AbortError' }); parent.abort(); await rejected;
  resolve(jsonStream({ cancel() { cancellations++; } })); await flush();
  assert.equal(cancellations, 1);
});
test('401 body is discarded without reading or waiting for stream cancellation', async () => {
  let cancellations = 0;
  const response = new Response(new ReadableStream({ cancel() { cancellations++; return new Promise(() => {}); } }), { status: 401 });
  assert.deepEqual(await call(response), { ok: false, status: 401, body: null });
  assert.equal(cancellations, 1);
});
for (const [name, response] of [
  ['non-JSON media type', () => new Response('{}')],
  ['invalid JSON', () => new Response('{"fixture":', { headers: { 'Content-Type': 'application/json' } })],
  ['missing body', () => new Response(null, { headers: { 'Content-Type': 'application/json' } })],
  ['malformed UTF-8', () => new Response(new Uint8Array([34, 0xc3, 0x28, 34]), { headers: { 'Content-Type': 'application/json' } })],
  ['redirected response', () => { const r = Response.json({}); Object.defineProperty(r, 'redirected', { value: true }); return r; }],
]) {
  test(`rejects ${name} with fixed diagnostics`, async () => {
    await assert.rejects(call(response()), { message: 'Invalid pilot response' });
  });
}
for (const length of ['-1', '1.5', 'abc', '9007199254740992', '65537']) {
  test(`rejects invalid advertised length ${length}`, async () => {
    let cancellations = 0;
    const response = jsonStream({ cancel() { cancellations++; return new Promise(() => {}); } }, { 'Content-Length': length });
    await assert.rejects(call(response), { message: 'Invalid pilot response' });
    assert.equal(cancellations, 1);
  });
}
test('actual byte limit defeats a dishonest Content-Length and hanging cancel', async () => {
  let cancellations = 0;
  const response = jsonStream({ start(c) { c.enqueue(new Uint8Array(MAX_PILOT_RESPONSE_BYTES + 1)); },
    cancel() { cancellations++; return new Promise(() => {}); } }, { 'Content-Length': '2' });
  await assert.rejects(call(response), { message: 'Invalid pilot response' });
  assert.equal(cancellations, 1); assert.equal(response.body.locked, false);
});
test('accepts valid JSON at the exact byte boundary, not a character approximation', async () => {
  const text = JSON.stringify('a'.repeat(MAX_PILOT_RESPONSE_BYTES - 2));
  const result = await call(new Response(text, { headers: { 'Content-Type': 'Application/JSON; charset=utf-8',
    'Content-Length': String(MAX_PILOT_RESPONSE_BYTES) } }));
  assert.equal(result.body.length, MAX_PILOT_RESPONSE_BYTES - 2);
});
test('strict decoding supports multibyte UTF-8 split across chunks', async () => {
  const bytes = encoder.encode('{"text":"Dumelang 🌍"}');
  const response = jsonStream({ start(c) { for (const byte of bytes) c.enqueue(new Uint8Array([byte])); c.close(); } });
  assert.deepEqual((await call(response)).body, { text: 'Dumelang 🌍' });
});
test('does not retry a rejected transport', async () => {
  let calls = 0;
  await assert.rejects(requestPilotJson(async () => { calls++; throw new Error('fixture transport'); }, path, {}));
  assert.equal(calls, 1);
});
test('completed requests remove the caller abort listener and timer', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] }); const parent = new AbortController(); let child;
  const remove = t.mock.method(parent.signal, 'removeEventListener');
  await requestPilotJson(async (_url, init) => { child = init.signal; return Response.json({}); }, path, { signal: parent.signal });
  assert.equal(remove.mock.callCount(), 1); parent.abort(); t.mock.timers.tick(PILOT_REPLY_TIMEOUT_MS);
  assert.equal(child.aborted, false);
});
for (const [status, code] of [[429, 'AI_USER_DAILY_QUOTA_EXHAUSTED'], [429, 'AI_PROVIDER_BUDGET_EXHAUSTED'],
  [503, 'AI_PROVIDER_UNAVAILABLE'], [422, 'AI_RESPONSE_BLOCKED'], [502, 'AI_REPLY_INCOMPLETE'],
  [502, 'AI_RESPONSE_INVALID'], [400, 'AI_INPUT_TOO_LARGE'], [413, 'AI_INPUT_TOO_LARGE'],
  [400, 'INVALID_INPUT'], [415, 'INVALID_INPUT'], [503, 'AI_DISABLED'],
  [503, 'BILLING_NOT_APPROVED'], [503, 'AI_BUDGET_STORE_UNAVAILABLE']]) {
  test(`preserves reviewed failure ${status}/${code}`, () => assert.equal(pilotFailureCode(status, { code }), code));
}
test('unknown, inherited and mismatched errors remain unconfirmed', () => {
  for (const [status, body] of [[502, {}], [503, null], [500, { code: 'fixture-secret' }],
    [500, { code: 'INVALID_INPUT' }], [200, { code: 'AI_PROVIDER_UNAVAILABLE' }],
    [400, { code: 'constructor' }], [400, Object.create({ code: 'INVALID_INPUT' })]]) {
    assert.equal(pilotFailureCode(status, body), 'RESPONSE_UNCONFIRMED');
  }
});
