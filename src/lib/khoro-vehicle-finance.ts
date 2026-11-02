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

export type VehicleFinanceComparison = {
  result: VehicleFinanceResult;
  monthlyReductionRand: number;
  additionalTotalRand: number;
  monthlyBalloonSetAsideRand: number;
};

/** Recompute from validated inputs; never trust a caller-supplied result. */
export function compareVehicleFinance(input: VehicleFinanceScenario): VehicleFinanceComparison {
  const result = modelVehicleFinance(input);
  // Reserve illustration rounds UP to a cent so rounding never leaves a shortfall.
  const balloonCents = Math.round(result.balloonDueRand * 100);
  return {
    result,
    monthlyReductionRand: roundCents(Math.max(0, result.comparisonMonthlyInstalmentRand - result.monthlyInstalmentRand)),
    additionalTotalRand: roundCents(Math.max(0, result.totalPaidRand - result.totalPaidWithoutBalloonRand)),
    monthlyBalloonSetAsideRand: Math.ceil(balloonCents / input.termMonths) / 100,
  };
}

/** Plain text generated on-device only after the user chooses Download. */
export function buildVehicleFinanceReport(input: VehicleFinanceScenario): string {
  const comparison = compareVehicleFinance(input);
  const r = comparison.result;
  const zar = (value: number) => 'R' + value.toFixed(2);
  return [
    'LUQI / KHORO - ILLUSTRATIVE VEHICLE FINANCE COMPARISON',
    'Calculator output, not a lender quote, affordability assessment or financial advice.',
    '',
    'YOUR SCENARIO',
    'Amount financed: ' + zar(input.principalRand),
    'Fixed annual nominal interest: ' + input.annualRatePercent + '%',
    'Repayment term: ' + input.termMonths + ' months',
    'Balloon: ' + input.balloonPercent + '% of amount financed',
    '',
    'WITH BALLOON',
    'Monthly instalment: ' + zar(r.monthlyInstalmentRand),
    'Separate final balloon: ' + zar(r.balloonDueRand),
    'Total interest: ' + zar(r.totalInterestRand),
    'Total repaid including balloon: ' + zar(r.totalPaidRand),
    '',
    'WITHOUT BALLOON',
    'Monthly instalment: ' + zar(r.comparisonMonthlyInstalmentRand),
    'Final balloon: R0.00',
    'Total interest: ' + zar(r.comparisonTotalInterestRand),
    'Total repaid: ' + zar(r.totalPaidWithoutBalloonRand),
    '',
    'UNDERSTAND THE DIFFERENCE',
    'Monthly instalment reduction: ' + zar(comparison.monthlyReductionRand),
    'Additional total repaid with balloon: ' + zar(comparison.additionalTotalRand),
    'Monthly balloon set-aside illustration: ' + zar(comparison.monthlyBalloonSetAsideRand),
    'The set-aside is separate from the loan instalment; it assumes no growth, fees or withdrawals and is rounded up to cents.',
    'A lower instalment is not proof that a loan costs less. No payment or saving is made by Luqi.',
    '',
    'ASSUMPTIONS AND LIMITATIONS',
    'Fixed annual nominal rate divided by 12; equal month-end repayments; balloon paid separately at term end.',
    'Excludes initiation/monthly fees, insurance, variable rates, arrears, penalties and contractual rounding.',
    'Displayed amounts are rounded to cents. Totals use unrounded instalments; displayed differences use rounded totals.',
    'Check your lender\'s written quote. This file does not establish eligibility or approval.',
    '',
    'PRIVACY',
    'Generated locally without an account or AI request. The downloaded file contains your entered amounts.',
    'Protect or delete the downloaded file on shared devices. Luqi does not upload this comparison.',
    '',
  ].join('\n');
}
