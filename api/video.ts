import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery, protectedQuery, adminQuery } from "./middleware";
import { getPrivateDb, assertOwnUserId } from "./security/access";
import { getDb } from "./queries/connection";
import { videoProjects } from "../db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import {
  calculateJobCost,
  getCreditBalance,
  addCredits,
  getApiRequirementsStatus,
  SUBSCRIPTION_TIERS,
  CREDIT_PACKS,
} from "./services/credits";
import { executeAnimationPipeline } from "./services/animation";

const VALID_LANGUAGES = [
  "en", "zu", "xh", "af", "ns", "tn", "st", "ts", "ss", "ve", "nr",
  "sw", "fr", "pt", "ha", "yo", "ig", "am", "de", "ru", "ja", "zh",
] as const;

const VALID_STATUSES = ["PENDING", "PROCESSING", "SUCCESS", "FAILED"] as const;

// Fail closed: these legacy endpoints trust caller-controlled user keys and project IDs.
// Restore only after authenticated ownership checks and verified payment settlement.
const disabledVideoProcedure = publicQuery.use(() => {
  throw new TRPCError({ code: "FORBIDDEN", message: "Video account operations are temporarily unavailable pending secure authentication and payment verification." });
});

export const videoRouter = createRouter({
  // ── Virtual Credit & Pricing Endpoints ────────────────────────────
  calculateCost: publicQuery
    .input(z.object({
      durationSeconds: z.number().min(1).max(300),
      dialogue: z.string().optional(),
    }))
    .query(({ input }) => {
      const breakdown = calculateJobCost(input.durationSeconds, input.dialogue || "");
      return breakdown;
    }),

  getBalance: disabledVideoProcedure
    .input(z.object({ userKey: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const key = input?.userKey || "guest@luqi.ai";
      return getCreditBalance(key);
    }),

  // Provider credential presence and configuration state are internal-only details.
  // Do not reveal infrastructure status to unauthenticated callers.
  getApiStatus: adminQuery.query(() => {
    return getApiRequirementsStatus();
  }),

  getSubscriptionTiers: publicQuery.query(() => {
    return {
      tiers: SUBSCRIPTION_TIERS,
      packs: CREDIT_PACKS,
    };
  }),

  topupCredits: disabledVideoProcedure
    .input(z.object({
      userKey: z.string().optional(),
      credits: z.number().min(10),
      packId: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const key = input.userKey || "guest@luqi.ai";
      const result = await addCredits(
        key,
        input.credits,
        `Credit Pack Top-Up (${input.credits} Luqi Credits)`
      );
      return result;
    }),

  // Personal video projects: all access is based on a validated session,
  // not a caller-supplied user ID. Unowned historical records are not visible.
  create: protectedQuery
    .input(z.object({
      title: z.string().trim().min(1).max(255),
      description: z.string().max(5000).optional(),
      prompt: z.string().trim().min(1).max(10000),
      language: z.enum(VALID_LANGUAGES).default("en"),
      userId: z.number().int().positive().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      assertOwnUserId(input.userId, ctx.user.id);
      const db = await getPrivateDb();
      const [result] = await db.insert(videoProjects).values({
        title: input.title,
        description: input.description ?? null,
        prompt: input.prompt,
        language: input.language,
        status: "PENDING",
        progress: 0,
        userId: ctx.user.id,
      });
      return { id: Number(result.insertId), created: true };
    }),

  list: protectedQuery
    .input(z.object({
      status: z.enum(VALID_STATUSES).optional(),
      language: z.string().min(2).max(10).optional(),
      limit: z.number().int().min(1).max(100).default(50),
      offset: z.number().int().min(0).max(10000).default(0),
    }).optional())
    .query(async ({ input, ctx }) => {
      const db = await getPrivateDb();
      const conditions = [
        eq(videoProjects.userId, ctx.user.id),
        input?.status ? eq(videoProjects.status, input.status) : undefined,
        input?.language ? eq(videoProjects.language, input.language) : undefined,
      ].filter((item): item is NonNullable<typeof item> => item !== undefined);
      return db.select().from(videoProjects)
        .where(and(...conditions))
        .orderBy(desc(videoProjects.createdAt))
        .limit(input?.limit ?? 50)
        .offset(input?.offset ?? 0);
    }),

  get: protectedQuery
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const db = await getPrivateDb();
      const [row] = await db.select().from(videoProjects)
        .where(and(eq(videoProjects.id, input.id), eq(videoProjects.userId, ctx.user.id)))
        .limit(1);
      return row ?? null;
    }),

  update: protectedQuery
    .input(z.object({
      id: z.number().int().positive(),
      title: z.string().trim().min(1).max(255).optional(),
      description: z.string().max(5000).optional(),
      prompt: z.string().trim().min(1).max(10000).optional(),
      language: z.enum(VALID_LANGUAGES).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getPrivateDb();
      const [owned] = await db.select({ id: videoProjects.id }).from(videoProjects)
        .where(and(eq(videoProjects.id, input.id), eq(videoProjects.userId, ctx.user.id)))
        .limit(1);
      if (!owned) return { updated: false };
      const { id, ...updates } = input;
      await db.update(videoProjects).set({ ...updates, updatedAt: new Date() })
        .where(and(eq(videoProjects.id, id), eq(videoProjects.userId, ctx.user.id)));
      return { updated: true };
    }),

  delete: protectedQuery
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getPrivateDb();
      const [owned] = await db.select({ id: videoProjects.id }).from(videoProjects)
        .where(and(eq(videoProjects.id, input.id), eq(videoProjects.userId, ctx.user.id)))
        .limit(1);
      if (!owned) return { deleted: false };
      await db.delete(videoProjects)
        .where(and(eq(videoProjects.id, input.id), eq(videoProjects.userId, ctx.user.id)));
      return { deleted: true };
    }),

  startProcessing: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getPrivateDb();
      await db
        .update(videoProjects)
        .set({
          status: "PROCESSING",
          progress: 0,
          updatedAt: new Date(),
        })
        .where(eq(videoProjects.id, input.id));
      return { status: "PROCESSING" };
    }),

  updateProgress: adminQuery
    .input(z.object({
      id: z.number(),
      progress: z.number().min(0).max(100),
    }))
    .mutation(async ({ input }) => {
      const db = await getPrivateDb();
      await db
        .update(videoProjects)
        .set({
          progress: input.progress,
          updatedAt: new Date(),
        })
        .where(eq(videoProjects.id, input.id));
      return { progress: input.progress };
    }),

  markSuccess: adminQuery
    .input(z.object({
      id: z.number(),
      videoUrl: z.string(),
      thumbnailUrl: z.string().optional(),
      durationSeconds: z.number().optional(),
      modelUsed: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getPrivateDb();
      await db
        .update(videoProjects)
        .set({
          status: "SUCCESS",
          progress: 100,
          videoUrl: input.videoUrl,
          thumbnailUrl: input.thumbnailUrl ?? null,
          durationSeconds: input.durationSeconds ?? null,
          modelUsed: input.modelUsed ?? null,
          processedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(videoProjects.id, input.id));
      return { status: "SUCCESS" };
    }),

  markFailed: adminQuery
    .input(z.object({
      id: z.number(),
      errorMessage: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await getPrivateDb();
      await db
        .update(videoProjects)
        .set({
          status: "FAILED",
          errorMessage: input.errorMessage,
          processedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(videoProjects.id, input.id));
      return { status: "FAILED" };
    }),

  stats: adminQuery.query(async () => {
    const db = await getPrivateDb();
    const total = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(videoProjects)
      .then((r) => Number(r[0]?.count ?? 0));
    const byStatus = await db
      .select({
        status: videoProjects.status,
        count: sql<number>`COUNT(*)`,
      })
      .from(videoProjects)
      .groupBy(videoProjects.status);
    const byLanguage = await db
      .select({
        language: videoProjects.language,
        count: sql<number>`COUNT(*)`,
      })
      .from(videoProjects)
      .groupBy(videoProjects.language)
      .orderBy(desc(sql`COUNT(*)`))
      .limit(10);
    return { total, byStatus, byLanguage };
  }),

  // ── Native Animation Pipeline Generation (Chained API Execution) ──
  generate: disabledVideoProcedure
    .input(z.object({
      prompt: z.string().min(1).max(5000),
      title: z.string().min(1).max(255),
      language: z.enum(VALID_LANGUAGES).default("en"),
      description: z.string().max(5000).optional(),
      dialogue: z.string().max(2000).optional(),
      durationSeconds: z.number().min(2).max(60).default(5),
      userKey: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getPrivateDb();
      const userKey = input.userKey || "guest@luqi.ai";
      const duration = input.durationSeconds || 5;

      // 1. Create project entry in PENDING state
      const [insertResult] = await db.insert(videoProjects).values({
        title: input.title,
        description: input.description ?? null,
        prompt: input.prompt,
        language: input.language,
        status: "PROCESSING",
        progress: 15,
        durationSeconds: duration,
      });
      const projectId = Number(insertResult.insertId);

      try {
        // 2. Execute Animation Pipeline (ElevenLabs + Replicate WAN 2.1 + Storyboard)
        const pipelineResult = await executeAnimationPipeline({
          title: input.title,
          scenePrompt: input.prompt,
          dialogue: input.dialogue || input.description || `Welcome to Luqi AI. Visualizing ${input.title}.`,
          durationSeconds: duration,
          userKey,
          language: input.language,
        });

        // 3. Mark as SUCCESS with generated assets & model info
        await db
          .update(videoProjects)
          .set({
            status: "SUCCESS",
            progress: 100,
            videoUrl: pipelineResult.videoUrl,
            thumbnailUrl: pipelineResult.videoUrl,
            durationSeconds: duration,
            modelUsed: `${pipelineResult.videoProvider} + ${pipelineResult.voiceProvider}`,
            processedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(videoProjects.id, projectId));

        return {
          projectId,
          status: "SUCCESS",
          videoUrl: pipelineResult.videoUrl,
          audioUrl: pipelineResult.audioUrl,
          model: `${pipelineResult.videoProvider} + ${pipelineResult.voiceProvider}`,
          creditsDeducted: pipelineResult.creditsDeducted,
          costBreakdown: pipelineResult.costBreakdown,
          scriptContent: pipelineResult.scriptContent,
        };
      } catch (err: any) {
        await db
          .update(videoProjects)
          .set({
            status: "FAILED",
            errorMessage: err.message ?? "Animation generation failed",
            processedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(videoProjects.id, projectId));

        throw new Error(err.message || "Animation generation failed");
      }
    }),
});
