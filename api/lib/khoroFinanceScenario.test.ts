import { describe, expect, it } from 'vitest';
import { evaluateKhoroFinanceRequest, KHORO_FINANCE_LIMITATIONS } from './khoroFinanceScenario';

describe('KHORO backend finance boundary', () => {
  const valid = { principalRand: 280000, annualRatePercent: 13.75, termMonths: 72, balloonPercent: 30 };
  it('returns a bounded scenario with explicit limitations', () => {
    const reply = evaluateKhoroFinanceRequest(valid);
    expect(reply.ok).toBe(true);
    if (!reply.ok) throw new Error('Unexpected rejection');
    expect(reply.result.balloonDueRand).toBe(84000);
    expect(reply.kind).toBe('ILLUSTRATIVE_FINANCE_SCENARIO');
    expect(reply.limitations).toEqual(KHORO_FINANCE_LIMITATIONS);
  });
  it.each([null, [], 'hello', {}, { ...valid, principalRand: '280000' },
    { ...valid, bankPassword: 'never store' }, { ...valid, termMonths: 0 },
    { ...valid, annualRatePercent: Infinity }, { ...valid, balloonPercent: 95 }])(
    'rejects malformed or excessive input without leaking content', value => {
      expect(evaluateKhoroFinanceRequest(value)).toEqual({ ok: false, error: 'INVALID_REQUEST' });
    });
});
