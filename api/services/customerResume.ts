/** Opt-in device sessions. Flag OFF until independent operational acceptance.
 * No legacy rows, plaintext refresh secrets, provider calls or cookie API auth.
 */
import { Hono, type Context } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { setCookie, getCookie, deleteCookie } from 'hono/cookie';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { customerDeviceSessions, users } from '../../db/schema';
import { getPersistentDb } from '../queries/connection';
import { getSigningSecret, signUserToken, verifyUserToken, verifyUserCredential,
  getSignedSessionDigest } from '../lib/userToken';

const COOKIE = '__Host-luqi_resume';
const HINT = '__Host-luqi_resume_hint';
const INTENT = 'x-luqi-session-intent';
export const RESUME_ABSOLUTE_SECONDS = 24 * 60 * 60;
export const RESUME_IDLE_SECONDS = 12 * 60 * 60;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}\.[a-f0-9]{64}$/;
const RANDOM_PATTERN = /^[A-Za-z0-9_-]{43}$/;
export const SID_PATTERN = /^luqi-rs1-[a-f0-9]{64}$/;
export const customerResumeEnabled = () => process.env.LUQI_CUSTOMER_RESUME_ENABLED === 'true';

export function customerSessionDigest(random: string): string {
  if (!RANDOM_PATTERN.test(random)) throw new Error('INVALID_RESUME_SECRET');
  return createHmac('sha256', getSigningSecret()).update('luqi-device-refresh-v1\0' + random).digest('hex');
}
function tokenSignature(random: string, userId: number, passwordHash: string): string {
  return createHmac('sha256', getSigningSecret())
    .update('luqi-resume-cookie-v1\0' + random + '\0' + userId + '\0' + passwordHash).digest('hex');
}
export function trustedResumeIntent(c: Context, intent: 'login' | 'signup' | 'restore' | 'logout' | 'revoke'): boolean {
  if (c.req.method !== 'POST' || c.req.header(INTENT) !== intent ||
      c.req.header('sec-fetch-site') !== 'same-origin' ||
      c.req.header('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json' ||
      Object.keys(c.req.query()).length) return false;
  try {
    // Railway terminates TLS. Compare the entire external scheme/host/port.
    // Forwarded Origin/Host headers never override this check.
    const host = c.req.header('host') ?? new URL(c.req.url).host;
    const protocol = process.env.NODE_ENV === 'production' ? 'https:' : new URL(c.req.url).protocol;
    const expected = new URL(protocol + '//' + host).origin;
    const origin = c.req.header('origin');
    return !!origin && origin === new URL(origin).origin && origin === expected;
  } catch { return false; }
}
export function hasResumeCookie(c: Context): boolean { return !!getCookie(c, COOKIE); }
export function clearResumeCookies(c: Context) {
  deleteCookie(c, COOKIE, { path: '/', secure: true, httpOnly: true, sameSite: 'Strict' });
  deleteCookie(c, HINT, { path: '/', secure: true, sameSite: 'Strict' });
}
export function setResumeCookies(c: Context, secret: string, absoluteExpiresAt: Date) {
  if (!TOKEN_PATTERN.test(secret)) throw new Error('INVALID_RESUME_SECRET');
  const maxAge = Math.max(0, Math.floor((absoluteExpiresAt.getTime() - Date.now()) / 1000));
  setCookie(c, COOKIE, secret, { secure: true, httpOnly: true, sameSite: 'Strict', path: '/', maxAge });
  setCookie(c, HINT, '1', { secure: true, sameSite: 'Strict', path: '/', maxAge });
}
function parseCookie(value: string | undefined) {
  if (!value || !TOKEN_PATTERN.test(value)) return null;
  const [random, signature] = value.split('.');
  return { random, signature, digest: customerSessionDigest(random) };
}
function newSession(userId: number, passwordHash: string, familyId: string,
  absoluteExpiresAt: Date, rotation = 0) {
  const random = randomBytes(32).toString('base64url');
  const now = new Date();
  return {
    row: { tokenDigest: customerSessionDigest(random), familyId, userId, issuedAt: now, lastUsedAt: now,
      absoluteExpiresAt, idleExpiresAt: new Date(Math.min(absoluteExpiresAt.getTime(), now.getTime() + RESUME_IDLE_SECONDS * 1000)),
      rotation, rotatedAt: null, revokedAt: null },
    token: signUserToken(userId, passwordHash, familyId),
    cookie: random + '.' + tokenSignature(random, userId, passwordHash), absoluteExpiresAt,
  };
}
export async function issueCustomerResumeSession(store: any, userId: number, passwordHash: string) {
  if (!customerResumeEnabled() || !Number.isSafeInteger(userId) || userId < 1) throw new Error('RESUME_UNAVAILABLE');
  const issued = newSession(userId, passwordHash, 'luqi-rs1-' + randomBytes(32).toString('hex'),
    new Date(Date.now() + RESUME_ABSOLUTE_SECONDS * 1000));
  await store.insert(customerDeviceSessions).values(issued.row);
  return { token: issued.token, cookie: issued.cookie, absoluteExpiresAt: issued.absoluteExpiresAt };
}
export async function boundSessionExists(familyId: string, userId: number): Promise<boolean> {
  if (!customerResumeEnabled() || !SID_PATTERN.test(familyId) || !Number.isSafeInteger(userId) || userId < 1) return false;
  const db = await getPersistentDb();
  const [row] = await db.select({ familyId: customerDeviceSessions.familyId }).from(customerDeviceSessions)
    .where(and(eq(customerDeviceSessions.familyId, familyId), eq(customerDeviceSessions.userId, userId),
      isNull(customerDeviceSessions.rotatedAt), isNull(customerDeviceSessions.revokedAt),
      gt(customerDeviceSessions.absoluteExpiresAt, new Date()), gt(customerDeviceSessions.idleExpiresAt, new Date()))).limit(1);
  return !!row;
}
async function revokeFamily(store: any, familyId: string, userId: number) {
  await store.update(customerDeviceSessions).set({ revokedAt: new Date() })
    .where(and(eq(customerDeviceSessions.familyId, familyId), eq(customerDeviceSessions.userId, userId),
      isNull(customerDeviceSessions.revokedAt)));
}
export async function revokeAllCustomerDeviceSessions(store: any, userId: number) {
  if (!customerResumeEnabled()) return;
  await store.update(customerDeviceSessions).set({ revokedAt: new Date() })
    .where(and(eq(customerDeviceSessions.userId, userId), isNull(customerDeviceSessions.revokedAt)));
}
/** Revoke the former browser identity on an account switch, even if the new
 * login declines persistence. The caller supplies its login transaction.
 */
export async function revokePriorResumeCookie(store: any, c: Context) {
  const cookie = parseCookie(getCookie(c, COOKIE));
  if (!cookie) return;
  const [row] = await store.select().from(customerDeviceSessions)
    .where(eq(customerDeviceSessions.tokenDigest, cookie.digest)).limit(1).for('update');
  if (row) await revokeFamily(store, row.familyId, Number(row.userId));
}

export const customerResumeRoutes = new Hono();
customerResumeRoutes.use('*', async (c, next) => {
  c.header('Cache-Control', 'no-store'); c.header('Pragma', 'no-cache');
  c.header('Vary', 'Origin, Sec-Fetch-Site');
  return next();
});
customerResumeRoutes.use('*', bodyLimit({ maxSize: 1024, onError: c => c.json({ code: 'INVALID_INPUT' }, 413) }));
customerResumeRoutes.onError((_error, c) => c.json({ code: 'AUTH_UNAVAILABLE' }, 503));
customerResumeRoutes.post('/session', async c => {
  if (!trustedResumeIntent(c, 'restore')) return c.json({ code: 'AUTH_CSRF_REJECTED' }, 403);
  const input = await c.req.json().catch(() => null);
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length) return c.json({ code: 'INVALID_INPUT' }, 400);
  if (!customerResumeEnabled()) { clearResumeCookies(c); return c.body(null, 204); }
  const cookie = parseCookie(getCookie(c, COOKIE));
  if (!cookie) { clearResumeCookies(c); return c.json({ code: 'AUTH_REQUIRED' }, 401); }
  try {
    const db = await getPersistentDb();
    const issued = await db.transaction(async (tx: any) => {
      const [row] = await tx.select({ session: customerDeviceSessions, email: users.email,
        passwordHash: users.passwordHash, isActive: users.isActive })
        .from(customerDeviceSessions).innerJoin(users, eq(customerDeviceSessions.userId, users.id))
        .where(eq(customerDeviceSessions.tokenDigest, cookie.digest)).limit(1).for('update');
      if (!row) return null;
      const session = row.session, userId = Number(session.userId);
      const signature = tokenSignature(cookie.random, userId, row.passwordHash);
      if (!timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(cookie.signature, 'hex'))) {
        await revokeFamily(tx, session.familyId, userId); return null;
      }
      const now = new Date();
      if (row.isActive !== true) { await revokeAllCustomerDeviceSessions(tx, userId); return null; }
      if (!Number.isSafeInteger(userId) || userId < 1 || session.revokedAt ||
          session.rotatedAt || session.absoluteExpiresAt <= now || session.idleExpiresAt <= now || session.rotation >= 256) {
        await revokeFamily(tx, session.familyId, userId);
        if (session.rotatedAt) console.warn('[Auth] device_session_replay');
        return null;
      }
      const next = newSession(userId, row.passwordHash, session.familyId, session.absoluteExpiresAt, session.rotation + 1);
      await tx.update(customerDeviceSessions).set({ rotatedAt: now, lastUsedAt: now })
        .where(eq(customerDeviceSessions.tokenDigest, cookie.digest));
      await tx.insert(customerDeviceSessions).values(next.row);
      return { ...next, email: row.email };
    });
    if (!issued) { clearResumeCookies(c); return c.json({ code: 'AUTH_REQUIRED' }, 401); }
    setResumeCookies(c, issued.cookie, issued.absoluteExpiresAt);
    return c.json({ token: issued.token, user: { email: issued.email } });
  } catch {
    // A failed commit acknowledgement may follow a successful rotation. No retry.
    return c.json({ code: 'AUTH_UNAVAILABLE' }, 503);
  }
});
customerResumeRoutes.post('/logout', async c => {
  if (!trustedResumeIntent(c, 'logout')) return c.json({ code: 'AUTH_CSRF_REJECTED' }, 403);
  if (!customerResumeEnabled()) { clearResumeCookies(c); return c.body(null, 204); }
  try {
    const db = await getPersistentDb();
    await db.transaction(async (tx: any) => {
      await revokePriorResumeCookie(tx, c);
      const bearer = c.req.header('authorization');
      if (bearer?.startsWith('Bearer ')) {
        const token = bearer.slice(7);
        const userId = verifyUserToken(token), sid = getSignedSessionDigest(token);
        if (sid) await revokeFamily(tx, sid, userId);
      }
    });
    clearResumeCookies(c); return c.body(null, 204);
  } catch { return c.json({ code: 'LOGOUT_UNCONFIRMED' }, 503); }
});
// Cookie alone cannot revoke another device. A verified bearer plus owner match
// is required; family IDs are not credentials and cannot authorize other users.
customerResumeRoutes.post('/sessions/revoke', async c => {
  if (!trustedResumeIntent(c, 'revoke')) return c.json({ code: 'AUTH_CSRF_REJECTED' }, 403);
  if (!customerResumeEnabled()) return c.json({ code: 'AUTH_REQUIRED' }, 401);
  const input = await c.req.json().catch(() => null);
  if (!input || Object.keys(input).length !== 1 || !SID_PATTERN.test(input.familyId)) return c.json({ code: 'INVALID_INPUT' }, 400);
  try {
    const token = c.req.header('authorization');
    if (!token?.startsWith('Bearer ')) return c.json({ code: 'AUTH_REQUIRED' }, 401);
    const raw = token.slice(7), userId = verifyUserToken(raw), sid = getSignedSessionDigest(raw);
    const db = await getPersistentDb();
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user || user.isActive !== true) return c.json({ code: 'AUTH_REQUIRED' }, 401);
    verifyUserCredential(raw, userId, user.passwordHash);
    if (sid && !await boundSessionExists(sid, userId)) return c.json({ code: 'AUTH_REQUIRED' }, 401);
    await revokeFamily(db, input.familyId, userId);
    return c.body(null, 204);
  } catch { return c.json({ code: 'AUTH_UNAVAILABLE' }, 503); }
});
