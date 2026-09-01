import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { guardianLinks, progressAlerts, studentProfiles, adaptiveHistory, labReports } from "../db/schema";
import { eq, and, desc, gte, sql, count } from "drizzle-orm";

export const guardianRouter = createRouter({
  link: publicQuery
    .input(z.object({
      guardianUserId: z.number(),
      studentUserId: z.number(),
      relationship: z.enum(["parent", "teacher", "tutor"]),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      const [result] = await db.insert(guardianLinks).values({
        guardianUserId: input.guardianUserId,
        studentUserId: input.studentUserId,
        relationship: input.relationship,
      });
      return { id: Number(result.insertId), linked: true };
    }),

  getStudents: publicQuery
    .input(z.object({ guardianUserId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      const links = await db
        .select()
        .from(guardianLinks)
        .where(eq(guardianLinks.guardianUserId, input.guardianUserId));

      const students = [];
      for (const link of links) {
        const [profile] = await db
          .select()
          .from(studentProfiles)
          .where(eq(studentProfiles.userId, link.studentUserId))
          .limit(1);

        const recentActivity = await db
          .select({ count: count() })
          .from(adaptiveHistory)
          .where(and(eq(adaptiveHistory.studentId, link.studentUserId), gte(adaptiveHistory.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))))
          .then((r) => Number(r[0]?.count ?? 0));

        const recentReports = await db
          .select()
          .from(labReports)
          .where(and(eq(labReports.studentId, link.studentUserId), gte(labReports.createdAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))))
          .orderBy(desc(labReports.createdAt))
          .limit(5);

        students.push({
          studentId: link.studentUserId,
          relationship: link.relationship,
          profile: profile ?? null,
          recentActivityCount: recentActivity,
          recentReports,
        });
      }

      return students;
    }),

  createAlert: publicQuery
    .input(z.object({
      guardianId: z.number(),
      studentId: z.number(),
      alertType: z.string(),
      message: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      await db.insert(progressAlerts).values({
        guardianId: input.guardianId,
        studentId: input.studentId,
        alertType: input.alertType,
        message: input.message,
      });
      return { created: true };
    }),

  checkAlerts: publicQuery
    .input(z.object({ guardianUserId: z.number() }))
    .mutation(async ({ input }) => {
      // Check and create alerts based on student activity
      return { alertsCreated: 0 };
    }),
});
