import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({ getPrivateDb: vi.fn() }));
vi.mock("./access", () => ({ getPrivateDb: mock.getPrivateDb }));
import { reserveAiRequest } from "./aiBudget";

function makeDatabase(initialCount = 0) {
  let reservations = 0;
  let lockedUser = false;
  let userFound = true;
  const tx = {
    select: () => {
      let table = "";
      const query = {
        from: (source: any) => {
          table = String(source?.[Symbol.for("drizzle:Name")] ?? "");
          return query;
        },
        where: (_condition: unknown) => query,
        limit: (_max: number) => query,
        for: async (_type: string) => {
          lockedUser = true;
          return userFound ? [{ id: 42 }] : [];
        },
        then: (resolve: (items: unknown[]) => unknown) =>
          Promise.resolve(table === "analytics_events" ? [{ total: initialCount + reservations }] : []).then(resolve),
      };
      return query;
    },
    insert: () => ({
      values: async (record: any) => {
        expect(record.userId).toBe(42);
        expect(record.eventType).toBe("paid_ai_reservation");
        reservations++;
      },
    }),
  };
  return {
    transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(tx),
    get reservations() { return reservations; },
    get lockedUser() { return lockedUser; },
    set userExists(value: boolean) { userFound = value; },
  };
}

describe("persistent per-user AI spending allowance", () => {
  beforeEach(() => {
    vi.stubEnv("LUQI_MAX_AI_CALLS_PER_DAY", "2");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("reserves daily usage only after an authenticated database row lock", async () => {
    const db = makeDatabase();
    mock.getPrivateDb.mockResolvedValue(db);
    await reserveAiRequest(42, "ai-chat");
    await reserveAiRequest(42, "ai-chat");
    expect(db.lockedUser).toBe(true);
    expect(db.reservations).toBe(2);
    await expect(reserveAiRequest(42, "ai-chat")).rejects.toMatchObject({
      code: "TOO_MANY_REQUESTS",
    });
    expect(db.reservations).toBe(2);
  });

  it("never reserves usage for a missing account", async () => {
    const db = makeDatabase();
    db.userExists = false;
    mock.getPrivateDb.mockResolvedValue(db);
    await expect(reserveAiRequest(42, "ai-chat")).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    expect(db.reservations).toBe(0);
  });

  it("does not fall back to a free in-memory allowance", async () => {
    mock.getPrivateDb.mockRejectedValue(new Error("Database unavailable"));
    await expect(reserveAiRequest(42, "ai-chat")).rejects.toThrow("Database unavailable");
  });
});
