import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ web: vi.fn(), news: vi.fn() }));
// This isolated fixture exercises handler argument wiring only. Real production
// authorization remains independently exercised by trpc-authorization.test.ts.
vi.mock('../api/middleware', async () => {
  const { initTRPC } = await import('@trpc/server');
  const t = initTRPC.create();
  return { createRouter: t.router, publicQuery: t.procedure };
});
vi.mock('../api/services/serper', () => ({ searchWeb: mocks.web, searchNews: mocks.news, formatSearchContext: vi.fn() }));
import { searchRouter } from '../api/search';
beforeEach(() => { vi.clearAllMocks(); mocks.web.mockResolvedValue(null); mocks.news.mockResolvedValue(null); });
describe('search transport option contract', () => {
  it('forwards requested web and news limits using numResults', async () => {
    const caller = searchRouter.createCaller({} as never);
    await caller.web({ query: 'synthetic', num: 2 });
    await caller.news({ query: 'synthetic', num: 7 });
    expect(mocks.web).toHaveBeenCalledExactlyOnceWith('synthetic', { numResults: 2 });
    expect(mocks.news).toHaveBeenCalledExactlyOnceWith('synthetic', { numResults: 7 });
  });
  it.each([['weather', 'weather synthetic', 3], ['finance', 'stock finance synthetic', 5], ['crypto', 'crypto synthetic', 5]] as const)(
    'forwards the %s bounded result count', async (method, query, count) => {
      await searchRouter.createCaller({} as never)[method]({ query: 'synthetic' });
      expect(mocks.web).toHaveBeenCalledExactlyOnceWith(query, { numResults: count });
    });
});
