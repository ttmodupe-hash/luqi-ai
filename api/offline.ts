import { z } from "zod";
import { createRouter, protectedQuery, publicQuery } from "./middleware";
import { getPrivateDb, assertOwnUserId } from "./security/access";
import { offlineSyncQueue } from "../db/schema";
import { and, eq, desc, inArray } from "drizzle-orm";

export const offlineRouter = createRouter({
  queueAction: protectedQuery
    .input(z.object({
      userId: z.number().int().positive().optional(),
      deviceId: z.string().trim().min(8).max(255),
      action: z.string().trim().min(1).max(255),
      payload: z.record(z.string(), z.unknown()),
    }))
    .mutation(async ({ input, ctx }) => {
      assertOwnUserId(input.userId, ctx.user.id);
      const payloadJson = JSON.stringify(input.payload);
      if (payloadJson.length > 50000) {
        throw new (await import("@trpc/server")).TRPCError({ code: "BAD_REQUEST", message: "Sync item is too large." });
      }
      const db = await getPrivateDb();
      const [result] = await db.insert(offlineSyncQueue).values({
        userId: ctx.user.id,
        deviceId: input.deviceId,
        action: input.action,
        payloadJson,
        synced: false,
      });
      return { id: Number(result.insertId), queued: true };
    }),

  getPending: protectedQuery
    .input(z.object({ deviceId: z.string().trim().min(8).max(255) }))
    .query(async ({ input, ctx }) => {
      const db = await getPrivateDb();
      return db.select().from(offlineSyncQueue)
        .where(and(
          eq(offlineSyncQueue.userId, ctx.user.id),
          eq(offlineSyncQueue.deviceId, input.deviceId),
          eq(offlineSyncQueue.synced, false),
        ))
        .orderBy(desc(offlineSyncQueue.createdAt)).limit(100);
    }),

  markSynced: protectedQuery
    .input(z.object({ ids: z.array(z.number().int().positive()).min(1).max(100) }))
    .mutation(async ({ input, ctx }) => {
      const db = await getPrivateDb();
      const ids = [...new Set(input.ids)];
      // Every mutation is user-scoped in SQL, even if client supplied other IDs.
      await db.update(offlineSyncQueue)
        .set({ synced: true, syncedAt: new Date() })
        .where(and(
          eq(offlineSyncQueue.userId, ctx.user.id),
          inArray(offlineSyncQueue.id, ids),
        ));
      return { processed: true };
    }),

  // Pure conflict-merging utility: no server-side state or identity access.
  resolveConflict: publicQuery
    .input(z.object({
      localData: z.record(z.string(), z.unknown()),
      serverData: z.record(z.string(), z.unknown()),
      strategy: z.enum(["server_wins", "client_wins", "merge"]).default("server_wins"),
    }))
    .query(({ input }) => {
      switch (input.strategy) {
        case "server_wins": return input.serverData;
        case "client_wins": return input.localData;
        case "merge": return { ...input.serverData, ...input.localData };
      }
    }),
});
