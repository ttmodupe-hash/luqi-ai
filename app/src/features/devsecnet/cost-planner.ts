/** Exact decimal scenario arithmetic, not metering, a quote or a budget change. */
export interface CostAssumptions {
  visitors: string;
  requestsPerVisitor: string;
  localPercent: string;
  inputTokens: string;
  outputTokens: string;
  inputRateUsd: string;
  outputRateUsd: string;
  zarPerUsd: string;
  budgetUsd: string;
}
export interface CostScenario {
  interactions: number;
  cloudCalls: number;
  localInteractions: number;
  inputTokens: string;
  outputTokens: string;
  usd: string;
  zar: string;
  overBudget: boolean | null;
  assumptions: CostAssumptions;
  format: "luqi.devsecnet.cost-scenario.v1";
  measuredSpend: false;
}
const invalid = () => new Error("INVALID_COST_ASSUMPTIONS");
function integer(raw: string, min: number, max: number): number {
  if (typeof raw !== "string" || !/^(?:0|[1-9]\d{0,8})$/.test(raw))
    throw invalid();
  const n = Number(raw);
  if (n < min || n > max) throw invalid();
  return n;
}
function decimal(raw: string, positive = false): bigint {
  if (
    typeof raw !== "string" ||
    !/^(?:0|[1-9]\d{0,5})(?:\.\d{1,6})?$/.test(raw)
  )
    throw invalid();
  const [whole, fraction = ""] = raw.split(".");
  const n = BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, "0"));
  if (positive && n === 0n) throw invalid();
  return n;
}
const up = (n: bigint, d: bigint) => (n + d - 1n) / d;
const money = (cents: bigint) =>
  `${cents / 100n}.${(cents % 100n).toString().padStart(2, "0")}`;
export function planTokenCosts(v: CostAssumptions): CostScenario {
  const visitors = integer(v.visitors, 1, 1_000_000),
    requests = integer(v.requestsPerVisitor, 1, 1000),
    local = integer(v.localPercent, 0, 100);
  const input = integer(v.inputTokens, 0, 1_000_000),
    output = integer(v.outputTokens, 0, 1_000_000);
  if (input + output === 0) throw invalid();
  const inRate = decimal(v.inputRateUsd),
    outRate = decimal(v.outputRateUsd),
    fx = decimal(v.zarPerUsd, true);
  const budget = v.budgetUsd === "" ? null : decimal(v.budgetUsd);
  const total = visitors * requests,
    cloudCalls = Math.ceil((total * (100 - local)) / 100);
  const inputTotal = BigInt(cloudCalls) * BigInt(input),
    outputTotal = BigInt(cloudCalls) * BigInt(output);
  // Rates use micro-USD per million tokens, hence a 10^12 USD denominator.
  // Round the combined result up once to cents, not each request separately.
  const numerator = inputTotal * inRate + outputTotal * outRate;
  const assumptions = {
    visitors: v.visitors,
    requestsPerVisitor: v.requestsPerVisitor,
    localPercent: v.localPercent,
    inputTokens: v.inputTokens,
    outputTokens: v.outputTokens,
    inputRateUsd: v.inputRateUsd,
    outputRateUsd: v.outputRateUsd,
    zarPerUsd: v.zarPerUsd,
    budgetUsd: v.budgetUsd,
  };
  return {
    format: "luqi.devsecnet.cost-scenario.v1",
    interactions: total,
    cloudCalls,
    localInteractions: total - cloudCalls,
    inputTokens: inputTotal.toString(),
    outputTokens: outputTotal.toString(),
    usd: money(up(numerator, 10_000_000_000n)),
    zar: money(up(numerator * fx, 10_000_000_000_000_000n)),
    overBudget: budget === null ? null : numerator > budget * 1_000_000n,
    assumptions,
    measuredSpend: false,
  };
}
export const INITIAL_COST_ASSUMPTIONS: CostAssumptions = {
  visitors: "5000",
  requestsPerVisitor: "8",
  localPercent: "0",
  inputTokens: "400",
  outputTokens: "300",
  inputRateUsd: "",
  outputRateUsd: "",
  zarPerUsd: "",
  budgetUsd: "",
};
export const ILLUSTRATIVE_COST_ASSUMPTIONS: CostAssumptions = {
  ...INITIAL_COST_ASSUMPTIONS,
  inputRateUsd: "0.10",
  outputRateUsd: "0.40",
  zarPerUsd: "16.53",
};
