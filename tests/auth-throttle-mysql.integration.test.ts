/** Destructive checks against disposable local MySQL CI ONLY. */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import mysql, { type Pool, type RowDataPacket } from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { bootstrapDatabase } from '../db/bootstrap';
import { restCompat } from '../api/rest-compat';
import { AUTH_LIMITS, closeAuthThrottle, reserveAuthenticationAttempt } from '../api/services/authThrottle';

let a: Pool, b: Pool;
const PASSWORD = 'Synthetic-Auth-Throttle-Password!';
const EMAIL = 'resume-throttle@example.invalid';
const fixtureUrl = 'mysql://root:ci-ephemeral-only-password@127.0.0.1:3306/luqi_ci';
const reserve = (email: string, n: number, action: 'login' | 'signup' = 'login') =>
  Promise.allSettled(Array.from({ length: n }, (_, i) => reserveAuthenticationAttempt(action, email, i % 2 ? a : b)));
async function rows(sql = 'SELECT * FROM auth_attempt_windows ORDER BY scope, subject_key', params: (string | number)[] = []) {
  return (await a.execute<RowDataPacket[]>(sql, params))[0];
}
function expectLimited(result: PromiseSettledResult<void>) {
  expect(result.status).toBe('rejected');
  if (result.status === 'rejected') {
    expect(result.reason.code).toBe('AUTH_RATE_LIMITED');
    expect(result.reason.retryAfter).toBeGreaterThan(0);
  }
}
beforeAll(async () => {
  if (process.env.LUQI_MYSQL_CI_FIXTURE !== 'true' || process.env.DATABASE_URL !== fixtureUrl) {
    throw new Error('Auth throttle tests refuse any non-CI database');
  }
  process.env.JWT_SECRET = 'synthetic-auth-throttle-ci-signing-secret-at-least-32-chars';
  await bootstrapDatabase();
  a = mysql.createPool(fixtureUrl);
  b = mysql.createPool(fixtureUrl);
  const hash = await bcrypt.hash(PASSWORD, 12);
  await a.execute('INSERT INTO users(email,password_hash,is_active) VALUES (?,?,1)', [EMAIL, hash]);
}, 60_000);
beforeEach(async () => { await a.query('DELETE FROM auth_attempt_windows'); });
afterAll(async () => {
  await closeAuthThrottle();
  if (a) await a.end();
  if (b) await b.end();
});

