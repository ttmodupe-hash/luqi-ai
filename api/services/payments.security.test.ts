import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyTransaction } from "./payments";

afterEach(() => { vi.unstubAllGlobals(); });

describe("Paystack server transaction verification", () => {
  const reference = "luqi_12345678-1234-4123-8123-123456789abc";
  const verified = {
    status: "success", reference, amount: 9000, currency: "ZAR",
    channel: "card", customer: { email: "learner@example.com" },
  };

  it("accepts only the exact reference returned by Paystack's authenticated verify endpoint", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      Response.json({ data: verified }, { status: 200 }),
    ));
    await expect(verifyTransaction(reference)).resolves.toEqual({
      amountCents: 9000, currency: "ZAR", channel: "card", email: "learner@example.com",
    });
  });

  it("does not credit a different transaction merely because it succeeded", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      Response.json({ data: { ...verified, reference: "other_transaction" } }),
    ));
    await expect(verifyTransaction(reference)).resolves.toBeNull();
  });

  it("does not accept a pending or failed payment", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      Response.json({ data: { ...verified, status: "pending" } }),
    ));
    await expect(verifyTransaction(reference)).resolves.toBeNull();
  });

  it("fails closed when provider cannot be contacted", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("connection failed")));
    await expect(verifyTransaction(reference)).resolves.toBeNull();
  });
});
