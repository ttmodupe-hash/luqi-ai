import { describe, expect, it } from "vitest";
import app from "./boot";

describe("legacy HTTP security integration", () => {
  it.each([
    ["/api/v1/auth/login", "/api/auth/login"],
    ["/auth/register", "/api/auth/register"],
    ["/api/v1/auth/register", "/api/auth/register"],
  ])("routes %s to real session-based authentication", async (source, destination) => {
    const res = await app.request(source, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "a@example.com", password: "fake" }),
    });
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(destination);
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("does not issue a fabricated token on the existing direct legacy login route", async () => {
    const res = await app.request("/auth/login", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "no-account@example.com", password: "invalid" }),
    });
    expect(res.status).toBe(401);
    expect(res.headers.get("set-cookie")).toBeNull();
    expect(await res.text()).not.toContain("LUQI-JWT-");
  });

  it("never accepts an unsigned Stripe event", async () => {
    const res = await app.request("/api/v1/billing/stripe-webhook", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: "evt_fake", type: "checkout.session.completed", amount: 100000 }),
    });
    expect([400, 503]).toContain(res.status);
    const body = await res.json() as Record<string, unknown>;
    expect(body).not.toHaveProperty("record");
    expect(body).not.toHaveProperty("status", "success");
  });

  it.each([
    ["GET", "/api/v1/security/diagnostics"],
    ["GET", "/security/diagnostics"],
    ["GET", "/api/v1/diagnostics/database-indexes"],
    ["GET", "/api/v1/audit/ledger"],
    ["POST", "/api/v1/audit/seal"],
    ["POST", "/api/v1/intelligence/self-optimize"],
    ["POST", "/intelligence/self-optimize"],
    ["GET", "/api/v1/workspace/critiques"],
    ["GET", "/workspace/critiques"],
    ["GET", "/api/v1/grading/ledger/123"],
  ])("requires a real session for sensitive legacy route %s %s", async (method, path) => {
    const res = await app.request(path, {
      method, headers: { "content-type": "application/json" },
      ...(method === "POST" ? { body: JSON.stringify({ actor: "admin", action: "DUMP", payload: {} }) } : {}),
    });
    // A denial may be CSRF-403 (for cross-site browser traffic) or 401.
    expect([401, 403]).toContain(res.status);
    const data = await res.json();
    expect(data).not.toHaveProperty("system_status", "SECURE_HARDENED");
    expect(data).not.toHaveProperty("code_optimization_patch", expect.stringContaining("APPLIED"));
  });

  it.each([
    "/api/gemini/generate", "/api/gemini/image",
    "/api/gemini/video", "/api/gemini/audio",
  ])("blocks anonymous vendor spending before external AI calls: %s", async (path) => {
    const res = await app.request(path, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: "Trigger a billable request" }),
    });
    expect(res.status).toBe(401);
  });

  it.each([
    "/api/khoro/chat", "/api/khoro/multimodal", "/api/khoro/stream", "/api/khoro-legal",
  ])("does not allow anonymous Khoro vendor spending: %s", async (path) => {
    const response = await app.request(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ user_query: "Expensive request" }),
    });
    expect(response.status).toBe(401);
  });

  it("will not accept forged anonymous learner grades or other users' progress", async () => {
    const result = await app.request("/api/v1/analytics/log-progression", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ user_id: 777, lab_id: "chemistry-lab", completion_status: "PASSED" }),
    });
    expect(result.status).toBe(401);
  });

  it("requires administrator credentials before returning billing records", async () => {
    const res = await app.request("/api/v1/admin/billing-ledger");
    expect(res.status).toBe(401);
  });
});
