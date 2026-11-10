/**
 * Browser-local, non-predictive educational credit-habits exercise.
 * Not an authorised bureau score, lending assessment or prescription finding.
 * No persistence, network access, user identifiers or provider requests.
 */
export type CreditAiTopic = 'understand-report' | 'dispute-record' | 'prescription-questions';

export type CreditHabitInputs = {
  onTimePercent: number;
  arrearsCount: number;
  utilizationPercent: number;
  adverseRecords: number;
  historyYears: number;
  enquiries90d: number;
};

export const CREDIT_EXAMPLE: Readonly<CreditHabitInputs> = Object.freeze({
  onTimePercent: 90,
  arrearsCount: 0,
  utilizationPercent: 30,
  adverseRecords: 0,
  historyYears: 3,
  enquiries90d: 1,
});

const clamp = (number: number) => Math.max(0, Math.min(1, number));
const valid = (number: number, low: number, high: number) =>
  Number.isFinite(number) && number >= low && number <= high;
const whole = (number: number, maximum: number) =>
  Number.isInteger(number) && valid(number, 0, maximum);

export type CreditHabitResult = {
  /** Custom educational index, NEVER a bureau score or approval prediction. */
  index: number;
  pillars: {
    payment: number;
    utilization: number;
    adverse: number;
    history: number;
    enquiries: number;
  };
};

export function creditHabitExercise(inputs: CreditHabitInputs): CreditHabitResult | null {
  if (!inputs || !valid(inputs.onTimePercent, 0, 100) ||
      !whole(inputs.arrearsCount, 24) || !valid(inputs.utilizationPercent, 0, 200) ||
      !whole(inputs.adverseRecords, 20) || !valid(inputs.historyYears, 0, 70) ||
      !whole(inputs.enquiries90d, 30)) return null;

  const revolvingRatio = inputs.utilizationPercent / 100;
  const pillars = {
    payment: clamp(inputs.onTimePercent / 100 - 0.08 * inputs.arrearsCount),
    // Continuous at 30% (the source proposal had an unexplained 0.11 jump).
    utilization: clamp(revolvingRatio <= 0.30
      ? 1 - 0.11 * (revolvingRatio / 0.30)
      : 0.89 - 1.04 * (revolvingRatio - 0.30)),
    adverse: clamp(1 - 0.50 * inputs.adverseRecords),
    history: clamp(inputs.historyYears / 7),
    enquiries: clamp(1 - 0.22 * Math.max(0, inputs.enquiries90d - 1)),
  };
  const composite = 0.35 * pillars.payment + 0.30 * pillars.utilization +
    0.15 * pillars.adverse + 0.10 * pillars.history + 0.10 * pillars.enquiries;
  return { index: Math.round(clamp(composite) * 100), pillars };
}

/** Neutral, non-personal starter: never embed numeric inputs or private reports in the handoff. */
export function creditAiStarter(topic: CreditAiTopic): string {
  switch (topic) {
    case 'understand-report':
      return 'Help me understand a South African consumer credit report. Explain how to get and verify my own real report with TransUnion, Experian or XDS. Do not invent a bureau score, predict approval or ask for ID numbers, account details or raw reports. Give a source-checkable general checklist, not personal financial advice.';
    case 'dispute-record':
      return 'Explain a South African credit-bureau dispute under National Credit Act section 72 and Regulation 20, including the general 20-business-day investigation requirement and when to contact the National Credit Regulator. Help me prepare a neutral factual outline using placeholders only. Do not invent facts, file a dispute, or request private identity and account details.';
    case 'prescription-questions':
      return 'Explain South African National Credit Act section 126B and the Prescription Act as general information. List key facts a qualified adviser would verify, including the type of debt, acknowledgements, court processes and any judgment. Do not conclude my debt is prescribed, promise deletion, tell me to stop paying or submit a claim. Refer me to original sources.';
    default: {
      // Exhaustiveness/fail-closed: avoid sending a surprising prompt if an unknown value arrives.
      return 'Explain where to find reliable South African consumer-credit information. Do not invent official scores or legal conclusions.';
    }
  }
}
