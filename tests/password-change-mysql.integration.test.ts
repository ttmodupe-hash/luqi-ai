/** Writes are restricted to the exact disposable MySQL CI fixture. */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import mysql, { type Pool, type RowDataPacket, type ResultSetHeader } from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { Hono } from 'hono';
import { bootstrapDatabase } from '../db/bootstrap';
import { accountSecurity } from '../api/account-security';
import { restCompat } from '../api/rest-compat';
import { privateConversations } from '../api/private-conversations';
import { signUserToken } from '../api/lib/userToken';
import { changeAccountPassword } from '../api/services/passwordChange';
import { AUTH_LIMITS, closeAuthThrottle, reservePasswordChangeAttempt } from '../api/services/authThrottle';
import { closeDb } from '../api/queries/connection';
const fixtureUrl = 'mysql://root:ci-ephemeral-only-password@127.0.0.1:3306/luqi_ci';
const OLD = 'Synthetic-CI-Previous-Password!', NEW = 'Synthetic-CI-New-Password!';
const app = new Hono().route('/api/v1/account', accountSecurity)
  .route('/api/v1/companion/conversations', privateConversations).route('/', restCompat);
let pool: Pool, sequence = 0;
async function account() {
  const email = `password-ci-${++sequence}@example.invalid`, hash = await bcrypt.hash(OLD, 12);
  const [created] = await pool.execute<ResultSetHeader>('INSERT INTO users(email,password_hash,is_active,name) VALUES (?,?,1,?)', [email, hash, 'Synthetic fixture']);
  return { id: created.insertId, email, hash, token: signUserToken(created.insertId, hash) };
}
async function user(id: number) { return (await pool.execute<RowDataPacket[]>('SELECT * FROM users WHERE id=?', [id]))[0][0]; }
const post = (token: string, currentPassword = OLD, newPassword = NEW, extra = {}) => app.request('/api/v1/account/password', {
  method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ currentPassword, newPassword, ...extra }),
});
beforeAll(async () => {
  if (process.env.LUQI_MYSQL_CI_FIXTURE !== 'true' || process.env.DATABASE_URL !== fixtureUrl) throw new Error('Refusing non-CI database');
  process.env.JWT_SECRET = 'synthetic-password-change-mysql-secret-over-32-characters';
  await bootstrapDatabase(); pool = mysql.createPool(fixtureUrl);
}, 60_000);
beforeEach(async () => { await pool.query('DELETE FROM auth_attempt_windows'); });
afterAll(async () => { await closeAuthThrottle(); await closeDb(); if (pool) await pool.end(); });

