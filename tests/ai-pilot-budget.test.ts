import { afterEach, describe, expect, it, vi } from "vitest";
import {
  assertPilotEnabled, budgetSnapshot, PILOT_CENTS, PILOT_TOTAL_CENTS,
  RESERVE_PER_ATTEMPT_CENTS, utcMonth, PilotBlocked
} from "../api/services/aiPilotBudget";
import { runBudgetedPilotChat } from "../api/services/aiPilotGateway";

afterEach(() => vi.unstubAllEnvs());
const approvals = {
  LUQI_AI_PROVIDER_ENABLED: "true",
  LUQI_AI_BILLING_APPROVED: "true",
  LUQI_AI_MONTHLY_USD: "50",
  LUQI_GEMINI_MONTHLY_USD: "30",
  LUQI_OPENAI_MONTHLY_USD: "20",
} as const;

describe("LUQI $50 monthly AI pilot allocation", () => {
  it("divides the cap into $30 Gemini and $20 OpenAI", () => {
    expect(PILOT_CENTS).toEqual({ gemini: 3000, openai: 2000 });
    expect(PILOT_TOTAL_CENTS).toBe(5000);
    expect(RESERVE_PER_ATTEMPT_CENTS).toBe(10);
    expect(budgetSnapshot(3000, "gemini")).toEqual({
      provider: "gemini", monthlyUsd: 30, reservedUsd: 30, remainingUsd: 0
    });
  });
  it("blocks by default even with an API key supplied", () => {
    vi.stubEnv("LUQI_PILOT_GEMINI_API_KEY", "fake-test-value");
    expect(() => assertPilotEnabled({})).toThrowError("AI_DISABLED");
  });
  it("requires separate verified billing authorization", () => {
    expect(() => assertPilotEnabled({
      ...approvals, LUQI_AI_BILLING_APPROVED: "false",
    })).toThrowError("BILLING_NOT_APPROVED");
  });
  it("refuses unexpected budget changes", () => {
    expect(() => assertPilotEnabled({
      ...approvals, LUQI_GEMINI_MONTHLY_USD: "300",
    })).toThrowError("AI_BUDGET_CONFIGURATION_INVALID");
    expect(() => assertPilotEnabled(approvals)).not.toThrow();
  });
  it("resets UTC month only at calendar boundary", () => {
    expect(utcMonth(new Date("2026-10-31T23:59:59Z"))).toBe("2026-10");
    expect(utcMonth(new Date("2026-11-01T00:00:00Z"))).toBe("2026-11");
  });
  it("returns no response without activation and never calls a provider", async () => {
    vi.stubEnv("LUQI_AI_PROVIDER_ENABLED", "false");
    await expect(runBudgetedPilotChat("hello")).rejects.toMatchObject({
      reason: "AI_DISABLED"
    } satisfies Partial<PilotBlocked>);
  });
});
