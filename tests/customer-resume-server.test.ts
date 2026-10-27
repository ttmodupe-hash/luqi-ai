import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import bcrypt from 'bcryptjs';
import { getSignedSessionDigest, verifyUserToken } from '../api/lib/userToken';
import { customerResumeRoutes, customerSessionDigest, customerResumeEnabled,
  issueCustomerResumeSession, setResumeCookies, boundSessionExists } from '../api/services/customerResume';

const mocks = vi.hoisted(() => ({ db: vi.fn() }));
vi.mock('../api/queries/connection', () => ({ getPersistentDb: mocks.db }));

const HASH = '$2b$12$zfjKKga9OGRJtq.1Nn.2BuUuc8UEQsjAq6/dT/IJt7RQzAsPp5yGO';
const USER = { userId: 7, email: 'pilot@example.invalid', passwordHash: HASH, isActive: true };
const secret = 'unit-test-resume-secret-with-over-32-safe-characters';
let rows: unknown[] = [];
let deleted = 0;

function storage() {
  return {
    select: () => ({
      from: () => ({
        where: () => ({ limit: async () => rows }),
        innerJoin: () => ({ where: () => ({ limit: async () => rows }) }),
      }),
    }),
    delete: () => ({ where: async () => { deleted++; } }),
  };
}
function request(path: string, cookie: string, intent: 'restore' | 'logout' = 'restore',
  extras: Record<string, string> = {}) {
  return customerResumeRoutes.request(path, {
    method: intent === 'logout' ? 'POST' : 'GET',
    headers: { host: 'app.luqi-ai.com', Cookie: '__Host-luqi_resume=' + cookie,
      'x-luqi-session-intent': intent, 'sec-fetch-site': 'same-origin', ...extras },
  });
}
async function issued() {
  let stored: any;
  const store = { insert: () => ({ values: async (value: unknown) => { stored = value; } }) };
  const token = await issueCustomerResumeSession(store, 7, HASH);
  return { ...token, stored };
}

beforeEach(() => {
  vi.stubEnv('JWT_SECRET', secret);
  vi.stubEnv('LUQI_CUSTOMER_RESUME_ENABLED', 'true');
  vi.stubEnv('NODE_ENV', 'production');
  rows = [USER]; deleted = 0;
  mocks.db.mockReset().mockImplementation(async () => storage());
});
afterEach(() => { vi.unstubAllEnvs(); });

describe('bounded customer session issuance (synthetic only)', () => {
  it('does not issue a persistent session without separate flag activation', async () => {
    vi.stubEnv('LUQI_CUSTOMER_RESUME_ENABLED', 'false');
    const write = vi.fn();
    expect(customerResumeEnabled()).toBe(false);
    await expect(issueCustomerResumeSession({ insert: write }, 7, HASH)).rejects.toThrow('RESUME_UNAVAILABLE');
    expect(write).not.toHaveBeenCalled();
  });

  it('stores a digest, never the cookie secret, and binds bearer JWT to that row', async () => {
    const result = await issued();
    expect(result.cookie.split('.')).toHaveLength(2);
    const [random, mac] = result.cookie.split('.');
    expect(random).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(mac).toMatch(/^[a-f0-9]{64}$/);
    expect(result.stored.token).toBe(customerSessionDigest(random));
    expect(JSON.stringify(result.stored)).not.toContain(random);
    expect(new Date(result.stored.expiresAt).getTime() - Date.now()).toBeGreaterThan(85_000_000);
    expect(verifyUserToken(result.token)).toBe(7);
    expect(getSignedSessionDigest(result.token)).toBe(result.stored.token);
  });

  it('sets host-only, secure, strict cookies and never exposes the session via JS', async () => {
    const result = await issued();
    const app = new Hono();
    app.get('/', c => { setResumeCookies(c, result.cookie); return c.text('ok'); });
    const response = await app.request('/');
    const cookies = response.headers.getSetCookie();
    expect(cookies).toHaveLength(2);
    expect(cookies[0]).toContain('HttpOnly');
    expect(cookies[0]).toContain('Secure');
    expect(cookies[0]).toContain('SameSite=Strict');
    expect(cookies[0]).toContain('Path=/');
    expect(cookies[0]).not.toContain('Domain=');
    expect(cookies[1]).toContain('__Host-luqi_resume_hint=1');
    expect(cookies[1]).not.toContain('HttpOnly');
  });

  it('restores only a validated account with an existing durable record', async () => {
    const result = await issued();
    const response = await request('/session', result.cookie);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.user.email).toBe(USER.email);
    expect(getSignedSessionDigest(body.token)).toBe(result.stored.token);
    expect(JSON.stringify(body)).not.toContain(result.cookie);
    rows = [];
    const missing = await request('/session', result.cookie);
    expect(missing.status).toBe(401);
  });

  it('rejects credential changes, disabled accounts, and transient database failure', async () => {
    const result = await issued();
    const changed = await bcrypt.hash('Changed-Synthetic-Only-2026!', 12);
    rows = [{ ...USER, passwordHash: changed }];
    expect((await request('/session', result.cookie)).status).toBe(401);
    rows = [{ ...USER, isActive: false }];
    expect((await request('/session', result.cookie)).status).toBe(401);
    mocks.db.mockRejectedValue(new Error('synthetic outage'));
    const unavailable = await request('/session', result.cookie);
    expect(unavailable.status).toBe(503);
    expect(unavailable.headers.getSetCookie()).toHaveLength(0);
  });

  it('rejects cross-site intent and does not touch session storage', async () => {
    const result = await issued();
    expect((await customerResumeRoutes.request('/session', { headers: { Cookie: '__Host-luqi_resume=' + result.cookie } })).status).toBe(403);
    expect((await request('/session', result.cookie, 'restore', { Origin: 'https://evil.example', 'sec-fetch-site': 'cross-site' })).status).toBe(403);
    expect(mocks.db).not.toHaveBeenCalled();
  });

  it('revokes the durable row once and never treats an unconfirmed DB error as logout success', async () => {
    const result = await issued();
    expect((await request('/logout', result.cookie, 'logout')).status).toBe(204);
    expect(deleted).toBe(1);
    mocks.db.mockRejectedValue(new Error('synthetic unavailable'));
    expect((await request('/logout', result.cookie, 'logout')).status).toBe(503);
  });

  it('refuses future bearer access after row revocation', async () => {
    const result = await issued();
    rows = [];
    expect(await boundSessionExists(result.stored.token, 7)).toBe(false);
    rows = [{ id: 1 }];
    expect(await boundSessionExists(result.stored.token, 7)).toBe(true);
  });
});
