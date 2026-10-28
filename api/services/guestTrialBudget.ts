/** Bounded visitor reservations inside the already approved Gemini monthly cap.
 * No guest-user DB table, fake account, cache-only quota or new spending budget.
 * Guest records use NEGATIVE user IDs in the existing signed BIGINT usage table;
 * authenticated LUQI users always have positive IDs.
 */
import mysql, { type Pool } from 'mysql2/promise';
import { parseMySqlConnectionSettings } from '../lib/mysqlConfig';
import { assertPilotEnabled, hasPilotReservationCapacity, PilotBlocked, utcDay, utcMonth } from './aiPilotBudget';

export const GUEST_REPLIES_PER_MONTH = 3;
export const GUEST_GLOBAL_MAX_PER_MONTH = 100;  // $10 at a $0.10 conservative reservation.
export const GUEST_GLOBAL_MAX_PER_DAY = 12;
export const GUEST_RESERVATION_CENTS = 10;
export const GUEST_GLOBAL_MONTH_ID = -1;
export const GUEST_GLOBAL_DAY_ID = -2;

export class GuestTrialError extends Error {
  constructor(public readonly code: 'GUEST_TRIAL_PAUSED' | 'GUEST_TRIAL_COMPLETE' |
    'GUEST_TRIAL_UNAVAILABLE' | 'GUEST_START_REQUIRED') { super(code); }
}

export function guestTrialEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.LUQI_GUEST_CHAT_ENABLED !== 'true' || !env.JWT_SECRET || env.JWT_SECRET.length < 32 ||
      !env.LUQI_PILOT_GEMINI_API_KEY) return false;
  try { assertPilotEnabled(env); return true; } catch { return false; }
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

export function guestQuotaStatus(guestAttempts: number, globalMonth: number, globalDay: number): GuestSnapshot {
  for (const x of [guestAttempts, globalMonth, globalDay])
    if (!Number.isSafeInteger(x) || x < 0) return { enabled: false, remaining: 0, limit: 3, reason: 'unavailable' };
  if (globalMonth >= GUEST_GLOBAL_MAX_PER_MONTH || globalDay >= GUEST_GLOBAL_MAX_PER_DAY)
    return { enabled: false, remaining: 0, limit: 3, reason: 'paused' };
  if (guestAttempts >= GUEST_REPLIES_PER_MONTH)
    return { enabled: false, remaining: 0, limit: 3, reason: 'complete' };
  return { enabled: true, remaining: GUEST_REPLIES_PER_MONTH - guestAttempts, limit: 3, reason: 'ready' };
}

/** Read-only availability. Never issues a metered call or creates counter rows. */
export async function guestTrialSnapshot(guestId: number, now = new Date()): Promise<GuestSnapshot> {
  if (!guestTrialEnabled()) return { enabled: false, remaining: 0, limit: 3, reason: 'paused' };
  if (!Number.isSafeInteger(guestId) || guestId >= -1000) throw new GuestTrialError('GUEST_TRIAL_UNAVAILABLE');
  try {
    const [rows] = await pool().execute<import('mysql2/promise').RowDataPacket[]>(
      `SELECT day_utc, user_id, attempts FROM ${counter} WHERE (day_utc=? AND user_id IN (?,?))
        OR (day_utc=? AND user_id=?)`,
      [monthDay(now), GUEST_GLOBAL_MONTH_ID, guestId, utcDay(now), GUEST_GLOBAL_DAY_ID]);
    const lookup = (day: string, id: number) =>
      Number(rows.find(r => r.day_utc === day && Number(r.user_id) === id)?.attempts ?? 0);
    return guestQuotaStatus(lookup(monthDay(now), guestId),
      lookup(monthDay(now), GUEST_GLOBAL_MONTH_ID), lookup(utcDay(now), GUEST_GLOBAL_DAY_ID));
  } catch { return { enabled: false, remaining: 0, limit: 3, reason: 'unavailable' }; }
}

