import { describe, expect, it } from "vitest";
import { videoRouter } from "./video";

/**
 * Temporary release gate: legacy video routes accept caller-supplied user keys
 * and resource IDs without checking ownership or payment settlement.
 * Keep these routes closed until each route has verified authentication,
 * per-object authorisation and (for credits) verified payment accounting.
 */
describe("video legacy endpoints fail closed", () => {
  const caller = videoRouter.createCaller({
    req: new Request("https://luqi-ai.com/api/trpc/video"),
    user: null,
  });

  const forbiddenCalls: Array<[string, () => Promise<unknown>]> = [
    ["getBalance", () => caller.getBalance({ userKey: "another-user" })],
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
    await expect(invoke()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
