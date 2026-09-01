import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { studentProfiles, adaptiveHistory } from "../db/schema";
import { eq, desc, sql, count } from "drizzle-orm";

export const adaptiveRouter = createRouter({
  getProfile: publicQuery
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      const [profile] = await db
        .select()
        .from(studentProfiles)
        .where(eq(studentProfiles.userId, input.userId))
        .limit(1);
      
      if (profile) {
        return {
          userId: profile.userId!,
          frameworkKey: profile.frameworkKey ?? undefined,
          currentDifficulty: profile.currentDifficulty,
          masteryScore: parseFloat(profile.masteryScore ?? "0"),
          streakDays: profile.streakDays ?? 0,
          learningStyle: profile.learningStyle ?? undefined,
          preferredLanguage: profile.preferredLanguage ?? "en",
        };
      }
      
      // Create new profile
      await db.insert(studentProfiles).values({
        userId: input.userId,
        currentDifficulty: "beginner",
        masteryScore: "0",
        streakDays: 0,
        preferredLanguage: "en",
      });
      
      return {
        userId: input.userId,
        currentDifficulty: "beginner",
        masteryScore: 0,
        streakDays: 0,
        preferredLanguage: "en",
      };
    }),

  recordAttempt: publicQuery
    .input(z.object({
      userId: z.number(),
      labSlug: z.string(),
      difficulty: z.string(),
      score: z.number().min(0).max(100),
      timeSpentSeconds: z.number(),
      hintsUsed: z.number().default(0),
      completed: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      await db.insert(adaptiveHistory).values({
        studentId: input.userId,
        labSlug: input.labSlug,
        difficultyAttempted: input.difficulty,
        score: input.score,
        timeSpentSeconds: input.timeSpentSeconds,
        hintsUsed: input.hintsUsed,
        completed: input.completed ? 1 : 0,
      });
      return { recorded: true };
    }),

  getRecommendations: publicQuery
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      
      const recent = await db
        .select({
          labSlug: adaptiveHistory.labSlug,
          avgScore: sql<number>`AVG(score)`,
          attempts: count(),
        })
        .from(adaptiveHistory)
        .where(eq(adaptiveHistory.studentId, input.userId))
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
