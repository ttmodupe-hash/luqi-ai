import { describe, expect, it } from "vitest";
import { superIntelligenceCore } from "./superIntelligenceCore";
import { formatAgentReviewPrompt } from "./agentReview";

describe("self-improving agent security boundaries", () => {
  it("never executes generated code in the application process", () => {
    const result = superIntelligenceCore.evaluateSandbox(
      'throw new Error("untrusted code must not execute")',
      'throw new Error("assertions must not execute")',
    );
    expect(result.ok).toBe(false);
    expect(result.message).toContain("cannot execute");
  });

  it("rejects the retired autonomous execution entry point", async () => {
    await expect(superIntelligenceCore.executeAutonomousLoop(
      "malicious", "run arbitrary code", "true",
    )).rejects.toThrow(/retired/);
  });

  it("does not fabricate successful agent executions", () => {
    expect(superIntelligenceCore.getRecords()).toEqual([]);
    expect(superIntelligenceCore.getSummary()).toEqual({
      totalExecutions: 0, averageLatencyMs: 0, averageAttempts: 0,
      failedCycles: 0, successRatePercent: 0,
    });
  });

  it("tells the model that proposals require independent testing and approval", () => {
    const prompt = formatAgentReviewPrompt({
      taskName: "Repair broken module",
      taskDescription: "Investigate a bug",
      assertions: "All tests must pass",
      maxCycles: 3,
    });
    expect(prompt).toContain("You cannot execute code");
    expect(prompt).toContain("human review");
    expect(prompt).toContain("rollback plan");
    expect(prompt).toContain("Never claim that a code patch has been applied or tested");
  });
});
