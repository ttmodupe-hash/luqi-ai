import { afterEach, expect, it, vi } from 'vitest';
import { clearOpportunityScoutCacheForTest, opportunityWatch } from '../api/opportunity-scan';
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); clearOpportunityScoutCacheForTest(); });
it('shares and coalesces source scans for 15 minutes while allowing a fresh check after expiry', async () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-30T10:00:00Z'));
  clearOpportunityScoutCacheForTest();
  const fetcher = vi.fn(async () => new Response('<html>Vacancy Circular 39 of 2026</html>', { headers: { 'Content-Type': 'text/html' } }));
  vi.stubGlobal('fetch', fetcher);
  const [one, two] = await Promise.all([opportunityWatch.request('/'), opportunityWatch.request('/')]);
  expect(one.status).toBe(200); expect(two.status).toBe(200); expect(fetcher).toHaveBeenCalledTimes(3);
  const first = await one.json();
  vi.advanceTimersByTime(14 * 60_000); const cached = await (await opportunityWatch.request('/')).json();
  expect(cached.checkedAt).toBe(first.checkedAt); expect(fetcher).toHaveBeenCalledTimes(3);
  vi.advanceTimersByTime(60_000); const fresh = await (await opportunityWatch.request('/')).json();
  expect(fresh.checkedAt).not.toBe(first.checkedAt); expect(fetcher).toHaveBeenCalledTimes(6);
});
