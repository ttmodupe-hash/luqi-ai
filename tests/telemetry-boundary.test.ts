import { describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import { readFileSync } from 'node:fs';
import { legacyOperationsUnavailable, retiredOperationPaths } from '../api/lib/legacyOperations';

const reports = ['/api/system/diagnostics-ledger', '/api/v1/intelligence/corporate-report/:dept'] as const;
describe('unverified diagnostics and department reports stay unavailable', () => {
  it.each(reports)('explicitly retires %s', pattern => expect(retiredOperationPaths).toContain(pattern));
  for (const pattern of reports) {
    it.each(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'])('%s cannot reach ' + pattern, async method => {
      const later = vi.fn(c => c.json({ success: true, errorsList: [], average_competency_score: 91.4 }));
      const app = new Hono().route('/', legacyOperationsUnavailable);
      app.all(pattern, later);
      const response = await app.request(pattern.replace(':dept', 'synthetic-dept') + '?private=do-not-echo', {
        method, headers: { Authorization: 'Bearer synthetic-private-token', 'x-luqi-admin-key': 'synthetic-key', 'Content-Type': 'application/json' },
        ...(['GET', 'HEAD'].includes(method) ? {} : { body: '{invalid-private-json' }),
      });
      expect(response.status).toBe(503);
      expect(response.headers.get('Cache-Control')).toBe('no-store');
      if (method !== 'HEAD') {
        expect(await response.json()).toEqual({ status: 'unavailable', code: 'LEGACY_OPERATION_UNAVAILABLE',
          message: 'This legacy operation requires reviewed authorization and verified results before it can be used.' });
      }
      expect(later).not.toHaveBeenCalled();
    });
  }
  it('mounts the denial before both the REST and direct historical handlers', () => {
    const boot = readFileSync('api/boot.ts', 'utf8');
    const guard = boot.indexOf('app.route("/", legacyOperationsUnavailable)');
    expect(guard).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(boot.indexOf('app.route("/", restCompat)'));
    expect(guard).toBeLessThan(boot.indexOf("app.get('/api/v1/intelligence/corporate-report/:dept'"));
  });
  it('does not intercept the reviewed readiness, account or paid-text route', async () => {
    const app = new Hono().route('/', legacyOperationsUnavailable);
    for (const path of ['/v1/readiness', '/api/v1/auth/login', '/api/v1/companion/conversations', '/api/v1/luqi-core']) {
      app.all(path, c => c.json({ reached: true }));
      expect((await app.request(path)).status).toBe(200);
    }
  });
});
