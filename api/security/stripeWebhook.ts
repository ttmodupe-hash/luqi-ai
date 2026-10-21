import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Stripe's signed webhook envelope is authenticated against the exact raw
 * request body. A verified event is evidence of delivery, NOT permission to
 * credit a wallet or claim revenue settlement.
 */
export type VerifiedStripeEvent = {
  id: string;
  type: string;
  created: number;
  livemode: boolean;
};

export function verifyStripeWebhook(
  rawBody: string,
  signatureHeader: string | null,
  secret: string | undefined,
  nowSeconds = Math.floor(Date.now() / 1000),
): VerifiedStripeEvent | null {
  if (!secret || !secret.startsWith("whsec_") || !signatureHeader || rawBody.length > 1024 * 1024) return null;
  const segments = signatureHeader.split(",").map((part) => part.trim().split("="));
  const timestampRaw = segments.find(([key]) => key === "t")?.[1];
  const signatures = segments.filter(([key]) => key === "v1").map(([, sig]) => sig);
  if (!timestampRaw || !/^\d{10,12}$/.test(timestampRaw) || signatures.length === 0) return null;
  const timestamp = Number(timestampRaw);
  if (!Number.isSafeInteger(timestamp) || Math.abs(nowSeconds - timestamp) > 300) return null;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`, "utf8").digest();
  const valid = signatures.some((sig) => {
    if (!sig || !/^[a-f0-9]{64}$/i.test(sig)) return false;
    const actual = Buffer.from(sig, "hex");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  });
  if (!valid) return null;
  try {
    const event: unknown = JSON.parse(rawBody);
    if (!event || typeof event !== "object") return null;
    const value = event as Record<string, unknown>;
    if (
      typeof value.id !== "string" || !/^evt_[a-zA-Z0-9]+$/.test(value.id) ||
      typeof value.type !== "string" || !/^[a-z_.]{1,100}$/.test(value.type) ||
      typeof value.created !== "number" || !Number.isSafeInteger(value.created) ||
      typeof value.livemode !== "boolean"
    ) return null;
    return { id: value.id, type: value.type, created: value.created, livemode: value.livemode };
  } catch {
    return null;
  }
}
