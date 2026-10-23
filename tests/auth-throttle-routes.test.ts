import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../api/services/authThrottle', async (importOriginal) => ({
  ...await importOriginal<typeof import('../api/services/authThrottle')>(),
  reserveAuthenticationAttempt: vi.fn(),
}));
vi.mock('../api/queries/connection', () => ({ getDb: vi.fn(), getPersistentDb: vi.fn() }));
vi.mock('bcryptjs', () => ({ default: { hash: vi.fn(), compare: vi.fn() } }));
import { restCompat } from '../api/rest-compat';
import { AuthThrottleError, reserveAuthenticationAttempt } from '../api/services/authThrottle';
import { getPersistentDb } from '../api/queries/connection';
import bcrypt from 'bcryptjs';

const paths = ['/auth/signup', '/auth/register', '/api/v1/auth/register', '/auth/login', '/api/v1/auth/login'];
const body = JSON.stringify({ email: '  Fixture@Example.Invalid  ', password: 'Strong-Synthetic-Password!' });
const request = (path: string) => restCompat.request(path, {
  method: 'POST', body, headers: { 'Content-Type': 'application/json',
    'X-Forwarded-For': '203.0.113.123', 'X-Real-IP': 'spoofed-client', 'CF-Connecting-IP': '192.0.2.1' },
});
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('JWT_SECRET', 'synthetic-test-only-signing-secret-at-least-32-characters');
});
afterEach(() => vi.unstubAllEnvs());

describe('shared authentication route admission', () => {
  it.each(paths)('denies %s before account lookup or password work', async (path) => {
    vi.mocked(reserveAuthenticationAttempt).mockRejectedValue(new AuthThrottleError('AUTH_RATE_LIMITED', 117));
    const response = await request(path);
    expect(response.status).toBe(429);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(response.headers.get('Retry-After')).toBe('117');
    expect(await response.json()).toEqual({ code: 'AUTH_RATE_LIMITED', detail: 'Too many authentication attempts. Please try again later.' });
    expect(reserveAuthenticationAttempt).toHaveBeenCalledExactlyOnceWith(path.endsWith('/login') ? 'login' : 'signup', 'fixture@example.invalid');
    expect(getPersistentDb).not.toHaveBeenCalled();
    expect(bcrypt.compare).not.toHaveBeenCalled();
    expect(bcrypt.hash).not.toHaveBeenCalled();
  });

  it.each(paths)('fails closed when shared storage is unavailable: %s', async (path) => {
    vi.mocked(reserveAuthenticationAttempt).mockRejectedValue(new AuthThrottleError('AUTH_THROTTLE_UNAVAILABLE'));
    const response = await request(path);
    expect(response.status).toBe(503);
    expect(response.headers.get('Retry-After')).toBe('30');
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(await response.json()).toMatchObject({ code: 'AUTH_THROTTLE_UNAVAILABLE' });
    expect(getPersistentDb).not.toHaveBeenCalled();
    expect(bcrypt.compare).not.toHaveBeenCalled();
    expect(bcrypt.hash).not.toHaveBeenCalled();
  });

  it.each([undefined, { id: 1, isActive: false }, { id: 1, isActive: true, passwordHash: 'invalid-legacy-hash' }])(
    'uses password work and generic denial for absent/disabled/unusable accounts', async (user) => {
      vi.mocked(reserveAuthenticationAttempt).mockResolvedValue();
      const limit = vi.fn().mockResolvedValue(user ? [user] : []);
      vi.mocked(getPersistentDb).mockResolvedValue({ select: () => ({ from: () => ({ where: () => ({ limit }) }) }) });
      // Even a match against the dummy hash must never authenticate a user.
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      const response = await request('/auth/login');
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ detail: 'Invalid credentials' });
      expect(bcrypt.compare).toHaveBeenCalledTimes(1);
    },
  );
});
