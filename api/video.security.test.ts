import { describe, expect, it } from "vitest";
import { videoRouter } from "./video";

/**
 * Authenticated project CRUD is restored with per-user SQL ownership;
 * account balances and top-up checkout are session protected; paid rendering
 * requires an explicit quote, idempotency key, and configured real providers.
 */
describe("video route authentication and spending controls", () => {
  const caller = videoRouter.createCaller({
    req: new Request("https://luqi-ai.com/api/trpc/video"),
    user: null,
  });

  const forbiddenCalls: Array<[string, () => Promise<unknown>]> = [
    ["getBalance", () => caller.getBalance({ userKey: "another-user@example.com" })],
    ["getApiStatus", () => caller.getApiStatus()],
    ["topupCredits", () => caller.topupCredits({ userKey: "another-user@example.com", credits: 100, packId: "pack-100" })],
    ["create", () => caller.create({ title: "example", prompt: "example", userId: 123 })],
    ["list", () => caller.list({})],
    ["get", () => caller.get({ id: 123 })],
    ["update", () => caller.update({ id: 123, title: "tampered" })],
    ["delete", () => caller.delete({ id: 123 })],
    ["startProcessing", () => caller.startProcessing({ id: 123 })],
    ["updateProgress", () => caller.updateProgress({ id: 123, progress: 100 })],
    ["markSuccess", () => caller.markSuccess({ id: 123, videoUrl: "https://example.com/file.mp4" })],
    ["markFailed", () => caller.markFailed({ id: 123, errorMessage: "tampered" })],
    ["stats", () => caller.stats()],
    ["generate", () => caller.generate({
      title: "example", prompt: "expensive rendering", userKey: "another-user@example.com",
      requestKey: "12345678-1234-4123-8123-123456789abc", mode: "silent_mp4",
      durationSeconds: 2, confirmedCredits: 20,
    })],
  ];

  it.each(forbiddenCalls)("%s cannot be invoked by unauthenticated callers", async (_name, invoke) => {
    await expect(invoke()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("denies cross-account operations and provider configuration to normal users", async () => {
    const signedIn = videoRouter.createCaller({
      req: new Request("https://luqi-ai.com/api/trpc/video"),
      user: { id: 55, email: "learner@example.com", name: null, role: "user" },
    });
    await expect(signedIn.getBalance({ userKey: "another-user@example.com" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(signedIn.topupCredits({ userKey: "another-user@example.com", credits: 100, packId: "pack-100" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(signedIn.generate({
      title: "test", prompt: "render", userKey: "another-user@example.com",
      requestKey: "12345678-1234-4123-8123-123456789abc", mode: "silent_mp4",
      durationSeconds: 2, confirmedCredits: 20,
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(signedIn.getApiStatus()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
