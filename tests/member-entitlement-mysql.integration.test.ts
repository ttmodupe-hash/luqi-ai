/** Strict CI-only synthetic MySQL. No Railway credentials, restore or customer data. */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import mysql, { type Pool, type RowDataPacket } from 'mysql2/promise';
import { readMemberEligibility } from '../api/services/memberEntitlementRead';

const DATABASE = 'mysql://root:ci-only-membership-password@127.0.0.1:3306/luqi_member_ci';
const isolated = process.env.GITHUB_ACTIONS === 'true' &&
  process.env.LUQI_MEMBER_LEDGER_CI_FIXTURE === 'true' &&
  process.env.DATABASE_URL === DATABASE &&
  process.env.LUQI_AI_PROVIDER_ENABLED === 'false' &&
  process.env.LUQI_AI_BILLING_APPROVED === 'false';
const approved = { LUQI_MEMBER_ENTITLEMENTS_ENABLED: 'true' };
const utc = new Date('2026-10-25T12:00:00Z');
const digest = (text: string) => createHash('sha256').update('synthetic:' + text).digest();
let pool: Pool;
let serial = 0;

async function receipt(owner: number, options: {
  settlement?: 'settled'|'refunded'|'disputed'|'pending'|'revoked';
  review?: 'approved'|'pending'|'rejected';
  membership?: 'active'|'paused'|'revoked'|'expired'|'pending';
  tier?: 'starter'|'creator'; begin?: string; end?: string;
  currency?: string;
} = {}) {
  const key = String(++serial);
  const order = digest('order:' + key), event = digest('event:' + key);
  await pool.execute(`INSERT INTO luqi_member_receipts_v1
    (merchant_code,event_hash,order_hash,owner_id,currency_code,gross_minor,
     settlement_state,review_state,settled_at_utc,created_at_utc)
    VALUES ('ci-fixture',?,?,?,?,?,?,?,'2026-10-24 12:00:00.000000','2026-10-24 12:00:00.000000')`,
    [event,order,owner,options.currency ?? 'ZAR',9900,options.settlement ?? 'settled',
      options.review ?? 'approved']);
  await pool.execute(`INSERT INTO luqi_member_entitlements_v1
    (owner_id,order_hash,tier_code,membership_state,period_start_utc,period_end_utc,created_at_utc)
    VALUES (?,?,?,?,?,?,'2026-10-24 12:00:00.000000')`,
    [owner,order,options.tier ?? 'starter',options.membership ?? 'active',
      options.begin ?? '2026-10-24 12:00:00.000000',
      options.end ?? '2026-11-23 12:00:00.000000']);
  return {order,event};
}
const read = (owner: number) =>
  readMemberEligibility(owner,{ environment: approved, nowUtc: utc, pool });

describe.skipIf(!isolated).sequential('read-only entitlement candidate against disposable MySQL', () => {
  beforeAll(async () => {
    if (!isolated) throw Error('Refusing a non-isolated database');
    pool = mysql.createPool({ uri: DATABASE, connectionLimit: 3 });
    const [tables] = await pool.query<RowDataPacket[]>('SHOW TABLES');
    expect(tables).toHaveLength(0);
    await pool.query('CREATE TABLE users (id BIGINT UNSIGNED PRIMARY KEY, is_active TINYINT(1) NOT NULL) ENGINE=InnoDB');
    await pool.query('INSERT INTO users (id,is_active) VALUES (101,1),(102,1),(103,0),(104,1),(105,1),(106,1),(107,1),(108,1),(109,1)');
  }, 30_000);
  afterAll(async () => { if (pool) await pool.end(); });
  it('fails closed if the optional migration is absent', async () => {
    expect((await read(101)).reason).toBe('unavailable');
    const sql = readFileSync('db/migrations/20261025_member_entitlements.sql','utf8');
    for (const statement of sql.split(/;\s*(?:\r?\n|$)/).filter(text => text.trim())) {
      await pool.query(statement);
    }
    const [tables] = await pool.query<RowDataPacket[]>("SHOW TABLES LIKE 'luqi_member_%'");
    expect(tables).toHaveLength(2);
  });
  it('never admits a user merely because a row, price idea or account exists', async () => {
    expect((await read(101)).recordMatched).toBe(false);
    expect((await read(102)).recordMatched).toBe(false);
    await receipt(101, { review: 'pending' });
    expect((await read(101)).reason).toBe('not_confirmed');
    expect((await readMemberEligibility(101, { pool, nowUtc: utc,
      environment: { LUQI_MEMBER_ENTITLEMENTS_ENABLED: 'false' } })).reason).toBe('disabled');
  });
  it('scopes a synthetic candidate record to the owner and active account', async () => {
    await receipt(102, { tier: 'creator' });
    await receipt(103, { tier: 'creator' });
    const result = await read(102);
    expect(result).toEqual({ paidAccessAllowed: false, recordMatched: true, tier: 'creator',
      expiresAtUtc: '2026-11-23T12:00:00.000000Z', reason: 'candidate_only' });
    expect(result.paidAccessAllowed).toBe(false);
    expect((await read(104)).recordMatched).toBe(false);
    expect((await read(103)).recordMatched).toBe(false);
    expect(JSON.stringify(result)).not.toMatch(/order|merchant|receipt|event/i);
  });
  it('refuses reversals, disputes, paused entitlements and expired periods', async () => {
    await receipt(104, { settlement: 'refunded' });
    await receipt(105, { settlement: 'disputed' });
    await receipt(106, { membership: 'paused' });
    await receipt(107, { begin: '2026-09-01 00:00:00.000000', end: '2026-09-30 00:00:00.000000' });
    for (const owner of [104,105,106,107]) expect((await read(owner)).recordMatched).toBe(false);
  });
  it('denies ambiguous overlapping grants instead of silently stacking them', async () => {
    await receipt(108);
    await receipt(108, { tier: 'creator' });
    expect(await read(108)).toEqual({ paidAccessAllowed:false,recordMatched:false,tier:null,expiresAtUtc:null,reason:'ambiguous' });
  });
  it('prevents duplicate settlement event keys and orders from producing extra grants', async () => {
    const known = await receipt(109);
    await expect(pool.execute(
      `INSERT INTO luqi_member_receipts_v1
        (merchant_code,event_hash,order_hash,owner_id,currency_code,gross_minor,
         settlement_state,review_state,settled_at_utc,created_at_utc)
        VALUES ('ci-fixture',?,?,109,'ZAR',9900,'settled','approved',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))`,
      [known.event,digest('new-order')])).rejects.toBeTruthy();
    await expect(pool.execute(
      `INSERT INTO luqi_member_receipts_v1
        (merchant_code,event_hash,order_hash,owner_id,currency_code,gross_minor,
         settlement_state,review_state,settled_at_utc,created_at_utc)
        VALUES ('other-merchant',?,?,109,'ZAR',9900,'settled','approved',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))`,
      [digest('another-event'),known.order])).rejects.toBeTruthy();
    expect((await read(109)).recordMatched).toBe(true);
  });
});
