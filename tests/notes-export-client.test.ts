import { afterEach, describe, expect, it, vi } from 'vitest';
import { conversationClient, ConversationError } from '../src/lib/private-conversations';
import { NOTES_EXPORT_TIMEOUT_MS } from '../src/lib/notes-export-request';

const fixture = { format: 'luqi.private-notes.v1', scope: 'saved_notes_only',
  exportedAt: '2026-10-24T14:00:00Z', conversations: [], messages: [], memories: [] };
afterEach(() => vi.useRealTimers());
describe('complete notes export integration (synthetic only)', () => {
  it('validates a complete snapshot using the existing schema', async () => {
    const request = vi.fn(async () => Response.json(fixture));
    await expect(conversationClient('synthetic-token', request).exportAll()).resolves.toEqual(fixture);
    expect(request).toHaveBeenCalledTimes(1);
  });
  for (const stall of ['fetch', 'oversized cancellation'] as const) {
    it(`settles ${stall} without retrying or returning partial data`, async () => {
      vi.useFakeTimers();
      const request = vi.fn(async () => stall === 'fetch' ? new Promise<Response>(() => {}) :
        new Response(new ReadableStream({
          start(c) { c.enqueue(new Uint8Array(32 * 1024 * 1024 + 1)); },
          cancel() { return new Promise<void>(() => {}); },
        }), { headers: { 'Content-Type': 'application/json' } }));
      const rejected = expect(conversationClient('synthetic-token', request).exportAll()).rejects.toThrow();
      await vi.advanceTimersByTimeAsync(NOTES_EXPORT_TIMEOUT_MS + 1); await rejected;
      expect(request).toHaveBeenCalledTimes(1);
    });
  }
  it('does not submit an already-cancelled export', async () => {
    const c = new AbortController(); c.abort(); const request = vi.fn();
    await expect(conversationClient('synthetic-token', request).exportAll(c.signal)).rejects.toMatchObject({ name: 'AbortError' });
    expect(request).not.toHaveBeenCalled();
  });
  it.each([401, 422, 429, 503])('keeps HTTP %s available for existing UI advice', async status => {
    const request = vi.fn(async () => new Response('private-fixture', { status }));
    await expect(conversationClient('synthetic-token', request).exportAll()).rejects.toEqual(new ConversationError(status));
    expect(request).toHaveBeenCalledTimes(1);
  });
  it.each([
    { ...fixture, scope: 'whole_account' },
    { ...fixture, 'private-fixture-field': 'private-fixture-data' },
    { ...fixture, messages: [{ id: 1, conversationId: 42, role: 'user', content: 'private-fixture-data', createdAt: null }] },
    { ...fixture, conversations: [{ id: 1, title: 'a', personalityId: 1, createdAt: null }, { id: 1, title: 'b', personalityId: 1, createdAt: null }] },
  ])('retains strict export schema while returning fixed, content-free errors %#', async data => {
    const request = vi.fn(async () => Response.json(data));
    const error = await conversationClient('synthetic-token', request).exportAll().then(() => null, err => err);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Notes export could not be verified');
    expect(error.issues).toBeUndefined();
    expect(JSON.stringify(error)).not.toContain('private-fixture');
  });
});
