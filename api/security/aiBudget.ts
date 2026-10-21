import { TRPCError } from "@trpc/server";
import { and, count, eq, gte, sql } from "drizzle-orm";
import { analyticsEvents, users, aiGlobalDailyQuota } from "../../db/schema";
import { getPrivateDb } from "./access";

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_LIMIT = 20;

/**
 * Reserve scarce AI usage *before* calling a paid vendor.
 * Lock the user's row to serialize quota checks across Cloud Run instances.
 * Persisting reservations prevents an attacker resetting limits by switching
 * browser sessions, IP addresses or service instances.
 */
export async function reserveAiRequest(userId: number, feature: string): Promise<void> {
  const db = await getPrivateDb();
  const configured = Number(process.env.LUQI_MAX_AI_CALLS_PER_DAY);
  const maxDaily = Number.isSafeInteger(configured) && configured >= 1 && configured <= 50
    ? configured : DEFAULT_LIMIT;
  const since = new Date(Date.now() - DAY_MS);

  await db.transaction(async (tx: any) => {
    const [user] = await tx.select({ id: users.id }).from(users)
      .where(and(eq(users.id, userId), eq(users.isActive, true)))
      .limit(1).for("update");
    if (!user) throw new TRPCError({ code: "UNAUTHORIZED", message: "Account is unavailable." });

    const [usage] = await tx.select({ total: count() }).from(analyticsEvents)
      .where(and(
        eq(analyticsEvents.userId, userId),
        eq(analyticsEvents.eventType, "paid_ai_reservation"),
        gte(analyticsEvents.createdAt, since),
      )).limit(1);
    if (Number(usage?.total ?? 0) >= maxDaily) {
      throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Daily AI usage limit reached." });
    }

    const configuredGlobal = Number(process.env.LUQI_MAX_AI_CALLS_GLOBAL_PER_DAY);
    const maxGlobal = Number.isSafeInteger(configuredGlobal) &&
      configuredGlobal >= 1 && configuredGlobal <= 5000 ? configuredGlobal : 100;
    const dayKey = new Date().toISOString().slice(0, 10);
    await tx.execute(sql`INSERT INTO ai_global_daily_quota (day_key, jobs)
      VALUES (${dayKey}, 0)
      ON DUPLICATE KEY UPDATE day_key = day_key`);
    const [globalBudget] = await tx.select().from(aiGlobalDailyQuota)
      .where(eq(aiGlobalDailyQuota.dayKey, dayKey))
      .limit(1).for("update");
    if (!globalBudget || globalBudget.jobs >= maxGlobal) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "LUQI's global AI provider budget has been reached for today.",
      });
    }
    await tx.update(aiGlobalDailyQuota)
      .set({ jobs: globalBudget.jobs + 1 })
      .where(eq(aiGlobalDailyQuota.dayKey, dayKey));

    await tx.insert(analyticsEvents).values({
      userId,
      eventType: "paid_ai_reservation",
      eventName: feature.slice(0, 255),
      properties: { evidence: "reserved_before_execution" },
    });
  });
}
