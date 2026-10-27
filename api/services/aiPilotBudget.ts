/** Durable, fail-closed monthly AI spend reservations for pilot chat only.
 * Reserves a deliberately padded 10 US cents BEFORE each text-only call.
 * This is a conservative application allocation, not an external billing cap.
 * Uses atomic MySQL row locking across app replicas. Failed calls retain their
 * reservation, to avoid double-spend after ambiguous network failures.
 */
import mysql, { type Pool } from "mysql2/promise";
import { MAX_PILOT_INPUT_CHARS } from "../../src/lib/pilot-input";
import { parseMySqlConnectionSettings } from "../lib/mysqlConfig";

export type PilotProvider = "gemini" | "openai";
export type PilotBlockReason = "AI_DISABLED" | "BILLING_NOT_APPROVED" |
  "AI_BUDGET_CONFIGURATION_INVALID" | "AI_BUDGET_STORE_UNAVAILABLE" |
  "AI_PROVIDER_BUDGET_EXHAUSTED" | "AI_USER_DAILY_QUOTA_EXHAUSTED";

export class PilotBlocked extends Error {
  constructor(public readonly reason: PilotBlockReason) {
    super(reason);
    this.name = "PilotBlocked";
  }
}
export const PILOT_CENTS = Object.freeze({ gemini: 6000, openai: 4000 });
export const PILOT_TOTAL_CENTS = 10000;
// Approved 27 October 2026 for the existing application ceiling only. Neither
// profile proves a provider-side hard limit or actual settled provider costs.
export const PILOT_EXPANDED_CENTS = Object.freeze({ gemini: 16500, openai: 13500 });
/** Exact, fail-closed approved profiles. Never infer caps from a single env var. */
export function readApprovedPilotCaps(env: NodeJS.ProcessEnv = process.env) {
  if (env.LUQI_AI_MONTHLY_USD === "100" &&
      env.LUQI_GEMINI_MONTHLY_USD === "60" &&
      env.LUQI_OPENAI_MONTHLY_USD === "40") return PILOT_CENTS;
  if (env.LUQI_AI_MONTHLY_USD === "300" &&
      env.LUQI_GEMINI_MONTHLY_USD === "165" &&
      env.LUQI_OPENAI_MONTHLY_USD === "135") return PILOT_EXPANDED_CENTS;
  throw new PilotBlocked("AI_BUDGET_CONFIGURATION_INVALID");
}
export const RESERVE_PER_ATTEMPT_CENTS = 10;
/** Read the selected provider cap at reservation time. Never exceed it. */
export function hasPilotReservationCapacity(
  spentCents: number, provider: PilotProvider, env: NodeJS.ProcessEnv = process.env
): boolean {
  if (!Number.isSafeInteger(spentCents) || spentCents < 0) {
    throw new PilotBlocked("AI_BUDGET_STORE_UNAVAILABLE");
  }
  return spentCents + RESERVE_PER_ATTEMPT_CENTS <= readApprovedPilotCaps(env)[provider];
}
export const MAX_INPUT_CHARS = MAX_PILOT_INPUT_CHARS;
export const PILOT_USER_DAILY_MAX_ATTEMPTS = 20;
export const MAX_OUTPUT_TOKENS = 512;

export function utcDay(now: Date = new Date()): string {
  if (Number.isNaN(now.getTime())) throw new Error("Invalid clock");
  return now.toISOString().slice(0, 10);
}

export function utcMonth(now: Date = new Date()): string {
  if (Number.isNaN(now.getTime())) throw new Error("Invalid clock");
  return now.toISOString().slice(0, 7);
}

/** Activation intentionally requires two separate explicit flags; defaults OFF. */
export function assertPilotEnabled(env: NodeJS.ProcessEnv = process.env): void {
  if (env.LUQI_AI_PROVIDER_ENABLED !== "true") throw new PilotBlocked("AI_DISABLED");
  if (env.LUQI_AI_BILLING_APPROVED !== "true") {
    throw new PilotBlocked("BILLING_NOT_APPROVED");
  }
  // Requiring an exact, explicitly approved triplet prevents accidentally
  // accepting a partial or inflated budget configuration.
  readApprovedPilotCaps(env);
}

