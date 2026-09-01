import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { contentItems } from "../db/schema";
import { eq, desc } from "drizzle-orm";

export const contentRouter = createRouter({
  getHealthTips: publicQuery
    .input(z.object({ limit: z.number().default(10) }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      return db
        .select()
        .from(contentItems)
        .where(eq(contentItems.category, "health"))
        .orderBy(desc(contentItems.createdAt))
        .limit(input?.limit ?? 10);
    }),

  getAgricultureNews: publicQuery
    .input(z.object({ limit: z.number().default(10) }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      return db
        .select()
        .from(contentItems)
        .where(eq(contentItems.category, "agriculture"))
        .orderBy(desc(contentItems.createdAt))
        .limit(input?.limit ?? 10);
    }),

  getSportsNews: publicQuery
    .input(z.object({ limit: z.number().default(10) }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      return db
        .select()
        .from(contentItems)
        .where(eq(contentItems.category, "sports"))
        .orderBy(desc(contentItems.createdAt))
        .limit(input?.limit ?? 10);
    }),

  getBusinessTips: publicQuery
    .input(z.object({ limit: z.number().default(10) }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      return db
        .select()
        .from(contentItems)
        .where(eq(contentItems.category, "business"))
        .orderBy(desc(contentItems.createdAt))
        .limit(input?.limit ?? 10);
    }),

  getGovernmentInfo: publicQuery
    .input(z.object({ limit: z.number().default(10) }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      return db
        .select()
        .from(contentItems)
        .where(eq(contentItems.category, "government"))
        .orderBy(desc(contentItems.createdAt))
        .limit(input?.limit ?? 10);
    }),

  getTourismInfo: publicQuery
    .input(z.object({ limit: z.number().default(10) }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      return db
        .select()
        .from(contentItems)
        .where(eq(contentItems.category, "tourism"))
        .orderBy(desc(contentItems.createdAt))
        .limit(input?.limit ?? 10);
    }),
});
