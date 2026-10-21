import { beforeAll, afterAll, describe, expect, it } from "vitest";
import mysql from "mysql2/promise";
import fs from "node:fs";
import { reserveRateLimit, rateLimitBucket } from "./rateLimit";

const integration = process.env.RUN_MYSQL_INTEGRATION === "1" ? describe : describe.skip;

integration("shared rate limiter in real MySQL", () => {
  let connection: mysql.Connection;
  beforeAll(async () => {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
    connection = await mysql.createConnection(process.env.DATABASE_URL);
    const ddl = fs.readFileSync("db/migrations/20261021_distributed_rate_limit.sql", "utf8");
    // The migration has one CREATE TABLE statement plus comments.
    await connection.query(ddl.split(";")[0]);
  });
  afterAll(async () => { if (connection) await connection.end(); });

  it("permits exactly 100 concurrent requests for one account and rejects the rest", async () => {
    const bucket = rateLimitBucket(958321);
    const outcomes = await Promise.allSettled(Array.from({ length: 105 }, () => reserveRateLimit(bucket)));
    expect(outcomes.filter(x => x.status === "fulfilled")).toHaveLength(100);
    const rejected = outcomes.filter(x => x.status === "rejected") as PromiseRejectedResult[];
    expect(rejected).toHaveLength(5);
    expect(rejected.every(x => x.reason?.code === "TOO_MANY_REQUESTS")).toBe(true);
    const windowStart = Math.floor(Date.now() / 60000) * 60000;
    const [rows] = await connection.query<mysql.RowDataPacket[]>(
      "SELECT hits FROM rate_limit_windows WHERE bucket = ? AND window_start = ?",
      [bucket, windowStart],
    );
    expect(rows[0]?.hits).toBe(100);
  }, 30000);

  it("isolates quotas across verified account IDs", async () => {
    await expect(reserveRateLimit(rateLimitBucket(958322))).resolves.toBeUndefined();
  });
});