describe.sequential('real MySQL current-password changes', () => {
  it('changes only the owner credential, rejects old tokens and preserves private notes and another account', async () => {
    const owner = await account(), foreign = await account();
    const before = await user(owner.id), otherBefore = await user(foreign.id);
    const [created] = await pool.execute<ResultSetHeader>('INSERT INTO companion_conversations(user_id,personality_id,title) VALUES (?,1,?)', [owner.id, 'Preserved password-change fixture']);
    await pool.execute("INSERT INTO companion_messages(conversation_id,role,content) VALUES (?,'user','Synthetic retained note')", [created.insertId]);
    const response = await post(owner.token);
    expect(response.status).toBe(200); expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(await response.json()).toEqual({ changed: true, signInRequired: true });
    const after = await user(owner.id); expect(await bcrypt.compare(NEW, after.password_hash)).toBe(true);
    expect(await bcrypt.compare(OLD, after.password_hash)).toBe(false);
    for (const key of Object.keys(before).filter(key => key !== 'password_hash' && key !== 'updated_at')) expect(after[key], key).toEqual(before[key]);
    expect(await user(foreign.id)).toEqual(otherBefore);
    for (const path of ['/auth/me', '/api/v1/companion/conversations', '/api/v1/companion/conversations/export']) {
      expect((await app.request(path, { headers: { Authorization: `Bearer ${owner.token}` } })).status).toBe(401);
    }
    expect((await post(owner.token, NEW, 'Another-Synthetic-Password!')).status).toBe(401);
    const login = await app.request('/api/v1/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: owner.email, password: NEW }) });
    expect(login.status).toBe(200); const signedIn = await login.json();
    const notes = await app.request('/api/v1/companion/conversations/export', { headers: { Authorization: `Bearer ${signedIn.token}` } });
    expect(notes.status).toBe(200); expect(await notes.json()).toMatchObject({ messages: [{ content: 'Synthetic retained note' }] });
  }, 30_000);
  it('requires the current password, refuses reuse/forged owners, and denies disabled accounts', async () => {
    const owner = await account(), foreign = await account(), before = await user(owner.id);
    for (const [current, next, code] of [['wrong-current', NEW, 'CURRENT_PASSWORD_INVALID'], [OLD, OLD, 'PASSWORD_REUSED']] as const) {
      const response = await post(owner.token, current, next); expect(await response.json()).toEqual({ code });
      expect(await user(owner.id)).toEqual(before);
    }
    expect((await post(owner.token, OLD, NEW, { userId: foreign.id })).status).toBe(400);
    await pool.execute('UPDATE users SET is_active=0 WHERE id=?', [owner.id]);
    expect((await post(owner.token)).status).toBe(401); expect((await user(owner.id)).password_hash).toBe(before.password_hash);
  }, 30_000);
  it('allows only one of two simultaneous changes and never overwrites the winner', async () => {
    const owner = await account(); let reads = 0, ready!: () => void;
    const barrier = new Promise<void>(resolve => { ready = resolve; });
    const concurrent = { execute: async (sql: string, args: unknown[]) => {
      const result = await pool.execute(sql, args);
      if (sql.startsWith('SELECT id, password_hash')) { reads++; if (reads === 2) ready(); await barrier; }
      return result;
    } } as unknown as Pool;
    const choices = [NEW, 'Synthetic-Second-New-Password!'];
    const results = await Promise.allSettled(choices.map(next => changeAccountPassword(concurrent, owner.id, owner.token, OLD, next)));
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.find(r => r.status === 'rejected')).toMatchObject({ reason: { code: 'PASSWORD_CHANGE_CONFLICT' } });
    const winner = results.findIndex(r => r.status === 'fulfilled'), stored = await user(owner.id);
    expect(await bcrypt.compare(choices[winner], stored.password_hash)).toBe(true);
    expect(await bcrypt.compare(choices[1-winner], stored.password_hash)).toBe(false);
    await expect(changeAccountPassword(pool, owner.id, owner.token, choices[winner], 'Synthetic-Third-Password!')).rejects.toMatchObject({ code: 'AUTH_REQUIRED' });
    expect((await user(owner.id)).password_hash).toBe(stored.password_hash);
  }, 30_000);
  it('does not mutate if the account is disabled while hashing', async () => {
    const owner = await account();
    const disabling = { execute: async (sql: string, args: unknown[]) => {
      if (sql.startsWith('UPDATE users SET password_hash')) await pool.execute('UPDATE users SET is_active=0 WHERE id=?', [owner.id]);
      return pool.execute(sql, args);
    } } as unknown as Pool;
    await expect(changeAccountPassword(disabling, owner.id, owner.token, OLD, NEW)).rejects.toMatchObject({ code: 'PASSWORD_CHANGE_CONFLICT' });
    expect((await user(owner.id)).password_hash).toBe(owner.hash);
  }, 30_000);
  it('fails closed without partial mutation or SQL disclosure when the database rejects the update', async () => {
    const owner = await account();
    await pool.query("CREATE TRIGGER reject_password_ci BEFORE UPDATE ON users FOR EACH ROW BEGIN IF NOT (BINARY NEW.password_hash=BINARY OLD.password_hash) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='private SQL fixture'; END IF; END");
    try {
      const response = await post(owner.token); expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ code: 'PASSWORD_CHANGE_UNAVAILABLE' });
      expect((await user(owner.id)).password_hash).toBe(owner.hash);
    } finally { await pool.query('DROP TRIGGER reject_password_ci'); }
  }, 30_000);
  it('shares durable per-account limits across connections and restarts without consuming login admission', async () => {
    const owner = await account(), otherPool = mysql.createPool(fixtureUrl);
    try {
      const outcomes = await Promise.allSettled(Array.from({ length: 20 }, (_, i) => reservePasswordChangeAttempt(owner.id, i % 2 ? pool : otherPool)));
      expect(outcomes.filter(r => r.status === 'fulfilled')).toHaveLength(AUTH_LIMITS.change_password.subject);
      for (const result of outcomes.filter(r => r.status === 'rejected')) expect(result).toMatchObject({ reason: { code: 'AUTH_RATE_LIMITED' } });
      await closeAuthThrottle();
      const response = await post(owner.token); expect(response.status).toBe(429);
      expect(Number(response.headers.get('Retry-After'))).toBeGreaterThan(0);
      const [rows] = await pool.query<RowDataPacket[]>('SELECT scope, attempts FROM auth_attempt_windows ORDER BY scope');
      expect(rows).toEqual([{ scope: 'change_password_global', attempts: 20 }, { scope: 'change_password_subject', attempts: 5 }]);
      expect((await user(owner.id)).password_hash).toBe(owner.hash);
    } finally { await otherPool.end(); }
  }, 30_000);
});
