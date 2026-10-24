import { afterEach, describe, expect, it, vi } from 'vitest';
import { restCompat } from '../api/rest-compat';
afterEach(() => vi.unstubAllGlobals());
describe('detached legacy streaming route', () => {
  it.each(['', '{invalid', '{"session_id":"foreign-account","message":"PRIVATE-CONTENT"}'])(
    'refuses access without parsing input or invoking a provider', async body => {
      const network = vi.fn(() => { throw new Error('Unexpected external request'); });
      vi.stubGlobal('fetch', network);
      const request = new Request('http://local/api/v25/ai-brain/stream', { method: 'POST', body });
      const response = await restCompat.fetch(request);
      expect(response.status).toBe(503);
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect(await response.json()).toEqual({ status: 'unavailable', code: 'AI_LEGACY_ROUTE_DISABLED',
        message: 'This legacy AI capability is not yet connected to the budgeted gateway.' });
      expect(request.bodyUsed).toBe(false);
      expect(network).not.toHaveBeenCalled();
    });
});
