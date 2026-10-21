import { describe, expect, it } from "vitest";
import { isTrustedReplicateUrl, paidVideoAvailable } from "./paidVideo";
import { quotePaidVideoCredits, renderIntentDigest, isStaleRender, STALE_RENDER_MS } from "./paidVideoLedger";

describe("paid video safety contracts", () => {
  it("quotes whole-second silent video from the explicit published price", () => {
    expect(quotePaidVideoCredits(2)).toBe(20);
    expect(quotePaidVideoCredits(10)).toBe(100);
    expect(quotePaidVideoCredits(2, "narrated_mp4", "Welcome to LUQI")).toBe(24);
    expect(quotePaidVideoCredits(10, "narrated_mp4", "A".repeat(500))).toBe(104);
    expect(() => quotePaidVideoCredits(5, "narrated_mp4", "")).toThrow();
    expect(() => quotePaidVideoCredits(5, "narrated_mp4", "A".repeat(501))).toThrow();
    expect(() => quotePaidVideoCredits(5, "silent_mp4", "unauthorised voice")).toThrow();
    expect(() => quotePaidVideoCredits(60)).toThrow();
    expect(() => quotePaidVideoCredits(1.5)).toThrow();
  });

  it("binds an idempotency key to the precise user and render intent", () => {
    const input = {
      userId: 9, email: "me@example.com",
      requestKey: "12345678-1234-4123-8123-123456789abc",
      title: "Physics", prompt: "A pendulum swinging",
      language: "en", durationSeconds: 4, confirmedCredits: 40,
    };
    expect(renderIntentDigest(input)).toBe(renderIntentDigest(input));
    expect(renderIntentDigest(input)).not.toBe(renderIntentDigest({ ...input, userId: 10 }));
    expect(renderIntentDigest(input)).not.toBe(renderIntentDigest({ ...input, durationSeconds: 5 }));
    expect(renderIntentDigest(input)).not.toBe(renderIntentDigest({ ...input, prompt: "new prompt" }));
    expect(renderIntentDigest(input)).not.toBe(renderIntentDigest({ ...input, mode: "narrated_mp4", narration: "Hello" }));
    expect(renderIntentDigest({ ...input, mode: "narrated_mp4", narration: "Hello" })).not.toBe(
      renderIntentDigest({ ...input, mode: "narrated_mp4", narration: "Different narration" }));
  });

  it("never fetches local, HTTP, metadata or attacker-controlled download URLs", () => {
    expect(isTrustedReplicateUrl("https://replicate.delivery/signed/file.mp4")).toBe(true);
    expect(isTrustedReplicateUrl("https://sub.replicate.delivery/path")).toBe(true);
    for (const url of [
      "http://replicate.delivery/file", "http://127.0.0.1/admin",
      "https://replicate.delivery.evil.test/file", "https://evil.test/",
      "file:///etc/passwd", "https://user:pass@replicate.delivery/file",
      "https://169.254.169.254/latest/meta-data",
    ]) expect(isTrustedReplicateUrl(url)).toBe(false);
  });

  it("does not refund active requests, and flags abandoned work after fifteen minutes", () => {
    const now = Date.parse("2026-10-21T12:00:00Z");
    expect(isStaleRender(new Date(now - STALE_RENDER_MS + 500), now)).toBe(false);
    expect(isStaleRender(new Date(now - STALE_RENDER_MS - 500), now)).toBe(true);
    expect(isStaleRender(null, now)).toBe(false);
  });

  it("fails closed without an actual provider and private storage", () => {
    // CI does not supply video provider credentials or private storage.
    if (!process.env.REPLICATE_API_TOKEN && !process.env.LUQI_VIDEO_BUCKET) {
      expect(paidVideoAvailable()).toBe(false);
    }
  });
});
