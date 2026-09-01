import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { orchestrateRequest } from "./services/orchestrator";

export const orchestratorRouter = createRouter({
  generate: publicQuery
    .input(z.object({
      query: z.string().min(1).max(10000),
      context: z.string().max(50000).optional(),
      systemPrompt: z.string().max(10000).optional(),
      useSearch: z.boolean().default(false),
      forceProvider: z.enum(["openai", "anthropic", "google"]).optional(),
      forceModel: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return orchestrateRequest({
        query: input.query,
        context: input.context,
        systemPrompt: input.systemPrompt,
        useSearch: input.useSearch,
        forceProvider: input.forceProvider,
        forceModel: input.forceModel,
      });
    }),

  classify: publicQuery
    .input(z.object({ query: z.string().min(1).max(10000) }))
    .query(async ({ input }) => {
      return classifyIntent(input.query);
    }),

  status: publicQuery.query(() => {
    return getOrchestratorStatus();
  }),

  logs: publicQuery
    .input(z.object({ limit: z.number().min(1).max(100).default(20) }))
    .query(async ({ input }) => {
      return getRecentLogs(input.limit);
    }),
});

// Import the actual functions from the service
import { classifyIntent, getOrchestratorStatus, getRecentLogs } from "./services/orchestrator";
