/** Real HTTP + restricted MySQL fixture ONLY; never target production. */
import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as pause } from 'node:timers/promises';
import mysql from 'mysql2/promise';
import { probeLocalHttp, summarizeDurations } from '../scripts/http-load-probe.mjs';

const ROOT = 'mysql://root:ci-ephemeral-only-password@127.0.0.1:3306/luqi_ci';
const PASSWORD = 'c'.repeat(64);
const RUNTIME = `mysql://luqi_web_runtime:${PASSWORD}@127.0.0.1:3306/luqi_ci`;
const ORIGIN = 'http://127.0.0.1:8779';
const BASELINE = '8f581283b63243d4d52031419c5a85a874adec6e';
const CANDIDATE = process.env.GITHUB_SHA;
const enabled = process.env.LUQI_MYSQL_CI_FIXTURE === 'true';
let root, live, owner, foreign, conversation;
const children = new Set();
const contents = ['Synthetic operations seed'];
const childEnv = { PATH: process.env.PATH, NODE_ENV: 'production', PORT: '8779', DATABASE_URL: RUNTIME,
  LUQI_MYSQL_CI_FIXTURE: 'true',
  JWT_SECRET: 'ci-operations-jwt-secret-only-over-32-characters',
  LUQI_AI_PROVIDER_ENABLED: 'false', LUQI_AI_BILLING_APPROVED: 'false',
  LUQI_AI_CREDENTIAL_CHECK_ENABLED: 'false', LUQI_OMEGA_WEB_ENABLED: 'false',
  LUQI_CUSTOMER_RESUME_ENABLED: 'false', LUQI_P2P_ENABLED: 'false', LUQI_BUSINESS_CONNECT_ENABLED: 'false' };

function launch(file, args = [], environment = childEnv) {
  const child = spawn(process.execPath, [file, ...args], { env: environment, stdio: ['ignore', 'pipe', 'pipe'] });
  children.add(child); let output = '';
  const append = chunk => { output = (output + chunk.toString()).slice(-12000); };
  child.stdout.on('data', append); child.stderr.on('data', append);
  const exited = new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', code => { children.delete(child); resolve(code); });
  });
  return { child, exited, output: () => output };
}
async function finish(run, ms = 15000) {
  let timer;
  try {
    return await Promise.race([run.exited, new Promise((_, reject) => {
      timer = setTimeout(() => { run.child.kill('SIGKILL'); reject(Error('Fixture child timed out; details withheld')); }, ms);
    })]);
  } finally { clearTimeout(timer); }
}
async function stop() {
  if (!live) return;
  const run = live; live = undefined;
  run.child.kill('SIGTERM');
  assert.equal(await finish(run), 0, 'Graceful shutdown must complete without a forced kill');
}
async function request(path, { method = 'GET', body, token } = {}) {
  return fetch(ORIGIN + path, { method, redirect: 'error', credentials: 'omit', cache: 'no-store',
    signal: AbortSignal.timeout(5000),
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}) });
}
async function json(response, expected) {
  assert.equal(response.status, expected);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  return response.json();
}
async function start(file, commit) {
  assert.equal(live, undefined);
  live = launch(file, [], { ...childEnv, RAILWAY_GIT_COMMIT_SHA: commit });
  for (let n = 0; n < 100; n++) {
    assert.equal(live.child.exitCode, null, 'Fixture runtime exited before startup; details withheld');
    try {
      const response = await request('/v1/release');
      const release = await json(response, 200);
      if (release.commit === commit) return;
    } catch { /* bounded listener startup, not request retries */ }
    await pause(100);
  }
  throw Error('Fixture runtime did not become ready');
}
async function readMessages(token = owner) {
  return json(await request(`/api/v1/companion/conversations/${conversation}/messages`, { token }), 200);
}
async function addMessage(content) {
  await json(await request(`/api/v1/companion/conversations/${conversation}/messages`, {
    method: 'POST', body: { content }, token: owner,
  }), 201);
}

