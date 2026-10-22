import fs from "node:fs";
import mysql from "mysql2/promise";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { digestAccountEmail, recordSecuritySignal, getIntrusionRadarSummary,
  countRecentLoginFailures } from "./intrusionRadar";

const integration = process.env.RUN_MYSQL_INTEGRATION === "1" ? describe : describe.skip;
integration("privacy-preserving intrusion evidence in real MySQL", () => {
  let conn: mysql.Connection;
  beforeAll(async () => {
    if (process.env.CI !== "true" || !process.env.DATABASE_URL)
      throw new Error("Refusing to run incident migrations without isolated CI.");
    const url = new URL(process.env.DATABASE_URL);
    if (url.hostname !== "127.0.0.1" || url.pathname !== "/luqi_integration")
      throw new Error("Refusing to touch a non-ephemeral MySQL database.");
    process.env.LUQI_SECURITY_HMAC_KEY = "offline-ci-observation-key-not-for-production-2026";
    conn = await mysql.createConnection(process.env.DATABASE_URL);
    await conn.query(fs.readFileSync("db/migrations/20261022_intrusion_radar_events.sql", "utf8"));
  });
  afterAll(async () => {
    if (conn) {
      await conn.query("DELETE FROM intrusion_radar_events");
      await conn.end();
    }
    delete process.env.LUQI_SECURITY_HMAC_KEY;
  });

  it("records only allowed enum category and anonymous decoy signals", async () => {
    expect(await recordSecuritySignal({
      category: "canary_path", severity: "critical", method: "GET",
    })).toBe(true);
    const [rows] = await conn.query<mysql.RowDataPacket[]>(
      "SELECT category, severity, subject_digest FROM intrusion_radar_events WHERE category = 'canary_path'"
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].subject_digest).toBeNull();
    expect(rows[0].severity).toBe("critical");
  });

  it("correlates failed account attempts only by keyed HMAC, never raw identifiers", async () => {
    for (let n = 0; n < 10; n++) {
      expect(await recordSecuritySignal({
        category: "login_failure", severity: "medium",
        method: "POST", accountEmail: "unit-account@example.test",
      })).toBe(true);
    }
    const digest = digestAccountEmail("unit-account@example.test",
      process.env.LUQI_SECURITY_HMAC_KEY!);
    const [rows] = await conn.query<mysql.RowDataPacket[]>(
      "SELECT subject_digest FROM intrusion_radar_events WHERE category = 'login_failure'"
    );
    expect(rows.length).toBe(10);
    expect(rows.every((row) => row.subject_digest === digest)).toBe(true);
    expect(rows.some((row) => JSON.stringify(row).includes("unit-account@example.test"))).toBe(false);
    expect(await countRecentLoginFailures("unit-account@example.test")).toBe(10);
    const summary = await getIntrusionRadarSummary();
    expect(summary.automatedRetaliationEnabled).toBe(false);
    expect(JSON.stringify(summary)).not.toContain(digest!);
    expect(summary.observedLastHour).toEqual(expect.arrayContaining([
      expect.objectContaining({ category: "canary_path", count: 1 }),
      expect.objectContaining({ category: "login_failure", count: 10 }),
    ]));
  });
});
