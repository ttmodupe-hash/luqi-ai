import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { companionPersonalities, companionConversations, companionMessages, companionMemories } from "../db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { orchestrateRequest } from "./services/orchestrator";

export const companionRouter = createRouter({
  listPersonalities: publicQuery.query(async () => {
    const db = await getDb();
    return db.select().from(companionPersonalities).where(eq(companionPersonalities.isDefault, 1));
  }),

  getPersonality: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      const [personality] = await db
        .select()
        .from(companionPersonalities)
        .where(eq(companionPersonalities.id, input.id))
        .limit(1);
      return personality ?? null;
    }),

  createConversation: publicQuery
    .input(z.object({ personalityId: z.number(), userId: z.number().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      const [result] = await db.insert(companionConversations).values({
        personalityId: input.personalityId,
        userId: input.userId ?? null,
        title: "New Conversation",
      });
      return { id: Number(result.insertId), created: true };
    }),

  getConversations: publicQuery
    .input(z.object({ userId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      let query = db.select().from(companionConversations).orderBy(desc(companionConversations.lastMessageAt));
      if (input?.userId) {
        query = query.where(eq(companionConversations.userId, input.userId)) as any;
      }
      return query.limit(50);
    }),

  getConversation: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      const [conversation] = await db
        .select()
        .from(companionConversations)
        .where(eq(companionConversations.id, input.id))
        .limit(1);
      return conversation ?? null;
    }),

  sendMessage: publicQuery
    .input(z.object({ conversationId: z.number(), content: z.string(), userId: z.number().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      
      // Save user message
      await db.insert(companionMessages).values({
        conversationId: input.conversationId,
        role: "user",
        content: input.content,
      });

      // Get conversation and personality for context
      const [conversation] = await db
        .select()
        .from(companionConversations)
        .where(eq(companionConversations.id, input.conversationId))
        .limit(1);

      const [personality] = await db
        .select()
        .from(companionPersonalities)
        .where(eq(companionPersonalities.id, conversation?.personalityId ?? 0))
        .limit(1);

      // Generate AI response
      const result = await orchestrateRequest({
        query: input.content,
        systemPrompt: personality?.systemPrompt ?? "You are a helpful AI companion.",
        useSearch: false,
      });

      // Save AI response
      await db.insert(companionMessages).values({
        conversationId: input.conversationId,
        role: "assistant",
        content: result.content,
      });

      return { id: Date.now(), content: result.content, role: "assistant" };
    }),

  search: publicQuery
    .input(z.object({ query: z.string(), limit: z.number().default(10) }))
    .query(async ({ input }) => {
      const db = await getDb();
      const results = await db
        .select()
        .from(companionMessages)
        .where(sql`content LIKE ${'%' + input.query + '%'}`)
        .orderBy(desc(companionMessages.createdAt))
        .limit(input.limit);
      return { results };
    }),

  updateFeedback: publicQuery
    .input(z.object({ messageId: z.number(), feedback: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      await db
        .update(companionMessages)
        .set({ metadataJson: JSON.stringify({ feedback: input.feedback }) })
        .where(eq(companionMessages.id, input.messageId));
      return { updated: true };
    }),

  getMemories: publicQuery
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      return db
        .select()
        .from(companionMemories)
        .where(eq(companionMemories.userId, input.userId))
        .orderBy(desc(companionMemories.importance));
    }),

  addMemory: publicQuery
    .input(z.object({ userId: z.number(), content: z.string(), category: z.string(), importance: z.number().default(0.5) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      const [result] = await db.insert(companionMemories).values({
        userId: input.userId,
        content: input.content,
        category: input.category,
        importance: input.importance,
      });
      return { id: Number(result.insertId), added: true };
    }),

  updateTrustScore: publicQuery
    .input(z.object({ conversationId: z.number(), score: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      await db
        .update(companionConversations)
        .set({ trustScore: input.score })
        .where(eq(companionConversations.id, input.conversationId));
      return { updated: true };
    }),
});
