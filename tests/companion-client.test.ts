import { afterEach, describe, expect, it, vi } from "vitest";
import { conversationClient, ConversationError, signIn } from "../src/lib/private-conversations";
import { readFileSync } from "node:fs";
import { Hono } from 'hono';

const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
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
      method: "POST", cache: "no-store", credentials: "omit", redirect: "error",
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
    for (const file of ["lib/private-conversations.ts", "pages/CompanionPage.tsx"])
      expect(readFileSync(`src/${file}`, "utf8")).toBe(readFileSync(`app/src/${file}`, "utf8"));
  });
});

it("deletes only the chosen conversation with explicit confirmation and no retry", async () => {
  const request = vi.fn().mockResolvedValue(response({ id: 3, deleted: true }));
  await expect(conversationClient("token", request).remove(3)).resolves.toEqual({ id: 3, deleted: true });
  expect(request).toHaveBeenCalledExactlyOnceWith("/api/v1/companion/conversations/3", {
    method: "DELETE", cache: "no-store", credentials: "omit", redirect: "error",
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
    method: 'GET', cache: 'no-store', credentials: 'omit', redirect: 'error',
    headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
  });
  await expect(conversationClient('token', request).export(4)).rejects.toThrow();
  for (const status of [401, 404, 422, 503]) {
    request.mockResolvedValueOnce(response({ privateDetails: 'must not escape' }, status));
    await expect(conversationClient('token', request).export(3)).rejects.toEqual(new ConversationError(status));
  }
  expect(request).toHaveBeenCalledTimes(6);
});
