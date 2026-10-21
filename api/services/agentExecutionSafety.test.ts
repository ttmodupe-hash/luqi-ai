import { describe, expect, it } from "vitest";
import { SuperIntelligenceCore } from "./superIntelligenceCore";
import { formatAgentReviewPrompt } from "./agentReview";

describe("agent execution security boundary", () => {
  it("never executes untrusted JavaScript in the API container", () => {
    const core = new SuperIntelligenceCore();
    const result = core.evaluateSandbox(
      "process.env.API_SECRET = 'exfiltrate'; require('fs').writeFileSync('/tmp/luqi-pwned', 'x')",
      "true",
    );
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/cannot execute/i);
  });

  it("rejects the retired self-modifying loop", async () => {
    const core = new SuperIntelligenceCore();
    await expect(core.executeAutonomousLoop(
      "unsafe", "modify server source code", "true", 10,
    )).rejects.toThrow(/retired/i);
  });

  it("does not invent successful telemetry or historical execution", () => {
    const core = new SuperIntelligenceCore();
    expect(core.getRecords()).toEqual([]);
    expect(core.getSummary()).toMatchObject({
      totalExecutions: 0,
      successRatePercent: 0,
      failedCycles: 0,
    });
  });

  it("requires review, CI, rollback and disclosure of absent evidence", () => {
    const prompt = formatAgentReviewPrompt({
      taskName: "Fix a database issue",
      taskDescription: "Improve reliability without touching production",
      assertions: "Tests must pass",
      maxCycles: 2,
    });
    expect(prompt).toMatch(/human review/i);
    expect(prompt).toMatch(/rollback plan/i);
    expect(prompt).toMatch(/never claim.*applied/i);
    expect(prompt).toMatch(/missing.*state that clearly/i);
  });
});
