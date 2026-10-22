import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import worker from "./cloudflareWorker.js";

function request(path: string, headers: Record<string, string> = {}) {
  return new Request("https://luqi.example" + path, {
    method: path === "/api/auth/login" ? "POST" : "GET",
    headers,
  });
}
function limiters(apiAllowed = true, authAllowed = true) {
  const api = { limit: vi.fn(async () => ({ success: apiAllowed })) };
  const auth = { limit: vi.fn(async () => ({ success: authAllowed })) };
  return { LUQI_API_RATE_LIMITER: api, LUQI_AUTH_RATE_LIMITER: auth };
}

describe("LUQI optional Cloudflare edge guard", () => {
  const upstream = vi.fn(async () => new Response(JSON.stringify({ user: "private" }), {
    status: 200,
    headers: {
      "set-cookie": "luqi_session=test; HttpOnly",
      "cache-control": "public, max-age=86400",
    },
  }));
  beforeEach(() => {
    upstream.mockClear();
    vi.stubGlobal("fetch", upstream);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("never places dynamic API responses in a shared cache", async () => {
    const env = limiters();
    const result = await worker.fetch(request("/api/v1/public/profile", {
      "cf-connecting-ip": "203.0.113.12",
      cookie: "luqi_session=some-session",
    }), env);
    expect(result.status).toBe(200);
    expect(result.headers.get("cache-control")).toBe("private, no-store");
    expect(result.headers.get("set-cookie")).toContain("luqi_session");
    expect(upstream).toHaveBeenCalledOnce();
    expect(env.LUQI_API_RATE_LIMITER.limit).toHaveBeenCalledWith({ key: "203.0.113.12" });
  });

  it("rejects API requests without a Cloudflare-managed client address", async () => {
    const result = await worker.fetch(request("/api/data", {
      "x-forwarded-for": "203.0.113.40",
    }), limiters());
    expect(result.status).toBe(503);
    expect(upstream).not.toHaveBeenCalled();
  });

  it("fails closed if the required binding is absent or throws", async () => {
    const origin = request("/api/status", { "cf-connecting-ip": "203.0.113.6" });
    expect((await worker.fetch(origin, {})).status).toBe(503);
    const env = limiters();
    env.LUQI_API_RATE_LIMITER.limit.mockRejectedValueOnce(new Error("Cloudflare unavailable"));
    expect((await worker.fetch(origin, env)).status).toBe(503);
    expect(upstream).not.toHaveBeenCalled();
  });

  it("rejects requests that exceed API limits before contacting origin", async () => {
    const env = limiters(false);
    const result = await worker.fetch(request("/api/v1/public", {
      "cf-connecting-ip": "2001:db8::1234",
    }), env);
    expect(result.status).toBe(429);
    expect(result.headers.get("retry-after")).toBe("60");
    expect(upstream).not.toHaveBeenCalled();
  });

  it("uses stricter separate login limits for canonical and legacy paths", async () => {
    const env = limiters(true, false);
    for (const url of ["/api/auth/login", "/api/v1/auth/login", "/auth/register"]) {
      const response = await worker.fetch(request(url, {
        "cf-connecting-ip": "203.0.113.24",
      }), env);
      expect(response.status).toBe(429);
    }
    expect(env.LUQI_AUTH_RATE_LIMITER.limit).toHaveBeenCalledTimes(3);
    expect(upstream).not.toHaveBeenCalled();
  });

  it("forwards non-API assets without touching shared quotas or caches", async () => {
    const env = limiters();
    const result = await worker.fetch(request("/assets/main.js"), env);
    expect(result.status).toBe(200);
    expect(env.LUQI_API_RATE_LIMITER.limit).not.toHaveBeenCalled();
    expect(upstream).toHaveBeenCalledOnce();
  });
});
