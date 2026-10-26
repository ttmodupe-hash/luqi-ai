import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CURRENT_PILOT_ALLOCATION, reservationCapacity } from '../scripts/ai-capacity-scenarios.mjs';
describe('offline AI budget scenarios, never actual provider invoices', () => {
  it('preserves the approved production budget and its hard-coded reservation boundary', () => {
    assert.deepEqual(CURRENT_PILOT_ALLOCATION, {
      monthlyUsd: 100, geminiUsd: 60, openaiUsd: 40,
      reservationCentsPerAttempt: 10, maxAttemptsPerAccountPerUtcDay: 20,
    });
    const scenario = reservationCapacity(100, 1);
    assert.equal(scenario.primaryAttemptSlots, 600);
    assert.equal(scenario.fallbackAttemptSlots, 400);
    assert.equal(scenario.illustrativeSustainedDailyActives, 20);
    assert.equal(scenario.providerCostVerified, false);
    assert.equal(scenario.providerRepliesGuaranteed, false);
    assert.equal(scenario.operationalBudgetIncreaseApproved, false);
  });
  it('models more frequent usage conservatively without counting fallback as guaranteed capacity', () => {
    assert.equal(reservationCapacity(100, 3).illustrativeSustainedDailyActives, 6);
    assert.equal(reservationCapacity(250, 3).illustrativeSustainedDailyActives, 16);
    assert.equal(reservationCapacity(500, 3).illustrativeSustainedDailyActives, 33);
    assert.equal(reservationCapacity(1000, 3).illustrativeSustainedDailyActives, 66);
    assert.equal(reservationCapacity(1500, 3).illustrativeSustainedDailyActives, 100);
  });
  it('does not mistake attempts, registrations, reservations or models for actual bills', () => {
    for (const monthlyUsd of [100, 250, 500, 1000, 1500]) {
      const r = reservationCapacity(monthlyUsd, 1);
      assert.equal(r.geminiUsd + r.openaiUsd, monthlyUsd);
      assert.equal(r.basedOnReservationsNotBills, true);
      assert.equal(r.providerCostVerified, false);
      assert.equal(r.operationalBudgetIncreaseApproved, false);
    }
  });
  it('rejects invalid and speculative inputs', () => {
    for (const args of [[0, 1], [-1, 1], [100, 0], [100, 21], [100, 1, 0], [100, 1, 32], [100.1, 2], [Infinity, 1]]) {
      assert.throws(() => reservationCapacity(...args), /INVALID_SCENARIO/);
    }
  });
});
