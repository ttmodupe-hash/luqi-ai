import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Pool } from 'mysql2/promise';
import { Hono } from 'hono';
const mocks = vi.hoisted(() => ({ auth: vi.fn(), throttle: vi.fn(), execute: vi.fn(), compare: vi.fn(), hash: vi.fn() }));
vi.mock('../api/services/pilotAuth', async original => ({ ...await original<typeof import('../api/services/pilotAuth')>(), authenticatePilotUser: mocks.auth }));
vi.mock('../api/services/authThrottle', async original => ({ ...await original<typeof import('../api/services/authThrottle')>(), reservePasswordChangeAttempt: mocks.throttle }));
vi.mock('../api/queries/connection', () => ({ getPersistentMySqlPool: () => ({ execute: mocks.execute }) }));
vi.mock('bcryptjs', () => ({ default: { compare: mocks.compare, hash: mocks.hash } }));
import { accountSecurity } from '../api/account-security';
import { changeAccountPassword } from '../api/services/passwordChange';
import { AuthThrottleError } from '../api/services/authThrottle';
import { PilotAuthError } from '../api/services/pilotAuth';
import { signUserToken } from '../api/lib/userToken';

const hash = '$2b$12$zfjKKga9OGRJtq.1Nn.2BuUuc8UEQsjAq6/dT/IJt7RQzAsPp5yGO';
const pool = { execute: mocks.execute } as unknown as Pool;
const app = new Hono().route('/api/v1/account', accountSecurity);
let token: string;
const input = { currentPassword: 'Current-Test-Password!', newPassword: 'New-Unique-Password!' };
function post(body: unknown = input, query = '', type = 'application/json') {
  return app.request('/api/v1/account/password' + query, { method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': type }, body: JSON.stringify(body) });
}
beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv('JWT_SECRET', 'synthetic-password-change-unit-secret-over-32-characters');
  token = signUserToken(7, hash); mocks.auth.mockResolvedValue(7); mocks.throttle.mockResolvedValue(undefined);
  mocks.execute.mockResolvedValueOnce([[{ id: 7, password_hash: hash, is_active: 1 }]]).mockResolvedValueOnce([{ affectedRows: 1 }]);
  mocks.compare.mockResolvedValueOnce(true).mockResolvedValueOnce(false); mocks.hash.mockResolvedValue('new-synthetic-hash');
});
afterEach(() => vi.unstubAllEnvs());

