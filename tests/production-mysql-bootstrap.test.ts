import { describe, expect, it } from "vitest";
import { CREATE_STATEMENTS } from "../db/bootstrap";

describe("production MySQL schema bootstrap integrity", () => {
  it("creates all 35 application tables and both budget ledgers idempotently", () => {
    expect(CREATE_STATEMENTS.length).toBe(37);
    for (const statement of CREATE_STATEMENTS) {
      expect(statement).toMatch(/CREATE TABLE IF NOT EXISTS/);
    }
    for (const table of ["users", "sessions", "ai_pilot_monthly_spend",
      "ai_pilot_daily_user_usage"]) {
      expect(CREATE_STATEMENTS.some(x =>
        x.includes(`IF NOT EXISTS \`${table}\``) ||
        x.includes(`IF NOT EXISTS ${table} `)
      )).toBe(true);
    }
    expect(CREATE_STATEMENTS.find(x =>
      x.includes("ai_pilot_monthly_spend"))).toContain("ENGINE=InnoDB");
    expect(CREATE_STATEMENTS.find(x =>
      x.includes("ai_pilot_daily_user_usage"))).toContain("PRIMARY KEY");
  });
  it("never seeds a publicly known demo password in production bootstrap", async () => {
    const fs = await import("node:fs/promises");
    const source = await fs.readFile("db/bootstrap.ts", "utf8");
    expect(source).not.toContain("demo123");
    expect(source).not.toContain("demo@luqi.ai");
    expect(source).not.toContain("password_hash, name, role) VALUES");
  });
});
