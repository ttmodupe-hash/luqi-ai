/** Bounded, opt-in durable customer session. Disabled until the dedicated
 * web role has approved table grants and production-derived recovery acceptance.
 * Raw 256-bit cookie secrets are never stored in MySQL, JWTs or logs.
 * Existing bearer-only flows are unchanged while the feature flag is off.
 */
import { Hono, type Context } from 'hono';
import { setCookie, getCookie, deleteCookie } from 'hono/cookie';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { and, eq, gt } from 'drizzle-orm';
import { sessions, users } from '../../db/schema';
import { getPersistentDb } from '../queries/connection';
import { getSigningSecret, signUserToken } from '../lib/userToken';

const COOKIE = '__Host-luqi_resume';
const HINT = '__Host-luqi_resume_hint';
const INTENT = 'x-luqi-session-intent';
const TTL_SECONDS = 24 * 60 * 60;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}\.[a-f0-9]{64}$/;
const RANDOM_PATTERN = /^[A-Za-z0-9_-]{43}$/;
export const SID_PATTERN = /^luqi-rs1-[a-f0-9]{64}$/;
const SAME_SITE = 'Strict' as const;

export const customerResumeEnabled = () => process.env.LUQI_CUSTOMER_RESUME_ENABLED === 'true';

export function customerSessionDigest(random: string): string {
  if (!RANDOM_PATTERN.test(random)) throw new Error('INVALID_RESUME_SECRET');
  return 'luqi-rs1-' + createHash('sha256').update('luqi-resume-v1\0' + random).digest('hex');
}

function tokenSignature(random: string, userId: number, passwordHash: string): string {
  // Changing the user's bcrypt hash revokes restoration even if old session rows
  // have not yet been deleted. No credential material goes into the cookie.
  return createHmac('sha256', getSigningSecret())
    .update('luqi-resume-cookie-v1\0' + random + '\0' + userId + '\0' + passwordHash)
    .digest('hex');
}

function sameOriginIntent(c: Context, intent: 'restore' | 'logout'): boolean {
  if (c.req.header(INTENT) !== intent) return false;
  const site = c.req.header('sec-fetch-site');
  if (site && site !== 'same-origin' && site !== 'none') return false;
  const origin = c.req.header('origin');
  if (origin) {
    try {
      const parsed = new URL(origin);
      const expectedHost = c.req.header('host')?.toLowerCase();
      if (!expectedHost || parsed.hostname.toLowerCase() !== expectedHost.split(':')[0] ||
          parsed.port && !expectedHost.endsWith(':' + parsed.port) ||
          (process.env.NODE_ENV === 'production' && parsed.protocol !== 'https:')) return false;
    } catch { return false; }
  }
  if (Object.keys(c.req.query()).length) return false;
  return true;
}

export function clearResumeCookies(c: Context) {
  deleteCookie(c, COOKIE, { path: '/', secure: true });
  deleteCookie(c, HINT, { path: '/', secure: true });
}

export function setResumeCookies(c: Context, secret: string) {
  if (!TOKEN_PATTERN.test(secret)) throw new Error('INVALID_RESUME_SECRET');
  setCookie(c, COOKIE, secret, {
    secure: true, httpOnly: true, sameSite: SAME_SITE, path: '/', maxAge: TTL_SECONDS,
  });
  // Non-secret opt-in marker avoids guest bootstrap calls. It never carries a
  // user ID, session value, email, token or conversation content.
  setCookie(c, HINT, '1', {
    secure: true, httpOnly: false, sameSite: SAME_SITE, path: '/', maxAge: TTL_SECONDS,
  });
}

type ResumeStore = { insert: any };

/** Return an issued JWT and secret only after the insert commits. To preserve
 * signup atomicity, callers may supply a MySQL transaction as the store.
 */
