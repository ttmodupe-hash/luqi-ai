import { beforeEach, describe, expect, it, vi } from "vitest";
import { MySqlDialect } from "drizzle-orm/mysql-core";

const mocks = vi.hoisted(() => ({ getAuthDb: vi.fn() }));
vi.mock("./queries/connection", () => ({ getAuthDb: mocks.getAuthDb }));

import { appRouter } from "./router";

const user = { id: 42, email: "learner@example.com", name: null, role: "user" };
const caller = appRouter.createCaller({
  req: new Request("https://luqi-ai.com/api/trpc"),
  user,
});

function fakeDatabase() {
  const predicates: Array<{ sql: string; params: unknown[] }> = [];
  const insertions: Record<string, unknown>[] = [];
  const query = {
    from: () => query,
    where: (condition: unknown) => {
      const compiled = new MySqlDialect().sqlToQuery(condition as any);
      predicates.push({ sql: compiled.sql, params: compiled.params });
      return query;
    },
    orderBy: () => query,
    groupBy: () => query,
    limit: async (_n: number) => [],
  };
  return {
    predicates,
    insertions,
    select: () => query,
    insert: () => ({
      values: async (values: Record<string, unknown>) => {
        insertions.push(values);
        return [{ insertId: 1 }];
      },
    }),
    update: () => ({
      set: (_values: unknown) => ({
        where: async (condition: unknown) => {
          const compiled = new MySqlDialect().sqlToQuery(condition as any);
          predicates.push({ sql: compiled.sql, params: compiled.params });
        },
      }),
    }),
  };
}

describe("secure personalised learning and device APIs", () => {
  let db: ReturnType<typeof fakeDatabase>;

  beforeEach(() => {
    vi.resetAllMocks();
    db = fakeDatabase();
    mocks.getAuthDb.mockResolvedValue(db);
  });

  it("rejects caller-controlled identities before accessing the database", async () => {
    await expect(caller.adaptive.getProfile({ userId: 10 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.adaptive.recordAttempt({
      userId: 10, labSlug: "networking", difficulty: "basic", score: 90,
      timeSpentSeconds: 30, completed: true,
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.grading.submitReport({
      studentId: 10, labSlug: "networking", sessionData: {},
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.voice.processCommand({
      userId: 10, commandText: "run",
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.offline.queueAction({
      userId: 10, deviceId: "device-123", action: "save", payload: {},
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.getAuthDb).not.toHaveBeenCalled();
  });

  it("uses the authenticated user ID for all new private records", async () => {
    await caller.adaptive.recordAttempt({
      userId: 42, labSlug: "routing", difficulty: "basic",
      score: 75, timeSpentSeconds: 50, completed: true,
    });
    await caller.grading.submitReport({
      studentId: 42, labSlug: "routing", sessionData: { passed: true },
    });
    await caller.voice.processCommand({ userId: 42, commandText: "run" });
    await caller.offline.queueAction({
      userId: 42, deviceId: "device-123", action: "save", payload: { one: 1 },
    });

    expect(db.insertions).toHaveLength(4);
    expect(db.insertions[0].studentId).toBe(42);
    expect(db.insertions[1].studentId).toBe(42);
    expect(db.insertions[2].userId).toBe(42);
    expect(db.insertions[3].userId).toBe(42);
  });

  it("scopes report, voice, profile, and offline reads in SQL", async () => {
    await caller.adaptive.getProfile({ userId: 42 });
    await caller.adaptive.getRecommendations({ userId: 42 });
    await caller.grading.getReports({ studentId: 42 });
    await caller.grading.getReport({ reportId: 777 });
    await caller.voice.getHistory({ userId: 42 });
    await caller.voice.markExecuted({ commandId: 999 });
    await caller.offline.getPending({ deviceId: "device-123" });
    await caller.offline.markSynced({ ids: [1, 2, 3] });

    expect(db.predicates.length).toBeGreaterThanOrEqual(8);
    for (const p of db.predicates) {
      expect(p.params).toContain(42);
    }
    expect(db.predicates.some(p => p.params.includes(777) && p.params.includes(42))).toBe(true);
    expect(db.predicates.some(p => p.params.includes("device-123") && p.params.includes(42))).toBe(true);
    expect(db.predicates.some(p => p.params.includes(1) && p.params.includes(42))).toBe(true);
  });

  it("enforces video project ownership at creation and in SQL retrieval", async () => {
    await expect(caller.video.create({
      title: "invalid", prompt: "wrong owner", userId: 77,
    })).rejects.toMatchObject({ code: "FORBIDDEN" });

    await caller.video.create({
      title: "my video", prompt: "my lesson", userId: 42,
    });
    expect(db.insertions.at(-1)?.userId).toBe(42);

    await caller.video.list({});
    await caller.video.get({ id: 999 });
    await caller.video.update({ id: 999, title: "new title" });
    await caller.video.delete({ id: 999 });

    const recent = db.predicates.slice(-4);
    expect(recent).toHaveLength(4);
    for (const clause of recent) expect(clause.params).toContain(42);
    expect(recent.some(p => p.params.includes(999) && p.params.includes(42))).toBe(true);
  });

  it("fails with SERVICE_UNAVAILABLE when persistent identity storage is down", async () => {
    mocks.getAuthDb.mockResolvedValue(null);
    await expect(caller.grading.getReports({ studentId: 42 })).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE" });
    await expect(caller.offline.getPending({ deviceId: "device-123" })).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE" });
  });
});
