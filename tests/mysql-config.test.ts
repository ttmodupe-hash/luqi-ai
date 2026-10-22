import { describe, expect, it } from "vitest";
import { parseMySqlConnectionSettings } from "../api/lib/mysqlConfig";

describe("production database contract", () => {
  it("does not mistake an unconfigured environment for durable storage", () => {
    expect(parseMySqlConnectionSettings({})).toBeNull();
  });
  it("parses Railway MySQL URL without silently connecting to localhost", () => {
    const c = parseMySqlConnectionSettings({
      DATABASE_URL: "mysql://dbuser:abc12345@mysql.railway.internal:3308/luqi_data",
    });
    expect(c).toMatchObject({
      host: "mysql.railway.internal",
      port: 3308,
      database: "luqi_data",
      user: "dbuser",
      password: "abc12345",
    });
  });
  it("refuses a PostgreSQL URL even if its service is named mysql", () => {
    expect(() => parseMySqlConnectionSettings({
      DATABASE_URL: "postgresql://admin:hidden@luqi-mysql.railway.internal:5432/luqi",
    })).toThrow(/requires MySQL/);
  });
  it("rejects missing credentials and incomplete DB_HOST settings", () => {
    expect(() => parseMySqlConnectionSettings({
      DATABASE_URL: "mysql://dbuser@mysql.internal:3306/luqi",
    })).toThrow(/required/);
    expect(() => parseMySqlConnectionSettings({ DB_HOST: "mysql.internal" })).toThrow(/Incomplete/);
  });
  it("accepts explicit standalone DB settings", () => {
    expect(parseMySqlConnectionSettings({
      DB_HOST: "db.private", DB_USER: "luqi", DB_PASSWORD: "secretfixture",
      DB_NAME: "luqi_ai", DB_PORT: "3307",
    })).toMatchObject({ host: "db.private", port: 3307, database: "luqi_ai" });
  });
});
