/** Destructive, isolated MySQL 8.4 fixture only. Never use production secrets. */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import mysql, { type Pool, type RowDataPacket } from 'mysql2/promise';
import { spawn, type ChildProcess } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { setTimeout as pause } from 'node:timers/promises';
import { checkRuntimeSchema, RUNTIME_TABLES } from '../db/runtimeSchema';

const ROOT_URL = 'mysql://root:ci-ephemeral-only-password@127.0.0.1:3306/luqi_ci';
const RUNTIME_PASSWORD = 'a'.repeat(64);
const RUNTIME_URL = `mysql://luqi_web_runtime:${RUNTIME_PASSWORD}@127.0.0.1:3306/luqi_ci`;
const ORIGIN = 'http://127.0.0.1:8766';
const enabled = process.env.LUQI_MYSQL_CI_FIXTURE === 'true';
const runtimeEnvironment: NodeJS.ProcessEnv = { ...process.env, DATABASE_URL: RUNTIME_URL, NODE_ENV: 'production',
  PORT: '8766', JWT_SECRET: 'ci-runtime-role-only-jwt-secret-with-over-32-characters',
  LUQI_AI_PROVIDER_ENABLED: 'false', LUQI_AI_BILLING_APPROVED: 'false',
  LUQI_AI_CREDENTIAL_CHECK_ENABLED: 'false', LUQI_OMEGA_WEB_ENABLED: 'false' };
const grants: Record<string, string> = {
  users: 'SELECT, INSERT, UPDATE',
  companion_conversations: 'SELECT, INSERT, UPDATE, DELETE',
  companion_messages: 'SELECT, INSERT, DELETE', companion_memories: 'SELECT, DELETE',
  offline_sync_queue: 'SELECT, INSERT, UPDATE',
  auth_attempt_windows: 'SELECT, INSERT, UPDATE, DELETE',
  ai_pilot_monthly_spend: 'SELECT, INSERT, UPDATE',
  ai_pilot_daily_user_usage: 'SELECT, INSERT, UPDATE',
};
let root: Pool;
const children = new Set<ChildProcess>();
function runNode(file: string, args: string[], environment = runtimeEnvironment) {
  const child = spawn(process.execPath, [file, ...args], { env: environment, stdio: ['ignore', 'pipe', 'pipe'] });
  children.add(child);
  let output = '';
  const append = (data: Buffer) => { output = (output + data.toString()).slice(-24_000); };
  child.stdout!.on('data', append); child.stderr!.on('data', append);
  const exited = new Promise<number | null>((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', code => { children.delete(child); resolve(code); });
  });
  return { child, exited, output: () => output };
}
async function finish(run: ReturnType<typeof runNode>, timeout = 15_000) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([run.exited, new Promise<never>((_, reject) => {
      timer = setTimeout(() => { run.child.kill('SIGKILL'); reject(new Error('CI child process timed out')); }, timeout);
    })]);
  } finally { if (timer) clearTimeout(timer); }
}
async function stop(run: ReturnType<typeof runNode>) {
  if (run.child.exitCode == null) run.child.kill('SIGTERM');
  await finish(run);
}
async function start() {
  const run = runNode('dist/boot.js', []);
  for (let attempt = 0; attempt < 100; attempt++) {
    if (run.child.exitCode != null) throw new Error('Runtime exited before health; details deliberately withheld');
    try {
      const response = await fetch(`${ORIGIN}/v1/health`, { signal: AbortSignal.timeout(300) });
      if (response.status === 200) return run;
    } catch { /* wait for listener */ }
    await pause(100);
  }
  await stop(run);
  throw new Error('Runtime did not listen within the CI startup bound');
}
async function rejectsStartup(overrides: Record<string, string> = {}) {
  const run = runNode('dist/boot.js', [], { ...runtimeEnvironment, ...overrides });
  expect(await finish(run)).toBe(1);
  expect(run.output()).toContain('[Boot] Startup preflight failed (details redacted).');
  expect(run.output()).not.toContain('Server running');
  expect(run.output()).not.toContain('mysql://');
  expect(run.output()).not.toContain(RUNTIME_PASSWORD);
  await expect(fetch(`${ORIGIN}/v1/health`, { signal: AbortSignal.timeout(500) })).rejects.toThrow();
}
async function request(path: string, method = 'GET', body?: unknown, token?: string) {
  return fetch(`${ORIGIN}${path}`, { method, signal: AbortSignal.timeout(8_000),
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}) });
}

