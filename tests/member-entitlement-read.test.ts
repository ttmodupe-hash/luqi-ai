import { describe, expect, it, vi } from 'vitest';
import { readMemberEligibility } from '../api/services/memberEntitlementRead';

describe('unattached paid-membership candidate stays default-deny', () => {
  it('makes no database request and returns no tier when disabled by default', async () => {
    const query = vi.fn(() => { throw new Error('must not access DB'); });
    const result = await readMemberEligibility(123, {
      environment: { LUQI_MEMBER_ENTITLEMENTS_ENABLED: 'false' },
      pool: { execute: query } as never,
    });
    expect(result).toEqual({ allowed: false, tier: null,
      expiresAtUtc: null, reason: 'disabled' });
    expect(query).not.toHaveBeenCalled();
  });

  it('rejects invalid owner IDs without consulting payment records', async () => {
    const query = vi.fn();
    for (const owner of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      const result = await readMemberEligibility(owner, {
        environment: { LUQI_MEMBER_ENTITLEMENTS_ENABLED: 'true' },
        pool: { execute: query } as never,
        nowUtc: new Date('2026-10-25T12:00:00Z'),
      });
      expect(result.allowed).toBe(false);
    }
    expect(query).not.toHaveBeenCalled();
  });

  it('refuses non-real, unusable and overlapping records even if the opt-in flag is true', async () => {
    const now = new Date('2026-10-25T12:00:00Z');
    const fakePool = (rows: unknown) =>
      ({ execute: vi.fn(async () => [rows, []]) }) as never;
    for (const rows of [
      [{ tier: 'enterprise', expires_at: '2026-11-01T12:00:00.000000Z' }],
      [{ tier: 'starter', expires_at: '2030-11-01T12:00:00Z' }],
      [{ tier: 'creator', expires_at: '2026-10-25T11:00:00.000000Z' }],
      [
        { tier: 'starter', expires_at: '2026-11-01T12:00:00.000000Z' },
        { tier: 'creator', expires_at: '2026-11-01T12:00:00.000000Z' },
      ],
    ]) {
      expect((await readMemberEligibility(123, {
        environment: { LUQI_MEMBER_ENTITLEMENTS_ENABLED: 'true' },
        pool: fakePool(rows), nowUtc: now,
      })).allowed).toBe(false);
    }
  });

  it('reports missing or failed database reads as unavailable, never as zero billing or paid access', async () => {
    const pool = { execute: vi.fn(async () => { throw new Error('private DB error'); }) } as never;
    const result = await readMemberEligibility(123, {
      environment: { LUQI_MEMBER_ENTITLEMENTS_ENABLED: 'true' },
      pool, nowUtc: new Date('2026-10-25T12:00:00Z'),
    });
    expect(result).toEqual({ allowed: false, tier: null,
      expiresAtUtc: null, reason: 'unavailable' });
    expect(JSON.stringify(result)).not.toContain('private');
  });
});
