/** Offline reservation-capacity scenarios only. Never changes provider caps or bills. */
export const CURRENT_PILOT_ALLOCATION = Object.freeze({
  monthlyUsd: 100, geminiUsd: 60, openaiUsd: 40,
  reservationCentsPerAttempt: 10, maxAttemptsPerAccountPerUtcDay: 20,
});
export function reservationCapacity(monthlyUsd, attemptsPerDailyActive, days = 30) {
  if (![monthlyUsd, attemptsPerDailyActive, days].every(Number.isSafeInteger) ||
      monthlyUsd < 1 || monthlyUsd > 100000 ||
      attemptsPerDailyActive < 1 || attemptsPerDailyActive > 20 ||
      days < 1 || days > 31) throw new Error('INVALID_SCENARIO');
  const geminiUsd = Math.floor(monthlyUsd * 0.6);
  const openaiUsd = monthlyUsd - geminiUsd;
  const primaryAttemptSlots = Math.floor(geminiUsd * 100 / CURRENT_PILOT_ALLOCATION.reservationCentsPerAttempt);
  const fallbackAttemptSlots = Math.floor(openaiUsd * 100 / CURRENT_PILOT_ALLOCATION.reservationCentsPerAttempt);
  return Object.freeze({
    monthlyUsd, geminiUsd, openaiUsd, attemptsPerDailyActive, days,
    primaryAttemptSlots, fallbackAttemptSlots,
    illustrativeSustainedDailyActives: Math.floor(primaryAttemptSlots / (attemptsPerDailyActive * days)),
    basedOnReservationsNotBills: true,
    providerCostVerified: false,
    providerRepliesGuaranteed: false,
    operationalBudgetIncreaseApproved: false,
  });
}
