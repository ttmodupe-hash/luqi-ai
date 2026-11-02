import { afterEach, describe, expect, it, vi } from "vitest";
import { conversationClient, ConversationError, signIn, MAX_NOTES_DOWNLOAD_BYTES } from "../src/lib/private-conversations";
import { readFileSync } from "node:fs";
import { Hono } from 'hono';

const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
afterEach(() => vi.unstubAllGlobals());
it.each([['117', 117], ['0', 30], ['999999', 30], ['private diagnostic', 30]])('bounds login retry hints %s and never retries automatically', async (header, seconds) => {
  const request = vi.fn().mockResolvedValue(new Response('private error details', { status: 429, headers: { 'Retry-After': header } }));
  vi.stubGlobal('fetch', request);
  await expect(signIn('fixture@example.invalid', 'synthetic-password')).rejects.toEqual(new ConversationError(429, Number(seconds)));
  expect(request).toHaveBeenCalledTimes(1);
});
describe("private conversation browser client", () => {
  it('uses the canonical Hono-mounted collection route for both listing and creation', async () => {
    const router = new Hono();
    router.get('/', c => c.json({ conversations: [] }));
    router.post('/', c => c.json({ id: 7, persisted: true }, 201));
    const app = new Hono(); app.route('/api/v1/companion/conversations', router);
    const request = vi.fn((path: string | URL | Request, init?: RequestInit) => app.request(String(path), init));
    const api = conversationClient('synthetic-token', request);
    await expect(api.list()).resolves.toEqual({ conversations: [] });
    await expect(api.create('Test title', 1)).resolves.toEqual({ id: 7, persisted: true });
    expect(request.mock.calls.map(call => new URL(String(call[0]), 'http://localhost').pathname))
      .toEqual(['/api/v1/companion/conversations', '/api/v1/companion/conversations']);
  });
  it("sends only the account token and allowed user content to the same origin", async () => {
    const request = vi.fn().mockResolvedValue(response({ id: 7, role: "user", persisted: true }, 201));
    await expect(conversationClient("account-token", request).save(3, "My note")).resolves.toEqual({ id: 7, role: "user", persisted: true });
    expect(request).toHaveBeenCalledExactlyOnceWith("/api/v1/companion/conversations/3/messages", {
      method: "POST", cache: "no-store", credentials: "omit", redirect: "error", signal: expect.any(AbortSignal),
      headers: { Authorization: "Bearer account-token", "Content-Type": "application/json" },
      body: JSON.stringify({ content: "My note" }),
    });
  });
  it.each([401, 404, 503])("rejects HTTP %s without echoing server content or retrying", async status => {
    const request = vi.fn().mockResolvedValue(response({ secret: "private SQL details" }, status));
    await expect(conversationClient("token", request).save(1, "note")).rejects.toEqual(new ConversationError(status));
    expect(request).toHaveBeenCalledTimes(1);
  });
  it("does not retry a lost write response", async () => {
    const request = vi.fn().mockRejectedValue(new TypeError("Network failure"));
    await expect(conversationClient("token", request).save(1, "note")).rejects.toThrow();
    expect(request).toHaveBeenCalledTimes(1);
  });
  it.each([{ id: 1, persisted: false, role: "user" }, { id: 0, persisted: true, role: "user" }, { id: 1, persisted: true, role: "assistant" }])("rejects unconfirmed or malformed success %#", async body => {
    const request = vi.fn().mockResolvedValue(response(body));
    await expect(conversationClient("token", request).save(1, "note")).rejects.toThrow();
  });
  it("loads paginated saved messages without changing their roles or content", async () => {
    const messages = [{ id: 4, role: "user", content: "<script>plain text</script>", createdAt: "2026-10-22T12:00:00Z" }];
    const request = vi.fn().mockResolvedValue(response({ messages }));
    await expect(conversationClient("token", request).messages(2, 5)).resolves.toEqual({ messages });
    expect(request.mock.calls[0][0]).toBe("/api/v1/companion/conversations/2/messages?limit=50&before=5");
  });
  it("keeps both frontend copies identical", () => {
    for (const file of ["lib/private-conversations.ts", "lib/conversation-request.ts", "pages/CompanionPage.tsx"])
      expect(readFileSync(`src/${file}`, "utf8")).toBe(readFileSync(`app/src/${file}`, "utf8"));
  });
});