describe.sequential('shared InnoDB authentication windows', () => {
  it('admits exactly ten concurrent attempts across independent pools', async () => {
    const results = await reserve(EMAIL, 30);
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(AUTH_LIMITS.login.subject);
    results.filter(r => r.status === 'rejected').forEach(expectLimited);
    const records = await rows();
    expect(records).toHaveLength(2);
    expect(records.find(r => r.scope === 'login_subject')?.attempts).toBe(10);
    expect(records.find(r => r.scope === 'login_global')?.attempts).toBe(30);
    expect(JSON.stringify(records)).not.toContain(EMAIL);
    expect(records.every(r => /^[a-f0-9]{64}$/.test(r.subject_key))).toBe(true);
  }, 60_000);

  it('keeps counters through new connections and idempotent bootstrap', async () => {
    (await reserve(EMAIL, 10)).forEach(r => expect(r.status).toBe('fulfilled'));
    const before = await rows();
    await b.end(); b = mysql.createPool(fixtureUrl);
    await bootstrapDatabase();
    expect(await rows()).toEqual(before);
    await expect(reserveAuthenticationAttempt('login', EMAIL, b)).rejects.toMatchObject({ code: 'AUTH_RATE_LIMITED' });
    expect((await rows()).find(r => r.scope === 'login_subject')?.reset_at)
      .toBe(before.find(r => r.scope === 'login_subject')?.reset_at);
  }, 60_000);

  it('shares aliases, collation-equivalent emails and limits despite spoofed IPs or successful login', async () => {
    // The disposable MySQL default collation treats these as the same account.
    const variant = 'résumé-throttle@example.invalid';
    expect((await rows('SELECT id FROM users WHERE email=?', [variant]))[0]?.id)
      .toBe((await rows('SELECT id FROM users WHERE email=?', [EMAIL]))[0]?.id);
    const request = (i: number, password = 'wrong-fixture-password') => restCompat.request(
      i % 2 ? '/auth/login' : '/api/v1/auth/login', { method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': `203.0.113.${i}`, 'X-Real-IP': `192.0.2.${i}` },
        body: JSON.stringify({ email: i % 2 ? `  ${EMAIL.toUpperCase()}  ` : variant, password }),
      });
    for (let i = 0; i < 10; i++) expect((await request(i, i === 4 ? PASSWORD : undefined)).status).toBe(i === 4 ? 200 : 401);
    const before = await rows();
    const denied = await request(11, PASSWORD);
    expect(denied.status).toBe(429);
    expect(denied.headers.get('Cache-Control')).toBe('no-store');
    expect(Number(denied.headers.get('Retry-After'))).toBeGreaterThan(0);
    expect(await denied.json()).toMatchObject({ code: 'AUTH_RATE_LIMITED' });
    expect((await rows()).find(r => r.scope === 'login_subject')?.reset_at)
      .toBe(before.find(r => r.scope === 'login_subject')?.reset_at);
    await a.query("UPDATE auth_attempt_windows SET reset_at=UNIX_TIMESTAMP()-1 WHERE scope='login_subject'");
    expect((await request(12, PASSWORD)).status).toBe(200);
    expect((await rows()).find(r => r.scope === 'login_subject')?.attempts).toBe(1);
  }, 60_000);

  it('globally caps distinct subjects before creating more rows', async () => {
    const results = await Promise.allSettled(Array.from({ length: 140 }, (_, i) =>
      reserveAuthenticationAttempt('login', `distinct-${i}@example.invalid`, i % 2 ? a : b)));
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(120);
    results.filter(r => r.status === 'rejected').forEach(expectLimited);
    const records = await rows();
    expect(records).toHaveLength(121);
    const global = records.find(r => r.scope === 'login_global')!;
    expect(global.attempts).toBe(120);
    await expect(reserveAuthenticationAttempt('login', 'brand-new-subject@example.invalid', a))
      .rejects.toMatchObject({ code: 'AUTH_RATE_LIMITED' });
    expect(await rows()).toEqual(records);
  }, 60_000);

  it('keeps signup alias limits separate and never locks account records', async () => {
    const before = await rows('SELECT * FROM users ORDER BY id');
    for (let i = 0; i < 6; i++) {
      const response = await restCompat.request(['/auth/signup', '/auth/register', '/api/v1/auth/register'][i % 3], {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
      });
      expect(response.status).toBe(i < 5 ? 409 : 429);
    }
    await reserveAuthenticationAttempt('login', EMAIL, b);
    expect(await rows('SELECT * FROM users ORDER BY id')).toEqual(before);
    // Signup global admission is shared, even with a fresh email each time.
    for (let i = 0; i < 14; i++) await reserveAuthenticationAttempt('signup', `signup-${i}@example.invalid`, a);
    await expect(reserveAuthenticationAttempt('signup', 'another-signup@example.invalid', b))
      .rejects.toMatchObject({ code: 'AUTH_RATE_LIMITED' });
  }, 60_000);

  it('rolls back incomplete reservations and fails closed when storage disappears', async () => {
    await a.query(`CREATE TRIGGER reject_auth_counter BEFORE UPDATE ON auth_attempt_windows FOR EACH ROW
      BEGIN IF NEW.scope='login_subject' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='synthetic failure'; END IF; END`);
    try {
      await expect(reserveAuthenticationAttempt('login', EMAIL, b)).rejects.toMatchObject({ code: 'AUTH_THROTTLE_UNAVAILABLE' });
      expect(await rows()).toHaveLength(0);
    } finally { await a.query('DROP TRIGGER reject_auth_counter'); }
    await a.query('RENAME TABLE auth_attempt_windows TO auth_attempt_windows_ci_hidden');
    try {
      for (const path of ['/auth/login', '/api/v1/auth/login', '/auth/signup', '/auth/register', '/api/v1/auth/register']) {
        const response = await restCompat.request(path, { method: 'POST',
          headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: EMAIL, password: PASSWORD }) });
        expect(response.status).toBe(503);
        expect(response.headers.get('Cache-Control')).toBe('no-store');
        expect(await response.json()).toMatchObject({ code: 'AUTH_THROTTLE_UNAVAILABLE' });
      }
    } finally { await a.query('RENAME TABLE auth_attempt_windows_ci_hidden TO auth_attempt_windows'); }
  }, 60_000);

  it('cleans expired rows in bounded batches without deleting current limits', async () => {
    const fixtures = Array.from({ length: 150 }, (_, i) => ['login_subject', i.toString(16).padStart(64, '0'), 1, 1]);
    await a.query('INSERT INTO auth_attempt_windows (scope,subject_key,attempts,reset_at) VALUES ?', [fixtures]);
    for (let i = 0; i < 20; i++) await reserveAuthenticationAttempt('login', `cleanup-${i}@example.invalid`, a);
    expect(await rows('SELECT * FROM auth_attempt_windows WHERE reset_at=1')).toHaveLength(50);
    expect(await rows('SELECT * FROM auth_attempt_windows WHERE reset_at>UNIX_TIMESTAMP()')).toHaveLength(21);
  }, 60_000);
});
