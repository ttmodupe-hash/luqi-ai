import { describe, expect, it, vi } from "vitest";
import { conversationClient, ConversationError } from "../src/lib/private-conversations";
import { readFileSync } from "node:fs";

const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
describe("private conversation browser client", () => {
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
