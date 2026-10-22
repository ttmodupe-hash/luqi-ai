import { describe, expect, it } from "vitest";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { allowedBrowserOrigin, BoundedRateLimiter } from "../api/lib/httpGuard";

describe("production HTTP perimeter", () => {
  it("allows only exact configured HTTPS origins, never wildcard", () => {
    const env = {
      NODE_ENV: "production",
      FRONTEND_URL: "https://web-production-a4b79.up.railway.app/",
      LUQI_ALLOWED_ORIGINS: "https://app.luqi-ai.com",
    };
    expect(allowedBrowserOrigin("https://app.luqi-ai.com", env))
      .toBe("https://app.luqi-ai.com");
    expect(allowedBrowserOrigin("https://web-production-a4b79.up.railway.app", env))
      .toBe("https://web-production-a4b79.up.railway.app");
    expect(allowedBrowserOrigin("https://evil.example", env)).toBeUndefined();
    expect(allowedBrowserOrigin("https://app.luqi-ai.com.evil.example", env))
      .toBeUndefined();
    expect(allowedBrowserOrigin("http://app.luqi-ai.com", env)).toBeUndefined();
    expect(allowedBrowserOrigin("https://app.luqi-ai.com", { FRONTEND_URL: "*" }))
      .toBeUndefined();
  });
  it("does not expose CORS origin to untrusted browser sites", async () => {
    const env = { FRONTEND_URL: "https://app.luqi-ai.com", NODE_ENV: "production" };
    const app = new Hono();
    app.use("*", cors({ origin: origin => allowedBrowserOrigin(origin, env),
      credentials: false }));
    app.get("/test", c => c.json({ ok: true }));
    const ok = await app.request("/test", {
      headers: { Origin: "https://app.luqi-ai.com" },
    });
    expect(ok.headers.get("access-control-allow-origin")).toBe("https://app.luqi-ai.com");
    expect(ok.headers.get("access-control-allow-credentials")).toBeNull();
    const denied = await app.request("/test", {
      headers: { Origin: "https://attacker.example" },
    });
    expect(denied.headers.get("access-control-allow-origin")).toBeNull();
  });
  it("bounds requests per identifier and entire in-memory cardinality", () => {
    const limiter = new BoundedRateLimiter(2, 1000, 3);
    expect(limiter.permit("user-a", 100)).toBe(true);
    expect(limiter.permit("user-a", 101)).toBe(true);
    expect(limiter.permit("user-a", 102)).toBe(false);
    expect(limiter.permit("user-b", 100)).toBe(true);
    expect(limiter.permit("user-c", 100)).toBe(true);
    expect(limiter.permit("spoofed-user-d", 100)).toBe(false);
    expect(limiter.trackedIdentities).toBe(3);
    expect(limiter.permit("new-user", 1100)).toBe(true);
    expect(limiter.trackedIdentities).toBeLessThanOrEqual(3);
  });
  it("limits resource abuse without mistaking IP keys for billing identity", () => {
    const limiter = new BoundedRateLimiter(1, 100, 1);
    expect(limiter.permit("a".repeat(10000), 10)).toBe(true);
    expect(limiter.permit("a".repeat(10000), 11)).toBe(false);
    expect(limiter.permit("b", 12)).toBe(false);
  });
});
