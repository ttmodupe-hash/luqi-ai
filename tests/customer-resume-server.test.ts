import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import jwt from 'jsonwebtoken';
import { getSignedSessionDigest } from '../api/lib/userToken';
import { customerResumeRoutes, customerSessionDigest, issueCustomerResumeSession,
  setResumeCookies, boundSessionExists } from '../api/services/customerResume';
const mocks = vi.hoisted(() => ({ db: vi.fn() }));
vi.mock('../api/queries/connection', () => ({ getPersistentDb: mocks.db }));
const HASH = '$2b$12$zfjKKga9OGRJtq.1Nn.2BuUuc8UEQsjAq6/dT/IJt7RQzAsPp5yGO';
const USER = { email: 'pilot@example.invalid', passwordHash: HASH, isActive: true };
let rows: any[] = [], inserted: any[], updates: any[];
function storage(): any {
  const selection = { for: async () => rows, then: (yes: any, no: any) => Promise.resolve(rows).then(yes, no) };
  const where = () => ({ limit: () => selection });
  return { select: () => ({ from: () => ({ where, innerJoin: () => ({ where }) }) }),
    insert: () => ({ values: async (value: any) => { inserted.push(value); } }),
    update: () => ({ set: (value: any) => ({ where: async () => { updates.push(value); } }) }),
    transaction: async (work: any) => work(storage()) };
}
function request(cookie: string, extras: Record<string, string> = {}, path = '/session', intent = 'restore') {
  return customerResumeRoutes.request('https://app.luqi-ai.com' + path, {
    method: 'POST', headers: { Host: 'app.luqi-ai.com', Cookie: '__Host-luqi_resume=' + cookie,
      Origin: 'https://app.luqi-ai.com', 'Content-Type': 'application/json',
      'x-luqi-session-intent': intent, 'sec-fetch-site': 'same-origin', ...extras }, body: '{}' });
}
async function issued() {
  const result = await issueCustomerResumeSession(storage(), 7, HASH);
  rows = [{ ...USER, session: inserted[0] }];
  return result;
}
beforeEach(() => {
  vi.stubEnv('JWT_SECRET', 'unit-test-resume-secret-with-over-32-safe-characters');
  vi.stubEnv('LUQI_CUSTOMER_RESUME_ENABLED', 'true'); vi.stubEnv('NODE_ENV', 'production');
  rows = []; inserted = []; updates = []; mocks.db.mockReset().mockImplementation(async () => storage());
});
afterEach(() => vi.unstubAllEnvs());
describe('device-session security boundaries', () => {
  it('does not issue device credentials while the flag is off', async () => {
    vi.stubEnv('LUQI_CUSTOMER_RESUME_ENABLED', 'false');
    await expect(issueCustomerResumeSession(storage(), 7, HASH)).rejects.toThrow('RESUME_UNAVAILABLE');
    expect(inserted).toHaveLength(0);
  });
  it('stores only a keyed digest of 256 random bits and issues a 15 minute memory token', async () => {
    const result = await issued(), random = result.cookie.split('.')[0];
    expect(random).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(inserted[0].tokenDigest).toBe(customerSessionDigest(random));
    expect(JSON.stringify(inserted)).not.toContain(random);
    expect(getSignedSessionDigest(result.token)).toBe(inserted[0].familyId);
    const claims = jwt.decode(result.token) as jwt.JwtPayload;
    expect(claims.exp! - claims.iat!).toBe(900);
    vi.stubEnv('JWT_SECRET', 'different-test-signing-secret-with-more-than-32-characters');
    expect(customerSessionDigest(random)).not.toBe(inserted[0].tokenDigest);
  });
  it('sets host-only Strict Secure HttpOnly cookies with a bounded absolute lifetime', async () => {
    const value = await issued();
    const app = new Hono().get('/', c => { setResumeCookies(c, value.cookie, value.absoluteExpiresAt); return c.text('ok'); });
    const cookies = (await app.request('/')).headers.getSetCookie();
    expect(cookies).toHaveLength(2);
    for (const cookie of cookies) { expect(cookie).toContain('Secure'); expect(cookie).toContain('SameSite=Strict');
      expect(cookie).toContain('Path=/'); expect(cookie).not.toContain('Domain='); }
    expect(cookies[0]).toContain('HttpOnly'); expect(cookies[1]).not.toContain('HttpOnly');
  });
  it('rejects GET/HEAD and CSRF variants before touching storage', async () => {
    for (const method of ['GET', 'HEAD']) expect((await customerResumeRoutes.request('/session', { method })).status).toBe(404);
    const value = await issued();
    for (const extra of [{ Origin: '' }, { Origin: 'null' }, { 'sec-fetch-site': '' }, { 'sec-fetch-site': 'none' },
      { Origin: 'https://app.luqi-ai.com:444' }, { Origin: 'http://app.luqi-ai.com' },
      { Origin: 'https://evil.example' }, { 'sec-fetch-site': 'same-site' },
      { 'sec-fetch-site': 'cross-site' }, { 'x-luqi-session-intent': '' }, { 'Content-Type': 'text/plain' }]) {
      expect((await request(value.cookie, extra)).status, JSON.stringify(extra)).toBe(403);
    }
    expect((await request(value.cookie, {}, '/session?redirect=https://evil.example')).status).toBe(403);
    expect(mocks.db).not.toHaveBeenCalled();
  });
  it('rotates under a transaction without extending absolute expiry or leaking cookie secrets', async () => {
    const value = await issued();
    const response = await request(value.cookie);
    expect(response.status).toBe(200); expect(response.headers.get('cache-control')).toBe('no-store');
    expect(updates[0].rotatedAt).toBeInstanceOf(Date); expect(inserted).toHaveLength(2);
    expect(inserted[1].familyId).toBe(inserted[0].familyId);
    expect(inserted[1].tokenDigest).not.toBe(inserted[0].tokenDigest);
    expect(inserted[1].absoluteExpiresAt).toEqual(inserted[0].absoluteExpiresAt);
    expect(inserted[1].rotation).toBe(1);
    expect(JSON.stringify(await response.json())).not.toContain(value.cookie);
  });
  it.each(['rotatedAt', 'revokedAt', 'absoluteExpiresAt', 'idleExpiresAt'])('rejects %s and revokes its family', async field => {
    const value = await issued(); rows[0].session[field] = new Date(Date.now() - 1000);
    expect((await request(value.cookie)).status).toBe(401);
    expect(updates[0].revokedAt).toBeInstanceOf(Date); expect(inserted).toHaveLength(1);
  });
  it('rejects disabled accounts and changed credentials', async () => {
    const value = await issued(); rows[0].isActive = false;
    expect((await request(value.cookie)).status).toBe(401);
    rows[0] = { ...USER, passwordHash: HASH.replace('zfjK', 'afjK'), session: inserted[0] };
    expect((await request(value.cookie)).status).toBe(401);
  });
  it('does not certify restoration or revocation on a database failure', async () => {
    const value = await issued(); mocks.db.mockRejectedValue(new Error('private-database-diagnostic'));
    const restore = await request(value.cookie);
    expect(restore.status).toBe(503); expect(restore.headers.getSetCookie()).toHaveLength(0);
    expect(await restore.text()).not.toContain('private');
    expect((await request(value.cookie, {}, '/logout', 'logout')).status).toBe(503);
  });
  it('flag rollback invalidates bound bearer access without a database call', async () => {
    const value = await issued(); vi.stubEnv('LUQI_CUSTOMER_RESUME_ENABLED', 'false');
    expect(await boundSessionExists(getSignedSessionDigest(value.token)!, 7)).toBe(false);
    expect(mocks.db).not.toHaveBeenCalled();
    expect((await request(value.cookie)).status).toBe(204);
  });
});
