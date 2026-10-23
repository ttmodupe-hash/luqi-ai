import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ auth: vi.fn(), db: vi.fn() }));
vi.mock('../api/services/pilotAuth', () => ({ authenticatePilotUser: mocks.auth,
  PilotAuthError: class extends Error { constructor(public code: string) { super(code); } } }));
vi.mock('../api/queries/connection', () => ({ getPersistentDb: mocks.db }));
import { privateConversations as app } from '../api/private-conversations';
import { PilotAuthError } from '../api/services/pilotAuth';
const post = (path: string, body: object) => app.request(path, { method: 'POST',
  headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
beforeEach(() => { vi.clearAllMocks(); mocks.auth.mockResolvedValue(7); });
describe('private durable conversation boundary', () => {
  it('rejects unauthenticated requests before reading storage', async () => {
    mocks.auth.mockRejectedValue(new PilotAuthError('AUTH_REQUIRED'));
    for (const path of ['/', '/1/messages']) {
      const response = await app.request(path);
      expect(response.status).toBe(401);
      expect(response.headers.get('Cache-Control')).toBe('no-store');
    }
    expect(mocks.db).not.toHaveBeenCalled();
  });
  it('rejects spoofed owners, roles, oversized and malformed input', async () => {
    for (const [path, body] of [['/', { personalityId: 1, title: 'x', userId: 8 }],
      ['/1/messages', { content: 'x', role: 'assistant' }],
      ['/1/messages', { content: 'x'.repeat(8001) }],
      ['/0/messages', { content: 'x' }], ['/', { personalityId: 1, title: ' ' }]] as const) {
      expect((await post(path, body)).status).toBe(400);
    }
    expect((await app.request('/?limit=101')).status).toBe(400);
    expect((await app.request('/?userId=8')).status).toBe(400);
    expect((await app.request('/', { method: 'POST', body: '{broken' })).status).toBe(400);
    expect(mocks.db).not.toHaveBeenCalled();
  });
  it('fails closed with a sanitized error if durable storage is unavailable', async () => {
    mocks.db.mockRejectedValue(new Error('mysql://private-password@host'));
    const response = await post('/', { personalityId: 1, title: 'Private' });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ code: 'CONVERSATION_STORAGE_UNAVAILABLE' });
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });
});

it('requires authentication and explicit deletion confirmation before storage access', async () => {
  mocks.auth.mockRejectedValueOnce(new PilotAuthError('AUTH_REQUIRED'));
  expect((await app.request('/1', { method: 'DELETE', body: JSON.stringify({ confirm: true }) })).status).toBe(401);
  for (const [path, body] of [['/1', {}], ['/1', { confirm: false }], ['/0', { confirm: true }],
    ['/1', { confirm: true, userId: 8 }]] as const) {
    const response = await app.request(path, { method: 'DELETE', body: JSON.stringify(body) });
    expect(response.status).toBe(400);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  }
  expect(mocks.db).not.toHaveBeenCalled();
});

it('authenticates exports, rejects caller identity/query overrides and redacts storage failure', async () => {
  mocks.auth.mockRejectedValueOnce(new PilotAuthError('AUTH_REQUIRED'));
  expect((await app.request('/7/export')).status).toBe(401);
  for (const path of ['/0/export', '/7/export?userId=8', '/7/export?limit=1']) {
    expect((await app.request(path)).status).toBe(400);
  }
  expect(mocks.db).not.toHaveBeenCalled();
  mocks.db.mockRejectedValueOnce(new Error('mysql://private-password@host'));
  const response = await app.request('/7/export');
  expect(response.status).toBe(503);
  expect(response.headers.get('Cache-Control')).toBe('no-store');
  expect(await response.json()).toEqual({ code: 'CONVERSATION_STORAGE_UNAVAILABLE' });
});
it('bounds authenticated note bodies even without Content-Length', async () => {
  const response = await app.request('/7/messages', { method: 'POST', body: JSON.stringify({ content: 'x'.repeat(32768) }) });
  expect(response.status).toBe(413);
  expect(response.headers.get('Cache-Control')).toBe('no-store');
  expect(mocks.db).not.toHaveBeenCalled();
});
