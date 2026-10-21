import { z } from "zod";
import { createRouter, protectedQuery } from "./middleware";
import { getPrivateDb, assertOwnUserId } from "./security/access";
import { voiceCommands } from "../db/schema";
import { and, eq, desc } from "drizzle-orm";

export const voiceRouter = createRouter({
  processCommand: protectedQuery
    .input(z.object({
      userId: z.number().int().positive().optional(),
      labSlug: z.string().max(255).optional(),
      commandText: z.string().trim().min(1).max(2000),
      language: z.string().min(2).max(10).default("en"),
    }))
    .mutation(async ({ input, ctx }) => {
      assertOwnUserId(input.userId, ctx.user.id);
      const db = await getPrivateDb();

      let action = "unknown";
      let parameters: Record<string, string | number> = {};
      if (input.commandText.toLowerCase().includes("set")) {
        action = "set_variable";
        const match = input.commandText.match(/set\s+(\w+)\s+to\s+(\d+(?:\.\d+)?)/i);
        if (match) parameters = { variable: match[1], value: parseFloat(match[2]) };
      } else if (input.commandText.toLowerCase().includes("run")) {
        action = "run_simulation";
      } else if (input.commandText.toLowerCase().includes("reset")) {
        action = "reset";
      }

      await db.insert(voiceCommands).values({
        userId: ctx.user.id,
        labSlug: input.labSlug ?? null,
        commandText: input.commandText,
        interpretedAction: action,
        confidence: "0.85",
        language: input.language,
      });
      return { action, parameters, confidence: 0.85 };
    }),

  getHistory: protectedQuery
    .input(z.object({
      userId: z.number().int().positive().optional(),
      limit: z.number().int().min(1).max(100).default(50),
    }).optional())
    .query(async ({ input, ctx }) => {
      assertOwnUserId(input?.userId, ctx.user.id);
      const db = await getPrivateDb();
      return db.select().from(voiceCommands)
        .where(eq(voiceCommands.userId, ctx.user.id))
        .orderBy(desc(voiceCommands.createdAt))
        .limit(input?.limit ?? 50);
    }),

  markExecuted: protectedQuery
    .input(z.object({ commandId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getPrivateDb();
      const [command] = await db.select({ id: voiceCommands.id })
        .from(voiceCommands)
        .where(and(eq(voiceCommands.id, input.commandId), eq(voiceCommands.userId, ctx.user.id)))
        .limit(1);
      if (!command) return { executed: false };
      await db.update(voiceCommands)
        .set({ executed: true, executedAt: new Date() })
        .where(and(eq(voiceCommands.id, input.commandId), eq(voiceCommands.userId, ctx.user.id)));
      return { executed: true };
    }),
});