let pool: Pool | undefined;
function budgetPool(): Pool {
  if (pool) return pool;
  let cfg;
  try {
    cfg = parseMySqlConnectionSettings(process.env);
  } catch {
    throw new PilotBlocked("AI_BUDGET_STORE_UNAVAILABLE");
  }
  if (!cfg) throw new PilotBlocked("AI_BUDGET_STORE_UNAVAILABLE");
  pool = mysql.createPool({ ...cfg, connectionLimit: 4, waitForConnections: true,
    connectTimeout: 3000, queueLimit: 30 });
  return pool;
}

/**
 * Requires migration db/migrations/20261022_ai_pilot_budget.sql.
 * Never fallback to demo/in-memory storage. Budget exhaustion for Gemini
 * may allow OpenAI fallback only after a SEPARATE OpenAI reservation.
 */
/** A DB deadlock is safely retryable because no provider request starts
 * until this durable reservation has committed. Other failures remain closed.
 */
class TransientReservationConflict extends Error {}

function isTransientSqlConflict(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: unknown }).code;
  const errno = (error as { errno?: unknown }).errno;
  return code === "ER_LOCK_DEADLOCK" || code === "ER_LOCK_WAIT_TIMEOUT" ||
    errno === 1213 || errno === 1205;
}

async function reserveOnce(
  provider: PilotProvider, userId: number, period: string, day: string
): Promise<void> {
  let conn: Awaited<ReturnType<Pool["getConnection"]>> | undefined;
  let begun = false;
  try {
    conn = await budgetPool().getConnection();
    await conn.beginTransaction();
    begun = true;

    // IMPORTANT: every worker locks the *user* counter before the provider
    // counter. Consistent ordering prevents cross-provider deadlocks when a
    // single account sends simultaneous requests. Upsert safely creates rows
    // on an empty database, unlike racing INSERT IGNORE transactions.
    await conn.execute(
      "INSERT INTO ai_pilot_daily_user_usage (day_utc, user_id, attempts) VALUES (?, ?, 0) ON DUPLICATE KEY UPDATE attempts=attempts",
      [day, userId]);
    const [userRows] = await conn.execute<import("mysql2/promise").RowDataPacket[]>(
      "SELECT attempts FROM ai_pilot_daily_user_usage WHERE day_utc=? AND user_id=? FOR UPDATE",
      [day, userId]);
    const attempts = Number(userRows[0]?.attempts);
    if (!Number.isSafeInteger(attempts) || attempts < 0) {
      throw new PilotBlocked("AI_BUDGET_STORE_UNAVAILABLE");
    }
    if (attempts >= PILOT_USER_DAILY_MAX_ATTEMPTS) {
      throw new PilotBlocked("AI_USER_DAILY_QUOTA_EXHAUSTED");
    }

    await conn.execute(
      "INSERT INTO ai_pilot_monthly_spend (month_utc, provider, reserved_cents) VALUES (?, ?, 0) ON DUPLICATE KEY UPDATE reserved_cents=reserved_cents",
      [period, provider]);
    const [rows] = await conn.execute<import("mysql2/promise").RowDataPacket[]>(
      "SELECT reserved_cents FROM ai_pilot_monthly_spend WHERE month_utc=? AND provider=? FOR UPDATE",
      [period, provider]);
    if (rows.length !== 1) throw new PilotBlocked("AI_BUDGET_STORE_UNAVAILABLE");
    const spent = Number(rows[0].reserved_cents);
    if (!Number.isSafeInteger(spent) || spent < 0) {
      throw new PilotBlocked("AI_BUDGET_STORE_UNAVAILABLE");
    }
    if (!hasPilotReservationCapacity(spent, provider)) {
      throw new PilotBlocked("AI_PROVIDER_BUDGET_EXHAUSTED");
    }

    await conn.execute(
      "UPDATE ai_pilot_daily_user_usage SET attempts=attempts+1 WHERE day_utc=? AND user_id=?",
      [day, userId]);
    await conn.execute(
      "UPDATE ai_pilot_monthly_spend SET reserved_cents=reserved_cents+? WHERE month_utc=? AND provider=?",
      [RESERVE_PER_ATTEMPT_CENTS, period, provider]);
    await conn.commit();
    begun = false;
  } catch (error) {
    if (begun && conn) {
      try {
        await conn.rollback();
      } catch {
        throw new PilotBlocked("AI_BUDGET_STORE_UNAVAILABLE");
      }
    }
    if (error instanceof PilotBlocked) throw error;
    if (isTransientSqlConflict(error)) throw new TransientReservationConflict();
    // Never disclose MySQL connection errors or secrets.
    throw new PilotBlocked("AI_BUDGET_STORE_UNAVAILABLE");
  } finally {
    conn?.release();
  }
}

