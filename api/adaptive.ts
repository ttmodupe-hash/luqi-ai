import { z } from "zod";
import { createRouter, protectedQuery } from "./middleware";
import { getPrivateDb, assertOwnUserId } from "./security/access";
import { studentProfiles, adaptiveHistory } from "../db/schema";
import { eq, desc, sql, count } from "drizzle-orm";

const ownAccount = z.object({ userId: z.number().int().positive().optional() }).optional();

export const adaptiveRouter = createRouter({
  getProfile: protectedQuery
    .input(ownAccount)
    .query(async ({ input, ctx }) => {
      assertOwnUserId(input?.userId, ctx.user.id);
      const db = await getPrivateDb();
      const [profile] = await db.select()
        .from(studentProfiles)
        .where(eq(studentProfiles.userId, ctx.user.id))
        .limit(1);

      if (profile) {
        return {
          userId: ctx.user.id,
          frameworkKey: profile.frameworkKey ?? undefined,
          currentDifficulty: profile.currentDifficulty,
          masteryScore: parseFloat(profile.masteryScore ?? "0"),
          streakDays: profile.streakDays ?? 0,
          learningStyle: profile.learningStyle ?? undefined,
          preferredLanguage: profile.preferredLanguage ?? "en",
        };
      }
      await db.insert(studentProfiles).values({
        userId: ctx.user.id,
        currentDifficulty: "beginner",
        masteryScore: "0",
        streakDays: 0,
        preferredLanguage: "en",
      });
      return {
        userId: ctx.user.id, currentDifficulty: "beginner",
        masteryScore: 0, streakDays: 0, preferredLanguage: "en",
      };
    }),

  recordAttempt: protectedQuery
    .input(z.object({
      userId: z.number().int().positive().optional(),
      labSlug: z.string().trim().min(1).max(255),
      difficulty: z.string().trim().min(1).max(50),
      score: z.number().min(0).max(100),
      timeSpentSeconds: z.number().int().min(0).max(86400),
      hintsUsed: z.number().int().min(0).max(1000).default(0),
      completed: z.boolean(),
    }))
    .mutation(async ({ input, ctx }) => {
      assertOwnUserId(input.userId, ctx.user.id);
      const db = await getPrivateDb();
      await db.insert(adaptiveHistory).values({
        studentId: ctx.user.id,
        labSlug: input.labSlug,
        difficultyAttempted: input.difficulty,
        score: input.score,
        timeSpentSeconds: input.timeSpentSeconds,
        hintsUsed: input.hintsUsed,
        completed: input.completed,
      });
      return { recorded: true };
    }),

  getRecommendations: protectedQuery
    .input(ownAccount)
    .query(async ({ input, ctx }) => {
      assertOwnUserId(input?.userId, ctx.user.id);
      const db = await getPrivateDb();
      const recent = await db.select({
        labSlug: adaptiveHistory.labSlug,
        avgScore: sql<number>`AVG(score)`,
        attempts: count(),
      }).from(adaptiveHistory)
        .where(eq(adaptiveHistory.studentId, ctx.user.id))
        .groupBy(adaptiveHistory.labSlug)
        .orderBy(desc(sql`AVG(score)`))
        .limit(5);
      const struggling = recent.filter((r) => (r.avgScore ?? 0) < 60);
      return {
        suggestedDifficulty: "intermediate",
        suggestedLabs: struggling.map((s) => s.labSlug),
        focusAreas: struggling.length > 0 ? ["Review fundamentals", "Practice more"] : ["Try advanced topics"],
      };
    }),
});
