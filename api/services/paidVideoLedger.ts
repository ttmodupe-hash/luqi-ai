import { createHash } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { and, eq, lt } from "drizzle-orm";
import { users, videoProjects, videoCreditWallets, videoCreditLedger, videoRenderRequests } from "../../db/schema";
import { getPrivateDb } from "../security/access";

export const MIN_PAID_VIDEO_SECONDS = 2;
export const MAX_PAID_VIDEO_SECONDS = 10;
export const STALE_RENDER_MS = 15 * 60 * 1000;

export function isStaleRender(createdAt: Date | null | undefined, now = Date.now()): boolean {
  return createdAt instanceof Date &&
    Number.isFinite(createdAt.getTime()) &&
    now - createdAt.getTime() > STALE_RENDER_MS;
}

const CREDITS_PER_SECOND = 10;

export function quotePaidVideoCredits(durationSeconds: number): number {
  if (!Number.isSafeInteger(durationSeconds) ||
      durationSeconds < MIN_PAID_VIDEO_SECONDS ||
      durationSeconds > MAX_PAID_VIDEO_SECONDS) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Video duration must be between 2 and 10 seconds." });
  }
  // Explicit price of a silent MP4 clip: voiceover and script charges are
  // separate products and cannot be silently included in this checkout.
  return durationSeconds * CREDITS_PER_SECOND;
}

export type RenderInput = {
  userId: number;
  email: string;
  requestKey: string;
  prompt: string;
  title: string;
  language: string;
  durationSeconds: number;
  confirmedCredits: number;
};

export function renderIntentDigest(input: RenderInput): string {
  return createHash("sha256").update(JSON.stringify({
    userId: input.userId,
    email: input.email.toLowerCase(),
    title: input.title,
    prompt: input.prompt,
    language: input.language,
    durationSeconds: input.durationSeconds,
    confirmedCredits: input.confirmedCredits,
  })).digest("hex");
}

export type ReservedRender = {
  started: boolean;
  projectId: number;
  requestKey: string;
  status: string;
  chargeCredits: number;
};

export async function reservePaidVideo(input: RenderInput): Promise<ReservedRender> {
  const charge = quotePaidVideoCredits(input.durationSeconds);
  if (input.confirmedCredits !== charge) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Video price changed. Confirm the displayed quote." });
  }
  const db = await getPrivateDb();
  const email = input.email.trim().toLowerCase();
  const digest = renderIntentDigest(input);

  return db.transaction(async (tx: any) => {
    // The user row serializes this user's requests across Cloud Run workers.
    // Lock it before reading idempotency keys or checking concurrency.
    const [user] = await tx.select({ id: users.id }).from(users)
      .where(and(eq(users.id, input.userId), eq(users.isActive, true)))
      .limit(1).for("update");
    if (!user) throw new TRPCError({ code: "UNAUTHORIZED", message: "Account is unavailable." });

    const [existing] = await tx.select().from(videoRenderRequests)
      .where(eq(videoRenderRequests.requestKey, input.requestKey)).limit(1);
    if (existing) {
      if (existing.userId !== input.userId || existing.requestDigest !== digest) {
        throw new TRPCError({ code: "CONFLICT", message: "This video request ID is already in use." });
      }
      return {
        started: false, projectId: existing.projectId,
        requestKey: input.requestKey,
        status: existing.status,
        chargeCredits: existing.chargeCredits,
      };
    }

    const [inProgress] = await tx.select({ id: videoRenderRequests.id })
      .from(videoRenderRequests)
      .where(and(eq(videoRenderRequests.userId, input.userId), eq(videoRenderRequests.status, "PROCESSING")))
      .limit(1);
    if (inProgress) {
      throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Finish your current video before starting another." });
    }

    const [wallet] = await tx.select().from(videoCreditWallets)
      .where(eq(videoCreditWallets.userKey, email)).limit(1).for("update");
    if (!wallet || wallet.credits < charge) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Insufficient verified video credits." });
    }

    const [project] = await tx.insert(videoProjects).values({
      userId: input.userId, title: input.title,
      description: null, prompt: input.prompt, language: input.language,
      status: "PROCESSING", progress: 5, durationSeconds: input.durationSeconds,
    });
    const projectId = Number(project.insertId);
    const balance = wallet.credits - charge;

    await tx.update(videoCreditWallets).set({ credits: balance })
      .where(eq(videoCreditWallets.userKey, email));
    await tx.insert(videoCreditLedger).values({
      reference: `render:${input.requestKey}`,
      userKey: email, entryType: "render_charge",
      deltaCredits: -charge, balanceAfter: balance,
    });
    await tx.insert(videoRenderRequests).values({
      requestKey: input.requestKey,
      userId: input.userId, userKey: email,
      projectId, requestDigest: digest,
      chargeCredits: charge, status: "PROCESSING",
    });
    return { started: true, projectId, requestKey: input.requestKey, status: "PROCESSING", chargeCredits: charge };
  });
}

