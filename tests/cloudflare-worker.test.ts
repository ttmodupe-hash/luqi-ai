import { afterEach, describe, expect, it, vi } from 'vitest';
import worker from '../edge/cloudflareWorker.js';

afterEach(() => vi.unstubAllGlobals());

function setup(response: Response = new Response('current origin response')) {
  const fetch = vi.fn().mockResolvedValue(response);
  const cache = {
    match: vi.fn().mockResolvedValue(new Response('another account cached response')),
    put: vi.fn(),
  };
  vi.stubGlobal('fetch', fetch);
  vi.stubGlobal('caches', { default: cache });
  return { fetch, cache };
}

function expectPrivate(response: Response) {
  for (const name of ['Cache-Control', 'CDN-Cache-Control', 'Cloudflare-CDN-Cache-Control']) {
    expect(response.headers.get(name)).toBe('no-store');
  }
  expect(response.headers.get('X-Luqi-Edge-Cache')).toBe('BYPASS');
  expect(response.headers.has('X-Edge-PoP')).toBe(false);
}

describe('legacy Cloudflare route Worker privacy', () => {
  it.each([
    '/', '/api/v1/public', '/api/v1/edge-cache',
    '/api/v1/companion/conversations/1/export', '/v1/readiness',
    '/prefix/api/v1/public/private', '/assets/index-abcdef12.js',
    '/?account=another-user',
  ])('never reads or writes shared entries for %s', async (path) => {
    const { fetch, cache } = setup();
    const request = new Request(`https://luqi.example${path}`);
    const response = await worker.fetch(request);
    expect(await response.text()).toBe('current origin response');
    expect(fetch).toHaveBeenCalledExactlyOnceWith(request, { cache: 'no-store', redirect: 'manual' });
    expect(cache.match).not.toHaveBeenCalled();
    expect(cache.put).not.toHaveBeenCalled();
    expectPrivate(response);
  });

  it.each([
    { Authorization: 'Bearer synthetic-account-one' },
    { Cookie: 'session=synthetic-account-two' },
    { 'Cache-Control': 'no-cache' },
    { Range: 'bytes=0-9' },
  ])('preserves request credentials/semantics while bypassing caches: %j', async (headers) => {
    const { fetch, cache } = setup();
    const request = new Request('https://luqi.example/', { headers });
    const response = await worker.fetch(request);
    expect(fetch.mock.calls[0][0]).toBe(request);
    expect(cache.match).not.toHaveBeenCalled();
    expect(cache.put).not.toHaveBeenCalled();
    expectPrivate(response);
  });

  it.each(['private', 'no-store', 'public, max-age=86400'])('never makes %s origin responses shareable', async (policy) => {
    setup(new Response('owned account data', { headers: {
      'Cache-Control': policy,
      'CDN-Cache-Control': 'public, max-age=3600',
      'Cloudflare-CDN-Cache-Control': 'max-age=3600',
      'Set-Cookie': 'session=synthetic; Secure; HttpOnly',
      Vary: 'Cookie, Authorization',
      'Content-Type': 'application/json',
      'X-Edge-PoP': 'JNB-01',
    } }));
    const response = await worker.fetch(new Request('https://luqi.example/'));
    expectPrivate(response);
    expect(response.headers.get('Set-Cookie')).toBe('session=synthetic; Secure; HttpOnly');
    expect(response.headers.get('Vary')).toBe('Cookie, Authorization');
    expect(response.headers.get('Content-Type')).toBe('application/json');
    expect(await response.text()).toBe('owned account data');
  });

  it('keeps redirect responses visible instead of forwarding credentials to another host', async () => {
    const { fetch } = setup(new Response(null, { status: 302, headers: { Location: 'https://other.example/' } }));
    const response = await worker.fetch(new Request('https://luqi.example/', { headers: { Authorization: 'Bearer synthetic' } }));
    expect(fetch.mock.calls[0][1].redirect).toBe('manual');
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('https://other.example/');
    expectPrivate(response);
  });

  it.each([401, 403, 404, 429, 503])('preserves origin denial/error status %i', async (status) => {
    setup(new Response('origin denial', { status, headers: { 'Retry-After': '30' } }));
    const response = await worker.fetch(new Request('https://luqi.example/api/v1/omega/tasks'));
    expect(response.status).toBe(status);
    expect(response.headers.get('Retry-After')).toBe('30');
    expect(await response.text()).toBe('origin denial');
    expectPrivate(response);
  });

  it('forwards mutation bodies once and never queues cache writes', async () => {
    const { fetch, cache } = setup(new Response(null, { status: 204 }));
    const request = new Request('https://luqi.example/api/v1/companion/conversations', {
      method: 'POST', body: JSON.stringify({ title: 'Synthetic private note' }),
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer synthetic' },
    });
    const response = await worker.fetch(request);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][0].method).toBe('POST');
    expect(await fetch.mock.calls[0][0].json()).toEqual({ title: 'Synthetic private note' });
    expect(cache.match).not.toHaveBeenCalled();
    expect(cache.put).not.toHaveBeenCalled();
    expect(response.status).toBe(204);
    expectPrivate(response);
  });

  it('returns a sanitized uncacheable error without stale private fallback', async () => {
    const { fetch, cache } = setup();
    fetch.mockRejectedValue(new Error('sensitive origin diagnostics'));
    const response = await worker.fetch(new Request('https://luqi.example/'));
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ code: 'ORIGIN_UNAVAILABLE', message: 'The origin is temporarily unavailable.' });
    expect(cache.match).not.toHaveBeenCalled();
    expect(cache.put).not.toHaveBeenCalled();
    expectPrivate(response);
  });
});
