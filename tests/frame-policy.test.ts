import { describe, expect, it } from 'vitest';
import { Hono } from 'hono';
import { embeddedLabPaths, framePolicy } from '../api/lib/framePolicy';
import { privateResponsePolicy } from '../api/lib/httpSafety';

const denied = { xFrameOptions: 'DENY', contentSecurityPolicy: "frame-ancestors 'none'" };
const allowed = { xFrameOptions: 'SAMEORIGIN', contentSecurityPolicy: "frame-ancestors 'self'" };
function app() {
  const server = new Hono();
  server.use('*', privateResponsePolicy);
  // Match the ordering of the production server's original security headers.
  server.use('*', async (c, next) => { await next(); c.header('X-Frame-Options', 'DENY'); });
  return server;
}
describe('narrow same-origin teaching-document policy', () => {
  it.each(embeddedLabPaths)('allows successful HTML for %s only', path => {
    expect(framePolicy(path, 'GET', 200, 'text/html; charset=UTF-8')).toEqual(allowed);
    expect(framePolicy(path, 'HEAD', 200, 'text/html')).toEqual(allowed);
  });
  it.each(['/', '/index.html', '/login', '/companion', '/api/v1/account/password',
    '/api/v1/companion/conversations', '/v1/readiness', '/labs/physics_lab.html',
    '/labs/not-reviewed.html', '/labs/algebra_lab.html/extra', '/labs/algebra_lab.html/',
    '/labs/ALGEBRA_lab.html', '/LABS/algebra_lab.html', '/labs/%61lgebra_lab.html',
    '/labs/algebra_lab.html%2f', '//labs/algebra_lab.html', '/labs/algebra_lab.html?origin=foreign'])
  ('does not widen the allowlist for %s', path => {
    expect(framePolicy(path, 'GET', 200, 'text/html')).toEqual(denied);
  });
  it.each(['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'CONNECT'])('denies method %s', method => {
    expect(framePolicy(embeddedLabPaths[0], method, 200, 'text/html')).toEqual(denied);
  });
  it.each([201, 204, 206, 301, 302, 304, 400, 401, 403, 404, 429, 500, 503])('denies status %s', status => {
    expect(framePolicy(embeddedLabPaths[0], 'GET', status, 'text/html')).toEqual(denied);
  });
  it.each(['', 'application/json', 'text/plain', 'application/javascript', 'text/html-other'])
  ('denies non-HTML media type %s', type => {
    expect(framePolicy(embeddedLabPaths[0], 'GET', 200, type)).toEqual(denied);
  });
  it('overrides the downstream DENY only for exact successful lab documents', async () => {
    const server = app();
    server.get('/labs/algebra_lab.html', c => c.html('<h1>Local lab</h1>'));
    server.get('/', c => c.html('<h1>Account shell</h1>'));
    for (const path of ['/labs/algebra_lab.html', '/labs/algebra_lab.html?origin=https://foreign.invalid']) {
      const response = await server.request(path, { headers: { Origin: 'https://foreign.invalid' } });
      expect(response.headers.get('X-Frame-Options')).toBe('SAMEORIGIN');
      expect(response.headers.get('Content-Security-Policy')).toBe("frame-ancestors 'self'");
      expect(response.headers.get('Content-Security-Policy')).not.toContain('foreign');
    }
    expect((await server.request('/')).headers.get('X-Frame-Options')).toBe('DENY');
  });
  it('retains other CSP directives instead of silently replacing them', async () => {
    const server = app();
    server.get('/labs/algebra_lab.html', c => c.html('Lab', 200, {
      'Content-Security-Policy': "script-src 'self'; frame-ancestors 'none'",
    }));
    const response = await server.request('/labs/algebra_lab.html');
    expect(response.headers.get('Content-Security-Policy')).toBe(
      "script-src 'self'; frame-ancestors 'none', frame-ancestors 'self'");
  });
  it('keeps rejected APIs private and prevents framing unknown/error lab responses', async () => {
    const server = app();
    server.get('/api/v1/account/password', c => c.json({ code: 'AUTH_REQUIRED' }, 401));
    server.get('/labs/algebra_lab.html', c => c.html('Unavailable', 503));
    for (const path of ['/api/v1/account/password', '/labs/algebra_lab.html', '/labs/missing.html']) {
      const response = await server.request(path);
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('Content-Security-Policy')).toBe("frame-ancestors 'none'");
    }
    expect((await server.request('/api/v1/account/password')).headers.get('Cache-Control')).toBe('no-store');
  });
});