describe('bounded production operations on a disposable restricted MySQL fixture', { skip: !enabled }, () => {
  before(async () => {
    assert.equal(process.env.GITHUB_ACTIONS, 'true');
    assert.equal(process.env.DATABASE_URL, ROOT, 'Refusing non-fixture database');
    assert.match(CANDIDATE ?? '', /^[a-f0-9]{40}$/);
    root = mysql.createPool(ROOT);
    const [tables] = await root.query('SHOW TABLES');
    assert.equal(tables.length, 0, 'Require a new empty disposable fixture');
    assert.equal(await finish(launch('dist/prepare-mysql-schema.js', ['--apply'], { ...childEnv, DATABASE_URL: ROOT }), 60000), 0);
    assert.equal(await finish(launch('dist/prepare-mysql-runtime-role.js', ['--provision-new'], {
      ...childEnv, DATABASE_URL: ROOT, LUQI_RUNTIME_DB_PASSWORD: PASSWORD,
    }), 30000), 0);
    await start('dist/boot.js', CANDIDATE);
    const signup = async email => (await json(await request('/api/v1/auth/register', {
      method: 'POST', body: { email, password: 'CI-Synthetic-Operations-Password-2026!' },
    }), 201)).token;
    owner = await signup('owner-operations@example.invalid');
    foreign = await signup('foreign-operations@example.invalid');
    assert.equal(typeof owner, 'string'); assert.equal(typeof foreign, 'string');
    conversation = (await json(await request('/api/v1/companion/conversations', {
      method: 'POST', token: owner, body: { personalityId: 1, title: 'Synthetic operations fixture' },
    }), 201)).id;
    assert.ok(Number.isSafeInteger(conversation));
    await addMessage(contents[0]);
  }, { timeout: 120000 });

  after(async () => {
    try { await stop(); }
    finally { for (const child of children) child.kill('SIGKILL'); await root?.end(); }
  });

  test('measures bounded HTTP concurrency against the actual compiled server and SPA', { timeout: 30000 }, async () => {
    for (const concurrency of [5, 20]) {
      const report = await probeLocalHttp({ origin: ORIGIN, concurrency, total: 120 });
      assert.equal(report.passed, true);
      assert.equal(report.succeeded, 120);
      assert.ok(report.latency.p95_ms < 2000, 'Local HTTP p95 exceeded the fixture regression limit');
      console.log(JSON.stringify(report));
    }
  });

  test('retains all concurrent private writes and separates owners during concurrent reads', { timeout: 30000 }, async () => {
    const durations = [];
    await Promise.all(Array.from({ length: 10 }, async (_, n) => {
      const content = `Synthetic concurrent note ${n}`; contents.push(content);
      const start = performance.now(); await addMessage(content); durations.push(performance.now() - start);
    }));
    let next = 0;
    await Promise.all(Array.from({ length: 10 }, async () => {
      while (next < 30) {
        const n = next++; const start = performance.now();
        if (n % 3 === 0) {
          const denied = await json(await request(`/api/v1/companion/conversations/${conversation}/messages`, { token: foreign }), 404);
          assert.equal(denied.code, 'CONVERSATION_NOT_FOUND');
        } else {
          const messages = await readMessages();
          assert.equal(messages.messages.length, contents.length);
        }
        durations.push(performance.now() - start);
      }
    }));
    const saved = await readMessages();
    assert.deepEqual(saved.messages.map(m => m.content).sort(), [...contents].sort());
    assert.equal(new Set(saved.messages.map(m => m.id)).size, contents.length);
    const latency = summarizeDurations(durations);
    assert.ok(latency.p95_ms < 3000, 'Private HTTP p95 exceeded the fixture regression limit');
    console.log(JSON.stringify({ scope: 'restricted_mysql_fixture', concurrent_writers: 10,
      mixed_reads: 30, latency, result: 'all_writes_persisted_and_foreign_reads_denied', production_capacity_verified: false }));
  });

  test('fails closed on actual storage failure, then recovers without in-memory acknowledgements', async () => {
    await root.query("REVOKE SELECT ON luqi_ci.companion_messages FROM 'luqi_web_runtime'@'%'");
    try {
      const response = await json(await request(`/api/v1/companion/conversations/${conversation}/messages`, { token: owner }), 503);
      assert.deepEqual(response, { code: 'CONVERSATION_STORAGE_UNAVAILABLE' });
      const health = await json(await request('/v1/health'), 200);
      assert.equal(health.status, 'healthy'); // process liveness is separate
    } finally { await root.query("GRANT SELECT ON luqi_ci.companion_messages TO 'luqi_web_runtime'@'%'"); }
    assert.equal((await readMessages()).messages.length, contents.length);
  });

  test('preserves notes through graceful restart and previous/current API bundle rollback', { timeout: 60000 }, async () => {
    await stop(); await start('dist/boot.js', CANDIDATE);
    assert.equal((await readMessages()).messages.length, contents.length);
    await stop(); await start('dist/rollback/boot.js', BASELINE);
    assert.deepEqual((await readMessages()).messages.map(m => m.content).sort(), [...contents].sort());
    await addMessage('Synthetic note written by previous API bundle');
    contents.push('Synthetic note written by previous API bundle');
    await stop(); await start('dist/boot.js', CANDIDATE);
    assert.deepEqual((await readMessages()).messages.map(m => m.content).sort(), [...contents].sort());
    console.log(JSON.stringify({ scope: 'fixture_api_bundle_rollback', baseline_commit: BASELINE,
      restart: 'passed', downgrade: 'passed', forward_recovery: 'passed', notes_preserved: contents.length,
      production_rollback_performed: false, frontend_rollback_tested: false }));
  });
});
