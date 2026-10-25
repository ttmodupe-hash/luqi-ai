import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ACCOUNT_CONTEXT, ACCOUNT_QUERY, BCRYPT_SHAPE, NON_ACCOUNT_SENTINEL,
  assertAccountContext, assertOperatorAppRoot, normalizeAccountEmail, classifyAccountRows, inspectAccount,
} from '../scripts/diagnose-account-access.mjs';

const active = { id: 123, active: 1, credential_format_supported: 1 };
test('requires the exact reviewed production context', () => {
  assert.doesNotThrow(() => assertAccountContext(ACCOUNT_CONTEXT));
  for (const key of Object.keys(ACCOUNT_CONTEXT)) {
    const env = { ...ACCOUNT_CONTEXT }; delete env[key];
    assert.throws(() => assertAccountContext(env), { message: 'ACCOUNT_CONTEXT_REFUSED' });
    env[key] = 'wrong-context';
    assert.throws(() => assertAccountContext(env), { message: 'ACCOUNT_CONTEXT_REFUSED' });
  }
});
test('recognizes the production Docker physical working directory, not the historical symlink', () => {
  assert.doesNotThrow(() => assertOperatorAppRoot('/srv/luqi'));
  for (const wrongRoot of ['/app', '/', '/srv/other', '/tmp']) {
    assert.throws(() => assertOperatorAppRoot(wrongRoot), { message: 'ACCOUNT_APP_DIRECTORY_REQUIRED' });
  }
});
test('normalizes an email exactly once without accepting a password parameter', () => {
  assert.equal(normalizeAccountEmail(' Test@Example.Invalid '), 'test@example.invalid');
});
for (const value of [null, {}, '', 'not-an-email', 'a b@example.invalid', 'x'.repeat(255) + '@example.invalid']) {
  test(`refuses malformed identifier ${typeof value}/${String(value).length}`, () => {
    assert.throws(() => normalizeAccountEmail(value), { message: 'ACCOUNT_INPUT_REFUSED' });
  });
}
test('uses one bounded parameterized SELECT and no account write', async () => {
  let calls = 0;
  const email = "o'brien@example.invalid";
  const result = await inspectAccount({ query: async (options, parameters) => {
    calls++; assert.equal(options.sql, ACCOUNT_QUERY); assert.equal(options.timeout, 5000);
    assert.equal(options.sql.startsWith('SELECT id, is_active AS active,'), true);
    assert.equal(options.sql.endsWith('FROM users WHERE email = ? LIMIT 2'), true);
    assert.equal(options.sql.includes(email), false);
    assert.equal(/\b(UPDATE|INSERT|DELETE|DROP|ALTER|REPLACE|SET|CALL|INTO)\b/i.test(options.sql), false);
    assert.deepEqual(parameters, [BCRYPT_SHAPE, NON_ACCOUNT_SENTINEL, email]);
    assert.equal(options.sql.includes('SELECT *'), false);
    return [[active]];
  } }, email);
  assert.equal(calls, 1); assert.deepEqual(result, { code: 'ACCOUNT_ACTIVE_FORMAT_SUPPORTED', accountId: 123 });
});
test('invalid email never calls the database', async () => {
  let calls = 0;
  await assert.rejects(inspectAccount({ query: async () => { calls++; } }, ''), { message: 'ACCOUNT_INPUT_REFUSED' });
  assert.equal(calls, 0);
});
test('missing and ambiguous matches are distinct private operator outcomes', () => {
  assert.deepEqual(classifyAccountRows([]), { code: 'ACCOUNT_NOT_FOUND' });
  assert.deepEqual(classifyAccountRows([active, { ...active, id: 124 }]), { code: 'ACCOUNT_MATCH_AMBIGUOUS' });
});
for (const value of [0, false, null]) {
  test(`inactive flag ${value} never implies automatic activation`, () => {
    assert.deepEqual(classifyAccountRows([{ ...active, active: value }]), { code: 'ACCOUNT_INACTIVE', accountId: 123 });
  });
}
for (const value of [1, true]) {
  test(`active flag ${value} still requires supported credential shape`, () => {
    assert.deepEqual(classifyAccountRows([{ ...active, active: value, credential_format_supported: 0 }]),
      { code: 'ACCOUNT_CREDENTIAL_FORMAT_UNSUPPORTED', accountId: 123 });
  });
}
test('whitelists output even when a test driver returns private fields', () => {
  const result = classifyAccountRows([{ ...active, password_hash: 'private-fixture', email: 'fixture@example.invalid', token: 'private-token' }]);
  assert.deepEqual(result, { code: 'ACCOUNT_ACTIVE_FORMAT_SUPPORTED', accountId: 123 });
  assert.equal(JSON.stringify(result).includes('private'), false);
});
for (const rows of [null, {}, [null], [[]], [active, active, active],
  [{ ...active, id: '123' }], [{ ...active, id: 0 }], [{ ...active, id: Number.MAX_SAFE_INTEGER + 1 }],
  [{ ...active, active: '1' }], [{ ...active, active: 2 }], [{ ...active, active: undefined }],
  [{ ...active, credential_format_supported: null }], [{ ...active, credential_format_supported: '1' }]]) {
  test(`refuses unverified result shape ${JSON.stringify(rows)}`, () => {
    assert.throws(() => classifyAccountRows(rows), { message: 'ACCOUNT_RESULT_UNVERIFIED' });
  });
}
test('database failures are redacted and never retried', async () => {
  let calls = 0;
  await assert.rejects(inspectAccount({ query: async () => { calls++; throw new Error('mysql://private-secret@example.invalid'); } },
    'fixture@example.invalid'), { message: 'ACCOUNT_CHECK_UNAVAILABLE' });
  assert.equal(calls, 1);
});
test('invalid driver output becomes a fixed error', async () => {
  await assert.rejects(inspectAccount({ query: async () => [[{ id: 'private-fixture' }]] }, 'fixture@example.invalid'),
    { message: 'ACCOUNT_CHECK_UNAVAILABLE' });
});
test('sentinel and supported bcrypt formats match the reviewed login conventions', () => {
  const pattern = new RegExp(BCRYPT_SHAPE);
  assert.equal(pattern.test(NON_ACCOUNT_SENTINEL), true);
  for (const prefix of ['a', 'b', 'y']) assert.equal(pattern.test('$2' + prefix + '$12$' + 'x'.repeat(53)), true);
  assert.equal(pattern.test('legacy-non-bcrypt-format'), false);
});
test('noninteractive invocation refuses before loading MySQL or printing inputs', () => {
  const script = fileURLToPath(new URL('../scripts/diagnose-account-access.mjs', import.meta.url));
  const result = spawnSync(process.execPath, [script, 'private-fixture'], {
    encoding: 'utf8', timeout: 5000,
    env: { PATH: process.env.PATH, ...ACCOUNT_CONTEXT, DATABASE_URL: 'mysql://private-secret@example.invalid' },
  });
  assert.equal(result.status, 1); assert.equal(result.stdout, '');
  assert.match(result.stderr, /^Account check stopped\./);
  assert.equal(/private-fixture|private-secret|ERR_MODULE_NOT_FOUND|example.invalid/.test(result.stderr), false);
});
