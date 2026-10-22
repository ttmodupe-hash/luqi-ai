/** Disposable GitHub Actions fixture only. Never connect to Railway.
 * Seeds realistic *non-secret* records for a complete dump-and-restore check.
 */
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import mysql, { type Pool, type RowDataPacket } from "mysql2/promise";
import { bootstrapDatabase, CREATE_STATEMENTS } from "../db/bootstrap";

let pool: Pool;

beforeAll(async () => {
  if (process.env.LUQI_MYSQL_CI_FIXTURE !== "true" ||
      !process.env.DATABASE_URL?.includes("@127.0.0.1:3306/luqi_ci")) {
    throw new Error("Backup fixture refuses nonlocal/non-CI MySQL URLs");
  }
  await bootstrapDatabase();
  pool = mysql.createPool(process.env.DATABASE_URL);
}, 60_000);

afterAll(async () => {
  if (pool) await pool.end();
});

describe("ephemeral backup seed fixture", () => {
  it("stores a sample account and both quota ledgers before dump", async () => {
    expect(CREATE_STATEMENTS).toHaveLength(37);
    const [result] = await pool.execute<import("mysql2/promise").ResultSetHeader>(
      "INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)",
      ["ci-restore@example.invalid", "nonlogin-fixture-not-a-real-password-hash", "CI Restore"]);
    const userId = Number(result.insertId);
    expect(userId).toBeGreaterThan(0);
    await pool.execute(
      "INSERT INTO ai_pilot_monthly_spend (month_utc, provider, reserved_cents) VALUES (?, ?, ?)",
      ["2026-10", "gemini", 150]);
    await pool.execute(
      "INSERT INTO ai_pilot_daily_user_usage (day_utc, user_id, attempts) VALUES (?, ?, ?)",
      ["2026-10-22", userId, 7]);

    const [tables] = await pool.query<RowDataPacket[]>("SHOW TABLES");
    expect(tables).toHaveLength(37);
    const [user] = await pool.execute<RowDataPacket[]>(
      "SELECT email, is_active FROM users WHERE id=?", [userId]);
    expect(user[0].email).toBe("ci-restore@example.invalid");
  });
});
