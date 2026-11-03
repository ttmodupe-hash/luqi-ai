import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";

const stubs = vi.hoisted(() => ({ getPrivateDb: vi.fn() }));
vi.mock("./access", () => ({ getPrivateDb: stubs.getPrivateDb }));
import { classifyDecoyPath, digestAccountEmail, recordSecuritySignal,
  getIntrusionRadarSummary, countRecentLoginFailures } from "./intrusionRadar";
import { intrusionDecoyMiddleware } from "./intrusionRadarMiddleware";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("LUQI_SECURITY_HMAC_KEY", "offline-review-key-that-is-not-a-real-secret-0123456789");
});
afterEach(() => vi.unstubAllEnvs());

describe("intrusion radar classification and minimal-data evidence", () => {
  it.each([
    "/.env", "/.git/config", "/.aws/credentials", "/config/.env",
    "/wp-admin", "/server-status", "/__luqi_canary__/runtime-credentials",
  ])("detects a known probe without showing a file: %s", (path) => {
    const item = classifyDecoyPath(path);
    expect(item?.category).toMatch(/^(credential_probe|canary_path)$/);
    expect(item?.severity).toMatch(/^(high|critical)$/);
  });

  it("does not intercept ordinary requests", () => {
    for (const path of ["/", "/health", "/api/auth/login", "/api/trpc/x",
      "/config.json", "/docs/readme", "/.env.example"]) {
      expect(classifyDecoyPath(path)).toBeNull();
    }
  });

  it("derives stable rotated pseudonyms without keeping the email", () => {
    const key = "this-is-a-long-key-for-unit-tests-only-00001";
    const first = digestAccountEmail(" Defender@Example.COM ", key);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(first).toBe(digestAccountEmail("defender@example.com", key));
    expect(first).not.toContain("example");
    expect(first).not.toBe(digestAccountEmail("defender@example.com", key + "rotated"));
    expect(digestAccountEmail("defender@example.com", "short")).toBeNull();
    expect(digestAccountEmail("invalid-email", key)).toBeNull();
  });

  it("rejects missing HMAC key for account signals with no persistence fallback", async () => {
    vi.stubEnv("LUQI_SECURITY_HMAC_KEY", "");
    const saved = await recordSecuritySignal({
      category: "login_failure", severity: "medium",
      method: "POST", accountEmail: "test@example.com",
    });
    expect(saved).toBe(false);
    expect(stubs.getPrivateDb).not.toHaveBeenCalled();
  });

  it("persists fixed classifications only; never saves a user email or password", async () => {
    let stored: unknown;
    stubs.getPrivateDb.mockResolvedValue({
      insert: () => ({ values: async (value: unknown) => { stored = value; } }),
    });
    const saved = await recordSecuritySignal({
      category: "login_throttled", severity: "high", method: "POST",
      accountEmail: "defender@example.test",
    });
    expect(saved).toBe(true);
    expect(stored).toMatchObject({
      category: "login_throttled", severity: "high", method: "POST",
      subjectDigest: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
    expect(JSON.stringify(stored)).not.toContain("defender@example.test");
    expect(JSON.stringify(stored)).not.toContain("password");
    expect(Object.keys(stored as object).sort()).toEqual(
      ["category", "method", "severity", "subjectDigest"]);
  });

  it("never records forged categories or severity, including untrusted JS object fields", async () => {
    const result = await recordSecuritySignal({
      category: "deployed" as any, severity: "critical", method: "GET",
    });
    const mismatch = await recordSecuritySignal({
      category: "login_failure", severity: "critical", method: "POST",
    });
    expect(result).toBe(false);
    expect(mismatch).toBe(false);
    expect(stubs.getPrivateDb).not.toHaveBeenCalled();
  });

  it("returns 404 without a decoy secret even if incident database is down", async () => {
    stubs.getPrivateDb.mockRejectedValue(new Error("DB unavailable"));
    const app = new Hono();
    app.use("*", intrusionDecoyMiddleware());
    app.get("/health", (c) => c.text("ok"));
    const path = "/.env";
    const response = await app.request(path);
    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const data = await response.text();
    expect(data).not.toContain("KEY=");
    expect(data).not.toContain("token");
    expect((await app.request("/health")).status).toBe(200);
  });

  it("does not fabricate a clean admin summary if the database is missing", async () => {
    stubs.getPrivateDb.mockRejectedValue(new Error("offline"));
    await expect(getIntrusionRadarSummary()).rejects.toThrow("offline");
    await expect(countRecentLoginFailures("defender@example.com")).resolves.toBeNull();
  });
});
