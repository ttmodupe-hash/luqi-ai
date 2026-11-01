import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { modelVehicleFinance, compareVehicleFinance, buildVehicleFinanceReport } from '../src/lib/khoro-vehicle-finance';
// Include the original scenarios and backend-boundary tests in this explicit CI gate.
import '../src/lib/khoro-vehicle-finance.test';
import '../api/lib/khoroFinanceScenario.test';

describe('KHORO additive release regressions', () => {
  it('handles very small positive interest without cancellation or infinite results', () => {
    const result = modelVehicleFinance({ principalRand: 120000, annualRatePercent: 1e-12, termMonths: 12, balloonPercent: 30 });
    expect(result.monthlyInstalmentRand).toBe(7000);
    expect(result.totalInterestRand).toBe(0);
    expect(Object.values(result).every(Number.isFinite)).toBe(true);
  });
  for (const principalRand of [1000, 100000, 280000, 100000000]) {
    for (const annualRatePercent of [0, 1e-12, 0.01, 12, 13.75, 100]) {
      for (const termMonths of [1, 12, 72, 360]) {
        for (const balloonPercent of [0, 30, 90]) {
          it(`keeps amortisation consistent: ${principalRand}/${annualRatePercent}/${termMonths}/${balloonPercent}`, () => {
            const input = { principalRand, annualRatePercent, termMonths, balloonPercent };
            const r = modelVehicleFinance(input);
            expect(Object.values(r).every(Number.isFinite)).toBe(true);
            expect(r.totalInterestRand).toBeGreaterThanOrEqual(0);
            expect(r.monthlyInstalmentRand).toBeLessThanOrEqual(r.comparisonMonthlyInstalmentRand);
            expect(r.totalInterestRand + 0.01).toBeGreaterThanOrEqual(r.comparisonTotalInterestRand);
            let balance = principalRand;
            for (let month = 0; month < termMonths; month++) balance = balance * (1 + annualRatePercent / 1200) - r.monthlyInstalmentRand;
            const roundingBound = 0.005 * termMonths * (1 + annualRatePercent / 1200) ** termMonths + 0.02;
            expect(Math.abs(balance - r.balloonDueRand)).toBeLessThanOrEqual(roundingBound);
            const comparison = compareVehicleFinance(input);
            expect(comparison.monthlyReductionRand).toBeGreaterThanOrEqual(0);
            expect(comparison.additionalTotalRand).toBeGreaterThanOrEqual(0);
            expect(comparison.monthlyBalloonSetAsideRand * termMonths + 1e-7).toBeGreaterThanOrEqual(r.balloonDueRand);
            expect(comparison.monthlyBalloonSetAsideRand * termMonths - r.balloonDueRand).toBeLessThan(0.01 * termMonths + 1e-7);
            const report = buildVehicleFinanceReport(input);
            expect(report).toContain('Total repaid including balloon: R' + r.totalPaidRand.toFixed(2));
            expect(report).not.toMatch(/NaN|Infinity|undefined/);
          });
        }
      }
    }
  }
  it.each(['lib/khoro-vehicle-finance.ts', 'components/KhoroVehicleFinanceScenario.tsx', 'components/KhoroExamConceptBridge.tsx', 'components/ConsumerRightsAssistant.tsx', 'pages/StudyDeskPage.tsx'])('preserves mirrored frontend parity: %s', path => {
    expect(readFileSync('src/' + path, 'utf8')).toBe(readFileSync('app/src/' + path, 'utf8'));
  });
});

describe('local finance explanations and downloads', () => {
  const input = { principalRand: 120000, annualRatePercent: 0, termMonths: 12, balloonPercent: 30 };
  it('separates lower instalments from total cost and the separate final balloon', () => {
    const comparison = compareVehicleFinance(input);
    expect(comparison.monthlyReductionRand).toBe(3000);
    expect(comparison.additionalTotalRand).toBe(0);
    expect(comparison.monthlyBalloonSetAsideRand).toBe(3000);
    const report = buildVehicleFinanceReport(input);
    expect(report).toContain('Monthly instalment: R7000.00');
    expect(report).toContain('Separate final balloon: R36000.00');
    expect(report).toContain('Total repaid including balloon: R120000.00');
    expect(report).toContain('Monthly instalment: R10000.00');
    expect(report).toContain('Additional total repaid with balloon: R0.00');
  });
  it('shows the added total cost at positive interest rather than calling a lower instalment a saving', () => {
    const comparison = compareVehicleFinance({ ...input, annualRatePercent: 13.75 });
    expect(comparison.monthlyReductionRand).toBeGreaterThan(0);
    expect(comparison.additionalTotalRand).toBeGreaterThan(0);
  });
  it('does not invent a balloon reserve or difference when no balloon is selected', () => {
    const comparison = compareVehicleFinance({ ...input, annualRatePercent: 13.75, balloonPercent: 0 });
    expect(comparison.monthlyReductionRand).toBe(0);
    expect(comparison.additionalTotalRand).toBe(0);
    expect(comparison.monthlyBalloonSetAsideRand).toBe(0);
  });
  it('rounds the monthly set-aside upwards, not below the balloon', () => {
    expect(compareVehicleFinance({ principalRand: 1000, annualRatePercent: 0, termMonths: 3, balloonPercent: 10 }).monthlyBalloonSetAsideRand).toBe(33.34);
  });
  it('exports fresh inputs, exclusions, rounding and shared-device warnings', () => {
    const report = buildVehicleFinanceReport({ ...input, principalRand: 240000 });
    expect(report).toContain('Amount financed: R240000.00');
    expect(report).toContain('Monthly instalment: R14000.00');
    expect(report).toContain('Excludes initiation/monthly fees, insurance');
    expect(report).toContain('Totals use unrounded instalments');
    expect(report).toContain('Protect or delete the downloaded file on shared devices');
    expect(report).toContain('no growth, fees or withdrawals');
    expect(report).toBe(buildVehicleFinanceReport({ ...input, principalRand: 240000 }));
  });
  it.each([{ ...input, principalRand: NaN }, { ...input, principalRand: 0 }, { ...input, annualRatePercent: Infinity }, { ...input, termMonths: 12.5 }, { ...input, balloonPercent: 91 }])('rejects invalid report inputs rather than exporting stale results', invalid => {
    expect(() => compareVehicleFinance(invalid)).toThrow();
    expect(() => buildVehicleFinanceReport(invalid)).toThrow();
  });
});
