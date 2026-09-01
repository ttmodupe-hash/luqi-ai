import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";

export const orchestratorRouter = createRouter({
  generate: publicQuery.input(z.object({ query: z.string() })).mutation(() => ({ content: "", provider: "", model: "", intent: "", intentReason: "", fallbackUsed: false, latencyMs: 0, tokensUsed: 0, costEstimate: "", searchAugmented: false, allProvidersAvailable: { openai: false, anthropic: false, google: false } })),
  classify: publicQuery.input(z.object({ query: z.string() })).query(() => ({ intent: "", confidence: 0 })),
  status: publicQuery.query(() => ({ providers: { openai: false, anthropic: false, google: false } })),
  logs: publicQuery.query(() => []),
});
