import { afterEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import { runtimeLiveness } from '../api/lib/runtimeLiveness';

afterEach(() => vi.restoreAllMocks());
const app = new Hono();
for (const path of ['/health', '/v1/health', '/api/health']) app.get(path, runtimeLiveness);

describe('truthful, non-cacheable process liveness', () => {
  it.each(['/health', '/v1/health', '/api/health'])('reports only HTTP liveness on %s', async path => {
    vi.spyOn(Date, 'now').mockReturnValue(1792913400000);
    const response = await app.request(path);
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(await response.json()).toEqual({
      status: 'healthy', timestamp: 1792913400000, service: 'luqi-ai-engine',
    });
  });
  it('does not claim running agents, database connectivity or billable provider readiness', async () => {
    const response = await app.request('/v1/health');
    const body = await response.json();
    for (const field of ['khoro_active', 'omega_active', 'workerVerified', 'database', 'ai_pilot', 'billing']) {
      expect(body).not.toHaveProperty(field);
    }
  });
});
