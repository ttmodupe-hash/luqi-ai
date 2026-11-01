import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { modelVehicleFinance } from '../src/lib/khoro-vehicle-finance';
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
            const r = modelVehicleFinance({ principalRand, annualRatePercent, termMonths, balloonPercent });
            expect(Object.values(r).every(Number.isFinite)).toBe(true);
            expect(r.totalInterestRand).toBeGreaterThanOrEqual(0);
            expect(r.monthlyInstalmentRand).toBeLessThanOrEqual(r.comparisonMonthlyInstalmentRand);
            expect(r.totalInterestRand + 0.01).toBeGreaterThanOrEqual(r.comparisonTotalInterestRand);
            let balance = principalRand;
            for (let month = 0; month < termMonths; month++) balance = balance * (1 + annualRatePercent / 1200) - r.monthlyInstalmentRand;
            const roundingBound = 0.005 * termMonths * (1 + annualRatePercent / 1200) ** termMonths + 0.02;
            expect(Math.abs(balance - r.balloonDueRand)).toBeLessThanOrEqual(roundingBound);
          });
        }
      }
    }
  }
  it.each(['lib/khoro-vehicle-finance.ts', 'components/KhoroVehicleFinanceScenario.tsx', 'components/KhoroExamConceptBridge.tsx', 'components/ConsumerRightsAssistant.tsx', 'pages/StudyDeskPage.tsx'])('preserves mirrored frontend parity: %s', path => {
    expect(readFileSync('src/' + path, 'utf8')).toBe(readFileSync('app/src/' + path, 'utf8'));
  });
});
