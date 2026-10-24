/** One explicitly approved synthetic production journey; no provider/admin keys.
 * Uses ordinary HTTP account routes. Never retries an account write or paid call.
 * Retains an inert synthetic account/counters, but removes its own test notes and
 * changes its password to an unretained random value to revoke issued tokens.
 * This is NOT human acceptance, invoice reconciliation or a restore drill.
 */
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
export const ORIGIN = 'https://web-production-a4b79.up.railway.app';
const NOTES = '/api/v1/companion/conversations';
const SHA = /^[a-f0-9]{40}$/;
const positiveId = x => Number.isSafeInteger(x) && x > 0;
const password = () => randomBytes(32).toString('base64url');

export class CheckFailure extends Error {
  constructor(check, status = null, code = null) {
    super('Production acceptance check failed'); this.check = check;
    this.status = Number.isInteger(status) ? status : null;
    const allowed = ['AUTH_REQUIRED','AUTH_UNAVAILABLE','AUTH_RATE_LIMITED','AUTH_THROTTLE_UNAVAILABLE',
      'AI_PROVIDER_UNAVAILABLE','AI_BUDGET_STORE_UNAVAILABLE','AI_PROVIDER_BUDGET_EXHAUSTED',
      'AI_USER_DAILY_QUOTA_EXHAUSTED','AI_DISABLED','BILLING_NOT_APPROVED','AI_BUDGET_CONFIGURATION_INVALID',
      'CONVERSATION_STORAGE_UNAVAILABLE','PASSWORD_CHANGE_UNAVAILABLE','ACCOUNT_RECOVERY_ASSISTED_ONLY'];
    this.code = allowed.includes(code) ? code : null;
  }
}
export async function boundedJson(response, limit = 131072) {
  if (!response.body || response.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') {
    throw new Error('Invalid JSON response');
  }
  const reader = response.body.getReader(); let bytes = 0; const chunks = [];
  try {
    for (;;) {
      const next = await reader.read(); if (next.done) break;
      bytes += next.value.byteLength;
      if (bytes > limit) throw new Error('Response too large');
      chunks.push(Buffer.from(next.value));
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
export async function runAcceptance({ expectedCommit, writesApproved = false, paidApproved = false,
  request = fetch } = {}) {
  if (!SHA.test(expectedCommit ?? '') || writesApproved !== true || typeof paidApproved !== 'boolean') {
    throw new CheckFailure('explicit_approval_and_revision_required');
  }
  const marker = 'luqi-acceptance-' + randomUUID();
  const email = marker + '@example.invalid';
  let currentPassword = password(); let token; let oldToken; let noteId;
  let writeAttempted = false; let passwordOutcomeUncertain = false;
  const report = { format: 'luqi.synthetic-production-acceptance.v1', expectedCommit,
    startedAt: new Date().toISOString(), syntheticAccountId: null, checks: [],
    providerRequestSubmitted: false, providerReplyVerified: false,
    billingReconciliation: 'not_verified', cleanup: { notes: 'not_created', sessions: 'not_created' },
    limitations: ['Synthetic HTTP journey, not human/browser acceptance', 'No email verification or automated recovery',
      'No database restart or production restore', 'Synthetic account and throttle/budget counters retained'], success: false };
  const pass = check => report.checks.push({ check, passed: true });
  const fail = (name, r) => { throw new CheckFailure(name, r?.status, r?.body?.code); };
  async function call(check, path, { method = 'GET', body, bearer, status = 200, privateResponse = true } = {}) {
    // All paths are authored constants or validated IDs, never returned URLs.
    if (!path.startsWith('/') || path.startsWith('//')) fail(check);
    let response, parsed;
    try {
      response = await request(ORIGIN + path, { method, redirect: 'error', cache: 'no-store', credentials: 'omit',
        headers: { Accept: 'application/json', 'Cache-Control': 'no-cache', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
          ...(bearer ? { Authorization: 'Bearer ' + bearer } : {}) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(check === 'one_budgeted_ai_reply' ? 50000 : 12000) });
      parsed = await boundedJson(response);
    } catch { fail(check); }
    const r = { status: response.status, body: parsed };
    if (response.status !== status || (privateResponse && response.headers.get('cache-control') !== 'no-store')) fail(check, r);
    return parsed;
  }
  async function revision(check) {
    const body = await call(check, '/v1/release');
    if (body.format !== 'luqi.release.v1' || body.commit !== expectedCommit) fail(check);
    pass(check);
  }
  async function login(check) {
    const result = await call(check, '/auth/login', { method: 'POST', body: { email, password: currentPassword } });
    if (result.user?.id !== report.syntheticAccountId || result.user?.email !== email ||
        typeof result.token !== 'string' || result.token.length < 20 || result.token.length > 4096) fail(check);
    token = result.token; pass(check);
  }
  async function rotate(check, nextPassword) {
    passwordOutcomeUncertain = true;
    const result = await call(check, '/api/v1/account/password', { method: 'POST', bearer: token,
      body: { currentPassword, newPassword: nextPassword } });
    if (result.changed !== true || result.signInRequired !== true) fail(check);
    currentPassword = nextPassword; passwordOutcomeUncertain = false; pass(check);
  }
  try {
    await revision('expected_revision_before');
    const ready = await call('persistence_ready', '/v1/readiness', { privateResponse: false });
    if (ready.checks?.persistence !== 'connected' || ready.checks?.ai_pilot !== 'configured_not_verified') fail('persistence_ready');
    pass('persistence_ready');
    await call('anonymous_notes_denied', NOTES, { status: 401 }); pass('anonymous_notes_denied');
    const signup = await call('normal_signup', '/auth/signup', { method: 'POST', status: 201,
      body: { email, password: currentPassword, name: 'LUQI automated acceptance fixture' } });
    if (!positiveId(signup.user?.id) || signup.user?.email !== email || typeof signup.token !== 'string' ||
        signup.token.length < 20 || signup.token.length > 4096) fail('normal_signup');
    report.syntheticAccountId = signup.user.id; token = signup.token; report.cleanup.sessions = 'pending'; pass('normal_signup');
    const me = await call('account_identity', '/auth/me', { bearer: token });
    if (me.id !== report.syntheticAccountId || me.email !== email) fail('account_identity'); pass('account_identity');
    await login('normal_login');
    const empty = await call('new_account_has_no_notes', NOTES, { bearer: token });
    if (!Array.isArray(empty.conversations) || empty.conversations.length !== 0) fail('new_account_has_no_notes');
    pass('new_account_has_no_notes');
    writeAttempted = true; report.cleanup.notes = 'pending';
    const note = await call('create_test_notebook', NOTES, { method: 'POST', bearer: token, status: 201,
      body: { personalityId: 1, title: marker } });
    if (!positiveId(note.id) || note.persisted !== true) fail('create_test_notebook'); noteId = note.id; pass('create_test_notebook');
    const content = 'Synthetic LUQI acceptance note. No customer or personal information. ' + marker;
    const saved = await call('persist_test_note', `${NOTES}/${noteId}/messages`, { method: 'POST', bearer: token,
      status: 201, body: { content } });
    if (!positiveId(saved.id) || saved.persisted !== true || saved.role !== 'user') fail('persist_test_note'); pass('persist_test_note');
    oldToken = token; await rotate('known_password_change', password());
    await call('old_session_revoked', '/auth/me', { bearer: oldToken, status: 401 }); pass('old_session_revoked'); oldToken = undefined;
    await login('sign_in_after_password_change');
    const messages = await call('note_survives_new_session', `${NOTES}/${noteId}/messages`, { bearer: token });
    if (messages.messages?.length !== 1 || messages.messages[0].content !== content) fail('note_survives_new_session');
    pass('note_survives_new_session');
    const exported = await call('owned_conversation_export', `${NOTES}/${noteId}/export`, { bearer: token });
    if (exported.format !== 'luqi.conversation.v1' || exported.conversation?.id !== noteId ||
        exported.messages?.length !== 1 || exported.messages[0].content !== content) fail('owned_conversation_export');
    pass('owned_conversation_export');
    const archive = await call('owned_notes_archive', NOTES + '/export', { bearer: token });
    if (archive.format !== 'luqi.private-notes.v1' || archive.conversations?.length !== 1 ||
        archive.conversations[0].id !== noteId || archive.messages?.length !== 1 || archive.messages[0].content !== content) fail('owned_notes_archive');
    pass('owned_notes_archive');
    const recovery = await call('recovery_limit_is_explicit', '/auth/forgot-password', { method: 'POST', status: 503, body: { email } });
    if (recovery.code !== 'ACCOUNT_RECOVERY_ASSISTED_ONLY') fail('recovery_limit_is_explicit'); pass('recovery_limit_is_explicit');
    if (paidApproved) {
      await revision('expected_revision_before_paid_request');
      const challenge = 'LUQI-' + randomBytes(12).toString('hex');
      report.providerRequestSubmitted = true;
      // One gateway request only. Existing server fallback may independently
      // reserve a second provider attempt. Never replay a failed/lost response.
      const reply = await call('one_budgeted_ai_reply', '/api/v1/luqi-core', { method: 'POST', bearer: token,
        body: { user_input: 'Connection test. Reply only with this exact text: ' + challenge, language: 'English' } });
      if (reply.status !== 'success' || !['gemini','openai'].includes(reply.provider) ||
          typeof reply.provider_model !== 'string' || !/^[a-zA-Z0-9.\-]{1,80}$/.test(reply.provider_model) ||
          typeof reply.response !== 'string' || reply.response.trim() !== challenge) fail('one_budgeted_ai_reply');
      report.providerReplyVerified = true; report.provider = reply.provider; report.model = reply.provider_model;
      report.replySha256 = createHash('sha256').update(reply.response).digest('hex'); pass('one_budgeted_ai_reply');
    }
  } catch (error) {
    const e = error instanceof CheckFailure ? error : new CheckFailure('unexpected_check_failure');
    report.checks.push({ check: e.check, passed: false, status: e.status, code: e.code });
  } finally {
    if (token && !passwordOutcomeUncertain) {
      try {
        if (writeAttempted) {
          const own = await call('cleanup_find_own_note', NOTES, { bearer: token });
          if (!Array.isArray(own.conversations)) fail('cleanup_find_own_note');
          // A lost create response is reconciled by one read, never by another create.
          const matches = own.conversations.filter(x => x?.title === marker && positiveId(x.id));
          if (matches.length > 1 || (noteId && matches.some(x => x.id !== noteId))) fail('cleanup_find_own_note');
          for (const note of matches) {
            const removed = await call('cleanup_delete_own_note', `${NOTES}/${note.id}`, { method: 'DELETE', bearer: token, body: { confirm: true } });
            if (removed.deleted !== true || removed.id !== note.id) fail('cleanup_delete_own_note');
            await call('deleted_note_unavailable', `${NOTES}/${note.id}/messages`, { bearer: token, status: 404 });
          }
          const after = await call('cleanup_confirm_empty', NOTES, { bearer: token });
          if (!Array.isArray(after.conversations) || after.conversations.length !== 0) fail('cleanup_confirm_empty');
          report.cleanup.notes = 'deleted_and_verified'; pass('cleanup_test_notes');
        }
      } catch { report.cleanup.notes = 'not_verified'; report.checks.push({ check: 'cleanup_test_notes', passed: false }); }
      try {
        await rotate('retire_synthetic_credentials', password());
        await call('final_session_revoked', '/auth/me', { bearer: token, status: 401 });
        report.cleanup.sessions = 'revoked_and_verified'; pass('final_session_revoked');
      } catch { report.cleanup.sessions = 'not_verified'; report.checks.push({ check: 'retire_synthetic_credentials', passed: false }); }
    } else if (token) {
      report.cleanup.sessions = 'password_change_outcome_uncertain';
      if (writeAttempted) report.cleanup.notes = 'not_verified';
    }
    // Credentials and raw note/provider content are never serialized or saved.
    token = undefined; oldToken = undefined; currentPassword = undefined;
    try { await revision('expected_revision_after'); }
    catch { report.checks.push({ check: 'expected_revision_after', passed: false }); }
    report.finishedAt = new Date().toISOString();
    report.success = report.checks.every(x => x.passed) && (!paidApproved || report.providerReplyVerified);
  }
  return report;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.env.GITHUB_ACTIONS !== 'true' || process.env.GITHUB_REPOSITORY !== 'ttmodupe-hash/luqi-ai' ||
        process.env.GITHUB_RUN_ATTEMPT !== '1' || process.env.LUQI_ACCEPTANCE_WRITES !== 'owner-approved-synthetic-only' ||
        !['one-request','none'].includes(process.env.LUQI_ACCEPTANCE_AI)) throw new CheckFailure('explicit_runner_approval_required');
    const result = await runAcceptance({ expectedCommit: process.env.LUQI_EXPECTED_COMMIT, writesApproved: true,
      paidApproved: process.env.LUQI_ACCEPTANCE_AI === 'one-request' });
    console.log(JSON.stringify(result, null, 2));
    if (!result.success) process.exitCode = 1;
  } catch { console.error('Production acceptance refused or failed; no credentials or raw responses logged.'); process.exitCode = 1; }
}
