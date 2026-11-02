import { describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import type { MiddlewareHandler } from 'hono';
import { serveStaticFiles } from '../api/lib/vite';
import { privateResponsePolicy } from '../api/lib/httpSafety';
import { embeddedLabPaths } from '../api/lib/framePolicy';

// Simulate missing lab files while the account SPA still exists. No filesystem
// writes or production server are involved in this middleware-order regression.
vi.mock('@hono/node-server/serve-static', () => ({
  serveStatic: (options: { path?: string }): MiddlewareHandler => async (c, next) => {
    if (options.path === '/index.html') return c.html('<h1>Account SPA fixture</h1>');
    return next();
  },
}));
function server() {
  const app = new Hono(); app.use('*', privateResponsePolicy); serveStaticFiles(app); return app;
}
describe('missing lab assets cannot expose the account shell in a frame', () => {
  it.each([...embeddedLabPaths, '/labs/unknown.html'])('returns a non-frameable 404 for missing %s', async path => {
    const response = await server().request(path);
    expect(response.status).toBe(404);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(response.headers.get('X-Frame-Options')).toBe('DENY');
    expect(response.headers.get('Content-Security-Policy')).toBe("frame-ancestors 'none'");
    expect(await response.text()).not.toContain('Account SPA fixture');
  });
  it('retains normal client-side SPA fallback outside the lab directory', async () => {
    const response = await server().request('/ordinary-client-route');
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('Account SPA fixture');
    expect(response.headers.get('X-Frame-Options')).toBe('DENY');
  });
});
