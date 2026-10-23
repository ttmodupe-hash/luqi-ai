/** Shared pre-credential limits for every web login/signup alias.
 * Count attempts before password work, including successful logins. Never
 * reset counters on success, trust caller IP headers, or fall back to memory.
 */
import { createHmac } from 'node:crypto';
import mysql, { type Pool, type PoolConnection, type RowDataPacket } from 'mysql2/promise';
import { parseMySqlConnectionSettings } from '../lib/mysqlConfig';
import { getSigningSecret } from '../lib/userToken';

export type AuthAction = 'login' | 'signup';
type LimitedAction = AuthAction | 'change_password';
export const AUTH_LIMITS = Object.freeze({
  login: { global: 120, globalSeconds: 60, subject: 10, subjectSeconds: 300 },
  signup: { global: 20, globalSeconds: 60, subject: 5, subjectSeconds: 3600 },
  change_password: { global: 20, globalSeconds: 60, subject: 5, subjectSeconds: 900 },
});
const GLOBAL_KEY = '0'.repeat(64);

export class AuthThrottleError extends Error {
  constructor(public readonly code: 'AUTH_RATE_LIMITED' | 'AUTH_THROTTLE_UNAVAILABLE',
              public readonly retryAfter = 30) {
    super(code);
  }
}

let pool: Pool | undefined;
function throttlePool(): Pool {
  if (!pool) {
    const config = parseMySqlConnectionSettings(process.env);
    if (!config) throw new Error('Persistent MySQL required');
    // Separate bounded queue: authentication floods cannot occupy the entire
    // application connection pool. No new infrastructure or paid service.
    pool = mysql.createPool({ ...config, connectionLimit: 4, queueLimit: 32,
      waitForConnections: true, connectTimeout: 3000 });
  }
  return pool;
}

export async function closeAuthThrottle(): Promise<void> {
  const previous = pool;
  pool = undefined;
  if (previous) await previous.end();
}

/** Lock and consume one fixed-duration window, anchored at its first attempt.
 * Blocked attempts never move its deadline. MySQL supplies the clock so app
 * restarts, time zones and replica clock skew cannot reset a live window.
 */
async function reserveBucket(conn: PoolConnection, scope: string, key: string,
                             limit: number, seconds: number) {
  await conn.execute(
    `INSERT INTO auth_attempt_windows (scope, subject_key, attempts, reset_at)
     VALUES (?, ?, 0, 0) ON DUPLICATE KEY UPDATE subject_key = subject_key`, [scope, key]);
  const [rows] = await conn.execute<RowDataPacket[]>(
    `SELECT attempts, reset_at, UNIX_TIMESTAMP() AS now_seconds
     FROM auth_attempt_windows WHERE scope = ? AND subject_key = ? FOR UPDATE`, [scope, key]);
  const now = Number(rows[0]?.now_seconds), resetAt = Number(rows[0]?.reset_at);
  const stored = Number(rows[0]?.attempts);
  if (![now, resetAt, stored].every(Number.isSafeInteger) || now <= 0 || stored < 0 || resetAt < 0) {
    throw new Error('Invalid throttle record');
  }
  const expired = resetAt <= now;
  const attempts = expired ? 0 : stored;
  const deadline = expired ? now + seconds : resetAt;
  if (attempts >= limit) return { allowed: false, retryAfter: Math.max(1, deadline - now), attempts };
  await conn.execute(
    'UPDATE auth_attempt_windows SET attempts = ?, reset_at = ? WHERE scope = ? AND subject_key = ?',
    [attempts + 1, deadline, scope, key]);
  return { allowed: true, retryAfter: 0, attempts: attempts + 1 };
}

export async function reserveAuthenticationAttempt(action: AuthAction, email: string,
                                                    testPool?: Pool): Promise<void> {
  return reserveAttempt(action, email, testPool);
}

/** Authenticated account ID only; never supplied by the request body. */
export async function reservePasswordChangeAttempt(userId: number, testPool?: Pool): Promise<void> {
  return reserveAttempt('change_password', userId, testPool);
}

async function reserveAttempt(action: LimitedAction, subject: string | number, testPool?: Pool): Promise<void> {
  let conn: PoolConnection | undefined;
  let begun = false;
  try {
    const secret = getSigningSecret();
    if (action === 'change_password' ? !Number.isSafeInteger(subject) || Number(subject) <= 0
      : (action !== 'login' && action !== 'signup') || typeof subject !== 'string' || !subject || subject.length > 254) {
      throw new Error('Invalid auth identity');
    }
    const limits = AUTH_LIMITS[action];
    conn = await (testPool ?? throttlePool()).getConnection();
    // This connection belongs to the dedicated throttle pool; never holds
    // application-row locks while bcrypt runs. A lock timeout fails closed.
    await conn.query('SET SESSION innodb_lock_wait_timeout = 3');
    await conn.beginTransaction();
    begun = true;
    // Every request takes its action's global lock before its subject lock.
    // The global admission cap also bounds attacker-created subject rows.
    const global = await reserveBucket(conn, `${action}_global`, GLOBAL_KEY, limits.global, limits.globalSeconds);
    if (!global.allowed) throw new AuthThrottleError('AUTH_RATE_LIMITED', global.retryAfter);

    let identity: string;
    if (action === 'change_password') identity = `account:${subject}`;
    else {
      // Match login's database collation rather than trusting caller spelling.
      const email = subject as string;
      const [accounts] = await conn.execute<RowDataPacket[]>('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
      const id = accounts[0]?.id;
      if (id !== undefined && (!Number.isSafeInteger(Number(id)) || Number(id) <= 0)) throw new Error('Invalid account ID');
      identity = id === undefined ? `email:${email.trim().toLowerCase()}` : `account:${Number(id)}`;
    }
    const key = createHmac('sha256', secret).update(`luqi-auth-throttle-v1\0${identity}`).digest('hex');
    const admission = await reserveBucket(conn, `${action}_subject`, key, limits.subject, limits.subjectSeconds);
    // A subject denial still spends global admission; otherwise a blocked
    // account could be hammered indefinitely without exhausting that cap.
    await conn.commit();
    begun = false;
    if (global.attempts % 20 === 0) {
      try {
        // Best-effort, bounded retention cleanup. Only expired counters older
        // than an hour; never user records or current protection windows.
        await conn.query('DELETE FROM auth_attempt_windows WHERE reset_at < UNIX_TIMESTAMP() - 3600 LIMIT 100');
      } catch { /* Cleanup failure cannot turn a denial into admission. */ }
    }
    if (!admission.allowed) throw new AuthThrottleError('AUTH_RATE_LIMITED', admission.retryAfter);
  } catch (error) {
    if (begun && conn) {
      try { await conn.rollback(); } catch { conn.destroy(); conn = undefined; }
    }
    if (error instanceof AuthThrottleError) throw error;
    // Never expose SQL, account data, connection URLs or driver errors.
    throw new AuthThrottleError('AUTH_THROTTLE_UNAVAILABLE');
  } finally {
    conn?.release();
  }
}
