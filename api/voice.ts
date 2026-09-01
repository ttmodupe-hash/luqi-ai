import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { voiceCommands } from "../db/schema";
import { eq, desc } from "drizzle-orm";

export const voiceRouter = createRouter({
  processCommand: publicQuery
    .input(z.object({
      userId: z.number().optional(),
      labSlug: z.string().optional(),
      commandText: z.string(),
      language: z.string().default("en"),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      
      // Simple command interpretation
      let action = "unknown";
      let parameters: Record<string, any> = {};
      
      if (input.commandText.toLowerCase().includes("set")) {
        action = "set_variable";
        const match = input.commandText.match(/set\s+(\w+)\s+to\s+(\d+(?:\.\d+)?)/i);
        if (match) {
          parameters = { variable: match[1], value: parseFloat(match[2]) };
        }
      } else if (input.commandText.toLowerCase().includes("run")) {
        action = "run_simulation";
      } else if (input.commandText.toLowerCase().includes("reset")) {
        action = "reset";
      }
      
      await db.insert(voiceCommands).values({
        userId: input.userId ?? null,
        labSlug: input.labSlug ?? null,
        commandText: input.commandText,
        interpretedAction: action,
        confidence: "0.85",
        language: input.language,
      });
      
      return { action, parameters, confidence: 0.85 };
    }),

  getHistory: publicQuery
    .input(z.object({ userId: z.number(), limit: z.number().default(50) }))
    .query(async ({ input }) => {
      const db = await getDb();
      return db
        .select()
        .from(voiceCommands)
        .where(eq(voiceCommands.userId, input.userId))
        .orderBy(desc(voiceCommands.createdAt))
        .limit(input.limit);
    }),

  markExecuted: publicQuery
    .input(z.object({ commandId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      await db
        .update(voiceCommands)
        .set({ executed: 1, executedAt: new Date() })
        .where(eq(voiceCommands.id, input.commandId));
      return { executed: true };
    }),
});
