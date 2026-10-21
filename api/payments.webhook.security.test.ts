import { beforeEach, describe, expect, it, vi } from "vitest";

const provider = vi.hoisted(() => ({
  verify: vi.fn(),
  signature: vi.fn(() => true),
}));
const store = vi.hoisted(() => ({ getPrivateDb: vi.fn() }));
vi.mock("./services/payments", () => ({
  paymentsConfigured: () => true,
  verifyWebhookSignature: provider.signature,
  verifyTransaction: provider.verify,
  initializeTopup: vi.fn(),
}));
vi.mock("./security/access", () => ({ getPrivateDb: store.getPrivateDb }));
import { restCompat } from "./rest-compat";

const reference = "luqi_12345678-1234-1234-1234-123456789abc";
const event = { event: "charge.success", data: { reference } };
function callback() {
  return restCompat.request("https://luqi-ai.com/api/v25/payments/webhook", {
    method: "POST",
    headers: { "content-type": "application/json", "x-paystack-signature": "valid" },
    body: JSON.stringify(event),
  });
}

function transactionalStore() {
  const record = {
    reference,
    userKey: "learner@example.com",
    amountCents: 500,
    currency: "ZAR",
    status: "pending",
  };
  let credits = 0;
  const tx = {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => ({ for: async () => [record] }),
        }),
      }),
    }),
    execute: async (_query: unknown) => { credits += 500; },
    update: () => ({
      set: (updates: Record<string, unknown>) => ({
        where: async () => { record.status = String(updates.status); },
      }),
    }),
  };
  return {
    transaction: (fn: (trx: typeof tx) => Promise<unknown>) => fn(tx),
    get credits() { return credits; },
    get status() { return record.status; },
  };
}

describe("authenticated provider settlement", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    provider.signature.mockReturnValue(true);
    provider.verify.mockResolvedValue({
      email: "learner@example.com", currency: "ZAR",
      amountCents: 500, channel: "card",
    });
  });

  it("awards wallet value at most once for repeated verified callbacks", async () => {
    const db = transactionalStore();
    store.getPrivateDb.mockResolvedValue(db);
    const first = await callback();
    expect(first.status).toBe(200);
    expect(db.credits).toBe(500);
    const replay = await callback();
    expect(replay.status).toBe(200);
    expect(db.credits).toBe(500);
    expect(db.status).toBe("credited");
  });

  it("will not settle a provider payment for the wrong account", async () => {
    const db = transactionalStore();
    store.getPrivateDb.mockResolvedValue(db);
    provider.verify.mockResolvedValue({
      email: "other@example.com", currency: "ZAR",
      amountCents: 500, channel: "card",
    });
    const response = await callback();
    expect(response.status).toBe(400);
    expect(db.credits).toBe(0);
  });

  it("requires the provider signature before querying any private wallet", async () => {
    provider.signature.mockReturnValue(false);
    const response = await callback();
    expect(response.status).toBe(401);
    expect(store.getPrivateDb).not.toHaveBeenCalled();
  });
});
