import { z } from "zod";
import { createRouter, publicQuery, protectedQuery, adminQuery } from "./middleware";
import { reserveAiRequest } from "./security/aiBudget";
import { orchestrateRequest } from "./services/orchestrator";

export const orchestratorRouter = createRouter({
  generate: protectedQuery
    .input(z.object({
      query: z.string().min(1).max(2000),
      context: z.string().max(5000).optional(),
      systemPrompt: z.string().max(2000).optional(),
      useSearch: z.boolean().default(false),
      forceProvider: z.enum(["openai", "anthropic", "google", "kimi"]).optional(),
      forceModel: z.string().max(100).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await reserveAiRequest(ctx.user.id, "orchestrator.generate");
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

  status: adminQuery.query(() => {
    return getOrchestratorStatus();
  }),

  logs: adminQuery
    .input(z.object({ limit: z.number().min(1).max(100).default(20) }))
    .query(async ({ input }) => {
      return getRecentLogs(input.limit);
    }),
});

// Import the actual functions from the service
import { classifyIntent, getOrchestratorStatus, getRecentLogs } from "./services/orchestrator";
