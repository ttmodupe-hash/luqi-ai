import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, protectedQuery } from "./middleware";
import { getPrivateDb, assertOwnUserId } from "./security/access";
import { guardianLinks, progressAlerts, studentProfiles, adaptiveHistory, labReports, users } from "../db/schema";
import { eq, and, desc, gte, inArray, count, or } from "drizzle-orm";

const relationships = ["parent", "teacher", "tutor"] as const;
const approved = relationships.map((r) => `consented:${r}`);

/**
 * A student starts the request from their authenticated account; the
 * intended guardian must accept from theirs. Only consented:* links authorize
 * records access. Legacy plain relationship values never authorize access.
 */
export const guardianRouter = createRouter({
  link: protectedQuery
    .input(z.object({
      guardianUserId: z.number().int().positive(),
      studentUserId: z.number().int().positive().optional(),
      relationship: z.enum(relationships),
    }))
    .mutation(async ({ input, ctx }) => {
      assertOwnUserId(input.studentUserId, ctx.user.id);
      if (input.guardianUserId === ctx.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "A student cannot be their own guardian." });
      }
      const db = await getPrivateDb();
      const [guardian] = await db.select({ id: users.id }).from(users)
        .where(and(eq(users.id, input.guardianUserId), eq(users.isActive, true)))
        .limit(1);
      if (!guardian) throw new TRPCError({ code: "NOT_FOUND", message: "Guardian account not found." });

      const [existing] = await db.select().from(guardianLinks)
        .where(and(eq(guardianLinks.guardianUserId, input.guardianUserId), eq(guardianLinks.studentUserId, ctx.user.id)))
        .limit(1);
      if (existing) {
        // Never silently turn an old unauthenticated link into approval.
        if (approved.includes(existing.relationship ?? "")) {
          return { id: existing.id, linked: true, pending: false };
        }
        await db.update(guardianLinks)
          .set({ relationship: `pending:${input.relationship}` })
          .where(and(eq(guardianLinks.id, existing.id), eq(guardianLinks.studentUserId, ctx.user.id)));
        return { id: existing.id, linked: false, pending: true };
      }

      const [result] = await db.insert(guardianLinks).values({
        guardianUserId: input.guardianUserId,
        studentUserId: ctx.user.id,
        relationship: `pending:${input.relationship}`,
      });
      return { id: Number(result.insertId), linked: false, pending: true };
    }),

  accept: protectedQuery
    .input(z.object({ linkId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getPrivateDb();
      const [link] = await db.select().from(guardianLinks)
        .where(and(eq(guardianLinks.id, input.linkId), eq(guardianLinks.guardianUserId, ctx.user.id)))
        .limit(1);
      if (!link) throw new TRPCError({ code: "NOT_FOUND", message: "Guardian invitation not found." });
      if (approved.includes(link.relationship ?? "")) return { accepted: true };
      const relationship = link.relationship ?? "";
      if (!relationships.some((r) => relationship === `pending:${r}`)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "This legacy link is not a verified invitation." });
      }
      await db.update(guardianLinks)
        .set({ relationship: relationship.replace("pending:", "consented:") })
        .where(and(
          eq(guardianLinks.id, input.linkId),
          eq(guardianLinks.guardianUserId, ctx.user.id),
          eq(guardianLinks.relationship, relationship),
        ));
      return { accepted: true };
    }),

  revoke: protectedQuery
    .input(z.object({ linkId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getPrivateDb();
      await db.delete(guardianLinks)
        .where(and(eq(guardianLinks.id, input.linkId),
          or(eq(guardianLinks.studentUserId, ctx.user.id), eq(guardianLinks.guardianUserId, ctx.user.id))));
      return { revoked: true };
    }),

  getStudents: protectedQuery
    .input(z.object({ guardianUserId: z.number().int().positive().optional() }).optional())
    .query(async ({ input, ctx }) => {
      assertOwnUserId(input?.guardianUserId, ctx.user.id);
      const db = await getPrivateDb();
      const links = await db.select().from(guardianLinks)
        .where(and(
          eq(guardianLinks.guardianUserId, ctx.user.id),
          inArray(guardianLinks.relationship, approved),
        ));

      const students = [];
      for (const link of links) {
        const [profile] = await db.select().from(studentProfiles)
          .where(eq(studentProfiles.userId, link.studentUserId)).limit(1);
        const recentActivity = await db.select({ count: count() }).from(adaptiveHistory)
          .where(and(eq(adaptiveHistory.studentId, link.studentUserId),
            gte(adaptiveHistory.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))))
          .then((r) => Number(r[0]?.count ?? 0));
        const recentReports = await db.select().from(labReports)
          .where(and(eq(labReports.studentId, link.studentUserId),
            gte(labReports.createdAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))))
          .orderBy(desc(labReports.createdAt)).limit(5);
        students.push({
          studentId: link.studentUserId,
          relationship: (link.relationship ?? "").replace("consented:", ""),
          profile: profile ?? null,
          recentActivityCount: recentActivity,
          recentReports,
        });
      }
      return students;
    }),

  createAlert: protectedQuery
    .input(z.object({
      guardianId: z.number().int().positive().optional(),
      studentId: z.number().int().positive(),
      alertType: z.string().trim().min(1).max(100),
      message: z.string().trim().min(1).max(2000),
    }))
    .mutation(async ({ input, ctx }) => {
      assertOwnUserId(input.guardianId, ctx.user.id);
      const db = await getPrivateDb();
      const [link] = await db.select({ id: guardianLinks.id }).from(guardianLinks)
        .where(and(
          eq(guardianLinks.guardianUserId, ctx.user.id),
          eq(guardianLinks.studentUserId, input.studentId),
          inArray(guardianLinks.relationship, approved),
        )).limit(1);
      if (!link) throw new TRPCError({ code: "FORBIDDEN", message: "Guardian access is not approved." });
      await db.insert(progressAlerts).values({
        guardianId: ctx.user.id,
        studentId: input.studentId,
        alertType: input.alertType,
        message: input.message,
      });
      return { created: true };
    }),

  checkAlerts: protectedQuery
    .input(z.object({ guardianUserId: z.number().int().positive().optional() }).optional())
    .mutation(async ({ input, ctx }) => {
      assertOwnUserId(input?.guardianUserId, ctx.user.id);
      // This route performs no creation, so it does not claim any alerts.
      return { alertsCreated: 0 };
    }),
});
