import { afterEach, describe, expect, it, vi } from 'vitest';
import { changePassword } from '../src/lib/account-security';
const reply = (body: unknown = { changed: true, signInRequired: true }, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });
afterEach(() => vi.useRealTimers());
describe('explicit password-change transport', () => {
  it('sends only the two passwords to the same origin, without cookies, storage or redirects', async () => {
    const request = vi.fn().mockResolvedValue(reply());
    await changePassword('synthetic-token', 'current', 'new-password', undefined, request);
    expect(request).toHaveBeenCalledExactlyOnceWith('/api/v1/account/password', {
      method: 'POST', credentials: 'omit', cache: 'no-store', redirect: 'error', signal: expect.any(AbortSignal),
      headers: { Authorization: 'Bearer synthetic-token', 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ currentPassword: 'current', newPassword: 'new-password' }),
    });
  });
  it.each([
    [401, 'CURRENT_PASSWORD_INVALID'], [401, 'AUTH_REQUIRED'], [400, 'PASSWORD_REUSED'], [400, 'INVALID_INPUT'],
    [409, 'PASSWORD_CHANGE_CONFLICT'], [429, 'AUTH_RATE_LIMITED'],
  ])('accepts only reviewed denial codes for status %s %s', async (status, code) => {
    const request = vi.fn().mockResolvedValue(reply({ code, diagnostic: 'private-server-payload' }, Number(status), { 'Retry-After': '901' }));
    await expect(changePassword('t', 'old', 'new', undefined, request)).rejects.toMatchObject({ code, retryAfter: 901, message: 'Password change request failed' });
    expect(request).toHaveBeenCalledTimes(1);
  });
  it.each([reply({ changed: true }), reply({ changed: true, signInRequired: true, token: 'unexpected' }),
    reply({ code: 'CURRENT_PASSWORD_INVALID' }, 503), reply({ code: 'unknown-private-message' }, 400), reply({}, 202)])(
    'treats malformed successes and unknown denials as unconfirmed %#', async response => {
      const request = vi.fn().mockResolvedValue(response);
      await expect(changePassword('t', 'old', 'new', undefined, request)).rejects.toMatchObject({ code: 'UNCONFIRMED' });
      expect(request).toHaveBeenCalledTimes(1);
    });
  it('cancels oversized streamed bodies and hides raw transport failures', async () => {
    const cancel = vi.fn();
    const response = new Response(new ReadableStream({ start(c) { c.enqueue(new Uint8Array(4097)); }, cancel }),
      { headers: { 'Content-Type': 'application/json' } });
    await expect(changePassword('t', 'old', 'new', undefined, vi.fn().mockResolvedValue(response))).rejects.toMatchObject({ code: 'UNCONFIRMED' });
    expect(cancel).toHaveBeenCalledTimes(1);
    const request = vi.fn().mockRejectedValue(new Error('secret provider diagnostics'));
    await expect(changePassword('t', 'old', 'new', undefined, request)).rejects.toMatchObject({ code: 'UNCONFIRMED', message: 'Password change request failed' });
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('applies its deadline to a stalled response body and discards late results', async () => {
    vi.useFakeTimers(); const cancel = vi.fn();
    const response = new Response(new ReadableStream({ cancel }), { headers: { 'Content-Type': 'application/json' } });
    const result = changePassword('t', 'old', 'new', undefined, vi.fn().mockResolvedValue(response));
    const checked = expect(result).rejects.toMatchObject({ code: 'UNCONFIRMED' });
    await vi.advanceTimersByTimeAsync(20_000); await checked; expect(cancel).toHaveBeenCalledTimes(1);
  });
});
