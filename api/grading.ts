import { z } from "zod";
import { createRouter, protectedQuery } from "./middleware";
import { getPrivateDb, assertOwnUserId } from "./security/access";
import { labReports } from "../db/schema";
import { and, eq, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const gradingRouter = createRouter({
  submitReport: protectedQuery
    .input(z.object({
      studentId: z.number().int().positive().optional(),
      labSlug: z.string().trim().min(1).max(255),
      sessionData: z.record(z.string(), z.unknown()),
      observations: z.string().max(10000).optional(),
      conclusion: z.string().max(10000).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      assertOwnUserId(input.studentId, ctx.user.id);
      const sessionDataJson = JSON.stringify(input.sessionData);
      if (sessionDataJson.length > 50000) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Report data is too large." });
      }
      const db = await getPrivateDb();
      const [result] = await db.insert(labReports).values({
        studentId: ctx.user.id,
        labSlug: input.labSlug,
        sessionDataJson,
        observations: input.observations ?? null,
        conclusion: input.conclusion ?? null,
      });
      return { reportId: Number(result.insertId), submitted: true };
    }),

  getReports: protectedQuery
    .input(z.object({
      studentId: z.number().int().positive().optional(),
      limit: z.number().int().min(1).max(100).default(20),
    }).optional())
    .query(async ({ input, ctx }) => {
      assertOwnUserId(input?.studentId, ctx.user.id);
      const db = await getPrivateDb();
      return db.select().from(labReports)
        .where(eq(labReports.studentId, ctx.user.id))
        .orderBy(desc(labReports.createdAt))
        .limit(input?.limit ?? 20);
    }),

  getReport: protectedQuery
    .input(z.object({ reportId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const db = await getPrivateDb();
      const [report] = await db.select().from(labReports)
        .where(and(eq(labReports.id, input.reportId), eq(labReports.studentId, ctx.user.id)))
        .limit(1);
      return report ?? null;
    }),
});
