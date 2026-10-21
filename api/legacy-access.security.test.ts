import { describe, expect, it } from "vitest";
import { appRouter } from "./router";

/**
 * Legacy sensitive endpoints are inaccessible while per-resource ownership,
 * guardian consent, agent authorisation and spending controls are unfinished.
 * These assertions run without a database or real vendor API credentials.
 */
describe("high-risk legacy tRPC routes fail closed", () => {
  const caller = appRouter.createCaller({
    req: new Request("https://luqi-ai.com/api/trpc"),
    user: null,
  });

  const sensitiveCalls: Array<[string, () => Promise<unknown>]> = [
    ["guardian.student records", () => caller.guardian.getStudents({ guardianUserId: 9 })],
    ["guardian.link", () => caller.guardian.link({ guardianUserId: 9, studentUserId: 10, relationship: "parent" })],
    ["archive.flight recorder", () => caller.archive.listThreads({ limit: 1 })],
    ["archive.private memory", () => caller.archive.getCognitiveMemory({ limit: 1 })],
    ["archive.upload", () => caller.archive.archiveArtifact({
      fileName: "leak.txt", fileType: "report",
      contentText: "private", taskOutput: { agentRole: "public", taskName: "unauthorised" },
    })],
    ["self healing telemetry", () => caller.selfHealing.getRecentErrors({ limit: 1 })],
    ["self healing patch control", () => caller.selfHealing.applyPatch({ patchId: 1 })],
    ["self healing fabricated tests", () => caller.selfHealing.runTests()],
    ["voice history", () => caller.voice.getHistory({ userId: 9, limit: 1 })],
    ["grading student reports", () => caller.grading.getReport({ reportId: 1 })],
    ["adaptive student records", () => caller.adaptive.getProfile({ userId: 9 })],
    ["offline device queue", () => caller.offline.getPending({ deviceId: "other-device" })],
    ["orchestrator model generation", () => caller.orchestrator.generate({ query: "consume paid API" })],
    ["orchestrator logs", () => caller.orchestrator.logs({ limit: 1 })],
    ["botanical verification", () => caller.botanical.verify({ id: 1, verifiedBy: "unverified stranger" })],
    ["knowledge write", () => caller.knowledge.saveArticle({ title: "forged", content: "forged", category: "test" })],
    ["autonomous refinement", () => caller.superCore.runAutonomousRefinement({
      taskName: "patch", taskDescription: "execute", assertions: "claim success", maxCycles: 1,
    })],
  ];

  it.each(sensitiveCalls)("blocks %s before any business logic executes", async (label, fn) => {
    const authenticatedRoutes = ["guardian.student records", "guardian.link", "voice history", "grading student reports", "adaptive student records", "offline device queue"];
    await expect(fn()).rejects.toMatchObject({
      code: authenticatedRoutes.includes(label) ? "UNAUTHORIZED" : "FORBIDDEN",
    });
  });

  it("also blocks unaudited administrative operations for authenticated users", async () => {
    const user = appRouter.createCaller({
      req: new Request("https://luqi-ai.com/api/trpc"),
      user: { id: 9, email: "owner@example.com", name: null, role: "admin" },
    });
    await expect(user.selfHealing.applyPatch({ patchId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(user.archive.listThreads({ limit: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("preserves public, non-sensitive education content and pure utility functions", async () => {
    const subjects = await caller.labs.listSubjects();
    expect(Array.isArray(subjects)).toBe(true);
    const merged = await caller.offline.resolveConflict({
      localData: { a: 2 }, serverData: { a: 1 }, strategy: "server_wins",
    });
    expect(merged).toEqual({ a: 1 });
  });
});
