// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CUSTOMER_RESUME_HINT, clearCustomerResumeHint, hasCustomerResumeHint,
  restoreCustomerSession, revokeCustomerSession } from '../src/lib/customer-resume';

let cookieText = '';
let writes: string[] = [];
const user = { token: 'signed-synthetic-token', user: { email: 'pilot@example.invalid' } };
function valid() { return Response.json(user); }

beforeEach(() => {
  cookieText = ''; writes = [];
  Object.defineProperty(document, 'cookie', {
    configurable: true,
    get: () => cookieText,
    set: (value: string) => { writes.push(value); if (value.includes('Max-Age=0')) cookieText = ''; },
  });
});
afterEach(() => { vi.restoreAllMocks(); });

describe('one-shot trusted-device session restoration', () => {
  it('does not probe the network for a guest without the non-secret marker', async () => {
    const request = vi.fn();
    expect(hasCustomerResumeHint()).toBe(false);
    expect(await restoreCustomerSession(undefined, request)).toBeNull();
    expect(request).not.toHaveBeenCalled();
  });

  it('restores only one JSON response over same-origin GET and never calls AI', async () => {
    cookieText = CUSTOMER_RESUME_HINT + '=1';
    const request = vi.fn(async () => valid());
    expect(await restoreCustomerSession(undefined, request)).toEqual(user);
    expect(request).toHaveBeenCalledOnce();
    const [path, options] = request.mock.calls[0] as unknown as [string, RequestInit];
    expect(path).toBe('/api/v1/auth/session');
    expect(options).toMatchObject({ method: 'GET', credentials: 'same-origin', redirect: 'error', cache: 'no-store' });
    expect((options.headers as Record<string, string>)['X-Luqi-Session-Intent']).toBe('restore');
  });

  it('clears a definitively rejected hint, but retains one during an outage', async () => {
    cookieText = CUSTOMER_RESUME_HINT + '=1';
    expect(await restoreCustomerSession(undefined, async () => new Response(null, { status: 401 }))).toBeNull();
    expect(writes.some(value => value.includes('Max-Age=0'))).toBe(true);
    cookieText = CUSTOMER_RESUME_HINT + '=1'; writes = [];
    await expect(restoreCustomerSession(undefined, async () => new Response(null, { status: 503 }))).rejects.toThrow('AUTH_RESTORE_UNAVAILABLE');
    expect(writes).toHaveLength(0);
    expect(hasCustomerResumeHint()).toBe(true);
  });

  it('rejects malformed, redirected, oversized, or incomplete data', async () => {
    cookieText = CUSTOMER_RESUME_HINT + '=1';
    for (const answer of [
      () => Response.json({ ...user, user: { email: 'invalid' } }),
      () => new Response('not-json', { headers: { 'Content-Type': 'text/html' } }),
      () => new Response('{}', { headers: { 'Content-Type': 'application/json', 'Content-Length': '9000' } }),
      () => new Response('{"token":', { headers: { 'Content-Type': 'application/json' } }),
    ]) {
      await expect(restoreCustomerSession(undefined, async () => answer())).rejects.toThrow();
    }
    expect(hasCustomerResumeHint()).toBe(true);
  });

  it('does not issue a second request on an ambiguous abort, and cannot show a late reply', async () => {
    cookieText = CUSTOMER_RESUME_HINT + '=1';
    const abort = new AbortController();
    const request = vi.fn(() => new Promise<Response>(() => {}));
    const pending = restoreCustomerSession(abort.signal, request);
    abort.abort();
    await expect(pending).rejects.toThrow('AUTH_REQUEST_UNCONFIRMED');
    expect(request).toHaveBeenCalledOnce();
  });

  it('logs out only on a confirmed same-origin POST and clears the hint once', async () => {
    cookieText = CUSTOMER_RESUME_HINT + '=1';
    const request = vi.fn(async () => new Response(null, { status: 204 }));
    await revokeCustomerSession(request);
    expect(request).toHaveBeenCalledOnce();
    expect(request.mock.calls[0][0]).toBe('/api/v1/auth/logout');
    expect(request.mock.calls[0][1]).toMatchObject({ method: 'POST', credentials: 'same-origin', redirect: 'error' });
    expect(writes.some(value => value.includes('Max-Age=0'))).toBe(true);
    cookieText = CUSTOMER_RESUME_HINT + '=1'; writes = [];
    await expect(revokeCustomerSession(async () => new Response(null, { status: 503 }))).rejects.toThrow('LOGOUT_UNCONFIRMED');
    expect(writes).toHaveLength(0);
  });

  it('clear-only writes an inert cookie and never writes credentials or storage', () => {
    cookieText = CUSTOMER_RESUME_HINT + '=1';
    clearCustomerResumeHint();
    expect(writes).toEqual([expect.stringContaining('Max-Age=0')]);
    expect(writes.join('')).not.toContain(user.token);
  });
});