/** Reserve before any external AI invocation; never refund a possible spend. */
export async function reservePilotAttempt(
  provider: PilotProvider, userId: number, now: Date = new Date()
): Promise<void> {
  assertPilotEnabled();
  if (provider !== "gemini" && provider !== "openai") {
    throw new PilotBlocked("AI_BUDGET_CONFIGURATION_INVALID");
  }
  if (!Number.isSafeInteger(userId) || userId <= 0) {
    throw new PilotBlocked("AI_BUDGET_CONFIGURATION_INVALID");
  }
  const period = utcMonth(now);
  const day = utcDay(now);
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await reserveOnce(provider, userId, period, day);
      return;
    } catch (error) {
      if (!(error instanceof TransientReservationConflict)) throw error;
      if (attempt === 4) break;
      await new Promise<void>(resolve => setTimeout(resolve, 15 * 2 ** attempt));
    }
  }
  throw new PilotBlocked("AI_BUDGET_STORE_UNAVAILABLE");
}


/** Read-only startup gate; does not spend credits or contact providers. */
export async function checkPilotGatewayReadiness(): Promise<
  "disabled" | "billing_unapproved" | "budget_misconfigured" |
  "keys_missing" | "ledger_unavailable" | "configured_not_verified"
> {
  try {
    assertPilotEnabled();
  } catch (error) {
    if (!(error instanceof PilotBlocked)) return "ledger_unavailable";
    if (error.reason === "AI_DISABLED") return "disabled";
    if (error.reason === "BILLING_NOT_APPROVED") return "billing_unapproved";
    return "budget_misconfigured";
  }
  if (!process.env.LUQI_PILOT_GEMINI_API_KEY ||
      !process.env.LUQI_PILOT_OPENAI_API_KEY) return "keys_missing";
  try {
    const [rows] = await budgetPool().query(
      "SELECT provider FROM ai_pilot_monthly_spend LIMIT 1");
    void rows;
    return "configured_not_verified";
  } catch {
    return "ledger_unavailable";
  }
}

/** For offline tests and account dashboards; provider billing is authoritative. */
export function budgetSnapshot(reservedCents: number, provider: PilotProvider,
  env: NodeJS.ProcessEnv = process.env) {
  if (!Number.isSafeInteger(reservedCents) || reservedCents < 0) {
    throw new Error("Invalid reservation balance");
  }
  // The no-configuration form remains useful for historical, offline $100
  // fixtures. In a configured environment, never report the wrong allowance.
  const hasConfig = ["LUQI_AI_MONTHLY_USD", "LUQI_GEMINI_MONTHLY_USD", "LUQI_OPENAI_MONTHLY_USD"]
    .some(name => env[name] !== undefined);
  const cap = (hasConfig ? readApprovedPilotCaps(env) : PILOT_CENTS)[provider];
  return {
    provider, monthlyUsd: cap / 100,
    reservedUsd: reservedCents / 100,
    remainingUsd: Math.max(0, cap - reservedCents) / 100,
  };
}
