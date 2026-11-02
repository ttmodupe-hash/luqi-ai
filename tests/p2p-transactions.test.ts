/** SQL conflicts can be retried only after a confirmed full rollback, never an uncertain commit. */
import { beforeEach, afterEach, it, expect, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ getConnection: vi.fn() }));
vi.mock('../api/queries/connection', () => ({
  getPersistentMySqlPool: () => ({ getConnection: mocks.getConnection }),
}));
import { SovereignP2PEngine as engine, P2PError } from '../api/services/sovereignP2P';

function connection(active = 1) {
  return {
    beginTransaction: vi.fn().mockResolvedValue(undefined),
    query: vi.fn().mockImplementation(async ({ sql }: { sql: string }) => [
      sql.startsWith('SELECT id,role,is_active FROM users WHERE id=')
        ? [{ id: 7, role: 'p2p_adult', is_active: active }] : [],
    ]),
    commit: vi.fn().mockResolvedValue(undefined),
    rollback: vi.fn().mockResolvedValue(undefined),
    release: vi.fn(), destroy: vi.fn(),
  };
}
beforeEach(() => {
  mocks.getConnection.mockReset();
  vi.stubEnv('LUQI_P2P_REPORT_KEY', Buffer.alloc(32, 31).toString('base64url'));
});
afterEach(() => vi.unstubAllEnvs());

it.each([
  { code: 'ER_LOCK_DEADLOCK', errno: 1213 },
  { code: 'ER_LOCK_WAIT_TIMEOUT', errno: 1205 },
])('restarts the transaction after confirmed rollback of $code', async conflict => {
  const first = connection(), second = connection();
  first.query.mockRejectedValueOnce(conflict);
  mocks.getConnection.mockResolvedValueOnce(first).mockResolvedValueOnce(second);
  await expect(engine.status(7)).resolves.toMatchObject({ enabled: true, userId: 7, circles: [] });
  expect(first.rollback).toHaveBeenCalledOnce();
  expect(first.commit).not.toHaveBeenCalled();
  expect(first.release).toHaveBeenCalledOnce();
  expect(second.beginTransaction).toHaveBeenCalledOnce();
  expect(second.commit).toHaveBeenCalledOnce();
  expect(second.query.mock.calls[0][1]).toEqual([7]);
});

it('checks account revocation again before any work in the retry', async () => {
  const first = connection(), second = connection(0);
  first.query.mockRejectedValueOnce({ code: 'ER_LOCK_DEADLOCK', errno: 1213 });
  mocks.getConnection.mockResolvedValueOnce(first).mockResolvedValueOnce(second);
  await expect(engine.status(7)).rejects.toMatchObject({ code: 'P2P_DENIED' });
  expect(second.query).toHaveBeenCalledOnce();
  expect(second.commit).not.toHaveBeenCalled();
  expect(second.rollback).toHaveBeenCalledOnce();
});

it('bounds repeated conflicts to three complete attempts', async () => {
  const attempts = [connection(), connection(), connection()];
  for (const c of attempts) {
    c.query.mockRejectedValueOnce({ code: 'ER_LOCK_DEADLOCK', errno: 1213 });
    mocks.getConnection.mockResolvedValueOnce(c);
  }
  await expect(engine.status(7)).rejects.toMatchObject({ code: 'P2P_UNAVAILABLE' });
  expect(mocks.getConnection).toHaveBeenCalledTimes(3);
  for (const c of attempts) {
    expect(c.rollback).toHaveBeenCalledOnce();
    expect(c.release).toHaveBeenCalledOnce();
    expect(c.commit).not.toHaveBeenCalled();
  }
});

it('destroys a connection with a failed rollback and never replays its work', async () => {
  const c = connection();
  c.query.mockRejectedValueOnce({ code: 'ER_LOCK_WAIT_TIMEOUT', errno: 1205 });
  c.rollback.mockRejectedValueOnce(Error('private database failure'));
  mocks.getConnection.mockResolvedValue(c);
  await expect(engine.status(7)).rejects.toMatchObject({ code: 'P2P_UNAVAILABLE', message: 'P2P_UNAVAILABLE' });
  expect(mocks.getConnection).toHaveBeenCalledOnce();
  expect(c.destroy).toHaveBeenCalledOnce();
  expect(c.release).not.toHaveBeenCalled();
});

it.each([{ code: 'ECONNRESET' }, { code: 'ER_LOCK_DEADLOCK', errno: 1213 }])(
  'never retries an uncertain commit, even when its error resembles a lock conflict', async error => {
    const c = connection();
    c.commit.mockRejectedValueOnce(error);
    mocks.getConnection.mockResolvedValue(c);
    await expect(engine.status(7)).rejects.toMatchObject({ code: 'P2P_UNAVAILABLE' });
    expect(mocks.getConnection).toHaveBeenCalledOnce();
    expect(c.commit).toHaveBeenCalledOnce();
    expect(c.destroy).toHaveBeenCalledOnce();
    expect(c.release).not.toHaveBeenCalled();
  },
);

it('does not retry ordinary SQL failures or denied authorisation', async () => {
  for (const error of [{ code: 'ER_DUP_ENTRY', errno: 1062 }, new P2PError('P2P_DENIED')]) {
    mocks.getConnection.mockReset();
    const c = connection();
    c.query.mockRejectedValueOnce(error);
    mocks.getConnection.mockResolvedValue(c);
    await expect(engine.status(7)).rejects.toBeInstanceOf(P2PError);
    expect(mocks.getConnection).toHaveBeenCalledOnce();
    expect(c.rollback).toHaveBeenCalledOnce();
  }
});

it('sanitises connection acquisition failures without beginning or replaying a transaction', async () => {
  mocks.getConnection.mockRejectedValueOnce(Error('private host and connection details'));
  await expect(engine.status(7)).rejects.toMatchObject({ code: 'P2P_UNAVAILABLE', message: 'P2P_UNAVAILABLE' });
  expect(mocks.getConnection).toHaveBeenCalledOnce();
});

it('destroys a connection if transaction setup fails', async () => {
  const c = connection();
  c.beginTransaction.mockRejectedValueOnce(Error('private database failure'));
  mocks.getConnection.mockResolvedValue(c);
  await expect(engine.status(7)).rejects.toMatchObject({ code: 'P2P_UNAVAILABLE' });
  expect(c.query).not.toHaveBeenCalled();
  expect(c.destroy).toHaveBeenCalledOnce();
  expect(c.release).not.toHaveBeenCalled();
});
