import { describe, expect, it } from "vitest";
import { addCredits, deductCredits, refundCredits, getCreditBalance } from "./credits";

describe("no unverified video credits", () => {
  it("cannot mint free starter credits from an arbitrary account identifier", async () => {
    await expect(addCredits("stranger@example.com", 10000, "self granted"))
      .rejects.toThrow(/provider-verified/);
  });
  it("cannot deduct or refund credit without an idempotent render request", async () => {
    await expect(deductCredits("stranger@example.com", 10, "arbitrary")).rejects.toThrow(/reservePaidVideo/);
    await expect(refundCredits("stranger@example.com", 10, "arbitrary")).rejects.toThrow(/refundPaidVideo/);
  });
  it("does not reveal another user's credits by accepting a forged email", async () => {
    await expect(getCreditBalance("stranger@example.com", "owner@example.com"))
      .rejects.toThrow(/Verified account/);
    await expect(getCreditBalance("stranger@example.com"))
      .rejects.toThrow(/Verified account/);
  });
});
