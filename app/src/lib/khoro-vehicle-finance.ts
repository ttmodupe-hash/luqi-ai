/** Illustrative fixed-rate, month-end payments; excludes fees and insurance. */
export type VehicleFinanceScenario = { principalRand: number; annualRatePercent: number; termMonths: number; balloonPercent: number };
export type VehicleFinanceResult = { monthlyInstalmentRand: number; balloonDueRand: number; totalPaidRand: number; totalInterestRand: number; totalPaidWithoutBalloonRand: number; comparisonMonthlyInstalmentRand: number; comparisonTotalInterestRand: number };
const roundCents = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
export function modelVehicleFinance(input: VehicleFinanceScenario): VehicleFinanceResult {
  const { principalRand: principal, annualRatePercent: rate, termMonths: months, balloonPercent } = input;
  if (![principal, rate, months, balloonPercent].every(Number.isFinite) || principal < 1000 || principal > 100000000 || rate < 0 || rate > 100 || !Number.isInteger(months) || months < 1 || months > 360 || balloonPercent < 0 || balloonPercent > 90) throw new RangeError('INVALID_VEHICLE_FINANCE_SCENARIO');
  const balloon = principal * balloonPercent / 100;
  const monthlyRate = rate / 1200;
  // log1p/expm1 avoid cancellation for very small positive rates.
  const instalmentFor = (endBalance: number) => monthlyRate === 0 ? (principal - endBalance) / months : (principal - endBalance) * (monthlyRate / -Math.expm1(-months * Math.log1p(monthlyRate))) + endBalance * monthlyRate;
  const monthly = instalmentFor(balloon), withoutBalloonMonthly = instalmentFor(0);
  const total = monthly * months + balloon, withoutBalloon = withoutBalloonMonthly * months;
  if (![monthly, withoutBalloonMonthly, total, withoutBalloon].every(Number.isFinite)) throw new RangeError('INVALID_VEHICLE_FINANCE_SCENARIO');
  return { monthlyInstalmentRand: roundCents(monthly), balloonDueRand: roundCents(balloon), totalPaidRand: roundCents(total), totalInterestRand: roundCents(Math.max(0, total-principal)), totalPaidWithoutBalloonRand: roundCents(withoutBalloon), comparisonMonthlyInstalmentRand: roundCents(withoutBalloonMonthly), comparisonTotalInterestRand: roundCents(Math.max(0, withoutBalloon-principal)) };
}
