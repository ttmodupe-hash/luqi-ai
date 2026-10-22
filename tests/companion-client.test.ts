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
