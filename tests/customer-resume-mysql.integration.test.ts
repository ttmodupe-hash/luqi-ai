/** Destructive synthetic fixtures only. Refuse every production URL. */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import mysql, { type Pool, type RowDataPacket } from 'mysql2/promise';
import { readFile } from 'node:fs/promises';
import { Hono } from 'hono';
import { bootstrapDatabase } from '../db/bootstrap';
import { checkRuntimeSchema } from '../db/runtimeSchema';
import { WEB_RUNTIME_GRANTS } from '../db/runtimeRole';
import { closeAuthThrottle } from '../api/services/authThrottle';
import { resetAccountPassword } from '../api/services/accountRecovery';
import { getSignedSessionDigest } from '../api/lib/userToken';
const ROOT = 'mysql://root:ci-ephemeral-only-password@127.0.0.1:3306/luqi_ci';
const RUNTIME = 'mysql://luqi_session_fixture:session-fixture-only-password@127.0.0.1:3306/luqi_ci';
const ORIGIN = 'https://app.luqi-ai.com';
const PASSWORD = 'Synthetic-Session-Password-2026!';
let app: Hono, closeDb: (() => Promise<void>) | undefined;
let root: Pool, seq = 0;
function post(path: string, body = {}, cookie = '', intent = 'restore', token?: string) {
  return app.request(ORIGIN + path, { method: 'POST', headers: {
    Host: 'app.luqi-ai.com', Origin: ORIGIN, 'sec-fetch-site': 'same-origin',
    'Content-Type': 'application/json', 'x-luqi-session-intent': intent,
    ...(cookie ? { Cookie: cookie } : {}), ...(token ? { Authorization: 'Bearer ' + token } : {}),
  }, body: JSON.stringify(body) });
}
function refreshCookie(response: Response) {
  return response.headers.getSetCookie().find(value => value.startsWith('__Host-luqi_resume='))!.split(';')[0];
}
async function account(rememberMe = true) {
  const email = `session-fixture-${++seq}@example.invalid`;
  const response = await post('/api/v1/auth/register', { email, password: PASSWORD, rememberMe }, '', 'signup');
  expect(response.status).toBe(201);
  return { ...(await response.json()), email, cookie: refreshCookie(response), response };
}
async function me(token?: string, cookie?: string) {
  return app.request(ORIGIN + '/auth/me', { headers: {
    ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(cookie ? { Cookie: cookie } : {}) } });
}
async function rows(id: number): Promise<RowDataPacket[]> {
  return (await root.execute<RowDataPacket[]>('SELECT * FROM customer_device_sessions_v1 WHERE user_id=? ORDER BY rotation', [id]))[0];
}
beforeAll(async () => {
  if (process.env.LUQI_MYSQL_CI_FIXTURE !== 'true' || process.env.DATABASE_URL !== ROOT) throw new Error('Refusing non-disposable MySQL fixture');
  await bootstrapDatabase(); root = mysql.createPool(ROOT);
  await root.query(await readFile('db/migrations/customer-device-sessions-v1.sql', 'utf8'));
  await root.query("CREATE USER 'luqi_session_fixture'@'%' IDENTIFIED BY 'session-fixture-only-password'");
  for (const [table, grants] of Object.entries({ ...WEB_RUNTIME_GRANTS, customer_device_sessions_v1: 'SELECT, INSERT, UPDATE' })) {
    await root.query('GRANT ' + grants + ' ON luqi_ci.' + mysql.escapeId(table) + " TO 'luqi_session_fixture'@'%'");
  }
  vi.stubEnv('DATABASE_URL', RUNTIME); vi.stubEnv('JWT_SECRET', 'synthetic-session-mysql-only-secret-with-over-32-characters');
  vi.stubEnv('LUQI_CUSTOMER_RESUME_ENABLED', 'true'); vi.stubEnv('NODE_ENV', 'test');
  // The connection module resolves its identity at import time. Import the HTTP
  // runtime ONLY after switching from the operator setup to the restricted role.
  const [{ restCompat }, { customerResumeRoutes }, { accountSecurity }, connection] = await Promise.all([
    import('../api/rest-compat'), import('../api/services/customerResume'), import('../api/account-security'),
    import('../api/queries/connection'),
  ]);
  closeDb = connection.closeDb;
  const [identity] = await connection.getPersistentMySqlPool().query<RowDataPacket[]>('SELECT CURRENT_USER() AS identity');
  expect(identity[0].identity).toBe('luqi_session_fixture@%');
  app = new Hono().route('/api/v1/auth', customerResumeRoutes)
    .route('/api/v1/account', accountSecurity).route('/', restCompat);
}, 60_000);
beforeEach(async () => { await root.query('DELETE FROM auth_attempt_windows'); });
afterAll(async () => { await closeAuthThrottle(); await closeDb?.(); await root?.end(); vi.unstubAllEnvs(); });
describe.sequential('real InnoDB device session acceptance', () => {
  it('validates exact schema, owner linkage and least privilege; rejects a DELETE grant', async () => {
    expect(await checkRuntimeSchema()).toEqual({ status: 'validated', tables: 9 });
    await root.query("GRANT DELETE ON luqi_ci.customer_device_sessions_v1 TO 'luqi_session_fixture'@'%'");
    try { await expect(checkRuntimeSchema()).rejects.toThrow('MYSQL_RUNTIME_SCHEMA_UNAVAILABLE'); }
    finally { await root.query("REVOKE DELETE ON luqi_ci.customer_device_sessions_v1 FROM 'luqi_session_fixture'@'%'"); }
    expect(await checkRuntimeSchema()).toEqual({ status: 'validated', tables: 9 });
  });
  it('rejects a changed digest collation and missing owner foreign key', async () => {
    await root.query('ALTER TABLE customer_device_sessions_v1 MODIFY token_digest CHAR(64) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL');
    try { await expect(checkRuntimeSchema()).rejects.toThrow('MYSQL_RUNTIME_SCHEMA_UNAVAILABLE'); }
    finally { await root.query('ALTER TABLE customer_device_sessions_v1 MODIFY token_digest CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL'); }
    await root.query('ALTER TABLE customer_device_sessions_v1 DROP FOREIGN KEY customer_device_owner_fk');
    try { await expect(checkRuntimeSchema()).rejects.toThrow('MYSQL_RUNTIME_SCHEMA_UNAVAILABLE'); }
    finally { await root.query('ALTER TABLE customer_device_sessions_v1 ADD CONSTRAINT customer_device_owner_fk FOREIGN KEY (user_id) REFERENCES users(id)'); }
  });
  it('requires explicit opt-in and never uses cookies to authorize private APIs', async () => {
    const memory = await account(false);
    expect(getSignedSessionDigest(memory.token)).toBeNull(); expect(await rows(memory.user.id)).toHaveLength(0);
    const owner = await account();
    expect((await me(undefined, owner.cookie)).status).toBe(401);
    expect((await me(owner.token)).status).toBe(200);
    const set = owner.response.headers.getSetCookie()[0];
    for (const flag of ['Secure', 'HttpOnly', 'SameSite=Strict', 'Path=/']) expect(set).toContain(flag);
    expect(set).not.toContain('Domain=');
  }, 30_000);
  it('rotates once, keeps the absolute limit and rejects replay of the previous token', async () => {
    const owner = await account(), before = (await rows(owner.user.id))[0];
    const restored = await post('/api/v1/auth/session', {}, owner.cookie);
    expect(restored.status).toBe(200);
    const next = await restored.json(), nextCookie = refreshCookie(restored), after = await rows(owner.user.id);
    expect(nextCookie).not.toBe(owner.cookie); expect(after).toHaveLength(2);
    expect(after[0].rotated_at).toBeInstanceOf(Date); expect(after[1].rotation).toBe(1);
    expect(after[1].absolute_expires_at).toEqual(before.absolute_expires_at);
    expect(getSignedSessionDigest(next.token)).toBe(getSignedSessionDigest(owner.token));
    expect(JSON.stringify(after)).not.toContain(owner.cookie.split('=')[1]);
    expect((await me(next.token)).status).toBe(200);
    expect((await post('/api/v1/auth/session', {}, owner.cookie)).status).toBe(401);
    expect((await me(next.token)).status).toBe(401);
    expect((await post('/api/v1/auth/session', {}, nextCookie)).status).toBe(401);
  }, 30_000);
  it('bounds concurrent refreshes and revokes the winning family after reuse detection', async () => {
    const owner = await account();
    const answers = await Promise.all([post('/api/v1/auth/session', {}, owner.cookie), post('/api/v1/auth/session', {}, owner.cookie)]);
    expect(answers.map(r => r.status).sort()).toEqual([200, 401]);
    const winner = await answers.find(r => r.status === 200)!.json();
    expect((await me(winner.token)).status).toBe(401);
  }, 30_000);
  it('revokes the device on logout even when the readable hint was removed, leaving other devices valid', async () => {
    const owner = await account();
    const other = await post('/api/v1/auth/login', { email: owner.email, password: PASSWORD, rememberMe: true }, '', 'login');
    expect(other.status).toBe(200); const otherDevice = await other.json();
    expect((await post('/api/v1/auth/logout', {}, owner.cookie, 'logout', owner.token)).status).toBe(204);
    expect((await me(owner.token)).status).toBe(401); expect((await me(otherDevice.token)).status).toBe(200);
    expect((await post('/api/v1/auth/logout', {}, '', 'logout', otherDevice.token)).status).toBe(204);
    expect((await me(otherDevice.token)).status).toBe(401);
  }, 30_000);
  it('isolates account switches and owner-scoped device revocation', async () => {
    const a = await account(), b = await account();
    const foreignFamily = getSignedSessionDigest(a.token);
    expect((await post('/api/v1/auth/sessions/revoke', { familyId: foreignFamily }, b.cookie, 'revoke', b.token)).status).toBe(204);
    expect((await me(a.token)).status).toBe(200);
    const switched = await post('/api/v1/auth/login', { email: b.email, password: PASSWORD }, a.cookie, 'login');
    expect(switched.status).toBe(200); expect(getSignedSessionDigest((await switched.json()).token)).toBeNull();
    expect((await me(a.token)).status).toBe(401);
    expect((await post('/api/v1/auth/sessions/revoke', { familyId: getSignedSessionDigest(b.token) }, b.cookie, 'revoke', b.token)).status).toBe(204);
    expect((await me(b.token)).status).toBe(401);
  }, 30_000);
  it('enforces absolute expiry, idle expiry and disabled accounts on the server', async () => {
    for (const field of ['absolute_expires_at', 'idle_expires_at', 'is_active']) {
      const owner = await account();
      if (field === 'is_active') await root.execute('UPDATE users SET is_active=0 WHERE id=?', [owner.user.id]);
      else await root.execute('UPDATE customer_device_sessions_v1 SET idle_expires_at=DATE_SUB(NOW(),INTERVAL 1 SECOND)' +
        (field === 'absolute_expires_at' ? ', absolute_expires_at=DATE_SUB(NOW(),INTERVAL 1 SECOND)' : '') + ' WHERE user_id=?', [owner.user.id]);
      expect((await post('/api/v1/auth/session', {}, owner.cookie)).status).toBe(401);
      expect((await me(owner.token)).status).toBe(401);
    }
  }, 30_000);
  it('changes passwords and revokes devices atomically, rolling back on a failed revocation', async () => {
    const owner = await account(), password = 'New-Session-Fixture-Password!';
    await root.query("CREATE TRIGGER deny_device_revocation BEFORE UPDATE ON customer_device_sessions_v1 FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic revocation failure'");
    try {
      expect((await post('/api/v1/account/password', { currentPassword: PASSWORD, newPassword: password }, '', '', owner.token)).status).toBe(503);
      expect((await me(owner.token)).status).toBe(200);
    } finally { await root.query('DROP TRIGGER deny_device_revocation'); }
    expect((await post('/api/v1/account/password', { currentPassword: PASSWORD, newPassword: password }, '', '', owner.token)).status).toBe(200);
    expect((await me(owner.token)).status).toBe(401);
    expect((await rows(owner.user.id)).every(row => row.revoked_at !== null)).toBe(true);
    expect((await post('/api/v1/auth/session', {}, owner.cookie)).status).toBe(401);
  }, 30_000);
  it('operator recovery revokes legacy and device sessions atomically', async () => {
    const owner = await account();
    const recovered = await resetAccountPassword(root, owner.user.id, owner.email, 'Operator-Recovered-Synthetic-Password!');
    expect(recovered.sessionsRevoked).toBe(1);
    expect((await me(owner.token)).status).toBe(401);
    expect((await post('/api/v1/auth/session', {}, owner.cookie)).status).toBe(401);
  }, 30_000);
  it('fails closed on missing session writes and rolls signup back without leaving an account', async () => {
    const owner = await account();
    await root.query("REVOKE INSERT ON luqi_ci.customer_device_sessions_v1 FROM 'luqi_session_fixture'@'%'");
    const email = `missing-grant-${++seq}@example.invalid`;
    try {
      expect((await post('/api/v1/auth/register', { email, password: PASSWORD, rememberMe: true }, '', 'signup')).status).toBe(503);
      const [users] = await root.execute<RowDataPacket[]>('SELECT id FROM users WHERE email=?', [email]); expect(users).toHaveLength(0);
      const failure = await post('/api/v1/auth/session', {}, owner.cookie);
      expect(failure.status).toBe(503); expect(failure.headers.getSetCookie()).toHaveLength(0);
      expect(await rows(owner.user.id)).toHaveLength(1); expect((await rows(owner.user.id))[0].rotated_at).toBeNull();
    } finally { await root.query("GRANT INSERT ON luqi_ci.customer_device_sessions_v1 TO 'luqi_session_fixture'@'%'"); }
  }, 30_000);
});
