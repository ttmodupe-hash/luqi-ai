/** Bounded visitor reservations inside the already approved Gemini monthly cap.
 * No guest-user DB table, fake account, cache-only quota or new spending budget.
 * Guest records use NEGATIVE user IDs in the existing signed BIGINT usage table;
 * authenticated LUQI users always have positive IDs.
 */
import { createHmac } from 'node:crypto';
import { PILOT_MODELS } from './pilotModels';
import { isIP } from 'node:net';
import mysql, { type Pool } from 'mysql2/promise';
import { parseMySqlConnectionSettings } from '../lib/mysqlConfig';
import { assertPilotEnabled, readApprovedPilotCaps, PilotBlocked, utcDay, utcMonth } from './aiPilotBudget';

export const GUEST_REPLIES_PER_MONTH = 3;
export const GUEST_GLOBAL_MAX_PER_MONTH = 100;  // $10 at a $0.10 conservative reservation.
export const GUEST_GLOBAL_MAX_PER_DAY = 12;
export const GUEST_RESERVATION_CENTS = 10;
export const GUEST_GLOBAL_MONTH_ID = -1;
export const GUEST_GLOBAL_DAY_ID = -2;

/** Expanded capacity is separately gated; never inferred from the existing live flag.
 * USD30 is part of Gemini's USD165 allocation, not additional application spend.
 * Legacy reservations are migrated conservatively at ten cents each.
 */
export function guestCapacity(env: NodeJS.ProcessEnv = process.env) {
  if (env.LUQI_GUEST_CAPACITY_PROFILE === undefined || env.LUQI_GUEST_CAPACITY_PROFILE === 'pilot')
    return { monthly: 100, daily: 12, cents: 10, budget: 1000, expanded: false };
  if (env.LUQI_GUEST_CAPACITY_PROFILE !== 'public-1000-v1' ||
      env.LUQI_GUEST_TRUST_RAILWAY_PROXY !== 'true' || PILOT_MODELS.gemini !== 'gemini-3.8-flash' ||
      readApprovedPilotCaps(env).gemini !== 16500)
    throw new GuestTrialError('GUEST_TRIAL_UNAVAILABLE');
  return { monthly: 3000, daily: 3000, cents: 1, budget: 3000, expanded: true };
}
export const GUEST_COST_ID = -3;
/** Network keys are daily HMACs in a namespace disjoint from visitor IDs.
 * Only Railway's overwritten X-Real-IP may be supplied; never X-Forwarded-For.
 * Do not log the raw address, prompt, signed cookie, or HMAC.
 */
export function guestNetworkId(ip: string | undefined, secret: string, now = new Date()): number {
  if (!ip || !isIP(ip) || secret.length < 32) throw new GuestTrialError('GUEST_TRIAL_UNAVAILABLE');
  const canonical = isIP(ip) === 6 ? new URL('http://[' + ip + ']').hostname : ip;
  return -(2 ** 49 + createHmac('sha256', secret).update('guest-network-v1|' + utcDay(now) + '|' + canonical)
    .digest().readUIntBE(0, 6));
}
function burstId(now: Date): number {
  // One worldwide minute bucket; distinct from guests, network and fixed IDs.
  return -(2 ** 50 + Math.floor(now.getTime() / 60000));
}

export class GuestTrialError extends Error {
  constructor(public readonly code: 'GUEST_TRIAL_PAUSED' | 'GUEST_TRIAL_COMPLETE' |
    'GUEST_TRIAL_UNAVAILABLE' | 'GUEST_START_REQUIRED' | 'GUEST_RATE_LIMITED', public readonly retryAfter = 60) { super(code); }
}

export function guestTrialEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.LUQI_GUEST_CHAT_ENABLED !== 'true' || !env.JWT_SECRET || env.JWT_SECRET.length < 32 ||
      !env.LUQI_PILOT_GEMINI_API_KEY) return false;
  try { assertPilotEnabled(env); guestCapacity(env); return true; } catch { return false; }
}

let guestPool: Pool | null = null;
function pool(): Pool {
  if (guestPool) return guestPool;
  let config;
  try { config = parseMySqlConnectionSettings(process.env); } catch { throw new GuestTrialError('GUEST_TRIAL_UNAVAILABLE'); }
  if (!config) throw new GuestTrialError('GUEST_TRIAL_UNAVAILABLE');
  guestPool = mysql.createPool({ ...config, connectionLimit: 3,
    waitForConnections: true, queueLimit: 12, connectTimeout: 3000 });
  return guestPool;
}
const counter = 'ai_pilot_daily_user_usage';
const monthDay = (now: Date) => utcMonth(now) + '-01';
export type GuestSnapshot = { enabled: boolean; remaining: number; limit: number; reason: 'ready' | 'paused' | 'complete' | 'unavailable' };

