import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { knowledgeArticles } from "../db/schema";
import { eq, desc, sql } from "drizzle-orm";

export const knowledgeRouter = createRouter({
  getArticles: publicQuery
    .input(z.object({ category: z.string().optional(), limit: z.number().default(50) }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      let query = db.select().from(knowledgeArticles).orderBy(desc(knowledgeArticles.createdAt));
      if (input?.category) {
        query = query.where(eq(knowledgeArticles.category, input.category)) as any;
      }
      return query.limit(input?.limit ?? 50);
    }),

  saveArticle: publicQuery
    .input(z.object({ title: z.string(), content: z.string(), category: z.string(), sourceUrl: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      const [result] = await db.insert(knowledgeArticles).values({
        title: input.title,
        content: input.content,
        category: input.category,
        sourceUrl: input.sourceUrl ?? null,
      });
      return { id: Number(result.insertId), saved: true };
    }),

  searchLearning: publicQuery
    .input(z.object({ query: z.string(), limit: z.number().default(20) }))
    .query(async ({ input }) => {
      const db = await getDb();
      const results = await db
        .select()
        .from(knowledgeArticles)
        .where(sql`title LIKE ${'%' + input.query + '%'} OR content LIKE ${'%' + input.query + '%'}`)
        .orderBy(desc(knowledgeArticles.createdAt))
        .limit(input.limit);
      return { results, count: results.length };
    }),

  generateQuiz: publicQuery
    .input(z.object({ topic: z.string(), difficulty: z.string().default("medium"), count: z.number().default(5) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      const articles = await db
        .select()
        .from(knowledgeArticles)
        .where(sql`title LIKE ${'%' + input.topic + '%'} OR content LIKE ${'%' + input.topic + '%'}`)
        .limit(5);

      const questions = articles.map((article, i) => ({
        id: i + 1,
        question: `Based on "${article.title}", what is the main concept?`,
        options: [
          "Option A: " + article.content.substring(0, 50) + "...",
          "Option B: Alternative interpretation",
          "Option C: Related concept",
          "Option D: Unrelated topic",
        ],
        correct: 0,
        explanation: article.content.substring(0, 200),
      }));

      return { questions, topic: input.topic, difficulty: input.difficulty };
    }),
});
