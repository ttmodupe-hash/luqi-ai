import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boundedJson, CheckFailure, ORIGIN, runAcceptance } from '../scripts/verify-production-pilot.mjs';
const sha = 'a'.repeat(40);
function fixture(options = {}) {
  const state = { calls: [], account: null, notes: [], tokens: new Map(), issued: 0, ai: 0, rotates: 0 };
  const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers } });
  function signedIn(init) { return state.tokens.get(init.headers.Authorization?.slice(7)) === state.account?.password && state.account !== null; }
  function accountReply() {
    const token = 'SYNTHETIC-SECRET-TOKEN-' + ++state.issued;
    state.tokens.set(token, state.account.password);
    return { token, token_type: 'bearer', user: { id: 7, email: state.account.email } };
  }
  async function request(url, init) {
    const path = new URL(url).pathname; const method = init.method;
    const body = init.body === undefined ? undefined : JSON.parse(init.body);
    state.calls.push({ url, path, method, body, init });
    if (path === '/v1/release') return json({ format: 'luqi.release.v1', commit:
      options.wrongRevision || (options.changedRevision && state.account) ? 'b'.repeat(40) : sha });
    if (path === '/v1/readiness') return json({ checks: { persistence: 'connected', ai_pilot: 'configured_not_verified' } });
    if (path === '/auth/signup') {
      if (options.signupFailure) return json({ detail: 'PRIVATE-SERVER-ERROR' }, 503);
      assert.equal(state.account, null); state.account = { email: body.email, password: body.password };
      return json(accountReply(), 201, options.cachedSignup ? { 'cache-control': 'public' } : {});
    }
    if (path === '/auth/login') {
      if (body.email !== state.account.email || body.password !== state.account.password) return json({}, 401);
      return json(accountReply());
    }
    if (path === '/auth/forgot-password') return json({ code: 'ACCOUNT_RECOVERY_ASSISTED_ONLY' }, 503);
    if (!signedIn(init)) return json({ code: 'AUTH_REQUIRED' }, 401);
    if (path === '/auth/me') return json({ id: 7, email: state.account.email });
    if (path === '/api/v1/account/password') {
      assert.equal(body.currentPassword, state.account.password);
      state.account.password = body.newPassword; state.rotates++;
      if (options.lostPasswordChange && state.rotates === 1) throw new Error('PRIVATE-TOKEN-IN-TRANSPORT-ERROR');
      return json({ changed: true, signInRequired: true });
    }
    if (path === '/api/v1/luqi-core') {
      state.ai++;
      if (options.aiTransportFailure) throw new Error('PRIVATE-UPSTREAM-SECRET');
      if (options.aiFailure) return json({ code: 'AI_PROVIDER_UNAVAILABLE', detail: 'PRIVATE-UPSTREAM' }, 503);
      return json({ status: 'success', provider: options.replyProvider ?? 'gemini', provider_model: 'fixture-model',
        response: options.wrongReply ? 'invented generic success' : body.user_input.split('exact text: ')[1] });
    }
    const base = '/api/v1/companion/conversations';
    if (path === base && method === 'GET') return json({ conversations: state.notes });
    if (path === base && method === 'POST') {
      state.notes.push({ id: 11, title: body.title, messages: [] });
      if (options.lostCreateResponse) throw new Error('PRIVATE-TRANSPORT-ERROR');
      return json({ id: 11, persisted: true }, 201);
    }
    if (path === base + '/export') return json({ format: 'luqi.private-notes.v1', conversations: state.notes,
      messages: state.notes.flatMap(x => x.messages), memories: [] });
    const note = state.notes.find(x => path.startsWith(base + '/' + x.id));
    if (!note) return json({ code: 'CONVERSATION_NOT_FOUND' }, 404);
    if (path.endsWith('/messages') && method === 'POST') {
      note.messages.push({ id: 13, role: 'user', content: body.content });
      return json({ id: 13, role: 'user', persisted: true }, 201);
    }
    if (path.endsWith('/messages')) return json({ messages: note.messages });
    if (path.endsWith('/export')) return json({ format: 'luqi.conversation.v1', conversation: note, messages: note.messages, memories: [] });
    if (method === 'DELETE') {
      assert.deepEqual(body, { confirm: true });
      if (options.deleteFailure) return json({ code: 'CONVERSATION_STORAGE_UNAVAILABLE' }, 503);
      state.notes = []; return json({ id: note.id, deleted: true });
    }
    throw new Error('Unhandled fixture request');
  }
  return { state, request };
}
async function run(options = {}, paidApproved = true) {
  const f = fixture(options); const report = await runAcceptance({ expectedCommit: sha, writesApproved: true, paidApproved, request: f.request });
  return { ...f, report };
}
test('explicit write approval required before all traffic', async () => {
  let calls = 0;
  await assert.rejects(runAcceptance({ expectedCommit: sha, request: async () => { calls++; } }), CheckFailure);
  assert.equal(calls, 0);
});
test('full exact revision required before all traffic', async () => {
  let calls = 0;
  await assert.rejects(runAcceptance({ expectedCommit: 'abc', writesApproved: true, request: async () => { calls++; } }), CheckFailure);
  assert.equal(calls, 0);
});
test('wrong deployed revision prevents registration and paid calls', async () => {
  const { state, report } = await run({ wrongRevision: true });
  assert.equal(report.success, false); assert.equal(state.account, null); assert.equal(state.ai, 0);
});
test('complete synthetic journey cleans notes and revokes every issued credential', async () => {
  const { state, report } = await run();
  assert.equal(report.success, true); assert.equal(state.ai, 1); assert.equal(state.notes.length, 0);
  assert.equal(report.providerReplyVerified, true);
  assert.equal(report.cleanup.notes, 'deleted_and_verified'); assert.equal(report.cleanup.sessions, 'revoked_and_verified');
  for (const oldPassword of state.tokens.values()) assert.notEqual(oldPassword, state.account.password);
  assert.equal(report.billingReconciliation, 'not_verified');
});
test('all requests stay on the fixed TLS origin and refuse redirects, cookies and caching', async () => {
  const { state } = await run();
  for (const { url, init } of state.calls) {
    assert.equal(new URL(url).origin, ORIGIN); assert.equal(init.redirect, 'error');
    assert.equal(init.cache, 'no-store'); assert.equal(init.credentials, 'omit'); assert.ok(init.signal instanceof AbortSignal);
  }
});
test('no paid traffic without separate explicit approval', async () => {
  const { state, report } = await run({}, false);
  assert.equal(report.success, true); assert.equal(state.ai, 0); assert.equal(report.providerRequestSubmitted, false);
});
test('independent OpenAI acceptance sends one explicitly selected request and verifies its provider identity', async () => {
  const f = fixture({ replyProvider: 'openai' });
  const report = await runAcceptance({ expectedCommit: sha, writesApproved: true, paidApproved: true,
    provider: 'openai', request: f.request });
  assert.equal(report.success, true); assert.equal(report.provider, 'openai');
  assert.equal(report.requestedProvider, 'openai'); assert.equal(f.state.ai, 1);
  assert.equal(f.state.calls.find(x => x.path === '/api/v1/luqi-core').body.provider, 'openai');
  assert.equal(report.cleanup.sessions, 'revoked_and_verified');
});
test('a complete Gemini reply cannot pass independent OpenAI acceptance and is never retried', async () => {
  const f = fixture();
  const report = await runAcceptance({ expectedCommit: sha, writesApproved: true, paidApproved: true,
    provider: 'openai', request: f.request });
  assert.equal(report.success, false); assert.equal(report.providerReplyVerified, false); assert.equal(f.state.ai, 1);
  assert.equal(report.cleanup.sessions, 'revoked_and_verified');
});
test('invalid provider choices are rejected before any account or provider traffic', async () => {
  let calls = 0;
  await assert.rejects(runAcceptance({ expectedCommit: sha, writesApproved: true, paidApproved: true,
    provider: 'arbitrary', request: async () => { calls++; } }), CheckFailure);
  assert.equal(calls, 0);
});
test('AI request contains only a new synthetic challenge, not private notes or account information', async () => {
  const { state } = await run();
  const ai = state.calls.find(x => x.path === '/api/v1/luqi-core');
  assert.deepEqual(Object.keys(ai.body).sort(), ['language','user_input']);
  assert.match(ai.body.user_input, /^Connection test\. Reply only with this exact text: LUQI-[a-f0-9]{24}$/);
  assert.ok(!ai.body.user_input.includes(state.account.email));
});
for (const options of [{ aiFailure: true }, { aiTransportFailure: true }, { wrongReply: true }]) {
  test('failed or unverifiable paid reply is never retried: ' + Object.keys(options)[0], async () => {
    const { state, report } = await run(options);
    assert.equal(state.ai, 1); assert.equal(report.success, false); assert.equal(report.providerReplyVerified, false);
    assert.equal(report.cleanup.notes, 'deleted_and_verified'); assert.equal(report.cleanup.sessions, 'revoked_and_verified');
    assert.doesNotMatch(JSON.stringify(report), /PRIVATE-|SYNTHETIC-SECRET/);
  });
}
test('a lost notebook creation response is reconciled by read and cleaned, never recreated', async () => {
  const { state, report } = await run({ lostCreateResponse: true });
  assert.equal(report.success, false); assert.equal(state.ai, 0); assert.equal(state.notes.length, 0);
  assert.equal(state.calls.filter(x => x.path === '/api/v1/companion/conversations' && x.method === 'POST').length, 1);
  assert.equal(report.cleanup.notes, 'deleted_and_verified');
});
test('lost password-change response stops writes and labels cleanup uncertain', async () => {
  const { state, report } = await run({ lostPasswordChange: true });
  assert.equal(state.ai, 0); assert.equal(state.rotates, 1); assert.equal(report.success, false);
  assert.equal(report.cleanup.sessions, 'password_change_outcome_uncertain'); assert.equal(report.cleanup.notes, 'not_verified');
});
test('failed note cleanup does not hide failure and still revokes sessions', async () => {
  const { report } = await run({ deleteFailure: true });
  assert.equal(report.success, false); assert.equal(report.cleanup.notes, 'not_verified'); assert.equal(report.cleanup.sessions, 'revoked_and_verified');
});
test('signup errors are not retried or echoed', async () => {
  const { state, report } = await run({ signupFailure: true });
  assert.equal(report.success, false); assert.equal(state.ai, 0);
  assert.equal(state.calls.filter(x => x.path === '/auth/signup').length, 1); assert.doesNotMatch(JSON.stringify(report), /PRIVATE-/);
});
test('deployment drift prevents the paid operation', async () => {
  const { state, report } = await run({ changedRevision: true });
  assert.equal(report.success, false); assert.equal(state.ai, 0); assert.equal(report.cleanup.notes, 'deleted_and_verified');
});
test('reports never contain passwords, tokens, email, note text or raw generated replies', async () => {
  const { state, report } = await run(); const serialized = JSON.stringify(report);
  for (const c of state.calls) for (const k of ['password','currentPassword','newPassword']) {
    if (c.body?.[k]) assert.ok(!serialized.includes(c.body[k]));
  }
  for (const token of state.tokens.keys()) assert.ok(!serialized.includes(token));
  assert.ok(!serialized.includes(state.account.email)); assert.doesNotMatch(serialized, /Synthetic LUQI acceptance note|LUQI-[a-f0-9]{24}/);
});
test('reader rejects oversized, non-JSON and malformed responses', async () => {
  await assert.rejects(boundedJson(new Response('"' + 'x'.repeat(200) + '"', { headers: { 'content-type': 'application/json' } }), 10));
  await assert.rejects(boundedJson(new Response('{}')));
  await assert.rejects(boundedJson(new Response('{broken', { headers: { 'content-type': 'application/json' } })));
});
