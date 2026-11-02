// Synthetic requests only: no listeners, customer accounts, database or providers.
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import jwt from 'jsonwebtoken';
import { readFileSync } from 'node:fs';
import { createRequestBodyGuard, MAX_REQUEST_BODY_BYTES } from '../api/lib/requestBodyGuard';
import { privateResponsePolicy, requestTelemetry } from '../api/lib/httpSafety';
import { logger } from '../api/lib/logger';
import { signUserToken, verifyUserToken, verifyUserCredential,
  LUQI_JWT_ISSUER, LUQI_JWT_AUDIENCE } from '../api/lib/userToken';

vi.mock('../api/lib/logger', () => ({ logger: { info: vi.fn(), error: vi.fn() } }));

function guardedApp(limit = 16) {
  const app = new Hono();
  const reached = vi.fn();
  app.use('*', createRequestBodyGuard(limit));
  app.all('*', async c => {
    reached();
    const bytes = c.req.method === 'GET' || c.req.method === 'HEAD'
      ? 0 : (await c.req.arrayBuffer()).byteLength;
    return c.json({ bytes });
  });
  return { app, reached };
}

function streamRequest(method: string, chunks: Uint8Array[], headers: Record<string, string> = {}) {
  let index = 0;
  return new Request('https://luqi.test/api/check', {
    method, headers,
    body: new ReadableStream<Uint8Array>({
      pull(controller) {
        if (index === chunks.length) controller.close();
        else controller.enqueue(chunks[index++]);
      },
    }),
    duplex: 'half',
  } as RequestInit & { duplex: 'half' });
}

function installGlobalBoundary() {
  const app = new Hono();
  const reached = vi.fn();
  app.use('*', privateResponsePolicy);
  app.use('*', requestTelemetry);
  app.post('/api/check', async c => {
    reached();
    return c.json({ bytes: (await c.req.arrayBuffer()).byteLength });
  });
  return { app, reached };
}

describe('bounded HTTP ingress', () => {
  it('preserves the existing 50 MiB global ceiling', () => {
    expect(MAX_REQUEST_BODY_BYTES).toBe(50 * 1024 * 1024);
  });
  it.each([0, -1, 1.5, NaN, Infinity, MAX_REQUEST_BODY_BYTES + 1])('rejects invalid guard configuration %s', limit => {
    expect(() => createRequestBodyGuard(limit)).toThrow('Invalid request body limit');
  });
  it.each(['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'])('rejects over-limit streamed %s without Content-Length', async method => {
    const { app, reached } = guardedApp();
    const request = streamRequest(method, [new Uint8Array(8), new Uint8Array(9)]);
    expect(request.headers.has('content-length')).toBe(false);
    const response = await app.request(request);
    expect(response.status).toBe(413);
    expect(reached).not.toHaveBeenCalled();
    expect(await response.json()).toMatchObject({ code: 'REQUEST_BODY_TOO_LARGE' });
  });
  it('rejects an oversized declared length before reaching the handler', async () => {
    const { app, reached } = guardedApp();
    const response = await app.request('/api/check', { method: 'POST',
      headers: { 'Content-Length': '17' }, body: 'x' });
    expect(response.status).toBe(413);
    expect(reached).not.toHaveBeenCalled();
  });
  it('preserves small streamed payloads and exact-boundary payloads', async () => {
    for (const size of [0, 1, 15, 16]) {
      const { app, reached } = guardedApp();
      const response = await app.request(streamRequest('POST', [new Uint8Array(size)]));
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ bytes: size });
      expect(reached).toHaveBeenCalledOnce();
    }
  });
  it('preserves a small request with a declared length', async () => {
    const { app } = guardedApp();
    const response = await app.request('/api/check', { method: 'POST',
      headers: { 'Content-Length': '2' }, body: '{}' });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ bytes: 2 });
  });
  it('limits bytes, not Unicode characters', async () => {
    const { app, reached } = guardedApp(3);
    const response = await app.request(streamRequest('POST', [new TextEncoder().encode('éé')]));
    expect(response.status).toBe(413);
    expect(reached).not.toHaveBeenCalled();
  });
  it.each(['GET', 'HEAD'])('preserves body-free %s requests', async method => {
    const { app, reached } = guardedApp();
    expect((await app.request('/api/check', { method })).status).toBe(200);
    expect(reached).toHaveBeenCalledOnce();
  });
  it('keeps stricter route limits effective', async () => {
    const { app } = guardedApp(16);
    // A fresh app puts the stricter guard before its handler, as production routes do.
    const scoped = new Hono();
    scoped.use('*', createRequestBodyGuard(16));
    scoped.use('*', bodyLimit({ maxSize: 4, onError: c => c.json({ code: 'ROUTE_LIMIT' }, 413) }));
    scoped.post('/api/check', async c => c.text(await c.req.text()));
    expect((await scoped.request(streamRequest('POST', [new Uint8Array(5)]))).status).toBe(413);
    expect((await app.request(streamRequest('POST', [new Uint8Array(5)]))).status).toBe(200);
  });
  it('does not reflect request content in rejection responses', async () => {
    const { app } = guardedApp(4);
    const response = await app.request('/api/check?private=synthetic-marker', { method: 'POST',
      body: 'synthetic-marker' });
    expect(response.status).toBe(413);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('pragma')).toBe('no-cache');
    expect(await response.text()).not.toContain('synthetic-marker');
  });
  it('global streaming ingress rejects above 50 MiB through the installed boundary', async () => {
    const { app, reached } = installGlobalBoundary();
    const chunk = new Uint8Array(1024 * 1024);
    const response = await app.request(streamRequest('POST', Array.from({ length: 51 }, () => chunk)));
    expect(response.status).toBe(413);
    expect(reached).not.toHaveBeenCalled();
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('x-request-id')).toMatch(/^[a-f0-9-]{36}$/);
    expect(logger.info).toHaveBeenLastCalledWith(expect.objectContaining({ status: 413 }), 'request');
  });
  it('small global requests remain usable without logging their bodies', async () => {
    vi.mocked(logger.info).mockClear();
    const { app, reached } = installGlobalBoundary();
    const response = await app.request('/api/check', { method: 'POST', body: 'synthetic-private-text' });
    expect(response.status).toBe(200);
    expect(reached).toHaveBeenCalledOnce();
    expect(JSON.stringify(vi.mocked(logger.info).mock.calls)).not.toContain('synthetic-private-text');
  });
  it('boot retains the boundary after the IP throttle and before routes', () => {
    const boot = readFileSync(new URL('../api/boot.ts', import.meta.url), 'utf8');
    const boundary = boot.indexOf('app.use("/*", requestTelemetry)');
    expect(boundary).toBeGreaterThan(boot.indexOf('const requestThrottle'));
    expect(boundary).toBeLessThan(boot.indexOf('app.route('));
  });
});

