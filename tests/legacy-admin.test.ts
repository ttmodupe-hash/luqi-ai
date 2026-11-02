import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { legacyAdminUnavailable } from '../api/lib/legacyAdmin';

describe('legacy browser admin fail-closed boundary', () => {
  it('contains no shadow handler capable of returning the administrative passkey', () => {
    const source = readFileSync(new URL('../api/boot.ts', import.meta.url), 'utf8');
    expect(source).toContain('app.route("/", legacyAdminUnavailable)');
    expect(source).not.toContain("app.post('/api/v1/admin/verify'");
    expect(source).not.toContain('app.post("/api/v1/admin/verify"');
    expect(source).not.toContain('token: passkey');
  });
  it.each(['GET', 'POST', 'PUT', 'DELETE'])('never grants a session through %s', async method => {
    const response = await legacyAdminUnavailable.request('/api/v1/admin/verify', {
      method, headers: { 'Content-Type': 'application/json', 'x-luqi-admin-key': 'LUQI-ADMIN-2026' },
      ...(method === 'GET' ? {} : { body: JSON.stringify({ passkey: 'LUQI-ADMIN-2026' }) }),
    });
    expect(response.status).toBe(503);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(await response.json()).toMatchObject({ code: 'ADMIN_SESSION_UNAVAILABLE' });
    expect(response.headers.get('Set-Cookie')).toBeNull();
  });
  it('never reports invented provider balances or health', async () => {
    const response = await legacyAdminUnavailable.request('/api/v1/system-api-matrix');
    expect(response.status).toBe(503);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    const data = await response.json();
    expect(data.code).toBe('PROVIDER_TELEMETRY_UNAVAILABLE');
    expect(data).not.toHaveProperty('apis');
    expect(data).not.toHaveProperty('systemGlobalStatus');
  });
});