describe('authenticated current-password change', () => {
  it('authenticates and reserves the signed-in account before bounded password work', async () => {
    const response = await post();
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(response.headers.get('Pragma')).toBe('no-cache');
    expect(await response.json()).toEqual({ changed: true, signInRequired: true });
    expect(mocks.throttle).toHaveBeenCalledExactlyOnceWith(7);
    expect(mocks.auth.mock.invocationCallOrder[0]).toBeLessThan(mocks.throttle.mock.invocationCallOrder[0]);
    expect(mocks.throttle.mock.invocationCallOrder[0]).toBeLessThan(mocks.compare.mock.invocationCallOrder[0]);
    expect(mocks.hash).toHaveBeenCalledExactlyOnceWith(input.newPassword, 12);
    expect(mocks.execute.mock.calls[1]).toEqual([
      expect.stringContaining('WHERE id=? AND is_active=1 AND BINARY password_hash=BINARY ?'), ['new-synthetic-hash', 7, hash],
    ]);
  });
  it.each(['AUTH_REQUIRED', 'AUTH_UNAVAILABLE'] as const)('rejects %s before parsing or storage', async code => {
    mocks.auth.mockRejectedValue(new PilotAuthError(code));
    const response = await post({ text: 'x'.repeat(5000) });
    expect(response.status).toBe(code === 'AUTH_REQUIRED' ? 401 : 503);
    expect(await response.json()).toEqual({ code });
    expect(mocks.throttle).not.toHaveBeenCalled(); expect(mocks.execute).not.toHaveBeenCalled();
  });
  it.each([{ ...input, userId: 8 }, { ...input, email: 'foreign@example.invalid' }, { ...input, newPassword: 'short' }, null])(
    'rejects forged identity and malformed fields %#', async body => {
      expect((await post(body)).status).toBe(400);
      expect(mocks.execute).not.toHaveBeenCalled(); expect(mocks.compare).not.toHaveBeenCalled();
    });
  it('rejects query input, non-JSON and oversized chunked bodies', async () => {
    expect((await post(input, '?userId=8')).status).toBe(400);
    expect((await post(input, '', 'text/plain')).status).toBe(400);
    const response = await post({ text: 'x'.repeat(5000) });
    expect(response.status).toBe(413); expect(await response.json()).toEqual({ code: 'PASSWORD_BODY_TOO_LARGE' });
    expect(mocks.execute).not.toHaveBeenCalled();
  });
  it.each(['AUTH_RATE_LIMITED', 'AUTH_THROTTLE_UNAVAILABLE'] as const)('fails closed for %s before bcrypt', async code => {
    mocks.throttle.mockRejectedValue(new AuthThrottleError(code, 81));
    const response = await post(); expect(response.status).toBe(code === 'AUTH_RATE_LIMITED' ? 429 : 503);
    expect(response.headers.get('Retry-After')).toBe('81');
    expect(mocks.execute).not.toHaveBeenCalled(); expect(mocks.hash).not.toHaveBeenCalled();
  });
  it.each([{ rows: [] }, { rows: [{ id: 7, password_hash: hash, is_active: 0 }] }, { rows: [{ id: 7, password_hash: hash.replace('zfjK', 'afjK'), is_active: 1 }] }])(
    'rechecks a removed, disabled or changed credential before password work %#', async ({ rows }) => {
      mocks.execute.mockReset().mockResolvedValue([rows]);
      expect((await post()).status).toBe(401); expect(mocks.compare).not.toHaveBeenCalled();
    });
  it('refuses another account token even if a caller supplied its ID', async () => {
    await expect(changeAccountPassword(pool, 8, token, input.currentPassword, input.newPassword))
      .rejects.toMatchObject({ code: 'AUTH_REQUIRED' });
    expect(mocks.hash).not.toHaveBeenCalled();
  });
  it('does not mutate after an incorrect current password or password reuse', async () => {
    mocks.compare.mockReset().mockResolvedValue(false);
    expect((await post()).status).toBe(401); expect(mocks.hash).not.toHaveBeenCalled();
    mocks.execute.mockReset().mockResolvedValue([[{ id: 7, password_hash: hash, is_active: 1 }]]);
    mocks.compare.mockReset().mockResolvedValue(true);
    const response = await post(); expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ code: 'PASSWORD_REUSED' }); expect(mocks.hash).not.toHaveBeenCalled();
  });
  it.each(['界'.repeat(25), 'a'.repeat(73)])('rejects overlong UTF-8 passwords before storage', async password => {
    await expect(changeAccountPassword(pool, 7, token, input.currentPassword, password)).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    await expect(changeAccountPassword(pool, 7, token, password, input.newPassword)).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    expect(mocks.execute).not.toHaveBeenCalled();
  });
  it('never overwrites a competing change or claims a zero-row UPDATE succeeded', async () => {
    mocks.execute.mockReset().mockResolvedValueOnce([[{ id: 7, password_hash: hash, is_active: 1 }]])
      .mockResolvedValueOnce([{ affectedRows: 0 }]);
    const response = await post(); expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ code: 'PASSWORD_CHANGE_CONFLICT' }); expect(mocks.execute).toHaveBeenCalledTimes(2);
  });
  it('does not retry or disclose SQL after a possibly committed write loses its response', async () => {
    mocks.execute.mockReset().mockResolvedValueOnce([[{ id: 7, password_hash: hash, is_active: 1 }]])
      .mockRejectedValueOnce(new Error('mysql://secret SQL private-password'));
    const response = await post(); expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ code: 'PASSWORD_CHANGE_UNAVAILABLE' }); expect(mocks.execute).toHaveBeenCalledTimes(2);
  });
});
