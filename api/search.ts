import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { searchWeb, searchNews, formatSearchContext } from "./services/serper";

export const searchRouter = createRouter({
  web: publicQuery
    .input(z.object({
      query: z.string().min(1).max(500),
      num: z.number().min(1).max(10).default(5),
    }))
    .query(async ({ input }) => {
      const results = await searchWeb(input.query, { num: input.num });
      return {
        results: results?.organic || [],
        answerBox: results?.answerBox || null,
        knowledgeGraph: results?.knowledgeGraph || null,
      };
    }),

  news: publicQuery
    .input(z.object({
      query: z.string().min(1).max(500),
      num: z.number().min(1).max(10).default(5),
    }))
    .query(async ({ input }) => {
      const results = await searchNews(input.query, { num: input.num });
      return {
        results: results?.news || [],
        answerBox: results?.answerBox || null,
      };
    }),

  weather: publicQuery
    .input(z.object({
      query: z.string().min(1).max(500),
    }))
    .query(async ({ input }) => {
      const results = await searchWeb(`weather ${input.query}`, { num: 3 });
      return {
        results: results?.organic || [],
        answerBox: results?.answerBox || null,
      };
    }),

  finance: publicQuery
    .input(z.object({
      query: z.string().min(1).max(500),
    }))
    .query(async ({ input }) => {
      const results = await searchWeb(`stock finance ${input.query}`, { num: 5 });
      return {
        results: results?.organic || [],
        answerBox: results?.answerBox || null,
      };
    }),

  crypto: publicQuery
    .input(z.object({
      query: z.string().min(1).max(500),
    }))
    .query(async ({ input }) => {
      const results = await searchWeb(`crypto ${input.query}`, { num: 5 });
      return {
        results: results?.organic || [],
        answerBox: results?.answerBox || null,
      };
    }),
});
