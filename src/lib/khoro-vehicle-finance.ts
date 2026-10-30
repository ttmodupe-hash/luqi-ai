/**
 * KHORO-in-Luqi vehicle finance scenario model.
 * Pure, offline arithmetic: no account, provider, persistence or request access.
 * Illustrative fixed-interest amortisation only; excludes fees, insurance,
 * payment dates, rate changes, arrears, penalties and contractual rounding.
 */
export type VehicleFinanceScenario = {
  principalRand: number;
  annualRatePercent: number;
  termMonths: number;
  balloonPercent: number;
};
export type VehicleFinanceResult = {
  monthlyInstalmentRand: number;
  balloonDueRand: number;
  totalPaidRand: number;
  totalInterestRand: number;
  totalPaidWithoutBalloonRand: number;
  comparisonMonthlyInstalmentRand: number;
  comparisonTotalInterestRand: number;
};
const roundCents = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
export function modelVehicleFinance(input: VehicleFinanceScenario): VehicleFinanceResult {
  const { principalRand: principal, annualRatePercent: rate, termMonths: months, balloonPercent } = input;
  if (
    ![principal, rate, months, balloonPercent].every(Number.isFinite) ||
    principal < 1_000 || principal > 100_000_000 ||
    rate < 0 || rate > 100 ||
    !Number.isInteger(months) || months < 1 || months > 360 ||
    balloonPercent < 0 || balloonPercent > 90
  ) throw new RangeError('INVALID_VEHICLE_FINANCE_SCENARIO');
  const balloon = principal * balloonPercent / 100;
  const monthlyRate = rate / 1200;
  const instalmentFor = (endBalance: number) =>
    monthlyRate === 0
      ? (principal - endBalance) / months
      : (principal - endBalance / Math.pow(1 + monthlyRate, months)) *
        monthlyRate / (1 - Math.pow(1 + monthlyRate, -months));
  const monthly = instalmentFor(balloon);
  const withoutBalloonMonthly = instalmentFor(0);
  if (![monthly, withoutBalloonMonthly].every(Number.isFinite)) throw new RangeError('INVALID_VEHICLE_FINANCE_SCENARIO');
  const total = monthly * months + balloon;
  const withoutBalloon = withoutBalloonMonthly * months;
  return {
    monthlyInstalmentRand: roundCents(monthly),
    balloonDueRand: roundCents(balloon),
    totalPaidRand: roundCents(total),
    totalInterestRand: roundCents(total - principal),
    totalPaidWithoutBalloonRand: roundCents(withoutBalloon),
    comparisonMonthlyInstalmentRand: roundCents(withoutBalloonMonthly),
    comparisonTotalInterestRand: roundCents(withoutBalloon - principal),
  };
}