describe.skipIf(!enabled).sequential('restricted MySQL web runtime', () => {
  beforeAll(async () => {
    if (process.env.DATABASE_URL !== ROOT_URL) throw new Error('Refusing non-disposable MySQL fixture');
    root = mysql.createPool(ROOT_URL);
    const [tables] = await root.query<RowDataPacket[]>('SHOW TABLES');
    expect(tables).toHaveLength(0);
    // A check must fail on an empty DB, without creating any table.
    const check = runNode('dist/prepare-mysql-schema.js', [], { ...runtimeEnvironment, DATABASE_URL: ROOT_URL });
    expect(await finish(check)).toBe(1);
    const [unchanged] = await root.query<RowDataPacket[]>('SHOW TABLES');
    expect(unchanged).toHaveLength(0);
    for (let attempt = 0; attempt < 2; attempt++) {
      const apply = runNode('dist/prepare-mysql-schema.js', ['--apply'], { ...runtimeEnvironment, DATABASE_URL: ROOT_URL });
      expect(await finish(apply, 30_000)).toBe(0);
      expect(apply.output()).toContain('Validated 8 runtime tables');
    }
    const provision = runNode('dist/prepare-mysql-runtime-role.js', ['--provision-new'], {
      ...runtimeEnvironment, DATABASE_URL: ROOT_URL, LUQI_RUNTIME_DB_PASSWORD: RUNTIME_PASSWORD,
    });
    expect(await finish(provision, 30_000)).toBe(0);
    expect(provision.output()).toContain('"privileges":"table_only"');
    expect(provision.output()).not.toContain(RUNTIME_PASSWORD);
    expect(Object.keys(grants).sort()).toEqual(Object.keys(RUNTIME_TABLES).sort());
  }, 90_000);
  afterAll(async () => {
    for (const child of children) child.kill('SIGKILL');
    await root?.end();
  });

  it('checks real operator grants and never overwrites an existing identity on retry', async () => {
    const operator = { ...runtimeEnvironment, DATABASE_URL: ROOT_URL, LUQI_RUNTIME_DB_PASSWORD: RUNTIME_PASSWORD };
    const check = runNode('dist/prepare-mysql-runtime-role.js', ['--check'], operator);
    expect(await finish(check)).toBe(0);
    for (const password of [RUNTIME_PASSWORD, 'b'.repeat(64)]) {
      const collision = runNode('dist/prepare-mysql-runtime-role.js', ['--provision-new'], {
        ...operator, LUQI_RUNTIME_DB_PASSWORD: password,
      });
      expect(await finish(collision)).toBe(1);
      expect(collision.output()).not.toContain(password);
    }
    await root.query("GRANT SELECT ON luqi_ci.sessions TO 'luqi_web_runtime'@'%'");
    try {
      const tooBroad = runNode('dist/prepare-mysql-runtime-role.js', ['--check'], operator);
      expect(await finish(tooBroad)).toBe(1);
    } finally { await root.query("REVOKE SELECT ON luqi_ci.sessions FROM 'luqi_web_runtime'@'%'"); }
    expect(await checkRuntimeSchema(runtimeEnvironment)).toEqual({ status: 'validated', tables: 8 });
  }, 60_000);

  it('checks schema with a restricted role; explicit apply and unknown arguments fail safely', async () => {
    expect(await checkRuntimeSchema(runtimeEnvironment)).toEqual({ status: 'validated', tables: 8 });
    for (const args of [[], ['--check']]) {
      const check = runNode('dist/prepare-mysql-schema.js', args);
      expect(await finish(check)).toBe(0);
    }
    for (const args of [['--apply'], ['--unexpected-secret-fixture']]) {
      const apply = runNode('dist/prepare-mysql-schema.js', args);
      expect(await finish(apply)).toBe(1);
      expect(apply.output()).not.toContain(RUNTIME_PASSWORD);
      expect(apply.output()).not.toContain('--unexpected-secret-fixture');
    }
    const missing = runNode('dist/prepare-mysql-schema.js', [], { ...runtimeEnvironment, DATABASE_URL: '', DB_HOST: '' });
    expect(await finish(missing)).toBe(1);
  }, 60_000);

  it('cannot create, alter, drop, truncate, grant or read unrelated legacy data', async () => {
    const restricted = await mysql.createConnection(RUNTIME_URL);
    try {
      for (const sql of [
        'CREATE TABLE IF NOT EXISTS users (id INT)', 'CREATE TABLE forbidden_ci (id INT)',
        'ALTER TABLE users ADD COLUMN forbidden_ci INT', 'DROP TABLE users', 'TRUNCATE TABLE users',
        "CREATE USER 'forbidden_ci'@'%' IDENTIFIED BY 'not-a-real-password'",
        "GRANT SELECT ON luqi_ci.users TO 'luqi_web_runtime'@'%'", 'DELETE FROM users',
        'SELECT * FROM sessions LIMIT 0', 'SELECT * FROM botanical_species LIMIT 0',
      ]) await expect(restricted.query(sql)).rejects.toMatchObject({ code: expect.stringMatching(/ACCESS_DENIED|COMMAND_DENIED/) });
    } finally { await restricted.end(); }
  });

  it('serves real authentication and private conversations across restart with no schema writes or seeds', async () => {
    let run = await start();
    try {
      const password = 'CI-Private-Runtime-Strong-Password-2026!';
      const account = async (email: string) => {
        const response = await request('/api/v1/auth/register', 'POST', { email, password });
        expect(response.status).toBe(201);
        return response.json() as Promise<{ token: string }>;
      };
      const owner = await account('owner-runtime@example.invalid');
      const foreign = await account('foreign-runtime@example.invalid');
      const login = await request('/api/v1/auth/login', 'POST', { email: 'owner-runtime@example.invalid', password });
      expect(login.status).toBe(200);
      const created = await request('/api/v1/companion/conversations', 'POST', { personalityId: 1,
        title: 'Synthetic restricted-role persistence fixture' }, owner.token);
      expect(created.status).toBe(201);
      const conversation = await created.json() as { id: number };
      const path = `/api/v1/companion/conversations/${conversation.id}`;
      expect((await request(`${path}/messages`, 'POST', { content: 'Synthetic private message' }, owner.token)).status).toBe(201);
      expect((await request(`${path}/export`, 'GET', undefined, foreign.token)).status).toBe(404);
      await stop(run); run = await start();
      const messages = await request(`${path}/messages`, 'GET', undefined, owner.token);
      expect(messages.status).toBe(200);
      expect((await messages.json()).messages).toMatchObject([{ content: 'Synthetic private message', role: 'user' }]);
      const exported = await request(`${path}/export`, 'GET', undefined, owner.token);
      expect(exported.status).toBe(200);
      expect((await exported.json()).format).toBe('luqi.conversation.v1');
      const allNotes = await request('/api/v1/companion/conversations/export', 'GET', undefined, owner.token);
      expect(allNotes.status).toBe(200);
      expect(await allNotes.json()).toMatchObject({ format: 'luqi.private-notes.v1', scope: 'saved_notes_only',
        conversations: [{ id: conversation.id }], messages: [{ conversationId: conversation.id, content: 'Synthetic private message' }] });
      const foreignNotes = await request('/api/v1/companion/conversations/export', 'GET', undefined, foreign.token);
      expect(foreignNotes.status).toBe(200);
      expect(await foreignNotes.json()).toMatchObject({ conversations: [], messages: [], memories: [] });
      const changed = await request('/api/v1/account/password', 'POST', { currentPassword: password,
        newPassword: 'CI-Runtime-Changed-Password-2026!' }, owner.token);
      expect(changed.status).toBe(200);
      expect(await changed.json()).toEqual({ changed: true, signInRequired: true });
      expect((await request('/auth/me', 'GET', undefined, owner.token)).status).toBe(401);
      expect((await request('/api/v1/companion/conversations/export', 'GET', undefined, owner.token)).status).toBe(401);
      expect((await request('/auth/me', 'GET', undefined, foreign.token)).status).toBe(200);
      await stop(run); run = await start();
      expect((await request('/auth/me', 'GET', undefined, owner.token)).status).toBe(401);
      const newLogin = await request('/api/v1/auth/login', 'POST', { email: 'owner-runtime@example.invalid',
        password: 'CI-Runtime-Changed-Password-2026!' });
      expect(newLogin.status).toBe(200); owner.token = (await newLogin.json() as { token: string }).token;
      expect((await request(`${path}/messages`, 'GET', undefined, owner.token)).status).toBe(200);
      expect((await request(path, 'DELETE', { confirm: true }, foreign.token)).status).toBe(404);
      expect((await request(path, 'DELETE', { confirm: true }, owner.token)).status).toBe(200);
      expect((await request(`${path}/messages`, 'GET', undefined, owner.token)).status).toBe(404);
      const ready = await request('/v1/readiness');
      expect(ready.status).toBe(503);
      expect((await ready.json()).checks).toMatchObject({ persistence: 'connected', ai_pilot: 'disabled' });
      // The legacy seed creates an extra table outside the base 38. Neither
      // web startup nor a restart may create that table or seed its contents.
      const [seed] = await root.query<RowDataPacket[]>(`SELECT COUNT(*) AS n FROM information_schema.tables
        WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='botanical_species'`);
      expect(Number(seed[0].n)).toBe(0);
      expect(run.output()).not.toContain('[Bootstrap]');
      expect(run.output()).not.toContain('[Seed]');
    } finally { await stop(run); }
  }, 60_000);

  it('refuses to open a port when a core table is absent', async () => {
    await root.query('RENAME TABLE auth_attempt_windows TO ci_hidden_auth_windows');
    try { await rejectsStartup(); }
    finally { await root.query('RENAME TABLE ci_hidden_auth_windows TO auth_attempt_windows'); }
  }, 25_000);

  it('rejects missing and prefix-only email uniqueness without modifying records', async () => {
    await root.query('ALTER TABLE users DROP INDEX users_email_unique');
    try {
      await rejectsStartup();
      await root.query('CREATE UNIQUE INDEX ci_email_prefix ON users (email(6))');
      try { await rejectsStartup(); }
      finally { await root.query('DROP INDEX ci_email_prefix ON users'); }
    } finally { await root.query('CREATE UNIQUE INDEX users_email_unique ON users (email)'); }
  }, 40_000);

  it('rejects unsafe counter types and nontransactional storage', async () => {
    await root.query('ALTER TABLE ai_pilot_monthly_spend MODIFY reserved_cents INT NOT NULL DEFAULT 0');
    try { await rejectsStartup(); }
    finally { await root.query('ALTER TABLE ai_pilot_monthly_spend MODIFY reserved_cents INT UNSIGNED NOT NULL DEFAULT 0'); }
    await root.query('ALTER TABLE companion_memories ENGINE=MyISAM');
    try { await rejectsStartup(); }
    finally { await root.query('ALTER TABLE companion_memories ENGINE=InnoDB'); }
  }, 40_000);

  it('keeps Omega optional while disabled and requires its schema and access when enabled', async () => {
    await rejectsStartup({ LUQI_OMEGA_WEB_ENABLED: 'true' });
    await root.query(readFileSync('db/migrations/20261023_omega_tasks.sql', 'utf8'));
    await expect(checkRuntimeSchema({ ...runtimeEnvironment, LUQI_OMEGA_WEB_ENABLED: 'true' })).rejects.toThrow('MYSQL_RUNTIME_SCHEMA_UNAVAILABLE');
    await root.query("GRANT SELECT, INSERT, UPDATE, DELETE ON luqi_ci.omega_tasks_v1 TO 'luqi_web_runtime'@'%'");
    expect(await checkRuntimeSchema({ ...runtimeEnvironment, LUQI_OMEGA_WEB_ENABLED: 'true' }))
      .toEqual({ status: 'validated', tables: 9 });
    // The owner/operator separately applied this exact table grant to the
    // disposable fixture. --check must validate it but never change it.
    const omegaRole = { ...runtimeEnvironment, DATABASE_URL: ROOT_URL,
      LUQI_RUNTIME_DB_PASSWORD: RUNTIME_PASSWORD, LUQI_OMEGA_WEB_ENABLED: 'true' };
    const omegaCheck = runNode('dist/prepare-mysql-runtime-role.js', ['--check'], omegaRole);
    expect(await finish(omegaCheck)).toBe(0);
    expect(omegaCheck.output()).toContain('"tables":9');
    expect(omegaCheck.output()).toContain('"privileges":"table_only"');
    expect(omegaCheck.output()).not.toContain(RUNTIME_PASSWORD);
    const refuseProvision = runNode('dist/prepare-mysql-runtime-role.js', ['--provision-new'], omegaRole);
    expect(await finish(refuseProvision)).toBe(1);
    expect(refuseProvision.output()).not.toContain(RUNTIME_PASSWORD);
    // A core-only check still rejects an unexpected extra grant, not silently
    // broadening the policy when Omega intake is disabled.
    const coreCheck = runNode('dist/prepare-mysql-runtime-role.js', ['--check'],
      { ...omegaRole, LUQI_OMEGA_WEB_ENABLED: 'false' });
    expect(await finish(coreCheck)).toBe(1);

  }, 25_000);


  it('keeps project storage opt-in and verifies exact ninth/tenth grants only after a reviewed migration', async () => {
    await rejectsStartup({LUQI_PROJECT_VAULT_ENABLED:'true'});
    await root.query(readFileSync('db/migrations/20261025_project_vault.sql', 'utf8'));
    await expect(checkRuntimeSchema({...runtimeEnvironment, LUQI_PROJECT_VAULT_ENABLED:'true'}))
      .rejects.toThrow('MYSQL_RUNTIME_SCHEMA_UNAVAILABLE');
    await root.query("GRANT SELECT, INSERT, UPDATE, DELETE ON luqi_ci.luqi_project_vault_v1 TO 'luqi_web_runtime'@'%'");
    expect(await checkRuntimeSchema({
      ...runtimeEnvironment, LUQI_OMEGA_WEB_ENABLED:'true', LUQI_PROJECT_VAULT_ENABLED:'true',
    })).toEqual({status:'validated',tables:10});
    const operator = {
      ...runtimeEnvironment, DATABASE_URL:ROOT_URL, LUQI_RUNTIME_DB_PASSWORD:RUNTIME_PASSWORD,
      LUQI_OMEGA_WEB_ENABLED:'true', LUQI_PROJECT_VAULT_ENABLED:'true',
    };
    const check = runNode('dist/prepare-mysql-runtime-role.js',['--check'],operator);
    expect(await finish(check)).toBe(0);
    expect(check.output()).toContain('"tables":10');
    expect(check.output()).toContain('"privileges":"table_only"');
    expect(check.output()).not.toContain(RUNTIME_PASSWORD);
    const prohibited = runNode('dist/prepare-mysql-runtime-role.js',['--provision-new'],operator);
    expect(await finish(prohibited)).toBe(1);
    expect(prohibited.output()).not.toContain(RUNTIME_PASSWORD);
    const omitted = runNode('dist/prepare-mysql-runtime-role.js',['--check'],
      {...operator, LUQI_PROJECT_VAULT_ENABLED:'false'});
    expect(await finish(omitted)).toBe(1);
  },45_000);
  it('fails closed before listening for unreachable or invalid configured MySQL', async () => {
    await rejectsStartup({ DATABASE_URL: 'mysql://fixture:private-synthetic-unreachable-password@127.0.0.1:1/luqi_ci' });
    await rejectsStartup({ DATABASE_URL: 'postgresql://fixture:private-synthetic-password@127.0.0.1:1/luqi_ci' });
  }, 30_000);
});
