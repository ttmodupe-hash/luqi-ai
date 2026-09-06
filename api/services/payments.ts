// =====================================================================
// PAYMENTS — Paystack micro-credit top-ups (South Africa / Africa)
// Zero new dependencies: fetch + node:crypto HMAC.
//
//   POST /api/v25/payments/topup   → initialize transaction → hosted
//                                    checkout URL (card, EFT, mobile money)
//   POST /api/v25/payments/webhook → HMAC-SHA512 signature-verified
//                                    server callback → credits the wallet
//   GET  /api/v25/payments/balance → current wallet balance
//
// Without PAYSTACK_SECRET_KEY every endpoint answers an honest 503.
// =====================================================================

import crypto from "node:crypto";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || "";
const PAYSTACK_BASE = "https://api.paystack.co";

export function paymentsConfigured(): boolean {
  return PAYSTACK_SECRET.startsWith("sk_") && PAYSTACK_SECRET.length > 10;
}

// ── Initialize a hosted-checkout transaction ─────────────────────────

export async function initializeTopup(
  email: string,
  amountCents: number,
  currency = "ZAR"
): Promise<{ authorizationUrl: string; reference: string } | null> {
  const reference = `luqi_${crypto.randomUUID()}`;

  try {
    const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: amountCents,
        currency,
        reference,
        metadata: { product: "luqi_credit_topup" },
      }),
    });

    const data = (await res.json()) as any;
    if (!res.ok || !data?.data?.authorization_url) {
      console.warn("[Payments] Paystack initialize failed:", data?.message || res.status);
      return null;
    }

    return { authorizationUrl: data.data.authorization_url, reference };
  } catch (e) {
    console.warn("[Payments] Initialize error:", (e as Error)?.message);
    return null;
  }
}

// ── Webhook signature verification (HMAC-SHA512, timing-safe) ────────

export function verifyWebhookSignature(rawBody: string, signature: string | undefined): boolean {
  if (!signature || !PAYSTACK_SECRET) return false;
  const computed = crypto.createHmac("sha512", PAYSTACK_SECRET).update(rawBody).digest("hex");
  const a = Buffer.from(computed, "utf8");
  const b = Buffer.from(String(signature), "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ── Server-side transaction verification (double-check before credit) ─

export async function verifyTransaction(
  reference: string
): Promise<{ amountCents: number; currency: string; channel: string; email: string } | null> {
  try {
    const res = await fetch(`${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
    });
    const data = (await res.json()) as any;
    const t = data?.data;
    if (!res.ok || !t || t.status !== "success") return null;
    return {
      amountCents: Number(t.amount),
      currency: t.currency || "ZAR",
      channel: t.channel || "card",
      email: t.customer?.email || "",
    };
  } catch {
    return null;
  }
}
