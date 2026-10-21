import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery, protectedQuery, adminQuery } from "./middleware";
import { getPrivateDb, assertOwnUserId } from "./security/access";
import { getDb } from "./queries/connection";
import { videoProjects, creditWallets, paymentEvents, videoCreditWallets } from "../db/schema";
import { initializeTopup, paymentsConfigured } from "./services/payments";
import { eq, desc, and, sql } from "drizzle-orm";
import {
  calculateJobCost,
  getApiRequirementsStatus,
  SUBSCRIPTION_TIERS,
  CREDIT_PACKS,
} from "./services/credits";
import { paidVideoAvailable, renderPaidVideo } from "./services/paidVideo";
import { quotePaidVideoCredits, reservePaidVideo, completePaidVideo, refundPaidVideo, getPaidVideoRequest, reconcileStalledVideo, reconcileAllStalledVideo } from "./services/paidVideoLedger";

const VALID_LANGUAGES = [
  "en", "zu", "xh", "af", "ns", "tn", "st", "ts", "ss", "ve", "nr",
  "sw", "fr", "pt", "ha", "yo", "ig", "am", "de", "ru", "ja", "zh",
] as const;

const VALID_STATUSES = ["PENDING", "PROCESSING", "SUCCESS", "FAILED"] as const;

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

  getBalance: protectedQuery
    .input(z.object({ userKey: z.string().trim().email().optional() }).optional())
    .query(async ({ input, ctx }) => {
      if (input?.userKey && input.userKey.toLowerCase() !== ctx.user.email.toLowerCase()) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied." });
      }
      await reconcileStalledVideo(ctx.user.id);
      const db = await getPrivateDb();
      const [wallet] = await db.select().from(creditWallets)
        .where(eq(creditWallets.userKey, ctx.user.email.toLowerCase())).limit(1);
      const [videoWallet] = await db.select().from(videoCreditWallets)
        .where(eq(videoCreditWallets.userKey, ctx.user.email.toLowerCase())).limit(1);
      return {
        userKey: ctx.user.email.toLowerCase(),
        balanceCents: wallet?.balanceCents ?? 0,
        currency: wallet?.currency ?? "ZAR",
        credits: videoWallet?.credits ?? 0,
        spendableVideoCredits: videoWallet?.credits ?? 0,
        videoRenderingEnabled: paidVideoAvailable(),
        narratedVideoEnabled: paidVideoAvailable("narrated_mp4"),
      };
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

  topupCredits: protectedQuery
    .input(z.object({
      userKey: z.string().trim().email().optional(),
      credits: z.number().int().positive(),
      packId: z.string().min(1).max(50),
    }))
    .mutation(async ({ input, ctx }) => {
      if (input.userKey && input.userKey.toLowerCase() !== ctx.user.email.toLowerCase()) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied." });
      }
      const pack = CREDIT_PACKS.find((p) => p.id === input.packId && p.credits === input.credits);
      if (!pack) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Select an available credit pack." });
      }
      if (!paymentsConfigured()) {
        throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Payment provider is not configured." });
      }
      if (!paidVideoAvailable()) {
        throw new TRPCError({
          code: "SERVICE_UNAVAILABLE",
          message: "Video credit purchases cannot begin until the real renderer and durable storage are configured.",
        });
      }
      const db = await getPrivateDb();
      const amountCents = Math.round(pack.priceZar * 100);
      const checkout = await initializeTopup(ctx.user.email.toLowerCase(), amountCents, "ZAR");
      if (!checkout) {
        throw new TRPCError({ code: "BAD_GATEWAY", message: "Could not create a verified checkout." });
      }
      await db.insert(paymentEvents).values({
        reference: checkout.reference,
        userKey: ctx.user.email.toLowerCase(),
        eventType: "topup_initialized",
        amountCents,
        currency: "ZAR",
        status: "pending",
        payloadJson: JSON.stringify({ product: "video_credit_pack", packId: pack.id, credits: pack.credits }),
      });
      return {
        pending: true,
        credited: false,
        authorizationUrl: checkout.authorizationUrl,
        reference: checkout.reference,
        creditsRequested: pack.credits,
      };
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

  // Internal recovery: always deduplicates refunds in the database transaction.
  reconcileStalled: adminQuery
    .input(z.object({ limit: z.number().int().min(1).max(100).default(25) }).optional())
    .mutation(async ({ input }) => reconcileAllStalledVideo(input?.limit ?? 25)),

  // Explicit, auditable quote for genuine MP4, with optional provider narration.
  // No unapproved soundtrack charges, fictional credits or hidden fallback.
  quoteRender: publicQuery
    .input(z.object({
      durationSeconds: z.number().int().min(2).max(10),
      mode: z.enum(["silent_mp4", "narrated_mp4"]).default("silent_mp4"),
      narration: z.string().max(500).optional(),
    }))
    .query(({ input }) => ({
      durationSeconds: input.durationSeconds,
      creditsRequired: quotePaidVideoCredits(input.durationSeconds, input.mode, input.narration),
      mode: input.mode,
      soundtrackIncluded: input.mode === "narrated_mp4",
    })),

  getRenderStatus: protectedQuery
    .input(z.object({ requestKey: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      await reconcileStalledVideo(ctx.user.id);
      return getPaidVideoRequest(ctx.user.id, input.requestKey);
    }),

  /**
   * Paid rendering: idempotent, user-scoped debit before the provider call,
   * real MP4 stored in private object storage, atomic refund on failures.
   * Unlike the former legacy pipeline this never uses in-memory credits,
   * mock MP4s, fake audio or caller-controlled account identifiers.
   */
  generate: protectedQuery
    .input(z.object({
      requestKey: z.string().uuid(),
      mode: z.enum(["silent_mp4", "narrated_mp4"]),
      narration: z.string().max(500).optional(),
      confirmedCredits: z.number().int().min(20).max(104),
      prompt: z.string().trim().min(1).max(1000),
      title: z.string().trim().min(1).max(255),
      language: z.enum(VALID_LANGUAGES).default("en"),
      durationSeconds: z.number().int().min(2).max(10),
      userKey: z.string().trim().email().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (input.userKey && input.userKey.toLowerCase() !== ctx.user.email.toLowerCase()) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied." });
      }
      // Validate price and narration before any database change or provider call.
      quotePaidVideoCredits(input.durationSeconds, input.mode, input.narration);
      if (!paidVideoAvailable(input.mode)) {
        throw new TRPCError({
          code: "SERVICE_UNAVAILABLE",
          message: "Real video, narration, FFmpeg, or private storage is not configured for this mode.",
        });
      }
      await reconcileStalledVideo(ctx.user.id);
      const job = await reservePaidVideo({
        userId: ctx.user.id,
        email: ctx.user.email.toLowerCase(),
        requestKey: input.requestKey,
        prompt: input.prompt,
        title: input.title,
        language: input.language,
        durationSeconds: input.durationSeconds,
        confirmedCredits: input.confirmedCredits,
        mode: input.mode,
        narration: input.narration,
      });
      if (!job.started) return {
        ...job,
        videoUrl: job.status === "SUCCESS" ? `/api/video/assets/${input.requestKey}` : null,
      };
      try {
        const result = await renderPaidVideo({
          userId: ctx.user.id, requestKey: input.requestKey,
          prompt: input.prompt, durationSeconds: input.durationSeconds,
          mode: input.mode, narration: input.narration,
        });
        await completePaidVideo(input.requestKey, result.objectKey, result.provider);
        return {
          ...job, status: "SUCCESS" as const,
          videoUrl: `/api/video/assets/${input.requestKey}`,
          provider: result.provider,
        };
      } catch {
        try {
          await refundPaidVideo(input.requestKey, "Video generation failed");
        } catch {
          // Preserve the transaction and stop unsafe retries if payment
          // recovery is unavailable; operator reconciliation is required.
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Video request requires billing reconciliation. Do not retry with a new request key.",
          });
        }
        throw new TRPCError({
          code: "BAD_GATEWAY",
          message: "The video could not be produced. Your reserved credits were refunded.",
        });
      }
    }),
});
