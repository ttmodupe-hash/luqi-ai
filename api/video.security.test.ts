import { describe, expect, it } from "vitest";
import { videoRouter } from "./video";

/**
 * Authenticated project CRUD is restored with per-user SQL ownership;
 * account credits and expensive rendering remain blocked until server-side
 * payment settlement and a durable credit ledger are implemented.
 */
describe("video route authentication and spending controls", () => {
  const caller = videoRouter.createCaller({
    req: new Request("https://luqi-ai.com/api/trpc/video"),
    user: null,
  });

  const forbiddenCalls: Array<[string, () => Promise<unknown>]> = [
    ["getBalance", () => caller.getBalance({ userKey: "another-user" })],
    ["getApiStatus", () => caller.getApiStatus()],
    ["topupCredits", () => caller.topupCredits({ userKey: "another-user", credits: 1000 })],
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
    ["generate", () => caller.generate({ title: "example", prompt: "expensive rendering", userKey: "another-user" })],
  ];

  it.each(forbiddenCalls)("%s cannot be invoked by unauthenticated callers", async (_name, invoke) => {
    await expect(invoke()).rejects.toMatchObject({
      code: ["getBalance", "topupCredits", "generate"].includes(_name) ? "FORBIDDEN" : "UNAUTHORIZED",
    });
  });

  it("denies paid operations and provider configuration to normal users", async () => {
    const signedIn = videoRouter.createCaller({
      req: new Request("https://luqi-ai.com/api/trpc/video"),
      user: { id: 55, email: "learner@example.com", name: null, role: "user" },
    });
    await expect(signedIn.getBalance({ userKey: "another-user" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(signedIn.topupCredits({ userKey: "another-user", credits: 1000 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(signedIn.generate({ title: "test", prompt: "render", userKey: "another-user" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(signedIn.getApiStatus()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
