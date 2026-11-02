/** Actual JWT -> Hono API -> MySQL -> independent Python worker -> API round trip.
 * Every write is restricted to this exact disposable GitHub Actions fixture.
 */
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import mysql, { type Pool, type ResultSetHeader, type RowDataPacket } from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { omegaTasks } from '../api/omega-tasks';
import { signUserToken } from '../api/lib/userToken';
import { bootstrapDatabase } from '../db/bootstrap';
import { closeDb } from '../api/queries/connection';

const DATABASE = 'mysql://root:ci-ephemeral-only-password@127.0.0.1:3306/luqi_omega_ci';
const fixture = process.env.GITHUB_ACTIONS === 'true' && process.env.LUQI_OMEGA_MYSQL_CI_FIXTURE === 'true' &&
  process.env.DATABASE_URL === DATABASE;
const run = promisify(execFile);
const budget = { handler: 'travel.budget', payload: { currency: 'ZAR', amounts: ['100.25', '40'] } };
let pool: Pool;
let owner: { id: number; token: string };
let other: { id: number; token: string };

async function account() {
  const hash = await bcrypt.hash('Isolated-Worker-Auth-Fixture!', 4);
  const [row] = await pool.execute<ResultSetHeader>('INSERT INTO users (email,password_hash,is_active) VALUES (?,?,1)',
    [`omega-${randomUUID()}@example.invalid`, hash]);
  return { id: row.insertId, token: signUserToken(row.insertId, hash) };
}
function request(token: string, path: string, body?: unknown) {
  return omegaTasks.request(path, { method: body === undefined ? 'GET' : 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
async function submit(token: string, input = budget, key = randomUUID()) {
  const response = await request(token, '/', { ...input, idempotencyKey: key });
  expect(response.status).toBe(201);
  return (await response.json()).task;
}
async function worker(id: string) {
  const options = { cwd: process.cwd(), timeout: 15_000, env: { ...process.env,
    LUQI_OMEGA_DATABASE_URL: DATABASE, LUQI_OMEGA_WORKER_ENABLED: 'true' } };
  try {
    const result = await run('python', ['-m', 'omega_ai.web_worker', '--task-id', id], options);
    expect(result.stderr).toBe('');
    return { exit: 0, body: JSON.parse(result.stdout) };
  } catch (error: any) {
    if (typeof error.code !== 'number') throw error;
    expect(error.stderr).toBe('');
    return { exit: error.code, body: JSON.parse(error.stdout) };
  }
}

describe.skipIf(!fixture).sequential('authenticated Node/Python Omega bridge on real MySQL', () => {
  beforeAll(async () => {
    if (!fixture) throw new Error('Refusing database fixture outside exact isolated CI configuration');
    process.env.JWT_SECRET = 'ci-omega-jwt-only-secret-for-isolated-accounts';
    process.env.LUQI_OMEGA_WEB_ENABLED = 'true';
    pool = mysql.createPool(DATABASE);
    await bootstrapDatabase();
    await pool.query(readFileSync('db/migrations/20261023_omega_tasks.sql', 'utf8'));
    owner = await account(); other = await account();
  }, 60_000);
  afterAll(async () => { if (pool) await pool.end(); await closeDb(); });

  it('requires actual signed active-account authentication before exposing queue status', async () => {
    expect((await omegaTasks.request('/status')).status).toBe(401);
    const forged = await request('unverified-client-token', '/status');
    expect(forged.status).toBe(401);
    const status = await request(owner.token, '/status');
    expect(status.status).toBe(200);
    expect(await status.json()).toMatchObject({ storage: 'connected', execution: 'operator_run_only', workerVerified: false });
    process.env.LUQI_OMEGA_WEB_ENABLED = 'false';
    try {
      expect((await request(owner.token, '/', { ...budget, idempotencyKey: randomUUID() })).status).toBe(503);
      expect(await (await request(owner.token, '/status')).json()).toMatchObject({ intake: 'disabled', execution: 'disabled' });
    } finally { process.env.LUQI_OMEGA_WEB_ENABLED = 'true'; }
  });

  const validCases = JSON.parse(readFileSync('tests/fixtures/omega-web-contracts.json', 'utf8')).filter((item: any) => item.valid);
  it.each(validCases)('persists and executes $name across Node and Python', async (item: any) => {
    const task = await submit(owner.token, { handler: item.handler, payload: item.payload });
    expect(task.state).toBe('pending');
    expect(task.result).toBeNull();
    expect(await worker(task.id)).toEqual({ exit: 0, body: { id: task.id, state: 'completed', error: null } });
    const read = await request(owner.token, `/${task.id}`);
    expect(read.status).toBe(200);
    const saved = (await read.json()).task;
    expect(saved).toMatchObject({ state: 'completed', attempts: 1, result: item.result, payload: item.payload });
    for (const key of ['owner_id', 'ownerId', 'audit', 'lease_token', 'lease_expires_at', 'idempotency_key']) {
      expect(saved).not.toHaveProperty(key);
    }
  });

  it('isolates two real accounts for get, list, cancel and idempotency', async () => {
    const key = randomUUID();
    const a = await submit(owner.token, budget, key), b = await submit(other.token, budget, key);
    expect(a.id).not.toBe(b.id);
    for (const id of [a.id, randomUUID()]) {
      const response = await request(other.token, `/${id}`);
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ code: 'OMEGA_TASK_NOT_FOUND' });
      expect((await request(other.token, `/${id}/cancel`, { confirm: true })).status).toBe(404);
    }
    const listed = await request(other.token, '/?limit=100');
    expect(listed.status).toBe(200);
    expect((await listed.json()).tasks.map((task: any) => task.id)).toEqual([b.id]);
    const before = await request(other.token, `/?limit=5&before=${b.id}`);
    expect(before.status).toBe(200);
    expect((await before.json()).tasks).toEqual([]);
    expect((await request(owner.token, '/', { ...budget, idempotencyKey: randomUUID(), owner_id: `luqi-user:${other.id}` })).status).toBe(400);
  });

  it('serializes concurrent identical submissions and rejects conflicting reuse', async () => {
    const key = randomUUID();
    const responses = await Promise.all(Array.from({ length: 12 }, () => request(owner.token, '/', { ...budget, idempotencyKey: key })));
    expect(responses.filter(response => response.status === 201)).toHaveLength(1);
    expect(responses.filter(response => response.status === 200)).toHaveLength(11);
    const results = await Promise.all(responses.map(response => response.json()));
    expect(new Set(results.map(result => result.task.id)).size).toBe(1);
    const reordered = await request(owner.token, '/', { ...budget, payload: { amounts: ['100.25', '40'], currency: 'ZAR' }, idempotencyKey: key });
    expect(reordered.status).toBe(200);
    expect((await request(owner.token, '/', { ...budget, payload: { currency: 'ZAR', amounts: ['1'] }, idempotencyKey: key })).status).toBe(409);
  });

  it('allows one winning worker and prevents duplicate completed attempts', async () => {
    const task = await submit(owner.token);
    const attempts = await Promise.all([worker(task.id), worker(task.id)]);
    expect(attempts.map(item => item.exit).sort()).toEqual([0, 1]);
    expect(attempts.find(item => item.exit === 1)?.body).toEqual({ code: 'OMEGA_TASK_NOT_RUNNABLE' });
    expect((await (await request(owner.token, `/${task.id}`)).json()).task.attempts).toBe(1);
  });

  it('preserves cancellation and refuses cancellation after completion', async () => {
    const task = await submit(owner.token);
    expect((await request(owner.token, `/${task.id}/cancel`, { confirm: true })).status).toBe(200);
    expect(await worker(task.id)).toEqual({ exit: 1, body: { code: 'OMEGA_TASK_NOT_RUNNABLE' } });
    expect((await (await request(owner.token, `/${task.id}`)).json()).task.state).toBe('cancelled');
    const finished = await submit(owner.token);
    expect((await worker(finished.id)).exit).toBe(0);
    expect((await request(owner.token, `/${finished.id}/cancel`, { confirm: true })).status).toBe(409);
  });

  it('removes terminal non-billable owned tasks without permitting foreign or pending deletion', async () => {
    const pending = await submit(owner.token);
    const crossAccount = await request(other.token, `/${pending.id}/remove`, { confirm: true });
    expect(crossAccount.status).toBe(404);
    expect(await crossAccount.json()).toEqual({ code: 'OMEGA_TASK_NOT_FOUND' });
    expect((await request(owner.token, `/${pending.id}/remove`, { confirm: true })).status).toBe(409);
    for (const bad of [{}, { confirm: false }, { confirm: true, userId: owner.id }]) {
      expect((await request(owner.token, `/${pending.id}/remove`, bad)).status).toBe(400);
    }
    const completed = await submit(owner.token);
    expect((await worker(completed.id)).exit).toBe(0);
    const finished = await request(owner.token, `/${completed.id}/remove`, { confirm: true });
    expect(finished.status).toBe(200);
    expect(await finished.json()).toEqual({ removed: true, id: completed.id });
    const [deleted] = await pool.execute<RowDataPacket[]>('SELECT id FROM omega_tasks_v1 WHERE id=?', [completed.id]);
    expect(deleted).toEqual([]);
    expect((await request(owner.token, `/${completed.id}/remove`, { confirm: true })).status).toBe(404);
    expect((await request(owner.token, `/${completed.id}`)).status).toBe(404);
    expect((await request(owner.token, `/${pending.id}`)).status).toBe(200);
    // A deleted idempotency reference does not cause a fictional recovered task:
    // explicit reuse is a new, separately visible submission.
    const replay = await request(owner.token, '/', { ...budget, idempotencyKey: 'reopened-reference-001' });
    expect(replay.status).toBe(201);
  });

  it('keeps completed records on an interrupted deletion and never exposes database diagnostics', async () => {
    const task = await submit(owner.token);
    expect((await worker(task.id)).exit).toBe(0);
    await pool.query("CREATE TRIGGER omega_fixture_no_delete BEFORE DELETE ON omega_tasks_v1 FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='private-delete-error'");
    try {
      const response = await request(owner.token, `/${task.id}/remove`, { confirm: true });
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ code: 'OMEGA_STORAGE_UNAVAILABLE' });
      const [rows] = await pool.execute<RowDataPacket[]>('SELECT state FROM omega_tasks_v1 WHERE id=?', [task.id]);
      expect(rows).toHaveLength(1);
      expect(rows[0].state).toBe('completed');
    } finally {
      await pool.query('DROP TRIGGER omega_fixture_no_delete');
    }
    expect((await request(owner.token, `/${task.id}/remove`, { confirm: true })).status).toBe(200);
  });

  it('revokes API access after password reset and denies disabled/deleted accounts to workers', async () => {
    const accountA = await account();
    const task = await submit(accountA.token);
    await pool.execute('UPDATE users SET password_hash=? WHERE id=?', [await bcrypt.hash('Reset-Account-Fixture!', 4), accountA.id]);
    expect((await request(accountA.token, `/${task.id}`)).status).toBe(401);
    await pool.execute('UPDATE users SET is_active=0 WHERE id=?', [accountA.id]);
    expect(await worker(task.id)).toEqual({ exit: 1, body: { code: 'OMEGA_TASK_UNAVAILABLE' } });
    const accountB = await account();
    const orphan = await submit(accountB.token);
    await pool.execute('DELETE FROM users WHERE id=?', [accountB.id]);
    expect((await request(accountB.token, `/${orphan.id}`)).status).toBe(401);
    expect(await worker(orphan.id)).toEqual({ exit: 1, body: { code: 'OMEGA_TASK_UNAVAILABLE' } });
    const [rows] = await pool.execute<RowDataPacket[]>('SELECT state FROM omega_tasks_v1 WHERE id IN (?,?)', [task.id, orphan.id]);
    expect(rows.map(row => row.state)).toEqual(['pending', 'pending']);
  });

  it('enforces the durable owner storage limit under concurrent intake and still permits replay', async () => {
    const quota = await account();
    const first = await submit(quota.token);
    const [original] = await pool.execute<RowDataPacket[]>('SELECT * FROM omega_tasks_v1 WHERE id=?', [first.id]);
    const row = original[0];
    // Isolated CI only: seed close to the cap to test the actual racing boundary.
    const values = Array.from({ length: 98 }, () => [randomUUID(), row.owner_id, Buffer.from(randomUUID()), row.handler,
      row.handler_version, 0, 'pending', typeof row.document === 'string' ? row.document : JSON.stringify(row.document)]);
    await pool.query('INSERT INTO omega_tasks_v1 (id,owner_id,idempotency_key,handler,handler_version,side_effects,state,document) VALUES ?', [values]);
    const responses = await Promise.all(Array.from({ length: 8 }, () => request(quota.token, '/', { ...budget, idempotencyKey: randomUUID() })));
    expect(responses.filter(response => response.status === 201)).toHaveLength(1);
    expect(responses.filter(response => response.status === 429)).toHaveLength(7);
    const [counts] = await pool.execute<RowDataPacket[]>('SELECT COUNT(*) AS total FROM omega_tasks_v1 WHERE owner_id=?', [row.owner_id]);
    expect(Number(counts[0].total)).toBe(100);
    const replay = await request(quota.token, '/', { ...budget, idempotencyKey: Buffer.from(row.idempotency_key).toString() });
    expect(replay.status).toBe(200);
    expect((await replay.json()).task.id).toBe(first.id);
    // A completed task can be removed, freeing exactly one account slot.
    expect((await worker(first.id)).exit).toBe(0);
    expect((await request(quota.token, `/${first.id}/remove`, { confirm: true })).status).toBe(200);
    const fresh = await request(quota.token, '/', { ...budget, idempotencyKey: randomUUID() });
    expect(fresh.status).toBe(201);
    const [restored] = await pool.execute<RowDataPacket[]>('SELECT COUNT(*) AS total FROM omega_tasks_v1 WHERE owner_id=?', [row.owner_id]);
    expect(Number(restored[0].total)).toBe(100);
  });

  it('refuses changed handler versions, side effects and injected private payload fields', async () => {
    for (const alteration of ["handler_version='future-v2'", 'side_effects=1',
      "document=JSON_SET(document,'$.payload.owner_id','another-account')"]) {
      const task = await submit(owner.token);
      await pool.query(`UPDATE omega_tasks_v1 SET ${alteration} WHERE id=?`, [task.id]);
      expect(await worker(task.id)).toEqual({ exit: 1, body: { code: 'OMEGA_TASK_UNAVAILABLE' } });
      const [rows] = await pool.execute<RowDataPacket[]>('SELECT state,document FROM omega_tasks_v1 WHERE id=?', [task.id]);
      expect(rows[0].state).toBe('pending');
      const doc = typeof rows[0].document === 'string' ? JSON.parse(rows[0].document) : rows[0].document;
      expect(doc.attempts).toBe(0);
    }
  });

  it('rolls back a failed submission and sanitizes database errors', async () => {
    const key = randomUUID();
    await pool.query("CREATE TRIGGER omega_fixture_reject BEFORE INSERT ON omega_tasks_v1 FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='private-database-detail'");
    try {
      const response = await request(owner.token, '/', { ...budget, idempotencyKey: key });
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ code: 'OMEGA_STORAGE_UNAVAILABLE' });
      const [rows] = await pool.execute<RowDataPacket[]>('SELECT id FROM omega_tasks_v1 WHERE idempotency_key=?', [Buffer.from(key)]);
      expect(rows).toEqual([]);
    } finally { await pool.query('DROP TRIGGER omega_fixture_reject'); }
  });

  it('reports missing task storage without creating it or returning in-memory success', async () => {
    await pool.query('RENAME TABLE omega_tasks_v1 TO omega_tasks_held_ci');
    try {
      for (const response of [await request(owner.token, '/status'),
        await request(owner.token, '/', { ...budget, idempotencyKey: randomUUID() })]) {
        expect(response.status).toBe(503);
        expect(await response.json()).toEqual({ code: 'OMEGA_STORAGE_UNAVAILABLE' });
      }
      const [tables] = await pool.query<RowDataPacket[]>("SHOW TABLES LIKE 'omega_tasks_v1'");
      expect(tables).toEqual([]);
    } finally { await pool.query('RENAME TABLE omega_tasks_held_ci TO omega_tasks_v1'); }
  });
});
