import { createHash } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { and, eq, lt, gte, count, sql } from "drizzle-orm";
import { users, videoProjects, videoCreditWallets, videoCreditLedger, videoRenderRequests, videoGlobalDailyQuota } from "../../db/schema";
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
export type PaidRenderMode = "silent_mp4" | "narrated_mp4";
export const VOICE_CREDITS_PER_CLIP = 4;
export const MAX_NARRATION_CHARS = 500;

export function quotePaidVideoCredits(
  durationSeconds: number,
  mode: PaidRenderMode = "silent_mp4",
  narration = "",
): number {
  if (!Number.isSafeInteger(durationSeconds) ||
      durationSeconds < MIN_PAID_VIDEO_SECONDS ||
      durationSeconds > MAX_PAID_VIDEO_SECONDS) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Video duration must be between 2 and 10 seconds." });
  }
  if (mode === "silent_mp4") {
    if (narration) throw new TRPCError({ code: "BAD_REQUEST", message: "Silent videos cannot have a billed narration." });
    return durationSeconds * CREDITS_PER_SECOND;
  }
  if (mode !== "narrated_mp4" || !narration.trim() ||
      narration.length > MAX_NARRATION_CHARS ||
      narration.trim().length > durationSeconds * 15) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Narration must be short enough to fit the selected video duration (approximately 15 characters per second).",
    });
  }
  // Flat per-clip surcharge for one short multilingual spoken narration.
  // Rendering and provider costs must be reconciled independently.
  return durationSeconds * CREDITS_PER_SECOND + VOICE_CREDITS_PER_CLIP;
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
  mode?: PaidRenderMode;
  narration?: string;
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
    mode: input.mode ?? "silent_mp4",
    narration: input.narration ?? "",
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
  const charge = quotePaidVideoCredits(input.durationSeconds, input.mode, input.narration);
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

    // One paid render at a time and a bounded daily quota limit vendor
    // exposure. The locked user row serializes this check across instances.
    const configLimit = Number(process.env.LUQI_VIDEO_DAILY_JOB_LIMIT);
    const dailyLimit = Number.isSafeInteger(configLimit) && configLimit >= 1 && configLimit <= 10
      ? configLimit : 3;
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [recent] = await tx.select({ total: count() }).from(videoRenderRequests)
      .where(and(
        eq(videoRenderRequests.userId, input.userId),
        gte(videoRenderRequests.createdAt, since),
      ));
    if (Number(recent?.total ?? 0) >= dailyLimit) {
      throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Daily paid-video limit reached." });
    }

    // Independent global cap: a user can never escape the provider budget
    // by creating more accounts. The UTC-day row serializes all workers.
    const configuredGlobal = Number(process.env.LUQI_VIDEO_GLOBAL_DAILY_LIMIT);
    const maxGlobalJobs = Number.isSafeInteger(configuredGlobal) &&
      configuredGlobal >= 1 && configuredGlobal <= 100 ? configuredGlobal : 10;
    const dayKey = new Date().toISOString().slice(0, 10);
    await tx.execute(sql`INSERT INTO video_global_daily_quota (day_key, jobs)
      VALUES (${dayKey}, 0) ON DUPLICATE KEY UPDATE day_key = day_key`);
    const [globalQuota] = await tx.select().from(videoGlobalDailyQuota)
      .where(eq(videoGlobalDailyQuota.dayKey, dayKey)).limit(1).for("update");
    if (!globalQuota || globalQuota.jobs >= maxGlobalJobs) {
      throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Video rendering capacity reached for today." });
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

    await tx.update(videoGlobalDailyQuota)
      .set({ jobs: globalQuota.jobs + 1 })
      .where(eq(videoGlobalDailyQuota.dayKey, dayKey));
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
      chargeCredits: charge, mode: input.mode ?? "silent_mp4", status: "PROCESSING",
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

/**
 * Operator reconciliation for abandoned requests whose users do not return.
 * Use after reviewing vendor jobs and signed billing logs. The same locked,
 * idempotent refund primitive ensures retries never mint duplicate credits.
 */
export async function reconcileAllStalledVideo(limit = 25): Promise<{ checked: number; refunded: number }> {
  const db = await getPrivateDb();
  const cutoff = new Date(Date.now() - STALE_RENDER_MS);
  const jobs = await db.select({ requestKey: videoRenderRequests.requestKey })
    .from(videoRenderRequests).where(and(
      eq(videoRenderRequests.status, "PROCESSING"),
      lt(videoRenderRequests.createdAt, cutoff),
    )).limit(Math.min(Math.max(Math.floor(limit), 1), 100));
  let refunded = 0;
  for (const job of jobs) {
    if (await refundPaidVideo(job.requestKey, "Unfinished render reconciled by operations", true)) refunded++;
  }
  return { checked: jobs.length, refunded };
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
