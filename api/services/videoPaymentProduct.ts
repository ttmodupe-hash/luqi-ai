import { CREDIT_PACKS } from "./credits";

/**
 * Server-recorded checkout metadata, not client/webhook data, determines which
 * product was purchased. Always compare the verified payment amount exactly.
 */
export type VideoPaymentProduct =
  | { kind: "cash" }
  | { kind: "pack"; packId: string; credits: number }
  | { kind: "invalid" };

export function resolveVideoPaymentProduct(
  storedMetadata: string | null | undefined,
  verifiedAmountCents: number,
): VideoPaymentProduct {
  if (storedMetadata == null) return { kind: "cash" };
  try {
    const data: unknown = JSON.parse(storedMetadata);
    if (!data || typeof data !== "object") return { kind: "invalid" };
    const value = data as Record<string, unknown>;
    if (
      value.product !== "video_credit_pack" ||
      typeof value.packId !== "string" ||
      !Number.isSafeInteger(value.credits)
    ) return { kind: "invalid" };
    const pack = CREDIT_PACKS.find((p) => p.id === value.packId);
    if (!pack || pack.credits !== value.credits ||
        Math.round(pack.priceZar * 100) !== verifiedAmountCents) {
      return { kind: "invalid" };
    }
    return { kind: "pack", packId: pack.id, credits: pack.credits };
  } catch {
    return { kind: "invalid" };
  }
}
