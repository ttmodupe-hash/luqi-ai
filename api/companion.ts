import { z } from "zod";
import { createRouter, publicQuery, protectedQuery } from "./middleware";
import { getDb, getAuthDb } from "./queries/connection";
import { companionPersonalities, companionConversations, companionMessages, companionMemories } from "../db/schema";
import { eq, desc, and, sql, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { orchestrateRequest } from "./services/orchestrator";

export const DEFAULT_PERSONALITIES = [
  {
    id: 1,
    name: "Luqi Prime",
    description: "Omni-Sovereign Adaptive Companion for universal reasoning, self-improving metacognition, and multi-domain problem solving.",
    avatarUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80",
    communicationStyle: "Empathetic, highly analytical, proactive, and encouraging",
    personalityTraits: ["Continuous Learner", "Adaptive", "Pan-African Visionary", "Mathematical Precision"],
    expertiseAreas: ["STEM", "AI Governance", "African Economics", "Coding", "General Knowledge"],
    systemPrompt: "You are Luqi Prime, the premier AI Companion of LUQI AI. You possess deep universal intelligence, empathy, and active self-improvement capabilities. Always provide thorough, well-reasoned, inspiring, and actionable responses across all disciplines. Reflect upon user feedback and retain key concepts.",
    isDefault: 1,
  },
  {
    id: 2,
    name: "Dr. Kwame",
    description: "Senior STEM Mentor & African Scientific Heritage Scholar specializing in physics, mathematics, chemistry, and indigenous engineering.",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    communicationStyle: "Pedagogical, rigorous, historically grounded, and inspiring",
    personalityTraits: ["Scientific Depth", "Socratic", "Heritage Preserver", "First-Principles"],
    expertiseAreas: ["Kinematics", "Thermodynamics", "Electromagnetism", "Curriculum Standards (CAPS/Cambridge/IB)"],
    systemPrompt: "You are Dr. Kwame, a world-class STEM professor and educational companion. You teach science and mathematics through first principles, intuitive analogies, and rich connections to African scientific heritage. You break down complex formulas into clear, step-by-step masteries.",
    isDefault: 1,
  },
  {
    id: 3,
    name: "Amina",
    description: "Pan-African Trade, Agribusiness & AfCFTA Strategist specialized in cross-border supply chains, market corridors, and fintech payment rails.",
    avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
    communicationStyle: "Strategic, pragmatic, commercial, and solution-driven",
    personalityTraits: ["Commercial Acumen", "Agritech Savvy", "Fintech Specialist", "AfCFTA Champion"],
    expertiseAreas: ["AfCFTA Rules of Origin", "PAPSS/M-Pesa Settlements", "Agritech & Satellite NDVI", "SADC Logistics"],
    systemPrompt: "You are Amina, a Senior Trade Strategist and Pan-African Commercial Companion. You guide entrepreneurs, exporters, and developers through intra-African commerce, tariff calculations, fintech payment integrations (Flutterwave, PAPSS, M-Pesa), and satellite agritech insights.",
    isDefault: 1,
  },
  {
    id: 4,
    name: "Chidi",
    description: "Cisco Certified Internetwork Expert (CCIE/CCNP) & Cloud Systems Architect for enterprise networks, routing, and cybersecurity.",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    communicationStyle: "Technical, direct, hands-on terminal command expert",
    personalityTraits: ["Network Engineer", "Packet Tracer Specialist", "Subnet Wizard", "Security-First"],
    expertiseAreas: ["Cisco IOS CLI", "IPv4/VLSM Subnetting", "BGP/OSPF Routing", "ITIL AI Governance"],
    systemPrompt: "You are Chidi, an elite Network Systems Companion. You mentor network engineers through Cisco CCNA, CCNP, and CCIP exams, provide hands-on CLI command configurations, debug routing tables, calculate binary subnet masks, and audit network topologies.",
    isDefault: 1,
  },
];


async function requireAuthDb() {
  const db = await getAuthDb();
  if (!db) {
    throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Persistent storage is unavailable; companion data is temporarily disabled." });
  }
  return db;
}

async function respondInConversation(db: any, userId: number, conversationId: number, content: string) {
  const [conversation] = await db.select().from(companionConversations)
    .where(and(eq(companionConversations.id, conversationId), eq(companionConversations.userId, userId))).limit(1);
  if (!conversation) throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found." });

  const [personalityRow] = await db.select().from(companionPersonalities)
    .where(eq(companionPersonalities.id, conversation.personalityId)).limit(1);
  const personality = personalityRow || DEFAULT_PERSONALITIES.find((p) => p.id === conversation.personalityId) || DEFAULT_PERSONALITIES[0];

  const priorMessages = await db.select().from(companionMessages)
    .where(eq(companionMessages.conversationId, conversationId))
    .orderBy(desc(companionMessages.createdAt)).limit(20);
  const history = priorMessages.reverse().map((message: any) => `${message.role === "assistant" ? "Assistant" : "User"}: ${message.content}`).join("\n");

  const memories = await db.select().from(companionMemories)
    .where(eq(companionMemories.userId, userId))
    .orderBy(desc(companionMemories.importance)).limit(10);
  const memoryContext = memories.length
    ? memories.map((memory: any, index: number) => `${index + 1}. [${memory.category || memory.memoryType || "Memory"}] ${memory.content}`).join("\n")
    : "No saved personal memories yet.";

  await db.insert(companionMessages).values({ conversationId, role: "user", content });
  const result = await orchestrateRequest({
    query: content,
    context: `RECENT CONVERSATION HISTORY (oldest first):\n${history || "(This is the start of the conversation.)"}\n\nSAVED USER MEMORIES AND PREFERENCES:\n${memoryContext}`,
    systemPrompt: `${personality.systemPrompt || "You are a helpful AI companion."}\n\nUse the supplied conversation history and saved user memories when relevant. Do not claim to remember information that is not present in the context.`,
    useSearch: false,
    // Companion chats must not present deterministic demo fallback text as an AI answer.
    throwOnProviderFailure: true,
  });
  await db.insert(companionMessages).values({ conversationId, role: "assistant", content: result.content });
  await db.update(companionConversations).set({ lastMessageAt: new Date() })
    .where(and(eq(companionConversations.id, conversationId), eq(companionConversations.userId, userId)));
  return { id: Date.now(), content: result.content, role: "assistant" as const, conversationId };
}

export const companionRouter = createRouter({
  // Personality metadata is intentionally public; personal data is not.
  listPersonalities: publicQuery.query(async () => {
    try {
      const db = await getDb();
      const rows = await db.select().from(companionPersonalities).where(eq(companionPersonalities.isDefault, true as any));
      if (rows && rows.length > 0) return rows;
    } catch {
      // Return defaults if the database is unavailable or unpopulated.
    }
    return DEFAULT_PERSONALITIES;
  }),

  getPersonality: publicQuery.input(z.object({ id: z.number() })).query(async ({ input }) => {
    try {
      const db = await getDb();
      const [personality] = await db.select().from(companionPersonalities)
        .where(eq(companionPersonalities.id, input.id)).limit(1);
      if (personality) return personality;
    } catch {
      // Fall through to built-in personalities.
    }
    return DEFAULT_PERSONALITIES.find((p) => p.id === input.id) ?? DEFAULT_PERSONALITIES[0];
  }),

  createConversation: protectedQuery.input(z.object({ personalityId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireAuthDb();
      const [result] = await db.insert(companionConversations).values({
        personalityId: input.personalityId, userId: ctx.user.id, title: "New Conversation",
      });
      return { id: Number(result.insertId), created: true };
    }),

  getConversations: protectedQuery.query(async ({ ctx }) => {
    const db = await requireAuthDb();
    return db.select().from(companionConversations)
      .where(eq(companionConversations.userId, ctx.user.id))
      .orderBy(desc(companionConversations.lastMessageAt)).limit(50);
  }),

  getConversation: protectedQuery.input(z.object({ id: z.number().int().positive() })).query(async ({ input, ctx }) => {
    const db = await requireAuthDb();
    const [conversation] = await db.select().from(companionConversations)
      .where(and(eq(companionConversations.id, input.id), eq(companionConversations.userId, ctx.user.id))).limit(1);
    if (!conversation) return null;
    const messages = await db.select().from(companionMessages)
      .where(eq(companionMessages.conversationId, conversation.id))
      .orderBy(companionMessages.createdAt);
    return { ...conversation, messages };
  }),

  sendMessage: protectedQuery.input(z.object({
    conversationId: z.number().int().positive(),
    content: z.string().trim().min(1).max(20000),
  })).mutation(async ({ input, ctx }) => {
    const db = await requireAuthDb();
    return respondInConversation(db, ctx.user.id, input.conversationId, input.content);
  }),

  search: protectedQuery.input(z.object({ query: z.string().trim().min(1).max(500), limit: z.number().int().min(1).max(50).default(10) }))
    .query(async ({ input, ctx }) => {
      const db = await requireAuthDb();
      const owned = await db.select({ id: companionConversations.id }).from(companionConversations)
        .where(eq(companionConversations.userId, ctx.user.id));
      if (!owned.length) return { results: [] };
      const results = await db.select().from(companionMessages)
        .where(and(inArray(companionMessages.conversationId, owned.map((row: any) => row.id)), sql`content LIKE ${"%" + input.query + "%"}`))
        .orderBy(desc(companionMessages.createdAt)).limit(input.limit);
      return { results };
    }),

  updateFeedback: protectedQuery.input(z.object({ messageId: z.number().int().positive(), feedback: z.string().trim().min(1).max(1000) }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireAuthDb();
      const [message] = await db.select().from(companionMessages).where(eq(companionMessages.id, input.messageId)).limit(1);
      if (!message) throw new TRPCError({ code: "NOT_FOUND", message: "Message not found." });
      const [ownerConversation] = await db.select({ id: companionConversations.id }).from(companionConversations)
        .where(and(eq(companionConversations.id, message.conversationId), eq(companionConversations.userId, ctx.user.id))).limit(1);
      if (!ownerConversation) throw new TRPCError({ code: "NOT_FOUND", message: "Message not found." });
      await db.update(companionMessages).set({ metadata: { feedback: input.feedback } }).where(eq(companionMessages.id, input.messageId));
      return { updated: true };
    }),

  getMemories: protectedQuery.query(async ({ ctx }) => {
    const db = await requireAuthDb();
    return db.select().from(companionMemories).where(eq(companionMemories.userId, ctx.user.id))
      .orderBy(desc(companionMemories.importance)).limit(100);
  }),

  deleteMemory: protectedQuery.input(z.object({
    id: z.number().int().positive(),
  })).mutation(async ({ input, ctx }) => {
    const db = await requireAuthDb();
    const [memory] = await db.select({ id: companionMemories.id }).from(companionMemories)
      .where(and(eq(companionMemories.id, input.id), eq(companionMemories.userId, ctx.user.id))).limit(1);
    if (!memory) throw new TRPCError({ code: "NOT_FOUND", message: "Memory not found." });
    await db.delete(companionMemories)
      .where(and(eq(companionMemories.id, input.id), eq(companionMemories.userId, ctx.user.id)));
    return { deleted: true };
  }),

  addMemory: protectedQuery.input(z.object({
    content: z.string().trim().min(1).max(10000),
    category: z.string().trim().min(1).max(100),
    importance: z.number().min(0).max(10).default(5),
  })).mutation(async ({ input, ctx }) => {
    const db = await requireAuthDb();
    const [result] = await db.insert(companionMemories).values({
      userId: ctx.user.id, content: input.content, category: input.category, importance: String(input.importance),
    });
    return { id: Number(result.insertId), added: true };
  }),

  updateTrustScore: protectedQuery.input(z.object({
    conversationId: z.number().int().positive(), score: z.number().min(0).max(100),
  })).mutation(async ({ input, ctx }) => {
    const db = await requireAuthDb();
    const [conversation] = await db.select({ id: companionConversations.id }).from(companionConversations)
      .where(and(eq(companionConversations.id, input.conversationId), eq(companionConversations.userId, ctx.user.id))).limit(1);
    if (!conversation) throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found." });
    await db.update(companionConversations).set({ trustScore: String(input.score) })
      .where(eq(companionConversations.id, input.conversationId));
    return { updated: true };
  }),

  // Backwards-compatible chat endpoint: select/create a conversation owned by
  // the signed-in user and reuse its persisted history and memories.
  chatDirect: protectedQuery.input(z.object({
    message: z.string().trim().min(1).max(20000),
    personalityId: z.number().int().positive().default(1),
  })).mutation(async ({ input, ctx }) => {
    const db = await requireAuthDb();
    let [conversation] = await db.select().from(companionConversations)
      .where(and(eq(companionConversations.userId, ctx.user.id), eq(companionConversations.personalityId, input.personalityId)))
      .orderBy(desc(companionConversations.lastMessageAt)).limit(1);
    if (!conversation) {
      const [created] = await db.insert(companionConversations).values({
        userId: ctx.user.id, personalityId: input.personalityId, title: "New Conversation",
      });
      const [fresh] = await db.select().from(companionConversations).where(eq(companionConversations.id, Number(created.insertId))).limit(1);
      conversation = fresh;
    }
    if (!conversation) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not create conversation." });
    const response = await respondInConversation(db, ctx.user.id, Number(conversation.id), input.message);
    const personality = DEFAULT_PERSONALITIES.find((p) => p.id === input.personalityId) || DEFAULT_PERSONALITIES[0];
    return { ...response, personality: personality.name, provider: "orchestrator", model: "automatic" };
  }),

  improveCapability: protectedQuery.input(z.object({
    skillDomain: z.string().trim().min(1).max(100),
    feedback: z.string().trim().max(2000),
    rating: z.number().min(1).max(5),
    taughtConcept: z.string().trim().max(10000).optional(),
  })).mutation(async ({ input, ctx }) => {
    const db = await requireAuthDb();
    const content = input.taughtConcept
      ? `Taught Concept [${input.skillDomain}]: ${input.taughtConcept}. Feedback: ${input.feedback}`
      : `Feedback [${input.skillDomain}]: ${input.feedback}`;
    await db.insert(companionMemories).values({
      userId: ctx.user.id,
      category: input.skillDomain,
      content,
      importance: String((input.rating * 2).toFixed(2)),
    });
    return { status: "success", learned: true, message: "Memory saved to your account." };
  }),
});
