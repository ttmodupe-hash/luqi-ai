import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ getDb: vi.fn(), rows: vi.fn() }));
vi.mock('../api/queries/connection', () => ({ getDb: mocks.getDb }));
import { getHistory } from '../api/services/session';
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('DATABASE_URL', 'mysql://synthetic.invalid/fixture');
  vi.stubEnv('DB_HOST', '');
  const chain = { select: vi.fn(), from: vi.fn(), where: vi.fn(), orderBy: mocks.rows };
  chain.select.mockReturnValue(chain); chain.from.mockReturnValue(chain); chain.where.mockReturnValue(chain);
  mocks.getDb.mockResolvedValue(chain);
});
afterEach(() => vi.unstubAllEnvs());
describe('legacy history result typing', () => {
  it('retains chronological user and assistant rows without treating other roles as either', async () => {
    mocks.rows.mockResolvedValue([{ role: 'system', content: 'not a user turn' }, { role: 'user', content: 'question' },
      { role: 'assistant', content: 'reply' }, { role: 'invalid', content: 'not a user turn' }]);
    expect(await getHistory('synthetic-session')).toEqual([{ role: 'user', content: 'question' }, { role: 'assistant', content: 'reply' }]);
  });
  it('retains the existing last-N ordering', async () => {
    mocks.rows.mockResolvedValue([{ role: 'user', content: 'old' }, { role: 'user', content: 'new' }, { role: 'assistant', content: 'reply' }]);
    expect(await getHistory('synthetic-session', 2)).toEqual([{ role: 'user', content: 'new' }, { role: 'assistant', content: 'reply' }]);
  });
  it('does not query when legacy storage is unconfigured', async () => {
    vi.stubEnv('DATABASE_URL', '');
    expect(await getHistory('synthetic-session')).toEqual([]);
    expect(mocks.getDb).not.toHaveBeenCalled();
  });
  it('does not manufacture history when storage is unavailable', async () => {
    mocks.getDb.mockRejectedValue(new Error('synthetic storage outage'));
    expect(await getHistory('synthetic-session')).toEqual([]);
  });
});
