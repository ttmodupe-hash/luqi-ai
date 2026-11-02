import { describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import { legacyOperationsUnavailable, retiredOperationPaths } from '../api/lib/legacyOperations';
import { SovereignCryptoLedger } from '../api/security/cryptoLedger';

describe('legacy operation boundary', () => {
  it.each(retiredOperationPaths)('closes %s for reads and writes before later handlers', async pattern => {
    const path = pattern.replace(':user_id', 'other-account');
    const later = vi.fn(c => c.json({ secret: 'must never escape' }));
    const app = new Hono().route('/', legacyOperationsUnavailable);
    app.all(pattern, later);
    for (const method of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']) {
      const response = await app.request(path + '?user_id=someone-else', {
        method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer forged', 'x-luqi-admin-key': 'unverified-key' },
        ...(method === 'GET' ? {} : { body: JSON.stringify({ actor: 'System Administrator', action: 'APPROVED', payload: { secret: 'private-content' } }) }),
      });
      expect(response.status).toBe(503);
      expect(response.headers.get('Cache-Control')).toBe('no-store');
      expect(await response.json()).toEqual({ status: 'unavailable', code: 'LEGACY_OPERATION_UNAVAILABLE',
        message: 'This legacy operation requires reviewed authorization and verified results before it can be used.' });
    }
    expect(later).not.toHaveBeenCalled();
  });
  it('cannot append a forged audit entry, even with malformed or missing JSON', async () => {
    const before = SovereignCryptoLedger.getLedgerChain();
    for (const body of ['{', '', JSON.stringify({ actor: 'Operator', action: 'GRANTED' })]) {
      const response = await legacyOperationsUnavailable.request('/api/v1/audit/seal', { method: 'POST', body });
      expect(response.status).toBe(503);
    }
    expect(SovereignCryptoLedger.getLedgerChain()).toEqual(before);
  });
  it('does not intercept reviewed private conversation, login or readiness routes', async () => {
    const app = new Hono().route('/', legacyOperationsUnavailable);
    for (const path of ['/api/v1/companion/conversations', '/api/v1/auth/login', '/v1/readiness']) app.all(path, c => c.json({ reached: true }));
    for (const path of ['/api/v1/companion/conversations', '/api/v1/auth/login', '/v1/readiness']) {
      const response = await app.request(path);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ reached: true });
    }
  });
});
