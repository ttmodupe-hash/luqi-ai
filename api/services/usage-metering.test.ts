import { describe, expect, it } from "vitest";
import { buildUsageReceipt, calculateProviderCostMinor, preflightUsageAllowance } from "./usage-metering";

describe("provider cost metering", () => {
  it("accounts for input and output tokens independently", () => {
    expect(calculateProviderCostMinor({
      inputTokens: 1_000_000, outputTokens: 1_000_000,
      pricePerMillionInputMinor: 100, pricePerMillionOutputMinor: 500,
    })).toBe(600);
  });
  it("rounds tiny costs upward rather than losing charges", () => {
    expect(calculateProviderCostMinor({
      inputTokens: 1, outputTokens: 0,
      pricePerMillionInputMinor: 1, pricePerMillionOutputMinor: 1,
    })).toBe(1);
  });
  it("rejects invalid token counts", () => {
    expect(() => calculateProviderCostMinor({
      inputTokens: -1, outputTokens: 0,
      pricePerMillionInputMinor: 100, pricePerMillionOutputMinor: 100,
    })).toThrow(RangeError);
  });
  it("creates an attributable usage receipt", () => {
    expect(buildUsageReceipt({
      userId: 7, tier: "student", requestId: "request-1",
      provider: "example", model: "economy", inputTokens: 1000,
      outputTokens: 1000, pricePerMillionInputMinor: 1000,
      pricePerMillionOutputMinor: 2000,
    })).toMatchObject({ userId: 7, requestId: "request-1", costMinor: 3 });
  });
  it("denies requests that exceed available monthly capacity", () => {
    expect(preflightUsageAllowance({
      tier: "community", budgetMinor: 100, spentMinor: 70,
      reservedMinor: 20, estimatedCostMinor: 11,
    }).allowed).toBe(false);
  });
});