it("deletes only the chosen conversation with explicit confirmation and no retry", async () => {
  const request = vi.fn().mockResolvedValue(response({ id: 3, deleted: true }));
  await expect(conversationClient("token", request).remove(3)).resolves.toEqual({ id: 3, deleted: true });
  expect(request).toHaveBeenCalledExactlyOnceWith("/api/v1/companion/conversations/3", {
    method: "DELETE", cache: "no-store", credentials: "omit", redirect: "error", signal: expect.any(AbortSignal),
    headers: { Authorization: "Bearer token", "Content-Type": "application/json" }, body: JSON.stringify({ confirm: true }),
  });
  request.mockResolvedValue(response({ id: 4, deleted: true }));
  await expect(conversationClient("token", request).remove(3)).rejects.toThrow();
  request.mockRejectedValue(new TypeError("Lost response"));
  await expect(conversationClient("token", request).remove(3)).rejects.toThrow();
  expect(request).toHaveBeenCalledTimes(3);
});

it('validates the exact requested conversation before exposing an export and never retries', async () => {
  const data = { format: 'luqi.conversation.v1', exportedAt: '2026-10-23T06:00:00Z',
    conversation: { id: 3, title: 'Private', personalityId: 1, createdAt: null },
    messages: [{ id: 1, role: 'user', content: '<script>plain JSON</script>', createdAt: null }], memories: [] };
  const request = vi.fn().mockResolvedValue(response(data));
  await expect(conversationClient('token', request).export(3)).resolves.toEqual(data);
  expect(request).toHaveBeenCalledExactlyOnceWith('/api/v1/companion/conversations/3/export', {
    method: 'GET', cache: 'no-store', credentials: 'omit', redirect: 'error', signal: expect.any(AbortSignal),
    headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
  });
  await expect(conversationClient('token', request).export(4)).rejects.toThrow();
  for (const status of [401, 404, 422, 503]) {
    request.mockResolvedValueOnce(response({ privateDetails: 'must not escape' }, status));
    await expect(conversationClient('token', request).export(3)).rejects.toEqual(new ConversationError(status));
  }
  expect(request).toHaveBeenCalledTimes(6);
});

const notesFixture = { format: 'luqi.private-notes.v1', scope: 'saved_notes_only', exportedAt: '2026-10-23T06:00:00Z',
  conversations: [{ id: 4, title: 'Private notes', personalityId: 1, createdAt: null }],
  messages: [{ id: 1, conversationId: 4, role: 'user', content: 'Sawubona <script>plain text</script>', createdAt: null }],
  memories: [{ id: 1, conversationId: null, memoryType: null, category: null, content: 'Unlinked owned memory', importance: null, createdAt: null }] };
