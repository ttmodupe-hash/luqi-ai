import { checkUsageBudget, type AccessTier } from "./affordability-policy";

/** Provider-side metering inputs must come from a trusted response, never the browser. */
export type MeteredUsage = {
  userId: number;
  tier: AccessTier;
  requestId: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  pricePerMillionInputMinor: number;
  pricePerMillionOutputMinor: number;
};

export type UsageReceipt = {
  userId: number;
  tier: AccessTier;
  requestId: string;
  provider: string;
  model: string;
  costMinor: number;
  inputTokens: number;
  outputTokens: number;
};

/** Conservatively round fractional minor units upward. */
export function calculateProviderCostMinor(usage: Pick<MeteredUsage,
  "inputTokens" | "outputTokens" | "pricePerMillionInputMinor" | "pricePerMillionOutputMinor">): number {
  const amounts = [usage.inputTokens, usage.outputTokens, usage.pricePerMillionInputMinor, usage.pricePerMillionOutputMinor];
  if (amounts.some((n) => !Number.isSafeInteger(n) || n < 0)) {
    throw new RangeError("Token counts and unit prices must be nonnegative safe integers");
  }
  const raw = (usage.inputTokens * usage.pricePerMillionInputMinor +
    usage.outputTokens * usage.pricePerMillionOutputMinor) / 1_000_000;
  if (!Number.isSafeInteger(Math.ceil(raw))) throw new RangeError("Usage cost overflow");
  return Math.ceil(raw);
}

export function buildUsageReceipt(usage: MeteredUsage): UsageReceipt {
  if (!Number.isSafeInteger(usage.userId) || usage.userId <= 0 ||
      !usage.requestId.trim() || !usage.provider.trim() || !usage.model.trim()) {
    throw new RangeError("Invalid metering identity");
  }
  return {
    userId: usage.userId, tier: usage.tier, requestId: usage.requestId,
    provider: usage.provider, model: usage.model,
    inputTokens: usage.inputTokens, outputTokens: usage.outputTokens,
    costMinor: calculateProviderCostMinor(usage),
  };
}

/**
 * Preflight check only. Real enforcement must atomically reserve spend in a
 * persistent ledger before sending a provider request, then reconcile the
 * reservation against the provider's reported token usage.
 */
export function preflightUsageAllowance(args: {
  tier: AccessTier; budgetMinor: number; spentMinor: number;
  estimatedCostMinor: number; reservedMinor: number;
}) {
  return checkUsageBudget({
    tier: args.tier,
    monthlyBudgetMinor: args.budgetMinor,
    spentMinor: args.spentMinor,
    requestEstimateMinor: args.estimatedCostMinor,
    reserveMinor: args.reservedMinor,
  });
}
