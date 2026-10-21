import { z } from "zod";
import { createRouter, publicQuery, protectedQuery, adminQuery } from "./middleware";
import { reserveAiRequest } from "./security/aiBudget";
import { getDb } from "./queries/connection";
import { getPrivateDb } from "./security/access";
import { botanicalEntries } from "../db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { orchestrateRequest } from "./services/orchestrator";

export const botanicalRouter = createRouter({
  search: publicQuery
    .input(z.object({ query: z.string(), limit: z.number().default(20) }))
    .query(async ({ input }) => {
      const db = await getDb();
      const results = await db
        .select()
        .from(botanicalEntries)
        .where(sql`name LIKE ${'%' + input.query + '%'} OR description LIKE ${'%' + input.query + '%'} OR traditional_use LIKE ${'%' + input.query + '%'}`)
        .orderBy(desc(botanicalEntries.createdAt))
        .limit(input.limit);
      return { results, count: results.length };
    }),

  getById: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      const [entry] = await db
        .select()
        .from(botanicalEntries)
        .where(eq(botanicalEntries.id, input.id))
        .limit(1);
      return entry ?? null;
    }),

  ask: protectedQuery
    .input(z.object({ question: z.string().trim().min(1).max(2000), plantId: z.number().int().positive().optional() }))
    .mutation(async ({ input, ctx }) => {
      await reserveAiRequest(ctx.user.id, "botanical.ask");
      const db = await getPrivateDb();
      
      let context = "";
      if (input.plantId) {
        const [plant] = await db
          .select()
          .from(botanicalEntries)
          .where(eq(botanicalEntries.id, input.plantId))
          .limit(1);
        if (plant) {
          context = `Plant: ${plant.name}\nDescription: ${plant.description}\nTraditional Use: ${plant.traditionalUse}\nSafety: ${plant.safetyNotes}`;
        }
      }

      const result = await orchestrateRequest({
        query: `${context}\n\nQuestion: ${input.question}`,
        systemPrompt: "You are an expert in traditional African medicine and ethnobotany. Provide accurate, safe information about plants and their traditional uses. Always include safety warnings.",
        useSearch: false,
      });

      return { answer: result.content, model: result.model };
    }),

  verify: adminQuery
    .input(z.object({ id: z.number(), verifiedBy: z.string(), notes: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = await getPrivateDb();
      await db
        .update(botanicalEntries)
        .set({
          verified: 1,
          verifiedBy: input.verifiedBy,
          verificationNotes: input.notes ?? null,
          verifiedAt: new Date(),
        })
        .where(eq(botanicalEntries.id, input.id));
      return { verified: true };
    }),

  byRegion: publicQuery
    .input(z.object({ region: z.string(), limit: z.number().default(20) }))
    .query(async ({ input }) => {
      const db = await getDb();
      return db
        .select()
        .from(botanicalEntries)
        .where(eq(botanicalEntries.region, input.region))
        .orderBy(desc(botanicalEntries.createdAt))
        .limit(input.limit);
    }),
});
