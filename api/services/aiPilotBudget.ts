/** Durable, fail-closed monthly AI spend reservations for pilot chat only.
 * Reserves a deliberately padded 10 US cents BEFORE each text-only call.
 * This is a conservative application allocation, not an external billing cap.
 * Uses atomic MySQL row locking across app replicas. Failed calls retain their
 * reservation, to avoid double-spend after ambiguous network failures.
 */
import mysql, { type Pool } from "mysql2/promise";
import { parseMySqlConnectionSettings } from "../lib/mysqlConfig";

export type PilotProvider = "gemini" | "openai";
export type PilotBlockReason = "AI_DISABLED" | "BILLING_NOT_APPROVED" |
  "AI_BUDGET_CONFIGURATION_INVALID" | "AI_BUDGET_STORE_UNAVAILABLE" |
  "AI_PROVIDER_BUDGET_EXHAUSTED";

export class PilotBlocked extends Error {
  constructor(public readonly reason: PilotBlockReason) {
    super(reason);
    this.name = "PilotBlocked";
  }
}
export const PILOT_CENTS = Object.freeze({ gemini: 3000, openai: 2000 });
export const PILOT_TOTAL_CENTS = 5000;
export const RESERVE_PER_ATTEMPT_CENTS = 10;
export const MAX_INPUT_CHARS = 6000;
export const MAX_OUTPUT_TOKENS = 512;

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
  if (env.LUQI_AI_MONTHLY_USD !== "50" ||
      env.LUQI_GEMINI_MONTHLY_USD !== "30" ||
      env.LUQI_OPENAI_MONTHLY_USD !== "20") {
    throw new PilotBlocked("AI_BUDGET_CONFIGURATION_INVALID");
  }
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
 * Requires migration db/migrations/20261022_pilot_spend.sql.
 * Never fallback to demo/in-memory storage. Budget exhaustion for Gemini
 * may allow OpenAI fallback only after a SEPARATE OpenAI reservation.
 */
export async function reservePilotAttempt(provider: PilotProvider,
  now: Date = new Date()): Promise<void> {
  assertPilotEnabled();
  if (provider !== "gemini" && provider !== "openai") {
    throw new PilotBlocked("AI_BUDGET_CONFIGURATION_INVALID");
  }
  const period = utcMonth(now);
  let conn: Awaited<ReturnType<Pool["getConnection"]>> | undefined;
  let begun = false;
  try {
    conn = await budgetPool().getConnection();
    await conn.beginTransaction();
    begun = true;
    await conn.execute(
      "INSERT IGNORE INTO ai_pilot_monthly_spend (month_utc, provider, reserved_cents) VALUES (?, ?, 0)",
      [period, provider]);
    const [rows] = await conn.execute<import("mysql2/promise").RowDataPacket[]>(
      "SELECT reserved_cents FROM ai_pilot_monthly_spend WHERE month_utc=? AND provider=? FOR UPDATE",
      [period, provider]);
    if (rows.length !== 1) throw new PilotBlocked("AI_BUDGET_STORE_UNAVAILABLE");
    const spent = Number(rows[0].reserved_cents);
    if (!Number.isSafeInteger(spent) || spent < 0) {
      throw new PilotBlocked("AI_BUDGET_STORE_UNAVAILABLE");
    }
    if (spent + RESERVE_PER_ATTEMPT_CENTS > PILOT_CENTS[provider]) {
      throw new PilotBlocked("AI_PROVIDER_BUDGET_EXHAUSTED");
    }
    await conn.execute(
      "UPDATE ai_pilot_monthly_spend SET reserved_cents = reserved_cents + ? WHERE month_utc=? AND provider=?",
      [RESERVE_PER_ATTEMPT_CENTS, period, provider]);
    await conn.commit();
    begun = false;
  } catch (error) {
    if (begun && conn) {
      try { await conn.rollback(); } catch { /* safely deny request */ }
    }
    if (error instanceof PilotBlocked) throw error;
    // Avoid database/connection error messages: they can disclose credentials.
    throw new PilotBlocked("AI_BUDGET_STORE_UNAVAILABLE");
  } finally {
    conn?.release();
  }
}

/** For offline tests and account dashboards; provider billing is authoritative. */
export function budgetSnapshot(reservedCents: number, provider: PilotProvider) {
  if (!Number.isSafeInteger(reservedCents) || reservedCents < 0) {
    throw new Error("Invalid reservation balance");
  }
  return {
    provider, monthlyUsd: PILOT_CENTS[provider] / 100,
    reservedUsd: reservedCents / 100,
    remainingUsd: Math.max(0, PILOT_CENTS[provider] - reservedCents) / 100,
  };
}
