import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";

export const knowledgeRouter = createRouter({
  getArticles: publicQuery.query(() => []),
  saveArticle: publicQuery.input(z.object({ title: z.string(), content: z.string() })).mutation(() => ({ id: 1 })),
  searchLearning: publicQuery.input(z.object({ query: z.string() })).query(() => ({ results: [] })),
  generateQuiz: publicQuery.input(z.object({ topic: z.string() })).mutation(() => ({ questions: [] })),
});
