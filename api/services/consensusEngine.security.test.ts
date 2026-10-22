import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";

const mocks = vi.hoisted(() => ({
  generateContent: vi.fn(),
  messagesCreate: vi.fn(),
  reserveAiRequest: vi.fn(),
  resolveGeminiApiKey: vi.fn(),
}));
vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContent: mocks.generateContent };
  },
}));
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create: mocks.messagesCreate };
  },
}));
vi.mock("../security/aiBudget", () => ({ reserveAiRequest: mocks.reserveAiRequest }));
vi.mock("../lib/apiKeyResolver", () => ({ resolveGeminiApiKey: mocks.resolveGeminiApiKey }));

import { MultiAgentConsensusEngine, parseModelAudit } from "./consensusEngine";

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("ANTHROPIC_API_KEY", "");
  vi.stubEnv("GEMINI_API_KEY", "");
  mocks.resolveGeminiApiKey.mockReturnValue("fake-test-key");
  mocks.reserveAiRequest.mockResolvedValue(undefined);
  mocks.generateContent.mockResolvedValueOnce({ text: "Draft with caveats." })
    .mockResolvedValueOnce({ text: JSON.stringify({ passed: true, issues: [], notes: "Review suggests no issues." }) });
});
afterEach(() => vi.unstubAllEnvs());

describe("paid model consensus is advisory, never certified", () => {
  it("reserves each paid provider request BEFORE performing it", async () => {
    const result = await MultiAgentConsensusEngine.executeConsensusTask("Review my example", 42);
    expect(mocks.reserveAiRequest).toHaveBeenNthCalledWith(1, 42, "consensus:draft");
    expect(mocks.reserveAiRequest).toHaveBeenNthCalledWith(2, 42, "consensus:audit");
    expect(mocks.generateContent).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({
      status: "review_required", consensusPassed: false, modelAgreement: true,
      humanReviewRequired: true, independentlyVerified: false, deployed: false,
      auditedOutput: "Draft with caveats.", auditPersistence: "not_persisted",
      sealedAuditBlock: null,
    });
    expect(result.evidenceDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(result)).not.toContain("Verified against South African");
  });

  it("fails closed before any paid call when account/global reservation is denied", async () => {
    mocks.reserveAiRequest.mockRejectedValueOnce(new TRPCError({ code: "TOO_MANY_REQUESTS" }));
    await expect(MultiAgentConsensusEngine.executeConsensusTask("Review something", 9))
      .rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
    expect(mocks.generateContent).not.toHaveBeenCalled();
  });

  it("never starts audit if the second provider reservation is denied", async () => {
    mocks.reserveAiRequest.mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new TRPCError({ code: "SERVICE_UNAVAILABLE" }));
    await expect(MultiAgentConsensusEngine.executeConsensusTask("Review something", 9))
      .rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE" });
    expect(mocks.generateContent).toHaveBeenCalledTimes(1);
  });

  it("does not invent a successful draft when the first model fails", async () => {
    mocks.generateContent.mockReset().mockRejectedValue(new Error("vendor unavailable"));
    await expect(MultiAgentConsensusEngine.executeConsensusTask("A legal question", 9))
      .rejects.toMatchObject({ code: "BAD_GATEWAY" });
    expect(mocks.generateContent).toHaveBeenCalledTimes(1);
    expect(mocks.reserveAiRequest).toHaveBeenCalledTimes(1);
  });

  it("does not treat auditor timeout, empty text, or invalid JSON as APPROVED", async () => {
    for (const audit of [
      { text: "APPROVED" }, { text: "" }, { text: '{"passed":"true","issues":[],"notes":"okay"}' },
      { text: '{"passed":true,"issues":["missed critical issue"],"notes":"okay"}' },
    ]) {
      vi.clearAllMocks();
      mocks.generateContent.mockReset();
      mocks.reserveAiRequest.mockReset().mockResolvedValue(undefined);
      mocks.generateContent.mockResolvedValueOnce({ text: "Draft" }).mockResolvedValueOnce(audit);
      await expect(MultiAgentConsensusEngine.executeConsensusTask("Example", 42))
        .rejects.toMatchObject({ code: "BAD_GATEWAY" });
    }
    mocks.generateContent.mockReset().mockResolvedValueOnce({ text: "Draft" })
      .mockRejectedValueOnce(new Error("audit unavailable"));
    await expect(MultiAgentConsensusEngine.executeConsensusTask("Example", 42))
      .rejects.toMatchObject({ code: "BAD_GATEWAY" });
  });

  it("will not serve uncorrected content if a model flags an issue", async () => {
    mocks.generateContent.mockReset().mockResolvedValueOnce({ text: "Risky first draft" })
      .mockResolvedValueOnce({ text: JSON.stringify({
        passed: false, issues: ["Unverified tax rate"], notes: "Needs a specialist",
      }) });
    const result = await MultiAgentConsensusEngine.executeConsensusTask("Check calculation", 20);
    expect(result.consensusPassed).toBe(false);
    expect(result.modelAgreement).toBe(false);
    expect(result.auditedOutput).toBe("");
    expect(result.auditIssues).toContain("Unverified tax rate");
  });

  it("does not switch to a hidden third paid model when Anthropic fails", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "fake-anthropic-test");
    mocks.messagesCreate.mockRejectedValueOnce(new Error("model unavailable"));
    await expect(MultiAgentConsensusEngine.executeConsensusTask("Review contract", 43))
      .rejects.toMatchObject({ code: "BAD_GATEWAY" });
    expect(mocks.generateContent).toHaveBeenCalledTimes(1);
    expect(mocks.messagesCreate).toHaveBeenCalledTimes(1);
    expect(mocks.reserveAiRequest).toHaveBeenCalledTimes(2);
  });

  it("never trusts caller supplied actor labels or invalid task text", async () => {
    await expect(MultiAgentConsensusEngine.executeConsensusTask("task", 0))
      .rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(MultiAgentConsensusEngine.executeConsensusTask("", 5))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(MultiAgentConsensusEngine.executeConsensusTask("x".repeat(2001), 5))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.reserveAiRequest).not.toHaveBeenCalled();
  });

  it("blocks unconfigured providers before reserving tokens", async () => {
    mocks.resolveGeminiApiKey.mockReturnValue(undefined);
    await expect(MultiAgentConsensusEngine.executeConsensusTask("Review", 5))
      .rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE" });
    expect(mocks.reserveAiRequest).not.toHaveBeenCalled();
  });
});

describe("structured audit parsing", () => {
  it("accepts a limited, explicit JSON review without ever certifying it", () => {
    expect(parseModelAudit('{"passed":true,"issues":[],"notes":"Model-only review"}'))
      .toEqual({ passed: true, issues: [], notes: "Model-only review" });
  });
  it.each(["APPROVED", "garbage", "{}", '{"passed":true,"issues":["problem"],"notes":"wrong"}'])(
    "rejects ambiguous or contradictory audit: %s",
    (str) => expect(() => parseModelAudit(str)).toThrow()
  );
});
