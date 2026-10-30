import { describe, expect, it } from 'vitest';
import { modelVehicleFinance } from './khoro-vehicle-finance';

describe('KHORO vehicle-finance scenarios', () => {
  it('models interest-free financing and a separately due balloon', () => {
    const r = modelVehicleFinance({principalRand:120000,annualRatePercent:0,termMonths:12,balloonPercent:30});
    expect(r.monthlyInstalmentRand).toBe(7000);
    expect(r.balloonDueRand).toBe(36000);
    expect(r.totalInterestRand).toBe(0);
    expect(r.comparisonMonthlyInstalmentRand).toBe(10000);
  });
  it('calculates conventional instalments with no balloon', () => {
    const r = modelVehicleFinance({principalRand:100000,annualRatePercent:12,termMonths:12,balloonPercent:0});
    expect(r.monthlyInstalmentRand).toBeCloseTo(8884.88, 1);
    expect(r.balloonDueRand).toBe(0);
    expect(r.comparisonTotalInterestRand).toBe(r.totalInterestRand);
  });
  it('shows the tradeoff between lower monthly instalment and more interest', () => {
    const r = modelVehicleFinance({principalRand:280000,annualRatePercent:13.75,termMonths:72,balloonPercent:30});
    expect(r.balloonDueRand).toBe(84000);
    expect(r.monthlyInstalmentRand).toBeLessThan(r.comparisonMonthlyInstalmentRand);
    expect(r.totalInterestRand).toBeGreaterThan(r.comparisonTotalInterestRand);
  });
  it.each([
    {principalRand:NaN,annualRatePercent:12,termMonths:72,balloonPercent:30},
    {principalRand:100000,annualRatePercent:-1,termMonths:72,balloonPercent:30},
    {principalRand:100000,annualRatePercent:12,termMonths:0,balloonPercent:30},
    {principalRand:100000,annualRatePercent:12,termMonths:72.5,balloonPercent:30},
    {principalRand:100000,annualRatePercent:12,termMonths:72,balloonPercent:101},
  ])('rejects invalid, misleading scenarios', scenario => {
    expect(() => modelVehicleFinance(scenario)).toThrow('INVALID_VEHICLE_FINANCE_SCENARIO');
  });
});
