import { describe, expect, it } from "vitest";
import { restCompat } from "../api/rest-compat";

describe("legacy payment data isolation", () => {
  it("never accepts an arbitrary email to initiate a hosted checkout", async () => {
    const result = await restCompat.request("/api/v25/payments/topup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "someone-else@example.invalid", amountZar: 50000 }),
    });
    expect(result.status).toBe(503);
    expect(result.headers.get("Cache-Control")).toBe("no-store");
    expect(await result.json()).toMatchObject({
      status: "unavailable",
      code: "LEGACY_PAYMENTS_DISABLED",
    });
  });

  it("never grants wallet credit from a forged, replayed or unsigned webhook", async () => {
    for (const signature of [undefined, "fake-hmac"]) {
      const result = await restCompat.request("/api/v25/payments/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(signature ? { "x-paystack-signature": signature } : {}),
        },
        body: JSON.stringify({
          event: "charge.success",
          data: { reference: "replayed-test-reference", amount: 5000000 },
        }),
      });
      expect(result.status).toBe(503);
      expect(await result.json()).toMatchObject({
        code: "LEGACY_PAYMENTS_DISABLED",
      });
    }
  });

  it("never discloses a wallet balance from an unauthenticated email lookup", async () => {
    const result = await restCompat.request(
      "/api/v25/payments/balance?key=someone-else%40example.invalid",
    );
    expect(result.status).toBe(503);
    const body = await result.json();
    expect(body.code).toBe("LEGACY_PAYMENTS_DISABLED");
    expect(body).not.toHaveProperty("balanceCents");
    expect(body).not.toHaveProperty("currency");
  });
});