export function guestQuotaStatus(guestAttempts: number, globalMonth: number, globalDay: number, capacity = guestCapacity()): GuestSnapshot {
  for (const x of [guestAttempts, globalMonth, globalDay])
    if (!Number.isSafeInteger(x) || x < 0) return { enabled: false, remaining: 0, limit: 3, reason: 'unavailable' };
  if (globalMonth >= capacity.monthly || globalDay >= capacity.daily)
    return { enabled: false, remaining: 0, limit: 3, reason: 'paused' };
  if (guestAttempts >= GUEST_REPLIES_PER_MONTH)
    return { enabled: false, remaining: 0, limit: 3, reason: 'complete' };
  return { enabled: true, remaining: GUEST_REPLIES_PER_MONTH - guestAttempts, limit: 3, reason: 'ready' };
}

/** Read-only availability. Never issues a metered call or creates counter rows. */
export async function guestTrialSnapshot(guestId: number, now = new Date()): Promise<GuestSnapshot> {
  if (!guestTrialEnabled()) return { enabled: false, remaining: 0, limit: 3, reason: 'paused' };
  if (!Number.isSafeInteger(guestId) || guestId >= -1000 || guestId <= -(2 ** 49)) throw new GuestTrialError('GUEST_TRIAL_UNAVAILABLE');
  try {
    const [rows] = await pool().execute<import('mysql2/promise').RowDataPacket[]>(
      `SELECT day_utc, user_id, attempts FROM ${counter} WHERE (day_utc=? AND user_id IN (?,?,?))
        OR (day_utc=? AND user_id=?)`,
      [monthDay(now), GUEST_GLOBAL_MONTH_ID, guestId, GUEST_COST_ID, utcDay(now), GUEST_GLOBAL_DAY_ID]);
    const lookup = (day: string, id: number) =>
      Number(rows.find(r => r.day_utc === day && Number(r.user_id) === id)?.attempts ?? 0);
    const costRow = rows.find(r => Number(r.user_id) === GUEST_COST_ID);
    const cost = costRow ? Number(costRow.attempts) : lookup(monthDay(now), GUEST_GLOBAL_MONTH_ID) * 10;
    if (!Number.isSafeInteger(cost) || cost < 0) throw new GuestTrialError('GUEST_TRIAL_UNAVAILABLE');
    const capacity = guestCapacity();
    if (cost + capacity.cents > capacity.budget)
      return { enabled: false, remaining: 0, limit: 3, reason: 'paused' };
    return guestQuotaStatus(lookup(monthDay(now), guestId),
      lookup(monthDay(now), GUEST_GLOBAL_MONTH_ID), lookup(utcDay(now), GUEST_GLOBAL_DAY_ID));
  } catch { return { enabled: false, remaining: 0, limit: 3, reason: 'unavailable' }; }
}

/** Must commit the guest counters AND the ordinary Gemini provider cap before
 * making any network request. No retries after an ambiguous model response.
 */