describe('synthetic user-token abuse regressions', () => {
  const secret = 'test-only-luqi-security-key-not-a-production-secret';
  const passwordHash = '$2b$12$' + 'A'.repeat(53);
  const changedPasswordHash = '$2b$12$' + 'B'.repeat(53);
  const priorSecret = process.env.JWT_SECRET;
  beforeAll(() => { process.env.JWT_SECRET = secret; });
  afterAll(() => {
    if (priorSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = priorSecret;
  });
  const tokenWith = (overrides: Record<string, unknown>) => {
    const now = Math.floor(Date.now() / 1000);
    return jwt.sign({ userId: 901, cv: 'a'.repeat(64), iss: LUQI_JWT_ISSUER,
      aud: LUQI_JWT_AUDIENCE, iat: now, exp: now + 300, ...overrides }, secret, { algorithm: 'HS256' });
  };
  it('accepts a valid synthetic credential-bound token', () => {
    const token = signUserToken(901, passwordHash);
    expect(verifyUserToken(token, secret)).toBe(901);
    expect(() => verifyUserCredential(token, 901, passwordHash, secret)).not.toThrow();
  });
  it('rejects a token signed by a different key', () => {
    expect(() => verifyUserToken(tokenWith({}), 'different-test-key-that-is-at-least-32-characters')).toThrow();
  });
  it('rejects unsigned tokens', () => {
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ userId: 901 })).toString('base64url');
    expect(() => verifyUserToken(`${header}.${payload}.`, secret)).toThrow();
  });
  it.each([
    { iss: 'another-service' }, { aud: 'another-audience' },
    { userId: 0 }, { userId: -1 }, { userId: 1.5 }, { userId: '901' },
    { cv: 'not-a-credential-digest' }, { sid: 'not-a-session-digest' },
  ])('rejects invalid scoped claims %j', overrides => {
    expect(() => verifyUserToken(tokenWith(overrides), secret)).toThrow();
  });
  it('rejects expired, future-issued and excessively long-lived tokens', () => {
    const now = Math.floor(Date.now() / 1000);
    for (const claims of [
      { iat: now - 3600, exp: now - 120 },
      { iat: now + 300, exp: now + 600 },
      { iat: now, exp: now + 86401 },
      { iat: now, exp: now + 901, sid: 'luqi-rs1-' + 'a'.repeat(64) },
    ]) expect(() => verifyUserToken(tokenWith(claims), secret)).toThrow();
  });
  it('rejects credential changes and a different account identity', () => {
    const token = signUserToken(901, passwordHash);
    expect(() => verifyUserCredential(token, 901, changedPasswordHash, secret)).toThrow();
    expect(() => verifyUserCredential(token, 902, passwordHash, secret)).toThrow();
  });
});