export async function completePaidVideo(requestKey: string, assetKey: string, provider: string): Promise<void> {
  const db = await getPrivateDb();
  await db.transaction(async (tx: any) => {
    const [job] = await tx.select().from(videoRenderRequests)
      .where(eq(videoRenderRequests.requestKey, requestKey)).limit(1).for("update");
    if (!job || job.status !== "PROCESSING") {
      throw new TRPCError({ code: "CONFLICT", message: "Video completion does not match an active request." });
    }
    await tx.update(videoRenderRequests)
      .set({ status: "SUCCESS", assetKey, completedAt: new Date() })
      .where(eq(videoRenderRequests.id, job.id));
    await tx.update(videoProjects)
      .set({
        status: "SUCCESS", progress: 100,
        videoUrl: `/api/video/assets/${requestKey}`,
        modelUsed: provider, processedAt: new Date(), updatedAt: new Date(),
      })
      .where(and(eq(videoProjects.id, job.projectId), eq(videoProjects.userId, job.userId)));
  });
}

/**
 * Idempotent transaction: at most one refund per request. Also used by
 * authorised operational reconciliation of interrupted render requests.
 */
export async function refundPaidVideo(requestKey: string, reason: string, requireStale = false): Promise<boolean> {
  const db = await getPrivateDb();
  return db.transaction(async (tx: any) => {
    const [job] = await tx.select().from(videoRenderRequests)
      .where(eq(videoRenderRequests.requestKey, requestKey)).limit(1).for("update");
    if (!job || job.status !== "PROCESSING") return false;
    if (requireStale && !isStaleRender(job.createdAt)) return false;
    const [wallet] = await tx.select().from(videoCreditWallets)
      .where(eq(videoCreditWallets.userKey, job.userKey)).limit(1).for("update");
    if (!wallet) throw new Error("Video credit wallet is missing; refund requires review.");
    const newBalance = wallet.credits + job.chargeCredits;
    await tx.update(videoCreditWallets).set({ credits: newBalance })
      .where(eq(videoCreditWallets.userKey, job.userKey));
    await tx.insert(videoCreditLedger).values({
      reference: `refund:${requestKey}`, userKey: job.userKey,
      entryType: "render_refund", deltaCredits: job.chargeCredits,
      balanceAfter: newBalance,
    });
    await tx.update(videoRenderRequests)
      .set({ status: "FAILED", errorMessage: reason.slice(0, 500), completedAt: new Date() })
      .where(eq(videoRenderRequests.id, job.id));
    await tx.update(videoProjects).set({
      status: "FAILED", errorMessage: "Video could not be generated. Credits were refunded.",
      processedAt: new Date(), updatedAt: new Date(),
    }).where(and(eq(videoProjects.id, job.projectId), eq(videoProjects.userId, job.userId)));
    return true;
  });
}

/**
 * An interrupted request can be recovered on the next wallet/status read.
 * The provider polling window is under two minutes, so a fifteen-minute job
 * is abandoned. The lock and status re-check prevent duplicate refunds and
 * races with render completion.
 */
export async function reconcileStalledVideo(userId: number): Promise<number> {
  const db = await getPrivateDb();
  const cutoff = new Date(Date.now() - STALE_RENDER_MS);
  const candidates = await db.select({ requestKey: videoRenderRequests.requestKey })
    .from(videoRenderRequests)
    .where(and(
      eq(videoRenderRequests.userId, userId),
      eq(videoRenderRequests.status, "PROCESSING"),
      lt(videoRenderRequests.createdAt, cutoff),
    )).limit(10);
  let refunded = 0;
  for (const candidate of candidates) {
    if (await refundPaidVideo(candidate.requestKey, "Render interrupted; credit reservation expired", true)) refunded++;
  }
  return refunded;
}

export async function getPaidVideoRequest(userId: number, requestKey: string) {
  const db = await getPrivateDb();
  const [job] = await db.select().from(videoRenderRequests)
    .where(and(eq(videoRenderRequests.requestKey, requestKey), eq(videoRenderRequests.userId, userId)))
    .limit(1);
  if (!job) return null;
  return {
    requestKey: job.requestKey, projectId: job.projectId,
    status: job.status, chargeCredits: job.chargeCredits,
    videoUrl: job.status === "SUCCESS" ? `/api/video/assets/${requestKey}` : null,
    createdAt: job.createdAt, completedAt: job.completedAt,
  };
}
