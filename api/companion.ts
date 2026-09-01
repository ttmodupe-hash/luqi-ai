import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";

export const companionRouter = createRouter({
  listPersonalities: publicQuery.query(() => []),
  getPersonality: publicQuery.input(z.object({ id: z.number() })).query(() => null),
  createConversation: publicQuery.input(z.object({ personalityId: z.number() })).mutation(() => ({ id: 1 })),
  getConversations: publicQuery.query(() => []),
  getConversation: publicQuery.input(z.object({ id: z.number() })).query(() => null),
  sendMessage: publicQuery.input(z.object({ conversationId: z.number(), content: z.string() })).mutation(() => ({ id: 1 })),
  search: publicQuery.input(z.object({ query: z.string() })).query(() => ({ results: [] })),
  updateFeedback: publicQuery.input(z.object({ messageId: z.number(), feedback: z.string() })).mutation(() => ({ updated: true })),
  getMemories: publicQuery.query(() => []),
  addMemory: publicQuery.input(z.object({ content: z.string(), category: z.string() })).mutation(() => ({ id: 1 })),
  updateTrustScore: publicQuery.input(z.object({ conversationId: z.number(), score: z.number() })).mutation(() => ({ updated: true })),
});
