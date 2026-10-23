import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
const mocks = vi.hoisted(() => ({ auth: vi.fn(), db: vi.fn(), fetch: vi.fn() }));
vi.mock('../api/services/pilotAuth', () => ({ authenticatePilotUser: mocks.auth,
  PilotAuthError: class extends Error { constructor(public code: string) { super(code); } } }));
vi.mock('../api/queries/connection', () => ({ getDb: mocks.db, getPersistentDb: mocks.db }));
import { appRouter } from '../api/router';
import { createRouter, publicQuery } from '../api/middleware';
import { createTrpcHttp } from '../api/trpc-http';
import { PilotAuthError } from '../api/services/pilotAuth';
const app = new Hono().route('/api/trpc', createTrpcHttp(appRouter));
const request = (procedure: string, input: unknown, mutation = false) => app.request(
  '/api/trpc/' + procedure + (mutation ? '' : '?input=' + encodeURIComponent(JSON.stringify({ json: input }))),
  { method: mutation ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-session' },
    ...(mutation ? { body: JSON.stringify({ json: input }) } : {}) });
beforeEach(() => { vi.clearAllMocks(); mocks.auth.mockResolvedValue(7); });

describe('tRPC authorization boundary', () => {
  it('denies every unreviewed registered procedure before validation or storage', async () => {
    const reviewed = new Set(['ping', 'knowledge.getArticles', 'knowledge.searchLearning',
      'content.getHealthTips', 'content.getAgricultureNews', 'content.getSportsNews', 'content.getBusinessTips',
      'content.getGovernmentInfo', 'content.getTourismInfo', 'offline.queueAction', 'offline.getPending',
      'offline.markSynced', 'offline.resolveConflict']);
    for (const [path, procedure] of Object.entries(appRouter._def.procedures)) {
      if (reviewed.has(path)) continue;
      const response = await request(path, { userId: 999, threadId: '../../foreign', content: 'untrusted' }, procedure._def.type === 'mutation');
      expect(response.status, path).toBe(503);
      expect(response.headers.get('Cache-Control'), path).toBe('no-store');
      expect(await response.text(), path).toContain('TRPC_PROCEDURE_UNAVAILABLE');
    }
    expect(mocks.auth).not.toHaveBeenCalled();
    expect(mocks.db).not.toHaveBeenCalled();
  });
  it('denies new procedures by default, including mutations disguised as public reads', async () => {
    const handler = vi.fn();
    const router = createRouter({ future: publicQuery.mutation(handler), ping: publicQuery.mutation(handler) });
    const caller = router.createCaller({ req: new Request('https://example.invalid') });
    await expect(caller.future()).rejects.toMatchObject({ code: 'SERVICE_UNAVAILABLE' });
    await expect(caller.ping()).rejects.toMatchObject({ code: 'SERVICE_UNAVAILABLE' });
    expect(handler).not.toHaveBeenCalled();
  });
  it('checks encoded and mixed batches per procedure without leaking private data', async () => {
    for (const path of ['ping,archive.listThreads', 'ping%2Carchive%2ElistThreads']) {
      const response = await app.request('/api/trpc/' + path + '?batch=1');
      expect(response.status).toBe(207);
      const entries = await response.json();
      expect(entries[0].result.data.json.ok).toBe(true);
      expect(entries[1].error.json.message).toBe('TRPC_PROCEDURE_UNAVAILABLE');
      expect(response.headers.get('Cache-Control')).toBe('no-store');
    }
    expect(mocks.db).not.toHaveBeenCalled();
  });
  it.each(['production', 'development', 'test'])('requires current account auth in %s', async mode => {
    vi.stubEnv('NODE_ENV', mode);
    vi.stubEnv('APP_SECRET', 'shared-secret-must-not-unlock');
    try {
      mocks.auth.mockRejectedValue(new PilotAuthError('AUTH_REQUIRED'));
      for (const [path, input, mutation] of [
        ['offline.getPending', { deviceId: 'shared' }, false],
        ['offline.queueAction', { deviceId: 'shared', action: 'save', payload: {} }, true],
        ['offline.markSynced', { deviceId: 'shared', ids: [99] }, true],
      ] as const) expect((await request(path, input, mutation)).status).toBe(401);
      expect(mocks.db).not.toHaveBeenCalled();
    } finally { vi.unstubAllEnvs(); }
  });
  it('rejects forged owners and invalid sizes before opening storage', async () => {
    for (const input of [
      { deviceId: 'd', action: 'save', payload: {}, userId: 8 },
      { deviceId: 'd', action: 'save', payload: { text: '界'.repeat(2800) } },
      { deviceId: '', action: 'save', payload: {} },
    ]) expect((await request('offline.queueAction', input, true)).status).toBe(400);
    for (const input of [{ deviceId: 'd', limit: 101 }, { deviceId: 'd', after: -1 }]) {
      expect((await request('offline.getPending', input)).status).toBe(400);
    }
    expect((await request('offline.markSynced', { deviceId: 'd', ids: Array(101).fill(1) }, true)).status).toBe(400);
    expect((await request('content.getHealthTips', { limit: 1000000 })).status).toBe(400);
    expect((await request('knowledge.searchLearning', { query: 'x', limit: -1 })).status).toBe(400);
    expect(mocks.db).not.toHaveBeenCalled();
  });
  it('sanitizes database/auth failures with no fallback or cached data', async () => {
    mocks.db.mockRejectedValue(new Error('mysql://private-password@host SQL SELECT private-payload'));
    let response = await request('offline.getPending', { deviceId: 'd' });
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: { json: {
      message: 'OFFLINE_STORAGE_UNAVAILABLE', data: { code: 'SERVICE_UNAVAILABLE' },
    } } });
    response = await request('knowledge.getArticles', {});
    const body = await response.text();
    expect(body).not.toMatch(/private-password|SQL SELECT|stack|private-payload/);
    mocks.auth.mockRejectedValue(new PilotAuthError('AUTH_UNAVAILABLE'));
    response = await request('offline.getPending', { deviceId: 'd' });
    expect(response.status).toBe(503);
    expect(await response.text()).toContain('AUTH_UNAVAILABLE');
  });
  it('bounds streamed request bodies and batched calls', async () => {
    const response = await request('offline.queueAction', { text: 'x'.repeat(65536) }, true);
    expect(response.status).toBe(413);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(await response.json()).toEqual({ code: 'TRPC_BODY_TOO_LARGE' });
    const batch = await app.request('/api/trpc/' + Array(11).fill('ping').join(',') + '?batch=1');
    expect(batch.status).toBe(400);
    expect(mocks.auth).not.toHaveBeenCalled();
    expect(mocks.db).not.toHaveBeenCalled();
  });
});
