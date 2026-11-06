import { describe, expect, it } from 'vitest';
import {
  CREDIT_EXAMPLE, creditHabitExercise, creditAiStarter,
} from '../src/lib/credit-ai-coach';
import {
  creditHabitExercise as mirroredExercise,
  creditAiStarter as mirroredStarter,
} from '../app/src/lib/credit-ai-coach';

describe('browser-local educational credit coach', () => {
  it('never exposes simulated numbers as official bureau score scales', () => {
    const result = creditHabitExercise({ ...CREDIT_EXAMPLE });
    expect(result).not.toBeNull();
    expect(result!.index).toBeGreaterThanOrEqual(0);
    expect(result!.index).toBeLessThanOrEqual(100);
    expect(result).toEqual(mirroredExercise({ ...CREDIT_EXAMPLE }));
    expect('transunion' in result!).toBe(false);
    expect('experian' in result!).toBe(false);
  });

  it('makes utilisation continuous at 30% and penalises higher usage, not less', () => {
    const result = (utilizationPercent: number) => creditHabitExercise({
      ...CREDIT_EXAMPLE, utilizationPercent,
    })!;
    expect(result(30).pillars.utilization).toBeCloseTo(0.89, 10);
    expect(Math.abs(result(30.000001).pillars.utilization - result(30).pillars.utilization)).toBeLessThan(0.00001);
    expect(result(70).index).toBeLessThan(result(30).index);
    expect(result(100).index).toBeLessThanOrEqual(result(70).index);
  });

  it('is monotonic as payments improve or negative events increase', () => {
    const base = creditHabitExercise({ ...CREDIT_EXAMPLE })!;
    expect(creditHabitExercise({ ...CREDIT_EXAMPLE, onTimePercent: 100 })!.index).toBeGreaterThanOrEqual(base.index);
    expect(creditHabitExercise({ ...CREDIT_EXAMPLE, arrearsCount: 3 })!.index).toBeLessThan(base.index);
    expect(creditHabitExercise({ ...CREDIT_EXAMPLE, adverseRecords: 2 })!.index).toBeLessThan(base.index);
    expect(creditHabitExercise({ ...CREDIT_EXAMPLE, enquiries90d: 8 })!.index).toBeLessThan(base.index);
  });

  it('rejects invalid numbers, including NaN, infinity and fractional event counts', () => {
    const invalid = [
      { onTimePercent: Number.NaN }, { onTimePercent: 101 },
      { utilizationPercent: -1 }, { utilizationPercent: Number.POSITIVE_INFINITY },
      { arrearsCount: -1 }, { arrearsCount: 1.5 }, { adverseRecords: 2.5 },
      { historyYears: -1 }, { enquiries90d: 31 },
    ] as const;
    for (const override of invalid) expect(creditHabitExercise({ ...CREDIT_EXAMPLE, ...override })).toBeNull();
  });

  it('prepares neutral AI questions; never includes slider data or issues a model request', () => {
    for (const topic of ['understand-report', 'dispute-record', 'prescription-questions'] as const) {
      const question = creditAiStarter(topic);
      expect(question.length).toBeGreaterThan(80);
      expect(question.length).toBeLessThan(1000);
      expect(question).toBe(mirroredStarter(topic));
      expect(question).not.toMatch(/Bearer |Authorization:|@\w+\.|customerToken/i);
    }
    expect(creditAiStarter('dispute-record')).toContain('section 72');
    expect(creditAiStarter('prescription-questions')).toContain('126B');
    expect(creditAiStarter('understand-report')).toContain('Do not invent');
  });
});
