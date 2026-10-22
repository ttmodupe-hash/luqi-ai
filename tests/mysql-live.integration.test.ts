/** Real MySQL integration tests: CI-only, no third-party AI calls.
 * The GitHub Actions runner creates an ephemeral MySQL 8.4 database.
 * No production database secrets or provider credentials are loaded.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mysql, { type Pool, type RowDataPacket } from "mysql2/promise";
import { bootstrapDatabase, CREATE_STATEMENTS } from "../db/bootstrap";
import {
  PilotBlocked, reservePilotAttempt, PILOT_CENTS,
  PILOT_USER_DAILY_MAX_ATTEMPTS, utcDay, utcMonth,
} from "../api/services/aiPilotBudget";

const TEST_PERIOD = new Date("2026-10-22T12:00:00Z");
const MONTH = utcMonth(TEST_PERIOD);
const DAY = utcDay(TEST_PERIOD);
let pool: Pool;

async function singleNumber(query: string, params: unknown[] = []): Promise<number> {
  const [rows] = await pool.execute<RowDataPacket[]>(query, params);
  return Number(Object.values(rows[0] ?? {})[0]);
}

beforeAll(async () => {
  if (process.env.LUQI_MYSQL_CI_FIXTURE !== "true" ||
      !process.env.DATABASE_URL?.includes("127.0.0.1")) {
    throw new Error("Refusing to run destructive integration checks outside local CI MySQL");
  }
  await bootstrapDatabase();
  pool = mysql.createPool(process.env.DATABASE_URL);
}, 60_000);
afterAll(async () => {
  if (pool) await pool.end();
});

describe.sequential("real InnoDB persistence and $100 pilot gates", () => {
  it("creates all 37 tables without inserting a publicly known demo user", async () => {
    const [tables] = await pool.query<RowDataPacket[]>("SHOW TABLES");
    expect(tables.length).toBe(CREATE_STATEMENTS.length);
    expect(await singleNumber("SELECT COUNT(*) AS n FROM users")).toBe(0);
    // Migrations are idempotent against an already provisioned MySQL.
    await bootstrapDatabase();
    const [again] = await pool.query<RowDataPacket[]>("SHOW TABLES");
    expect(again.length).toBe(37);
  }, 70_000);

  it("atomically enforces 20 daily attempts from concurrent Gemini/OpenAI requests", async () => {
    expect(PILOT_USER_DAILY_MAX_ATTEMPTS).toBe(20);
    const results = await Promise.allSettled(Array.from({ length: 25 }, (_, i) =>
      reservePilotAttempt(i % 2 === 0 ? "gemini" : "openai", 101, TEST_PERIOD)));
    const allowed = results.filter(x => x.status === "fulfilled").length;
    const blocked = results.filter(x => x.status === "rejected");
    expect(allowed).toBe(20);
    expect(blocked).toHaveLength(5);
    for (const item of blocked) {
      if (item.status === "rejected") {
        expect(item.reason).toBeInstanceOf(PilotBlocked);
        expect(item.reason.reason).toBe("AI_USER_DAILY_QUOTA_EXHAUSTED");
      }
    }
    expect(await singleNumber(
      "SELECT attempts AS n FROM ai_pilot_daily_user_usage WHERE day_utc=? AND user_id=?",
      [DAY, 101])).toBe(20);
    const total = await singleNumber(
      "SELECT SUM(reserved_cents) AS n FROM ai_pilot_monthly_spend WHERE month_utc=?",
      [MONTH]);
    expect(total).toBe(200);
  }, 70_000);

  it("enforces separate $60 Gemini and $40 OpenAI limits without leakage", async () => {
    // Simulate existing reservations, not actual paid provider calls.
    await pool.execute(
      "UPDATE ai_pilot_monthly_spend SET reserved_cents=? WHERE month_utc=? AND provider=?",
      [PILOT_CENTS.gemini - 10, MONTH, "gemini"]);
    await pool.execute(
      "UPDATE ai_pilot_monthly_spend SET reserved_cents=? WHERE month_utc=? AND provider=?",
      [PILOT_CENTS.openai - 10, MONTH, "openai"]);
    await reservePilotAttempt("gemini", 202, TEST_PERIOD);
    await reservePilotAttempt("openai", 202, TEST_PERIOD);
    await expect(reservePilotAttempt("gemini", 203, TEST_PERIOD))
      .rejects.toMatchObject({ reason: "AI_PROVIDER_BUDGET_EXHAUSTED" });
    await expect(reservePilotAttempt("openai", 203, TEST_PERIOD))
      .rejects.toMatchObject({ reason: "AI_PROVIDER_BUDGET_EXHAUSTED" });
    expect(await singleNumber(
      "SELECT reserved_cents AS n FROM ai_pilot_monthly_spend WHERE month_utc=? AND provider='gemini'",
      [MONTH])).toBe(6000);
    expect(await singleNumber(
      "SELECT reserved_cents AS n FROM ai_pilot_monthly_spend WHERE month_utc=? AND provider='openai'",
      [MONTH])).toBe(4000);
  });

  it("rolls back all spend reservations if the quota ledger is missing", async () => {
    // Only this isolated CI database is modified; never execute against Railway.
    const before = await singleNumber(
      "SELECT SUM(reserved_cents) AS n FROM ai_pilot_monthly_spend WHERE month_utc=?",
      [MONTH]);
    await pool.query("DROP TABLE ai_pilot_daily_user_usage");
    await expect(reservePilotAttempt("gemini", 500, new Date("2026-11-01T01:00:00Z")))
      .rejects.toMatchObject({ reason: "AI_BUDGET_STORE_UNAVAILABLE" });
    const after = await singleNumber(
      "SELECT SUM(reserved_cents) AS n FROM ai_pilot_monthly_spend WHERE month_utc=?",
      [MONTH]);
    expect(after).toBe(before);
  });
});
