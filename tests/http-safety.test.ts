import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { privateResponsePolicy, requestTelemetry, redactedHttpError } from '../api/lib/httpSafety';

let info: ReturnType<typeof vi.spyOn>, errors: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  info = vi.spyOn(console, 'info').mockImplementation(() => {});
  errors = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());
function server() {
  const app = new Hono();
  app.use('*', privateResponsePolicy);
  app.use('*', requestTelemetry);
  app.onError(redactedHttpError);
  return app;
}

describe('HTTP privacy boundary', () => {
  it('prevents caching dynamic successes, denials, unknown APIs and readiness, while retaining static caching', async () => {
    const app = server();
    app.get('/api/account', c => c.json({ private: true }, 200, { 'Cache-Control': 'public, max-age=300' }));
    app.get('/auth/session', c => c.json({ code: 'AUTH_REQUIRED' }, 401));
    app.get('/v1/readiness', c => c.json({ status: 'degraded' }, 503));
    app.get('/trpc/ping', c => c.json({ ok: true }));
    app.get('/assets/static.js', c => c.text('static', 200, { 'Cache-Control': 'public, max-age=31536000' }));
    for (const path of ['/api/account', '/auth/session', '/v1/readiness', '/trpc/ping', '/api/unknown']) {
      const response = await app.request(path);
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect(response.headers.get('pragma')).toBe('no-cache');
    }
    expect((await app.request('/assets/static.js')).headers.get('cache-control')).toContain('max-age=31536000');
  });

  it('redacts SQL/provider exceptions from responses and runtime logs, preserving correlation', async () => {
    const app = server();
    const privateText = 'mysql://operator:private-password@db/users?email=private@example.invalid';
    app.get('/api/failure/:privateValue', () => { throw Object.assign(new Error(privateText), { status: 200 }); });
    const response = await app.request('/api/failure/private-note?token=secret-query');
    expect(response.status).toBe(500);
    expect(response.headers.get('cache-control')).toBe('no-store');
    const body = await response.json();
    expect(body).toEqual({ success: false, error: 'Service temporarily unavailable',
      requestId: response.headers.get('x-request-id') });
    expect(body.requestId).toMatch(/^[0-9a-f-]{36}$/);
    const telemetry = [...info.mock.calls, ...errors.mock.calls].flat().join('');
    for (const secret of [privateText, 'private-note', 'secret-query', 'private-password']) expect(telemetry).not.toContain(secret);
    expect(telemetry).toContain('/api/failure/:privateValue');
    expect(telemetry).toContain(body.requestId);
  });

  it('does not echo rejected schema values, HTTP exception responses or abort messages', async () => {
    const app = server();
    app.get('/api/validation', () => { z.enum(['allowed']).parse('private-rejected-value'); return new Response(); });
    app.get('/api/http', () => { throw new HTTPException(403, { message: 'private-exception-message',
      res: new Response('private-error-body', { status: 403, headers: { 'X-Leaked': 'private-header' } }) }); });
    app.get('/api/abort', () => { const error = new Error('private-abort-message'); error.name = 'AbortError'; throw error; });
    app.get('/api/invalid-status', () => { throw new HTTPException(200, { message: 'private-success-error' }); });
    for (const [path, status] of [['/api/validation', 400], ['/api/http', 403], ['/api/abort', 408], ['/api/invalid-status', 500]] as const) {
      const response = await app.request(path);
      expect(response.status).toBe(status);
      expect(await response.text()).not.toContain('private-');
      expect(response.headers.get('x-leaked')).toBeNull();
    }
    expect(errors.mock.calls.flat().join('')).not.toContain('private-');
  });

  it('never logs unknown caller paths, query strings or supplied correlation headers', async () => {
    const app = server();
    await app.request('/private-caller-path?password=private-query', { headers: { 'X-Request-Id': 'private-header' } });
    const telemetry = info.mock.calls.flat().join('');
    expect(telemetry).not.toContain('private-');
    expect(telemetry).toContain('"status":404');
  });
});
