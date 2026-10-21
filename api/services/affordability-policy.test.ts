import { describe, expect, it } from "vitest";
import { checkUsageBudget, minimumPriceMinor, tierFeatures } from "./affordability-policy";

describe("Luqi-AI affordability policy", () => {
  it("permits spending exactly within the budget", () => {
    expect(checkUsageBudget({ tier: "student", monthlyBudgetMinor: 1000, spentMinor: 800, requestEstimateMinor: 200 }).allowed).toBe(true);
  });
  it("blocks over-budget requests without charging the user", () => {
    expect(checkUsageBudget({ tier: "community", monthlyBudgetMinor: 100, spentMinor: 90, requestEstimateMinor: 11 }).reason).toBe("budget_exceeded");
  });
  it("reserves headroom for unbilled costs", () => {
    expect(checkUsageBudget({ tier: "everyday", monthlyBudgetMinor: 1000, spentMinor: 700, reserveMinor: 200, requestEstimateMinor: 101 }).allowed).toBe(false);
  });
  it("rejects invalid or fractional money values", () => {
    expect(checkUsageBudget({ tier: "enterprise", monthlyBudgetMinor: 100, spentMinor: -1, requestEstimateMinor: 1 }).reason).toBe("invalid_amount");
  });
  it("prices a 15 percent margin correctly", () => {
    expect(minimumPriceMinor(8500, 15)).toBe(10000);
    expect(() => minimumPriceMinor(100, 100)).toThrow(RangeError);
  });
  it("keeps universal answer and privacy standards across plans", () => {
    for (const tier of ["community", "student", "everyday", "professional", "enterprise", "sponsored"] as const) {
      expect(tierFeatures(tier)).toMatchObject({ accurateAnswers: true, privacyControls: true, africanLanguageSupport: true });
    }
    expect(tierFeatures("professional").priorityProcessing).toBe(true);
  });
});
