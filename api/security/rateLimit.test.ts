import { describe, expect, it } from "vitest";
import { rateLimitBucket, reserveRateLimit } from "./rateLimit";

describe("distributed rate-limit identity", () => {
  it("uses validated account identity instead of spoofable forwarding headers", () => {
    expect(rateLimitBucket(17)).toBe("user:17");
    expect(rateLimitBucket(18)).not.toBe(rateLimitBucket(17));
  });
  it("rejects invalid per-route quota configuration before database access", async () => {
    await expect(reserveRateLimit("auth:login:global", 0)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(reserveRateLimit("auth:login:global", 101)).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
  it("gives anonymous requests a conservative global bucket", () => {
    expect(rateLimitBucket(undefined)).toBe("anonymous:global");
  });
});
