import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { labReports } from "../db/schema";
import { eq, desc } from "drizzle-orm";

export const gradingRouter = createRouter({
  submitReport: publicQuery
    .input(z.object({
      studentId: z.number(),
      labSlug: z.string(),
      sessionData: z.record(z.string(), z.any()),
      observations: z.string().optional(),
      conclusion: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      const [result] = await db.insert(labReports).values({
        studentId: input.studentId,
        labSlug: input.labSlug,
        sessionDataJson: JSON.stringify(input.sessionData),
        observations: input.observations ?? null,
        conclusion: input.conclusion ?? null,
      });
      return { reportId: Number(result.insertId), submitted: true };
    }),

  getReports: publicQuery
    .input(z.object({ studentId: z.number(), limit: z.number().default(20) }))
    .query(async ({ input }) => {
      const db = await getDb();
      return db
        .select()
        .from(labReports)
        .where(eq(labReports.studentId, input.studentId))
        .orderBy(desc(labReports.createdAt))
        .limit(input.limit);
    }),

  getReport: publicQuery
    .input(z.object({ reportId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      const [report] = await db
        .select()
        .from(labReports)
        .where(eq(labReports.id, input.reportId))
        .limit(1);
      return report ?? null;
    }),
});
