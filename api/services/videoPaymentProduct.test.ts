import { describe, expect, it } from "vitest";
import { resolveVideoPaymentProduct } from "./videoPaymentProduct";

describe("verified Paystack video pack classification", () => {
  const pack = { product: "video_credit_pack", packId: "pack-500", credits: 500 };
  const stored = JSON.stringify(pack);

  it("mints only the exact server-recorded pack with the verified charge", () => {
    expect(resolveVideoPaymentProduct(stored, 40000)).toEqual({
      kind: "pack", packId: "pack-500", credits: 500,
    });
  });

  it("prevents credit inflation or over/underpayment", () => {
    expect(resolveVideoPaymentProduct(stored, 39999)).toEqual({ kind: "invalid" });
    expect(resolveVideoPaymentProduct(stored, 40001)).toEqual({ kind: "invalid" });
    expect(resolveVideoPaymentProduct(JSON.stringify({ ...pack, credits: 5000 }), 40000))
      .toEqual({ kind: "invalid" });
    expect(resolveVideoPaymentProduct(JSON.stringify({ ...pack, packId: "pack-nope" }), 40000))
      .toEqual({ kind: "invalid" });
  });

  it("keeps ordinary cash deposits out of the video credit ledger", () => {
    expect(resolveVideoPaymentProduct(null, 5000)).toEqual({ kind: "cash" });
  });

  it("never treats malformed or arbitrary metadata as cash deposits", () => {
    expect(resolveVideoPaymentProduct("not-json", 40000)).toEqual({ kind: "invalid" });
    expect(resolveVideoPaymentProduct(JSON.stringify({ product: "unknown" }), 40000))
      .toEqual({ kind: "invalid" });
  });
});