const notesResponse = (data: unknown = notesFixture) => new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
describe('bounded complete-notes browser client', () => {
  it('fetches one authenticated private snapshot without filters, persistence or automatic retries', async () => {
    const request = vi.fn().mockResolvedValue(notesResponse());
    await expect(conversationClient('private-token', request).exportAll()).resolves.toEqual(notesFixture);
    expect(request).toHaveBeenCalledExactlyOnceWith('/api/v1/companion/conversations/export', {
      method: 'GET', cache: 'no-store', credentials: 'omit', redirect: 'error', signal: expect.any(AbortSignal),
      headers: { Authorization: 'Bearer private-token', Accept: 'application/json' },
    });
  });
  it.each([401, 422, 429, 503])('rejects HTTP %s without consuming private diagnostics', async status => {
    const request = vi.fn().mockResolvedValue(response({ privateDetails: 'never display' }, status));
    await expect(conversationClient('token', request).exportAll()).rejects.toEqual(new ConversationError(status));
    expect(request).toHaveBeenCalledTimes(1);
  });
  it.each([
    { ...notesFixture, scope: 'whole_account' },
    { ...notesFixture, token: 'unexpected credential' },
    { ...notesFixture, conversations: [] },
    { ...notesFixture, conversations: [...notesFixture.conversations, ...notesFixture.conversations] },
    { ...notesFixture, memories: [{ ...notesFixture.memories[0], conversationId: 99 }] },
    { ...notesFixture, messages: [{ ...notesFixture.messages[0], role: 'tool' }] },
  ])('rejects invalid scope, unexpected fields and inconsistent ownership relationships %#', async data => {
    const request = vi.fn().mockResolvedValue(notesResponse(data));
    await expect(conversationClient('token', request).exportAll()).rejects.toThrow();
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('bounds declared and streamed bytes before parsing a downloaded document', async () => {
    const request = vi.fn().mockResolvedValueOnce(new Response('{}', { headers: {
      'Content-Type': 'application/json', 'Content-Length': String(MAX_NOTES_DOWNLOAD_BYTES + 1),
    } }));
    await expect(conversationClient('token', request).exportAll()).rejects.toThrow();
    const cancelled = vi.fn();
    request.mockResolvedValueOnce(new Response(new ReadableStream({
      start(controller) { controller.enqueue(new Uint8Array(MAX_NOTES_DOWNLOAD_BYTES + 1)); }, cancel: cancelled,
    }), { headers: { 'Content-Type': 'application/json' } }));
    await expect(conversationClient('token', request).exportAll()).rejects.toThrow(/limit/);
    expect(cancelled).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledTimes(2);
  });
  it('cancels a stalled response body on explicit cancellation', async () => {
    const cancelled = vi.fn(), controller = new AbortController();
    const request = vi.fn().mockResolvedValue(new Response(new ReadableStream({ cancel: cancelled }), {
      headers: { 'Content-Type': 'application/json' },
    }));
    const pending = conversationClient('token', request).exportAll(controller.signal);
    const failed = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    await vi.waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    controller.abort(); await failed;
    expect(request.mock.calls[0][1].signal.aborted).toBe(true);
    expect(cancelled).toHaveBeenCalledTimes(1);
  });
  it('times out a stalled body without another request', async () => {
    vi.useFakeTimers();
    try {
      const request = vi.fn().mockResolvedValue(new Response(new ReadableStream(), { headers: { 'Content-Type': 'application/json' } }));
      const failed = expect(conversationClient('token', request).exportAll()).rejects.toMatchObject({ name: 'AbortError' });
      await vi.advanceTimersByTimeAsync(30_001); await failed;
      expect(request).toHaveBeenCalledTimes(1);
    } finally { vi.useRealTimers(); }
  });
});

// Integrated client regressions: same schemas, bounded transport, no auto retries.
it.each(['list', 'create', 'messages', 'save', 'remove', 'export'] as const)(
  'ordinary notes %s times out once without an automatic retry', async operation => {
    vi.useFakeTimers();
    try {
      const request = vi.fn().mockImplementation(() => new Promise(() => {}));
      const api = conversationClient('synthetic-token', request);
      const calls = { list: () => api.list(), create: () => api.create('Title', 1),
        messages: () => api.messages(4), save: () => api.save(4, 'Retained draft'),
        remove: () => api.remove(4), export: () => api.export(4) };
      const failed = expect(calls[operation]()).rejects.toMatchObject({ name: 'AbortError' });
      await vi.advanceTimersByTimeAsync(15_001); await failed;
      expect(request).toHaveBeenCalledTimes(1);
      expect(request.mock.calls[0][1].signal.aborted).toBe(true);
    } finally { vi.useRealTimers(); }
  });
it('selected export rejects an oversized response before JSON parsing', async () => {
  const request = vi.fn().mockResolvedValue(new Response('{}', { headers: {
    'Content-Type': 'application/json', 'Content-Length': '8388609',
  } }));
  await expect(conversationClient('synthetic-token', request).export(4)).rejects.toThrow('Invalid notes response');
  expect(request).toHaveBeenCalledTimes(1);
});
