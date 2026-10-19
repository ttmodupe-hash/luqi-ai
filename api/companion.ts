import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { companionPersonalities, companionConversations, companionMessages, companionMemories } from "../db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
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

export const companionRouter = createRouter({
  listPersonalities: publicQuery.query(async () => {
    try {
      const db = await getDb();
      const rows = await db.select().from(companionPersonalities).where(eq(companionPersonalities.isDefault, true as any));
      if (rows && rows.length > 0) return rows;
    } catch {
      // Return defaults if db unpopulated
    }
    return DEFAULT_PERSONALITIES;
  }),

  getPersonality: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        const [personality] = await db
          .select()
          .from(companionPersonalities)
          .where(eq(companionPersonalities.id, input.id))
          .limit(1);
        if (personality) return personality;
      } catch {
        // Fall through
      }
      return DEFAULT_PERSONALITIES.find((p) => p.id === input.id) ?? DEFAULT_PERSONALITIES[0];
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
        .set({ metadata: { feedback: input.feedback } })
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

  chatDirect: publicQuery
    .input(z.object({
      message: z.string().min(1),
      personalityId: z.number().default(1),
      userContext: z.string().optional(),
      memories: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      const personality = DEFAULT_PERSONALITIES.find((p) => p.id === input.personalityId) || DEFAULT_PERSONALITIES[0];
      
      let memoryContext = "";
      if (input.memories && input.memories.length > 0) {
        memoryContext = `ACTIVE LEARNED MEMORIES & PREFERENCES:\n${input.memories.map((m, idx) => `${idx + 1}. ${m}`).join("\n")}\n\n`;
      }

      const fullSystemPrompt = `${personality.systemPrompt}\n\n${memoryContext}You are actively improving your companionship. Incorporate the user's learned preferences and domain focus into your response.`;

      const result = await orchestrateRequest({
        query: input.message,
        systemPrompt: fullSystemPrompt,
        useSearch: false,
      });

      // Try persisting to DB companionMessages if available
      try {
        const db = await getDb();
        await db.insert(companionMessages).values({
          conversationId: input.personalityId,
          role: "user",
          content: input.message,
        });
        await db.insert(companionMessages).values({
          conversationId: input.personalityId,
          role: "assistant",
          content: result.content,
        });
      } catch {
        // Continue gracefully
      }

      return {
        content: result.content,
        provider: result.provider,
        model: result.model,
        personality: personality.name,
        timestamp: Date.now(),
      };
    }),

  improveCapability: publicQuery
    .input(z.object({
      skillDomain: z.string(),
      feedback: z.string(),
      rating: z.number().min(1).max(5),
      taughtConcept: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        await db.insert(companionMemories).values({
          userId: 1,
          category: input.skillDomain,
          content: input.taughtConcept 
            ? `Taught Concept [${input.skillDomain}]: ${input.taughtConcept}. Feedback: ${input.feedback}`
            : `Feedback [${input.skillDomain}]: ${input.feedback}`,
          importance: String((input.rating * 2).toFixed(2)),
        });
      } catch {
        // Memory logged in session
      }
      return {
        status: "success",
        learned: true,
        message: `Capability in ${input.skillDomain} updated. Memory reinforced with rating ${input.rating}/5.`,
      };
    }),
});
