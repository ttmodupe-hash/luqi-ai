import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { offlineSyncQueue } from "../db/schema";
import { eq, and, desc } from "drizzle-orm";

export const offlineRouter = createRouter({
  queueAction: publicQuery
    .input(z.object({
      userId: z.number().optional(),
      deviceId: z.string(),
      action: z.string(),
      payload: z.record(z.string(), z.any()),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      const [result] = await db.insert(offlineSyncQueue).values({
        userId: input.userId ?? null,
        deviceId: input.deviceId,
        action: input.action,
        payloadJson: JSON.stringify(input.payload),
        synced: 0,
      });
      return { id: Number(result.insertId), queued: true };
    }),

  getPending: publicQuery
    .input(z.object({ deviceId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      return db
        .select()
        .from(offlineSyncQueue)
        .where(and(eq(offlineSyncQueue.deviceId, input.deviceId), eq(offlineSyncQueue.synced, 0)))
        .orderBy(offlineSyncQueue.createdAt);
    }),

  markSynced: publicQuery
    .input(z.object({ ids: z.array(z.number()) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      for (const id of input.ids) {
        await db
          .update(offlineSyncQueue)
          .set({ synced: 1, syncedAt: new Date() })
          .where(eq(offlineSyncQueue.id, id));
      }
      return { synced: true };
    }),

  resolveConflict: publicQuery
    .input(z.object({
      localData: z.record(z.string(), z.any()),
      serverData: z.record(z.string(), z.any()),
      strategy: z.enum(["server_wins", "client_wins", "merge"]).default("server_wins"),
    }))
    .query(async ({ input }) => {
      switch (input.strategy) {
        case "server_wins":
          return input.serverData;
        case "client_wins":
          return input.localData;
        case "merge":
          return { ...input.serverData, ...input.localData };
        default:
          return input.serverData;
      }
    }),
});
