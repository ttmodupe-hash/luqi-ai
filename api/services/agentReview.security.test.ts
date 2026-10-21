import { describe, expect, it, vi } from "vitest";
import { formatAgentReviewPrompt } from "./agentReview";
import { SuperIntelligenceCore } from "./superIntelligenceCore";

describe("agent self-improvement cannot run generated code in the app container", () => {
  it("prepares a review plan without pretending code has executed", () => {
    const prompt = formatAgentReviewPrompt({
      taskName: "Fix persistent sessions",
      taskDescription: "Avoid stale sessions after logout",
      assertions: "Expired cookies must never authenticate",
      maxCycles: 3,
    });
    expect(prompt).toContain("Never claim that a code patch has been applied or tested.");
    expect(prompt).toContain("Expired cookies must never authenticate");
    expect(prompt).toContain("human");
  });

  it("refuses execution even for code that attempts to modify local files", async () => {
    const core = new SuperIntelligenceCore();
    const payload = `require("node:fs").writeFileSync("/tmp/luqi-unsafe-agent-marker", "owned")`;
    const result = core.evaluateSandbox(payload, "true");
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/cannot execute/i);
    await expect(core.executeAutonomousLoop("malicious", payload, "true"))
      .rejects.toThrow(/retired/);
    expect(core.getRecords()).toEqual([]);
  });

  it("never seeds fake successful telemetry or a 100% success rate", () => {
    const core = new SuperIntelligenceCore();
    expect(core.getSummary()).toEqual({
      totalExecutions: 0,
      averageLatencyMs: 0,
      averageAttempts: 0,
      failedCycles: 0,
      successRatePercent: 0,
    });
  });
});
