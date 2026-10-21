/**
 * Luqi-AI commercial guardrails.
 * Amounts are integer minor currency units. This module does not charge users.
 * The server must supply trusted usage and costs; never trust client estimates.
 */
export type AccessTier = "community" | "student" | "everyday" | "professional" | "enterprise" | "sponsored";
export type UsagePolicy = {
  tier: AccessTier;
  monthlyBudgetMinor: number;
  spentMinor: number;
  requestEstimateMinor: number;
  reserveMinor?: number;
};
export type BudgetDecision = {
  allowed: boolean;
  remainingMinor: number;
  reason: "within_budget" | "budget_exceeded" | "invalid_amount";
};

export function checkUsageBudget(policy: UsagePolicy): BudgetDecision {
  const { monthlyBudgetMinor, spentMinor, requestEstimateMinor } = policy;
  const reserveMinor = policy.reserveMinor ?? 0;
  const values = [monthlyBudgetMinor, spentMinor, requestEstimateMinor, reserveMinor];
  if (values.some((v) => !Number.isSafeInteger(v) || v < 0)) {
    return { allowed: false, remainingMinor: 0, reason: "invalid_amount" };
  }
  const remainingMinor = Math.max(0, monthlyBudgetMinor - spentMinor - reserveMinor);
  return {
    allowed: requestEstimateMinor <= remainingMinor,
    remainingMinor,
    reason: requestEstimateMinor <= remainingMinor ? "within_budget" : "budget_exceeded",
  };
}

/** Target prices for an operating margin, not a markup. */
export function minimumPriceMinor(fullyLoadedCostMinor: number, marginPercent = 15): number {
  if (!Number.isSafeInteger(fullyLoadedCostMinor) || fullyLoadedCostMinor < 0 ||
      !Number.isFinite(marginPercent) || marginPercent < 0 || marginPercent >= 100) {
    throw new RangeError("Invalid cost or margin");
  }
  return Math.ceil(fullyLoadedCostMinor / (1 - marginPercent / 100));
}

/** Plans vary by capacity; basic answer quality and safety must not vary by tier. */
export function tierFeatures(tier: AccessTier) {
  const advanced = tier === "professional" || tier === "enterprise";
  return {
    accurateAnswers: true,
    privacyControls: true,
    africanLanguageSupport: true,
    companionAccess: true,
    priorityProcessing: advanced,
    advancedSimulations: advanced,
  };
}
