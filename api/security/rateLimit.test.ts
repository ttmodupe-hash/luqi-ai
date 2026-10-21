import { describe, expect, it } from "vitest";
import { rateLimitBucket } from "./rateLimit";

describe("distributed rate-limit identity", () => {
  it("uses validated account identity instead of spoofable forwarding headers", () => {
    expect(rateLimitBucket(17)).toBe("user:17");
    expect(rateLimitBucket(18)).not.toBe(rateLimitBucket(17));
  });
  it("gives anonymous requests a conservative global bucket", () => {
    expect(rateLimitBucket(undefined)).toBe("anonymous:global");
  });
});
