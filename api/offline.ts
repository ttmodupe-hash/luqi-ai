import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createRouter, protectedQuery } from "./middleware";
import { getPersistentDb } from "./queries/connection";
import { offlineSyncQueue, users } from "../db/schema";
import { eq, and, asc, count, gt, inArray } from "drizzle-orm";

const id = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const deviceId = z.string().trim().min(1).max(255);
const payload = z.record(z.string(), z.unknown()).refine(
  value => Buffer.byteLength(JSON.stringify(value), "utf8") <= 8192,
  "Payload exceeds 8192 bytes",
);
// Includes acknowledged rows: intake cannot grow storage indefinitely by
// repeatedly acknowledging entries. Retention/erasure requires a separate review.
export const OFFLINE_MAX_STORED = 1000;
async function storage<T>(operation: (db: Awaited<ReturnType<typeof getPersistentDb>>) => Promise<T>): Promise<T> {
  try { return await operation(await getPersistentDb()); }
  catch (error) {
    if (error instanceof TRPCError) throw error;
    throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "OFFLINE_STORAGE_UNAVAILABLE" });
  }
}

export const offlineRouter = createRouter({
  queueAction: protectedQuery.input(z.object({
    deviceId, action: z.string().trim().min(1).max(255), payload,
  }).strict()).mutation(({ input, ctx }) => storage(db => db.transaction(async (tx: any) => {
    // Serialize intake for this owner across processes before counting rows.
    const [owner] = await tx.select({ id: users.id }).from(users)
      .where(and(eq(users.id, ctx.userId), eq(users.isActive, true))).for("update");
    if (!owner) throw new TRPCError({ code: "UNAUTHORIZED", message: "AUTH_REQUIRED" });
    const [total] = await tx.select({ total: count() }).from(offlineSyncQueue)
      .where(eq(offlineSyncQueue.userId, ctx.userId));
    if (Number(total.total) >= OFFLINE_MAX_STORED) {
      throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "OFFLINE_QUEUE_LIMIT" });
    }
    const [result] = await tx.insert(offlineSyncQueue).values({
      userId: ctx.userId, deviceId: input.deviceId, action: input.action,
      payloadJson: JSON.stringify(input.payload), synced: false,
    });
    return { id: Number(result.insertId), queued: true };
  }))),

  getPending: protectedQuery.input(z.object({
    deviceId, after: id.optional(), limit: z.number().int().min(1).max(100).default(50),
  }).strict()).query(({ input, ctx }) => storage(db => db.select().from(offlineSyncQueue)
    .where(and(eq(offlineSyncQueue.userId, ctx.userId), eq(offlineSyncQueue.deviceId, input.deviceId),
      eq(offlineSyncQueue.synced, false), input.after ? gt(offlineSyncQueue.id, input.after) : undefined))
    .orderBy(asc(offlineSyncQueue.id)).limit(input.limit))),

  markSynced: protectedQuery.input(z.object({
    deviceId, ids: z.array(id).min(1).max(100),
  }).strict()).mutation(({ input, ctx }) => storage(async db => {
    await db.update(offlineSyncQueue).set({ synced: true, syncedAt: new Date() })
      .where(and(eq(offlineSyncQueue.userId, ctx.userId), eq(offlineSyncQueue.deviceId, input.deviceId),
        eq(offlineSyncQueue.synced, false), inArray(offlineSyncQueue.id, input.ids)));
    // Same response for absent/foreign IDs; no row-existence oracle.
    return { synced: true };
  })),

  resolveConflict: protectedQuery.input(z.object({
    localData: payload, serverData: payload,
    strategy: z.enum(["server_wins", "client_wins", "merge"]).default("server_wins"),
  }).strict()).query(({ input }) => input.strategy === "merge"
    ? { ...input.serverData, ...input.localData }
    : input.strategy === "client_wins" ? input.localData : input.serverData),
});
