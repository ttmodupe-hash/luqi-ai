import { describe, expect, it, vi } from 'vitest';
import { readPublicRevision, waitForPublicRevision, PUBLIC_RELEASE_ORIGIN } from '../scripts/verify-deployed-release.mjs';

const commit = 'a'.repeat(40);
const reply = (data: unknown = { format: 'luqi.release.v1', commit }, status = 200, cache = 'no-store') =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': cache } });
describe('observe the deployed commit before reporting release checks', () => {
  it('reads only the fixed public identity endpoint, without credentials or redirects', async () => {
    const request = vi.fn().mockResolvedValue(reply());
    await expect(readPublicRevision(request)).resolves.toBe(commit);
    expect(request).toHaveBeenCalledExactlyOnceWith(PUBLIC_RELEASE_ORIGIN + '/v1/release', {
      method: 'GET', cache: 'no-store', credentials: 'omit', redirect: 'error', signal: expect.any(AbortSignal),
      headers: { 'Cache-Control': 'no-cache', Accept: 'application/json' },
    });
  });
  it.each([
    { format: 'luqi.release.v1', commit: 'short' },
    { format: 'luqi.release.v1', commit, diagnostic: 'private data' },
    { format: 'unverified', commit }, {}, [],
  ])('refuses malformed or unexpectedly expanded identity documents %#', async data => {
    await expect(readPublicRevision(vi.fn().mockResolvedValue(reply(data)))).resolves.toBeNull();
  });
  it('refuses cached, unavailable and oversized responses', async () => {
    const request = vi.fn().mockResolvedValueOnce(reply(undefined, 200, 'public, max-age=3600'))
      .mockResolvedValueOnce(reply(undefined, 503));
    expect(await readPublicRevision(request)).toBeNull();
    expect(await readPublicRevision(request)).toBeNull();
    const cancel = vi.fn();
    request.mockResolvedValueOnce(new Response(new ReadableStream({
      start(controller) { controller.enqueue(new Uint8Array(4097)); }, cancel,
    }), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }));
    expect(await readPublicRevision(request)).toBeNull();
    expect(cancel).toHaveBeenCalledTimes(1);
  });
  it('waits across an older deployment and a transient read failure, then accepts only the expected revision', async () => {
    let clock = 0;
    const request = vi.fn().mockResolvedValueOnce(reply({ format: 'luqi.release.v1', commit: 'b'.repeat(40) }))
      .mockRejectedValueOnce(new Error('private transport diagnostics'))
      .mockResolvedValueOnce(reply());
    const pause = vi.fn(async (ms: number) => { clock += ms; });
    await expect(waitForPublicRevision(commit, { request, pause, clock: () => clock, timeoutMs: 20_000 })).resolves.toBeUndefined();
    expect(request).toHaveBeenCalledTimes(3);
    for (const [url, options] of request.mock.calls) {
      expect(url).toBe(PUBLIC_RELEASE_ORIGIN + '/v1/release');
      expect(options.method).toBe('GET');
      expect(options.headers).not.toHaveProperty('Authorization');
    }
  });
  it('fails by a bounded deadline when only an older version is healthy', async () => {
    let clock = 0;
    const request = vi.fn().mockResolvedValue(reply({ format: 'luqi.release.v1', commit: 'b'.repeat(40) }));
    await expect(waitForPublicRevision(commit, { request, pause: async (ms: number) => { clock += ms; },
      clock: () => clock, timeoutMs: 5000 })).rejects.toThrow(/not observed/);
    expect(clock).toBe(5000);
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('rejects missing/short expected revisions before any network request', async () => {
    const request = vi.fn();
    for (const expected of [undefined, '', 'short']) await expect(waitForPublicRevision(expected, { request })).rejects.toThrow();
    expect(request).not.toHaveBeenCalled();
  });
});
