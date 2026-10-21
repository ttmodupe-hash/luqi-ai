import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  db: vi.fn(),
  initialize: vi.fn(),
  configured: vi.fn(),
}));
vi.mock("./security/access", async (importOriginal) => {
  const existing = await importOriginal<typeof import("./security/access")>();
  return { ...existing, getPrivateDb: mocks.db };
});
vi.mock("./services/payments", () => ({
  initializeTopup: mocks.initialize,
  paymentsConfigured: mocks.configured,
}));
import { videoRouter } from "./video";

const caller = videoRouter.createCaller({
  req: new Request("https://luqi-ai.com/api/trpc/video"),
  user: { id: 42, email: "learner@example.com", name: null, role: "user" },
});

describe("real credit checkout security", () => {
  let events: Record<string, unknown>[];
  beforeEach(() => {
    vi.clearAllMocks();
    events = [];
    mocks.configured.mockReturnValue(true);
    mocks.initialize.mockResolvedValue({
      reference: "luqi_12345678-1234-1234-1234-123456789abc",
      authorizationUrl: "https://checkout.example.org/pay",
    });
    mocks.db.mockResolvedValue({
      insert: () => ({
        values: async (values: Record<string, unknown>) => {
          events.push(values);
          return [{ insertId: 1 }];
        },
      }),
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [{ balanceCents: 18000, currency: "ZAR" }],
          }),
        }),
      }),
    });
  });

  it("uses verified account identity and records only a pending checkout", async () => {
    const result = await caller.topupCredits({ packId: "pack-100", credits: 100 });
    expect(mocks.initialize).toHaveBeenCalledWith("learner@example.com", 9000, "ZAR");
    expect(result.pending).toBe(true);
    expect(result.credited).toBe(false);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      userKey: "learner@example.com", amountCents: 9000,
      status: "pending", currency: "ZAR",
    });
  });

  it("does not trust a requested account or fabricated pack", async () => {
    await expect(caller.topupCredits({
      userKey: "other@example.com", credits: 100, packId: "pack-100",
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.topupCredits({
      credits: 1000000, packId: "pack-100",
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(events).toHaveLength(0);
    expect(mocks.initialize).not.toHaveBeenCalled();
  });

  it("reads only the signed-in wallet and does not claim video credits are spendable", async () => {
    const result = await caller.getBalance();
    expect(result).toMatchObject({
      userKey: "learner@example.com", balanceCents: 18000,
      currency: "ZAR", spendableVideoCredits: 0, videoRenderingEnabled: false,
    });
    await expect(caller.getBalance({
      userKey: "another@example.com",
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("cannot credit wallets merely by starting a checkout", async () => {
    mocks.configured.mockReturnValue(false);
    await expect(caller.topupCredits({
      packId: "pack-100", credits: 100,
    })).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE" });
    expect(events).toHaveLength(0);
  });
});