export async function reserveGuestAttempt(guestId: number, now = new Date(), networkId?: number): Promise<void> {
  if (!guestTrialEnabled()) throw new GuestTrialError('GUEST_TRIAL_PAUSED');
  if (!Number.isSafeInteger(guestId) || guestId >= -1000 || guestId <= -(2 ** 49)) throw new GuestTrialError('GUEST_TRIAL_UNAVAILABLE');
  const capacity = guestCapacity();
  if (capacity.expanded && (!Number.isSafeInteger(networkId) || networkId! > -(2 ** 49) || networkId! <= -(2 ** 50)))
    throw new GuestTrialError('GUEST_TRIAL_UNAVAILABLE');
  const month = monthDay(now), day = utcDay(now), period = utcMonth(now);
  let connection: Awaited<ReturnType<Pool['getConnection']>> | undefined;
  let started = false;
  try {
    connection = await pool().getConnection(); await connection.beginTransaction(); started = true;
    // Fixed lock order, like the registered user ledger: user counters, then provider.
    const identifiers: Array<[string, number]> = [
      [month, GUEST_GLOBAL_MONTH_ID], [day, GUEST_GLOBAL_DAY_ID], [month, guestId],
      ...(capacity.expanded ? [[day, networkId!], [day, burstId(now)]] as Array<[string, number]> : []),
    ];
    const usage = new Map<string, number>();
    for (const [periodDay, id] of identifiers) {
      await connection.execute(`INSERT INTO ${counter} (day_utc,user_id,attempts) VALUES (?,?,0)
        ON DUPLICATE KEY UPDATE attempts=attempts`, [periodDay, id]);
      const [rows] = await connection.execute<import('mysql2/promise').RowDataPacket[]>(
        `SELECT attempts FROM ${counter} WHERE day_utc=? AND user_id=? FOR UPDATE`, [periodDay, id]);
      if (rows.length !== 1) throw new GuestTrialError('GUEST_TRIAL_UNAVAILABLE');
      const attempts = Number(rows[0].attempts);
      if (!Number.isSafeInteger(attempts) || attempts < 0) throw new GuestTrialError('GUEST_TRIAL_UNAVAILABLE');
      usage.set(id.toString(), attempts);
    }
    const result = guestQuotaStatus(usage.get(guestId.toString())!,
      usage.get(String(GUEST_GLOBAL_MONTH_ID))!, usage.get(String(GUEST_GLOBAL_DAY_ID))!, capacity);
    if (!result.enabled) throw new GuestTrialError(result.reason === 'complete' ? 'GUEST_TRIAL_COMPLETE' : 'GUEST_TRIAL_PAUSED');

    if (capacity.expanded && usage.get(String(networkId))! >= 300)
      throw new GuestTrialError('GUEST_RATE_LIMITED', Math.ceil((Date.parse(day + 'T00:00:00Z') + 86400000 - now.getTime()) / 1000));
    if (capacity.expanded && usage.get(String(burstId(now)))! >= 60)
      throw new GuestTrialError('GUEST_RATE_LIMITED');
    // Initialise once from historical pilot attempts, under the global-month lock.
    await connection.execute(`INSERT INTO ${counter} (day_utc,user_id,attempts) VALUES (?,?,?)
      ON DUPLICATE KEY UPDATE attempts=attempts`, [month, GUEST_COST_ID,
      usage.get(String(GUEST_GLOBAL_MONTH_ID))! * GUEST_RESERVATION_CENTS]);
    const [guestCost] = await connection.execute<import('mysql2/promise').RowDataPacket[]>(
      `SELECT attempts FROM ${counter} WHERE day_utc=? AND user_id=? FOR UPDATE`, [month, GUEST_COST_ID]);
    const reserved = Number(guestCost[0]?.attempts);
    if (!Number.isSafeInteger(reserved) || reserved < 0) throw new GuestTrialError('GUEST_TRIAL_UNAVAILABLE');
    if (reserved + capacity.cents > capacity.budget) throw new GuestTrialError('GUEST_TRIAL_PAUSED');

    await connection.execute(`INSERT INTO ai_pilot_monthly_spend (month_utc,provider,reserved_cents)
      VALUES (?,'gemini',0) ON DUPLICATE KEY UPDATE reserved_cents=reserved_cents`, [period]);
    const [cost] = await connection.execute<import('mysql2/promise').RowDataPacket[]>(
      "SELECT reserved_cents FROM ai_pilot_monthly_spend WHERE month_utc=? AND provider='gemini' FOR UPDATE", [period]);
    if (cost.length !== 1 || !Number.isSafeInteger(Number(cost[0].reserved_cents)) || Number(cost[0].reserved_cents) < 0 ||
      Number(cost[0].reserved_cents) + capacity.cents > readApprovedPilotCaps().gemini) throw new GuestTrialError('GUEST_TRIAL_PAUSED');
    for (const [periodDay, id] of identifiers)
      await connection.execute(`UPDATE ${counter} SET attempts=attempts+1 WHERE day_utc=? AND user_id=?`, [periodDay, id]);
    await connection.execute(`UPDATE ${counter} SET attempts=attempts+? WHERE day_utc=? AND user_id=?`,
      [capacity.cents, month, GUEST_COST_ID]);
    await connection.execute("UPDATE ai_pilot_monthly_spend SET reserved_cents=reserved_cents+? WHERE month_utc=? AND provider='gemini'",
      [capacity.cents, period]);
    await connection.commit(); started = false;
  } catch (error) {
    if (started && connection) { try { await connection.rollback(); } catch { throw new GuestTrialError('GUEST_TRIAL_UNAVAILABLE'); } }
    if (error instanceof GuestTrialError) throw error;
    if (error instanceof PilotBlocked && error.reason === 'AI_PROVIDER_BUDGET_EXHAUSTED')
      throw new GuestTrialError('GUEST_TRIAL_PAUSED');
    throw new GuestTrialError('GUEST_TRIAL_UNAVAILABLE');
  } finally { connection?.release(); }
}
