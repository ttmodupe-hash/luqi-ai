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

  it("requires administrator credentials before returning billing records", async () => {
    const res = await app.request("/api/v1/admin/billing-ledger");
    expect(res.status).toBe(401);
  });
});