export async function issueCustomerResumeSession(
  store: ResumeStore, userId: number, passwordHash: string,
): Promise<{ token: string; cookie: string }> {
  if (!customerResumeEnabled() || !Number.isSafeInteger(userId) || userId < 1) throw new Error('RESUME_UNAVAILABLE');
  const random = randomBytes(32).toString('base64url');
  const digest = customerSessionDigest(random);
  const signature = tokenSignature(random, userId, passwordHash);
  await store.insert(sessions).values({
    userId, token: digest, expiresAt: new Date(Date.now() + TTL_SECONDS * 1000),
  });
  return { token: signUserToken(userId, passwordHash, digest), cookie: random + '.' + signature };
}

export async function boundSessionExists(digest: string, userId: number): Promise<boolean> {
  if (!SID_PATTERN.test(digest) || !Number.isSafeInteger(userId) || userId < 1) return false;
  const db = await getPersistentDb();
  const [row] = await db.select({ id: sessions.id }).from(sessions)
    .where(and(eq(sessions.token, digest), eq(sessions.userId, userId),
      gt(sessions.expiresAt, new Date()))).limit(1);
  return !!row;
}

function parseCookie(value: string | undefined): { random: string; signature: string; digest: string } | null {
  if (!value || !TOKEN_PATTERN.test(value)) return null;
  const [random, signature] = value.split('.');
  return { random, signature, digest: customerSessionDigest(random) };
}

export const customerResumeRoutes = new Hono();

customerResumeRoutes.get('/session', async c => {
  c.header('Cache-Control', 'no-store'); c.header('Pragma', 'no-cache');
  if (!sameOriginIntent(c, 'restore')) return c.json({ code: 'AUTH_CSRF_REJECTED' }, 403);
  if (!customerResumeEnabled()) { clearResumeCookies(c); return c.body(null, 204); }
  const cookie = parseCookie(getCookie(c, COOKIE));
  if (!cookie) { clearResumeCookies(c); return c.json({ code: 'AUTH_REQUIRED' }, 401); }
  try {
    const db = await getPersistentDb();
    const [row] = await db.select({
      userId: sessions.userId, email: users.email, passwordHash: users.passwordHash,
      isActive: users.isActive,
    }).from(sessions).innerJoin(users, eq(sessions.userId, users.id))
      .where(and(eq(sessions.token, cookie.digest), gt(sessions.expiresAt, new Date()))).limit(1);
    if (!row || row.isActive !== true || !Number.isSafeInteger(Number(row.userId))) {
      clearResumeCookies(c); return c.json({ code: 'AUTH_REQUIRED' }, 401);
    }
    const signature = tokenSignature(cookie.random, Number(row.userId), row.passwordHash);
    if (!timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(cookie.signature, 'hex'))) {
      clearResumeCookies(c); return c.json({ code: 'AUTH_REQUIRED' }, 401);
    }
    return c.json({ token: signUserToken(Number(row.userId), row.passwordHash, cookie.digest),
      user: { email: row.email } });
  } catch {
    // Do not erase the customer's valid cookie on a transient DB outage.
    return c.json({ code: 'AUTH_UNAVAILABLE' }, 503);
  }
});

customerResumeRoutes.post('/logout', async c => {
  c.header('Cache-Control', 'no-store'); c.header('Pragma', 'no-cache');
  if (!sameOriginIntent(c, 'logout')) return c.json({ code: 'AUTH_CSRF_REJECTED' }, 403);
  const cookie = parseCookie(getCookie(c, COOKIE));
  if (!cookie) { clearResumeCookies(c); return c.body(null, 204); }
  try {
    const db = await getPersistentDb();
    await db.delete(sessions).where(eq(sessions.token, cookie.digest));
    clearResumeCookies(c);
    return c.body(null, 204);
  } catch {
    // An ambiguous DB error cannot certify revocation. Do not silently claim
    // logout completed: clients must retain a visible warning.
    return c.json({ code: 'LOGOUT_UNCONFIRMED' }, 503);
  }
});
