/**
 * Read-only, disconnected candidate for later server-enforced memberships.
 *
 * This module is NOT mounted on any route, called by any AI provider gateway,
 * or linked to checkout. Nothing here validates payment signatures or grants
 * paid features. Only an approved future merchant ingestion can populate the
 * separately migrated evidence tables.
 */
import type { Pool, RowDataPacket } from 'mysql2/promise';
import { getPersistentMySqlPool } from '../queries/connection';

export type MemberTier = 'starter' | 'creator';
export type MemberDecision =
  | { allowed: false; tier: null; expiresAtUtc: null;
      reason: 'disabled' | 'not_confirmed' | 'unavailable' | 'ambiguous' }
  | { allowed: true; tier: MemberTier; expiresAtUtc: string;
      reason: 'record_eligible' };

type ReadOnlyPool = Pick<Pool, 'execute'>;
export type MemberReadOptions = {
  environment?: Record<string, string | undefined>;
  nowUtc?: Date;
  pool?: ReadOnlyPool;
};

const refuse = (reason: 'disabled' | 'not_confirmed' | 'unavailable' | 'ambiguous'): MemberDecision =>
  ({ allowed: false, tier: null, expiresAtUtc: null, reason });
const safeOwner = (value: number) => Number.isSafeInteger(value) && value > 0;
// Strict contract: a future reviewer can make a different decision for annual
// plans but this pilot cannot silently accept unbounded memberships.
const TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/;

/**
 * Future internal-only eligibility lookup. NOT actual purchase confirmation.
 *
 * - Opt-in flag is absent by default; no DB work in that state.
 * - Only stored receipt evidence joined to the signed-in owner's active user
 *   and a finite monthly entitlement can produce a candidate positive result.
 * - This function has no user-supplied email, token, browser tier, payment
 *   redirect or order-reference arguments.
 * - Even a positive candidate MUST NOT trigger provider calls or paid access
 *   until a separate merchant signature, settlement and capacity acceptance
 *   has been implemented and independently approved.
 */
export async function readMemberEligibility(
  ownerId: number, options: MemberReadOptions = {},
): Promise<MemberDecision> {
  const env = options.environment ?? process.env;
  if (env.LUQI_MEMBER_ENTITLEMENTS_ENABLED !== 'true') return refuse('disabled');
  const now = options.nowUtc ?? new Date();
  if (!safeOwner(ownerId) || !(now instanceof Date) || !Number.isFinite(now.getTime()))
    return refuse('not_confirmed');

  const stamp = now.toISOString().replace('T', ' ').replace('Z', '');
  try {
    const pool = options.pool ?? getPersistentMySqlPool();
    // SELECT-only, bounded. Receipt evidence and the entitlement MUST bind to
    // the same authenticated user and unique opaque order hash. This is *not*
    // an independent verification of the merchant that recorded those fields.
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT e.tier_code AS tier,
              DATE_FORMAT(e.period_end_utc, '%Y-%m-%dT%H:%i:%s.%fZ') AS expires_at
       FROM luqi_member_entitlements_v1 AS e
       INNER JOIN luqi_member_receipts_v1 AS r
         ON r.order_hash=e.order_hash AND r.owner_id=e.owner_id
       INNER JOIN users AS u
         ON u.id=e.owner_id AND u.is_active=1
       WHERE e.owner_id=? AND e.membership_state='active'
         AND e.period_start_utc<=? AND e.period_end_utc>?
         AND e.period_end_utc<=DATE_ADD(e.period_start_utc, INTERVAL 35 DAY)
         AND e.period_end_utc>=DATE_ADD(e.period_start_utc, INTERVAL 1 DAY)
         AND r.settlement_state='settled' AND r.review_state='approved'
         AND r.currency_code='ZAR' AND r.gross_minor>0
         AND r.settled_at_utc<=?
       ORDER BY e.period_end_utc DESC
       LIMIT 2`,
      [ownerId, stamp, stamp, stamp],
    );
    // Two overlapping approved orders are ambiguous; do not stack.
    if (!Array.isArray(rows) || rows.length > 2) return refuse('unavailable');
    if (rows.length === 0) return refuse('not_confirmed');
    if (rows.length !== 1) return refuse('ambiguous');
    const row = rows[0];
    if ((row.tier !== 'starter' && row.tier !== 'creator') ||
        typeof row.expires_at !== 'string' ||
        !TIME_PATTERN.test(row.expires_at) ||
        !Number.isFinite(Date.parse(row.expires_at)) ||
        Date.parse(row.expires_at) <= now.getTime()) return refuse('unavailable');
    return { allowed: true, tier: row.tier as MemberTier,
      expiresAtUtc: row.expires_at, reason: 'record_eligible' };
  } catch {
    // Missing optional migration/grants, DB errors and bad records fail closed.
    // Never expose SQL text, payment hashes, accounts or credential values.
    return refuse('unavailable');
  }
}
