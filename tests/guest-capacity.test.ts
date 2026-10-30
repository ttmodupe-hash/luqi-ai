import { describe, it, expect } from 'vitest';
import { guestCapacity, guestNetworkId, guestQuotaStatus, guestTrialEnabled } from '../api/services/guestTrialBudget';
const env = { LUQI_GUEST_CHAT_ENABLED: 'true', JWT_SECRET: 'x'.repeat(40), LUQI_PILOT_GEMINI_API_KEY: 'fixture',
  LUQI_AI_PROVIDER_ENABLED: 'true', LUQI_AI_BILLING_APPROVED: 'true',
  LUQI_AI_MONTHLY_USD: '300', LUQI_GEMINI_MONTHLY_USD: '165', LUQI_OPENAI_MONTHLY_USD: '135',
  LUQI_GUEST_CAPACITY_PROFILE: 'public-1000-v1', LUQI_GUEST_TRUST_RAILWAY_PROXY: 'true' };
describe('capacity and privacy contract', () => {
  it('leaves existing live pilot capacity unchanged without a separate rollout', () => {
    expect(guestCapacity({})).toMatchObject({ monthly: 100, daily: 12, cents: 10, budget: 1000 });
  });
  it('supports 1000 full three-turn trials inside USD30 and the approved Gemini allocation', () => {
    const capacity = guestCapacity(env);
    expect(capacity.monthly).toBe(1000 * 3); expect(capacity.daily).toBe(3000);
    expect(capacity.monthly * capacity.cents).toBe(capacity.budget);
    expect(capacity.budget).toBeLessThan(16500);
    expect(guestQuotaStatus(2, 2999, 2999, capacity).enabled).toBe(true);
    expect(guestQuotaStatus(0, 3000, 0, capacity).enabled).toBe(false);
    expect(guestQuotaStatus(3, 10, 10, capacity).reason).toBe('complete');
  });
  it('fails closed for typos, missing proxy trust, unapproved budget or disabled trial', () => {
    for (const change of [{ LUQI_GUEST_CAPACITY_PROFILE: 'unlimited' },
      { LUQI_GUEST_TRUST_RAILWAY_PROXY: undefined }, { LUQI_AI_MONTHLY_USD: '301' },
      { LUQI_GUEST_CHAT_ENABLED: 'false' }]) expect(guestTrialEnabled({ ...env, ...change })).toBe(false);
  });
  it('rotates network pseudonyms daily, canonicalizes IPv6, and separates namespaces', () => {
    const now = new Date('2026-10-30T12:00:00Z'), secret = env.JWT_SECRET;
    const a = guestNetworkId('192.0.2.1', secret, now);
    expect(a).toBeLessThanOrEqual(-(2 ** 49)); expect(a).toBeGreaterThan(-(2 ** 50));
    expect(guestNetworkId('192.0.2.1', secret, new Date('2026-10-31'))).not.toBe(a);
    expect(guestNetworkId('2001:db8::1', secret, now)).toBe(guestNetworkId('2001:0db8:0:0:0:0:0:1', secret, now));
    expect(() => guestNetworkId('192.0.2.1, 192.0.2.2', secret, now)).toThrow();
    expect(() => guestNetworkId(undefined, secret, now)).toThrow();
  });
});
