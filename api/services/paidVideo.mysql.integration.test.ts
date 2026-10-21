import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { bootstrapDatabase } from "../../db/bootstrap";
import { getPrivateDb } from "../security/access";
import {
  users, paymentEvents, videoCreditWallets, videoCreditLedger,
  videoProjects, videoRenderRequests, videoGlobalDailyQuota,
} from "../../db/schema";
import { settleVerifiedPaystackCharge } from "./paystackSettlement";
import {
  reservePaidVideo, refundPaidVideo, completePaidVideo, getPaidVideoRequest,
} from "./paidVideoLedger";

// This is a genuine MySQL transactional test, not a fake DB adapter. The
// separate GitHub Actions MySQL service opts in with RUN_MYSQL_INTEGRATION=1.
const integration = process.env.RUN_MYSQL_INTEGRATION === "1" ? describe : describe.skip;

integration("verified payments and video debits in real MySQL", () => {
  let db: Awaited<ReturnType<typeof getPrivateDb>>;
  let userId = 0;
  let otherId = 0;
  let email = "";
  let otherEmail = "";
  let paymentReference = "";
  let requestKey = "";

  beforeAll(async () => {
    if (!process.env.DATABASE_URL && !process.env.DB_HOST) {
      throw new Error("Real DATABASE_URL required for MySQL integration");
    }
    await bootstrapDatabase();
    db = await getPrivateDb();
    email = `ci-${randomUUID()}@example.test`;
    otherEmail = `ci-${randomUUID()}@example.test`;
    const [owner] = await db.insert(users).values({
      email, passwordHash: "not-a-login-hash", role: "user", isActive: true,
    });
    const [other] = await db.insert(users).values({
      email: otherEmail, passwordHash: "not-a-login-hash", role: "user", isActive: true,
    });
    userId = Number(owner.insertId);
    otherId = Number(other.insertId);
    paymentReference = `luqi_${randomUUID()}`;
    requestKey = randomUUID();
    await db.insert(paymentEvents).values({
      reference: paymentReference,
      userKey: email,
      amountCents: 40000,
      currency: "ZAR",
      status: "pending",
      payloadJson: JSON.stringify({
        product: "video_credit_pack", packId: "pack-500", credits: 500,
      }),
    });
  }, 30000);

  afterAll(async () => {
    if (!db || !userId) return;
    // The CI DB is ephemeral, but clean all test records anyway.
    await db.delete(videoCreditLedger).where(eq(videoCreditLedger.userKey, email));
    await db.delete(videoRenderRequests).where(eq(videoRenderRequests.userId, userId));
    await db.delete(videoProjects).where(eq(videoProjects.userId, userId));
    await db.delete(videoCreditWallets).where(eq(videoCreditWallets.userKey, email));
    await db.delete(paymentEvents).where(eq(paymentEvents.reference, paymentReference));
    await db.delete(users).where(eq(users.id, userId));
    await db.delete(users).where(eq(users.id, otherId));
    await db.delete(videoGlobalDailyQuota).where(eq(videoGlobalDailyQuota.dayKey, new Date().toISOString().slice(0, 10)));
  }, 30000);

  it("rejects a forged settlement without changing any account balance", async () => {
    const result = await settleVerifiedPaystackCharge(paymentReference, {
      email: "attacker@example.test", amountCents: 40000,
      currency: "ZAR", channel: "card",
    });
    expect(result).toBe("mismatch");
    const wallets = await db.select().from(videoCreditWallets)
      .where(eq(videoCreditWallets.userKey, email));
    expect(wallets).toHaveLength(0);
  });

  it("credits a verified checkout only once despite concurrent callbacks", async () => {
    const verified = { email, amountCents: 40000, currency: "ZAR", channel: "card" };
    const results = await Promise.all([
      settleVerifiedPaystackCharge(paymentReference, verified),
      settleVerifiedPaystackCharge(paymentReference, verified),
    ]);
    expect(results.sort()).toEqual(["already_processed", "credited"]);
    const [wallet] = await db.select().from(videoCreditWallets)
      .where(eq(videoCreditWallets.userKey, email));
    expect(wallet.credits).toBe(500);
    const creditEntries = await db.select().from(videoCreditLedger)
      .where(eq(videoCreditLedger.userKey, email));
    expect(creditEntries).toHaveLength(1);
    expect(creditEntries[0].deltaCredits).toBe(500);
  });

  it("charges an idempotent render once, rejects a second live job and enforces ownership", async () => {
    const input = {
      userId, email, requestKey, prompt: "A pendulum", title: "Physics",
      language: "en", durationSeconds: 3, confirmedCredits: 30,
    };
    const jobs = await Promise.all([reservePaidVideo(input), reservePaidVideo(input)]);
    expect(jobs.filter((job) => job.started)).toHaveLength(1);
    expect(jobs.filter((job) => !job.started)).toHaveLength(1);
    const [wallet] = await db.select().from(videoCreditWallets)
      .where(eq(videoCreditWallets.userKey, email));
    expect(wallet.credits).toBe(470);
    expect((await getPaidVideoRequest(otherId, requestKey))).toBeNull();
    await expect(reservePaidVideo({ ...input, requestKey: randomUUID() }))
      .rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
    await expect(reservePaidVideo({ ...input, prompt: "forged" }))
      .rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("refunds a failed request once and forbids resurrecting it as success", async () => {
    expect(await refundPaidVideo(requestKey, "upstream video provider failed")).toBe(true);
    expect(await refundPaidVideo(requestKey, "duplicate callback")).toBe(false);
    await expect(completePaidVideo(requestKey, "forged-object", "unverified"))
      .rejects.toMatchObject({ code: "CONFLICT" });
    const [wallet] = await db.select().from(videoCreditWallets)
      .where(eq(videoCreditWallets.userKey, email));
    expect(wallet.credits).toBe(500);
    const entries = await db.select().from(videoCreditLedger)
      .where(eq(videoCreditLedger.userKey, email));
    expect(entries).toHaveLength(3); // settled credit, render charge, one refund
    expect(entries.reduce((sum, entry) => sum + entry.deltaCredits, 0)).toBe(500);
    const request = await getPaidVideoRequest(userId, requestKey);
    expect(request?.status).toBe("FAILED");
    expect(request?.videoUrl).toBeNull();
  });

  it("enforces a global provider limit across accounts before any debit", async () => {
    const [current] = await db.select().from(videoGlobalDailyQuota)
      .where(eq(videoGlobalDailyQuota.dayKey, new Date().toISOString().slice(0, 10)));
    expect(current.jobs).toBeGreaterThanOrEqual(1);
    process.env.LUQI_VIDEO_GLOBAL_DAILY_LIMIT = String(current.jobs);
    try {
      await expect(reservePaidVideo({
        userId, email, requestKey: randomUUID(),
        title: "Not billed", prompt: "A wave moving",
        language: "en", durationSeconds: 2, confirmedCredits: 20,
      })).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
      const [wallet] = await db.select().from(videoCreditWallets)
        .where(eq(videoCreditWallets.userKey, email));
      expect(wallet.credits).toBe(500);
    } finally {
      delete process.env.LUQI_VIDEO_GLOBAL_DAILY_LIMIT;
    }
  });


});
