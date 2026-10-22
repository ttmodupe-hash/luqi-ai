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
