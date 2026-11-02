import { afterEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import { releaseIdentity } from '../api/lib/releaseIdentity';

const app = new Hono().get('/v1/release', releaseIdentity);
afterEach(() => vi.unstubAllEnvs());
describe('minimal public release identity', () => {
  it('exposes only the complete source commit with private cache controls', async () => {
    const commit = 'a'.repeat(40);
    vi.stubEnv('RAILWAY_GIT_COMMIT_SHA', commit);
    vi.stubEnv('JWT_SECRET', 'private signing value must not escape');
    vi.stubEnv('RAILWAY_GIT_AUTHOR', 'private author must not escape');
    const response = await app.request('/v1/release');
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(response.headers.get('Pragma')).toBe('no-cache');
    expect(await response.json()).toEqual({ format: 'luqi.release.v1', commit });
  });
  it.each([undefined, '', 'short', 'A'.repeat(40), 'b'.repeat(41), 'private secret string'])('fails closed without a valid full revision %#', async commit => {
    vi.stubEnv('RAILWAY_GIT_COMMIT_SHA', commit);
    const response = await app.request('/v1/release');
    expect(response.status).toBe(503);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(await response.json()).toEqual({ code: 'RELEASE_IDENTITY_UNAVAILABLE' });
  });
  it('refuses caller-selected identities rather than reflecting them', async () => {
    vi.stubEnv('RAILWAY_GIT_COMMIT_SHA', 'a'.repeat(40));
    const response = await app.request('/v1/release?commit=private-value');
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ code: 'INVALID_RELEASE_REQUEST' });
  });
});
