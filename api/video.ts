import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { videoProjects } from "../db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { orchestrateRequest } from "./services/orchestrator";

const VALID_LANGUAGES = [
  "en", "zu", "xh", "af", "ns", "tn", "st", "ts", "ss", "ve", "nr",
  "sw", "fr", "pt", "ha", "yo", "ig", "am", "de", "ru", "ja", "zh",
] as const;

const VALID_STATUSES = ["PENDING", "PROCESSING", "SUCCESS", "FAILED"] as const;

export const videoRouter = createRouter({
  create: publicQuery
    .input(z.object({
      title: z.string().min(1).max(255),
      description: z.string().max(5000).optional(),
      prompt: z.string().min(1).max(10000),
      language: z.enum(VALID_LANGUAGES).default("en"),
      userId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      const [result] = await db.insert(videoProjects).values({
        title: input.title,
        description: input.description ?? null,
        prompt: input.prompt,
        language: input.language,
        status: "PENDING",
        progress: 0,
        userId: input.userId ?? null,
      });
      return { id: Number(result.insertId), created: true };
    }),

  list: publicQuery
    .input(z.object({
      status: z.enum(VALID_STATUSES).optional(),
      language: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      const limit = input?.limit ?? 50;
      const offset = input?.offset ?? 0;
      let conditions = undefined;
      if (input?.status) {
        conditions = eq(videoProjects.status, input.status);
      }
      if (input?.language) {
        conditions = conditions
          ? and(conditions, eq(videoProjects.language, input.language))
          : eq(videoProjects.language, input.language);
      }
      const rows = await db
        .select()
        .from(videoProjects)
        .where(conditions)
        .orderBy(desc(videoProjects.createdAt))
        .limit(limit)
        .offset(offset);
      return rows;
    }),

  get: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      const [row] = await db
        .select()
        .from(videoProjects)
        .where(eq(videoProjects.id, input.id))
        .limit(1);
      return row ?? null;
    }),

  update: publicQuery
    .input(z.object({
      id: z.number(),
      title: z.string().min(1).max(255).optional(),
      description: z.string().max(5000).optional(),
      prompt: z.string().min(1).max(10000).optional(),
      language: z.enum(VALID_LANGUAGES).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      const { id, ...updates } = input;
      await db
        .update(videoProjects)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(videoProjects.id, id));
      return { updated: true };
    }),

  delete: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      await db.delete(videoProjects).where(eq(videoProjects.id, input.id));
      return { deleted: true };
    }),

  startProcessing: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
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

  updateProgress: publicQuery
    .input(z.object({
      id: z.number(),
      progress: z.number().min(0).max(100),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      await db
        .update(videoProjects)
        .set({
          progress: input.progress,
          updatedAt: new Date(),
        })
        .where(eq(videoProjects.id, input.id));
      return { progress: input.progress };
    }),

  markSuccess: publicQuery
    .input(z.object({
      id: z.number(),
      videoUrl: z.string().url(),
      thumbnailUrl: z.string().url().optional(),
      durationSeconds: z.number().optional(),
      modelUsed: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
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

  markFailed: publicQuery
    .input(z.object({
      id: z.number(),
      errorMessage: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
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

  stats: publicQuery.query(async () => {
    const db = await getDb();
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

  generate: publicQuery
    .input(z.object({
      prompt: z.string().min(1).max(5000),
      title: z.string().min(1).max(255),
      language: z.enum(VALID_LANGUAGES).default("en"),
      description: z.string().max(5000).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      // 1. Create project entry
      const [insertResult] = await db.insert(videoProjects).values({
        title: input.title,
        description: input.description ?? null,
        prompt: input.prompt,
        language: input.language,
        status: "PENDING",
        progress: 0,
      });
      const projectId = Number(insertResult.insertId);

      // 2. Move to PROCESSING
      await db
        .update(videoProjects)
        .set({ status: "PROCESSING", updatedAt: new Date() })
        .where(eq(videoProjects.id, projectId));

      // 3. Call AI orchestrator for video script/content generation
      try {
        const aiResult = await orchestrateRequest({
          query: `Create a detailed video script and scene breakdown for: ${input.prompt}. Respond in ${input.language} if possible.`,
          systemPrompt:
            "You are a professional video script writer. Create a detailed scene-by-scene breakdown with visual descriptions, narration text, and timing. Format as JSON with scenes array.",
          useSearch: false,
          forceProvider: "openai",
          forceModel: "gpt-4o",
        });

        // 4. Mark as SUCCESS with generated content
        await db
          .update(videoProjects)
          .set({
            status: "SUCCESS",
            progress: 100,
            processedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(videoProjects.id, projectId));

        return {
          projectId,
          status: "SUCCESS",
          aiContent: aiResult.content,
          model: aiResult.model,
        };
      } catch (err: any) {
        await db
          .update(videoProjects)
          .set({
            status: "FAILED",
            errorMessage: err.message ?? "AI generation failed",
            processedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(videoProjects.id, projectId));

        return {
          projectId,
          status: "FAILED",
          error: err.message ?? "AI generation failed",
        };
      }
    }),
});