/** Must commit the guest counters AND the ordinary Gemini provider cap before
 * making any network request. No retries after an ambiguous model response.
 */
export async function reserveGuestAttempt(guestId: number, now = new Date()): Promise<void> {
  if (!guestTrialEnabled()) throw new GuestTrialError('GUEST_TRIAL_PAUSED');
  if (!Number.isSafeInteger(guestId) || guestId >= -1000) throw new GuestTrialError('GUEST_TRIAL_UNAVAILABLE');
  const month = monthDay(now), day = utcDay(now), period = utcMonth(now);
  let connection: Awaited<ReturnType<Pool['getConnection']>> | undefined;
  let started = false;
  try {
    connection = await pool().getConnection(); await connection.beginTransaction(); started = true;
    // Fixed lock order, like the registered user ledger: user counters, then provider.
    const identifiers: Array<[string, number]> = [
      [month, GUEST_GLOBAL_MONTH_ID], [day, GUEST_GLOBAL_DAY_ID], [month, guestId],
    ];
    const usage = new Map<string, number>();
    for (const [periodDay, id] of identifiers) {
      await connection.execute(`INSERT INTO ${counter} (day_utc,user_id,attempts) VALUES (?,?,0)
        ON DUPLICATE KEY UPDATE attempts=attempts`, [periodDay, id]);
      const [rows] = await connection.execute<import('mysql2/promise').RowDataPacket[]>(
        `SELECT attempts FROM ${counter} WHERE day_utc=? AND user_id=? FOR UPDATE`, [periodDay, id]);
      if (rows.length !== 1) throw new GuestTrialError('GUEST_TRIAL_UNAVAILABLE');
      usage.set(id.toString(), Number(rows[0].attempts));
    }
    const result = guestQuotaStatus(usage.get(guestId.toString())!,
      usage.get(String(GUEST_GLOBAL_MONTH_ID))!, usage.get(String(GUEST_GLOBAL_DAY_ID))!);
    if (!result.enabled) throw new GuestTrialError(result.reason === 'complete' ? 'GUEST_TRIAL_COMPLETE' : 'GUEST_TRIAL_PAUSED');

    await connection.execute(`INSERT INTO ai_pilot_monthly_spend (month_utc,provider,reserved_cents)
      VALUES (?,'gemini',0) ON DUPLICATE KEY UPDATE reserved_cents=reserved_cents`, [period]);
    const [cost] = await connection.execute<import('mysql2/promise').RowDataPacket[]>(
      "SELECT reserved_cents FROM ai_pilot_monthly_spend WHERE month_utc=? AND provider='gemini' FOR UPDATE", [period]);
    if (cost.length !== 1 || !hasPilotReservationCapacity(Number(cost[0].reserved_cents),
      'gemini', process.env, GUEST_RESERVATION_CENTS)) throw new GuestTrialError('GUEST_TRIAL_PAUSED');
    for (const [periodDay, id] of identifiers)
      await connection.execute(`UPDATE ${counter} SET attempts=attempts+1 WHERE day_utc=? AND user_id=?`, [periodDay, id]);
    await connection.execute("UPDATE ai_pilot_monthly_spend SET reserved_cents=reserved_cents+? WHERE month_utc=? AND provider='gemini'",
      [GUEST_RESERVATION_CENTS, period]);
    await connection.commit(); started = false;
  } catch (error) {
    if (started && connection) { try { await connection.rollback(); } catch { throw new GuestTrialError('GUEST_TRIAL_UNAVAILABLE'); } }
    if (error instanceof GuestTrialError) throw error;
    if (error instanceof PilotBlocked && error.reason === 'AI_PROVIDER_BUDGET_EXHAUSTED')
      throw new GuestTrialError('GUEST_TRIAL_PAUSED');
    throw new GuestTrialError('GUEST_TRIAL_UNAVAILABLE');
  } finally { connection?.release(); }
}
