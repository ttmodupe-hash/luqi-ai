import { eq, sql } from "drizzle-orm";
import { creditWallets, paymentEvents, videoCreditLedger, videoCreditWallets } from "../../db/schema";
import { getPrivateDb } from "../security/access";
import { resolveVideoPaymentProduct } from "./videoPaymentProduct";

/**
 * Persistent, idempotent financial settlement.
 * Only call after provider HMAC validation AND independent Paystack API
 * verification; never accept these values directly from the browser.
 */
export type VerifiedPaystackCharge = {
  amountCents: number;
  currency: string;
  email: string;
  channel: string;
};

export async function settleVerifiedPaystackCharge(
  reference: string, verified: VerifiedPaystackCharge,
): Promise<"credited" | "already_processed" | "unknown" | "mismatch"> {
  if (!/^luqi_[0-9a-f-]{36}$/i.test(reference) ||
      !Number.isSafeInteger(verified.amountCents) ||
      verified.amountCents < 500 || verified.amountCents > 5000000 ||
      verified.currency !== "ZAR" ||
      typeof verified.email !== "string" || !verified.email.trim()) return "mismatch";

  const db = await getPrivateDb();
  return db.transaction(async (tx: any) => {
    const [pending] = await tx.select().from(paymentEvents)
      .where(eq(paymentEvents.reference, reference)).limit(1).for("update");
    if (!pending) return "unknown";
    if (pending.status === "credited") return "already_processed";
    if (pending.status !== "pending" ||
        pending.amountCents !== verified.amountCents ||
        pending.currency !== verified.currency ||
        pending.userKey?.toLowerCase() !== verified.email.trim().toLowerCase()) return "mismatch";

    const product = resolveVideoPaymentProduct(pending.payloadJson, verified.amountCents);
    if (product.kind === "invalid") return "mismatch";
    if (product.kind === "pack") {
      await tx.execute(sql`INSERT INTO video_credit_wallets (user_key, credits)
          VALUES (${pending.userKey}, ${product.credits})
          ON DUPLICATE KEY UPDATE credits = credits + ${product.credits}`);
      const [wallet] = await tx.select({ credits: videoCreditWallets.credits })
        .from(videoCreditWallets).where(eq(videoCreditWallets.userKey, pending.userKey)).limit(1);
      if (!wallet) throw new Error("Settled video credit wallet is unavailable.");
      await tx.insert(videoCreditLedger).values({
        reference: `paystack:${reference}`,
        userKey: pending.userKey,
        entryType: "verified_topup", deltaCredits: product.credits,
        balanceAfter: wallet.credits,
      });
    } else {
      await tx.execute(sql`INSERT INTO credit_wallets (user_key, balance_cents, currency)
          VALUES (${pending.userKey}, ${verified.amountCents}, 'ZAR')
          ON DUPLICATE KEY UPDATE balance_cents = balance_cents + ${verified.amountCents}`);
    }
    await tx.update(paymentEvents).set({
      status: "credited",
      eventType: product.kind === "pack" ? "video_pack_settled" : "charge.success",
      channel: verified.channel,
      payloadJson: JSON.stringify({
        provider: "paystack", reference,
        ...(product.kind === "pack"
          ? { product: "video_credit_pack", packId: product.packId, credits: product.credits }
          : {}),
      }),
    }).where(eq(paymentEvents.reference, reference));
    return "credited";
  });
}
