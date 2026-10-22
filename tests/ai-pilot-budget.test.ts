import { afterEach, describe, expect, it, vi } from "vitest";
import {
  assertPilotEnabled, budgetSnapshot, PILOT_CENTS, PILOT_TOTAL_CENTS,
  RESERVE_PER_ATTEMPT_CENTS, PILOT_USER_DAILY_MAX_ATTEMPTS, utcDay, utcMonth, PilotBlocked
} from "../api/services/aiPilotBudget";
import { runBudgetedPilotChat } from "../api/services/aiPilotGateway";

afterEach(() => vi.unstubAllEnvs());
const approvals = {
  LUQI_AI_PROVIDER_ENABLED: "true",
  LUQI_AI_BILLING_APPROVED: "true",
  LUQI_AI_MONTHLY_USD: "100",
  LUQI_GEMINI_MONTHLY_USD: "60",
  LUQI_OPENAI_MONTHLY_USD: "40",
} as const;

describe("LUQI $100 monthly AI pilot allocation", () => {
  it("divides the cap into $60 Gemini and $40 OpenAI", () => {
    expect(PILOT_CENTS).toEqual({ gemini: 6000, openai: 4000 });
    expect(PILOT_TOTAL_CENTS).toBe(10000);
    expect(RESERVE_PER_ATTEMPT_CENTS).toBe(10);
    expect(budgetSnapshot(6000, "gemini")).toEqual({
      provider: "gemini", monthlyUsd: 60, reservedUsd: 60, remainingUsd: 0
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
  it("limits every authenticated user to 20 reserved attempts daily", () => {
    expect(PILOT_USER_DAILY_MAX_ATTEMPTS).toBe(20);
    expect(utcDay(new Date("2026-10-22T23:59:59Z"))).toBe("2026-10-22");
    expect(utcDay(new Date("2026-10-23T00:00:00Z"))).toBe("2026-10-23");
  });
  it("resets UTC month only at calendar boundary", () => {
    expect(utcMonth(new Date("2026-10-31T23:59:59Z"))).toBe("2026-10");
    expect(utcMonth(new Date("2026-11-01T00:00:00Z"))).toBe("2026-11");
  });
  it("returns no response without activation and never calls a provider", async () => {
    vi.stubEnv("LUQI_AI_PROVIDER_ENABLED", "false");
    await expect(runBudgetedPilotChat("hello", 1)).rejects.toMatchObject({
      reason: "AI_DISABLED"
    } satisfies Partial<PilotBlocked>);
  });
  it("keeps the gateway disabled even if payment is merely planned", async () => {
    vi.stubEnv("LUQI_AI_PROVIDER_ENABLED", "false");
    vi.stubEnv("LUQI_AI_BILLING_APPROVED", "false");
    vi.stubEnv("LUQI_PILOT_GEMINI_API_KEY", "test-not-live");
    await expect(runBudgetedPilotChat("Give me a greeting", 1)).rejects.toMatchObject({
      reason: "AI_DISABLED",
    });
  });
  it("denies the pilot if configured keys cannot use a durable MySQL ledger", async () => {
    for (const [name,value] of Object.entries(approvals)) vi.stubEnv(name, value);
    vi.stubEnv("LUQI_PILOT_GEMINI_API_KEY", "test-not-live");
    vi.stubEnv("LUQI_PILOT_OPENAI_API_KEY", "");
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("DB_HOST", "");
    await expect(runBudgetedPilotChat("How are you?", 1)).rejects.toMatchObject({
      reason: "AI_BUDGET_STORE_UNAVAILABLE",
    });
  });

});
