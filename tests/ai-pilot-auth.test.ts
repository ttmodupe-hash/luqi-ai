import { describe, expect, it } from "vitest";
import jwt from "jsonwebtoken";
import { LUQI_JWT_AUDIENCE, LUQI_JWT_ISSUER } from "../api/lib/userToken";
import { parsePilotUserId, PilotAuthError } from "../api/services/pilotAuth";

const key = "test-signing-secret-at-least-thirty-two-chars";
const bearer = (token: string) => "Bearer " + token;

describe("authenticated AI pilot gate", () => {
  it("accepts a scoped signed user JWT with a credential-version claim", () => {
    const token = jwt.sign({ userId: 42, cv: "a".repeat(64) }, key, { issuer: LUQI_JWT_ISSUER, audience: LUQI_JWT_AUDIENCE, expiresIn: "24h" });
    expect(parsePilotUserId(bearer(token), key)).toBe(42);
  });
  it("rejects anonymous callers and missing signing key", () => {
    expect(() => parsePilotUserId(undefined, key)).toThrow("AUTH_REQUIRED");
    expect(() => parsePilotUserId("Bearer bogus", key)).toThrow("AUTH_REQUIRED");
    for (const header of ["Bearer  a.b.c", "Bearer a.b.c ", "Basic a.b.c"]) {
      expect(() => parsePilotUserId(header, key)).toThrow("AUTH_REQUIRED");
    }
    expect(() => parsePilotUserId(bearer("a.b.c"), undefined)).toThrow("AUTH_UNAVAILABLE");
  });
  it("rejects tokens signed by another server or expired JWTs", () => {
    const foreign = jwt.sign({ userId: 1 }, "another-long-test-signing-secret-1234567890");
    const expired = jwt.sign({ userId: 1 }, key, { issuer: LUQI_JWT_ISSUER, audience: LUQI_JWT_AUDIENCE, expiresIn: -120 });
    expect(() => parsePilotUserId(bearer(foreign), key)).toThrow("AUTH_REQUIRED");
    expect(() => parsePilotUserId(bearer(expired), key)).toThrow("AUTH_REQUIRED");
  });
  it("rejects forged identities and malformed claims", () => {
    for (const bad of [{ userId: -1 }, { userId: "2" }, { role: "admin" }]) {
      const token = jwt.sign(bad, key, { issuer: LUQI_JWT_ISSUER, audience: LUQI_JWT_AUDIENCE });
      expect(() => parsePilotUserId(bearer(token), key)).toThrow(PilotAuthError);
    }
  });
  it("rejects tokens without the correct issuer or audience", () => {
    const noScope = jwt.sign({ userId: 1 }, key);
    const wrongAudience = jwt.sign({ userId: 1 }, key, {
      issuer: LUQI_JWT_ISSUER, audience: "another-product",
    });
    expect(() => parsePilotUserId(bearer(noScope), key)).toThrow("AUTH_REQUIRED");
    expect(() => parsePilotUserId(bearer(wrongAudience), key)).toThrow("AUTH_REQUIRED");
  });
  it("rejects algorithms other than HS256", () => {
    const token = jwt.sign({ userId: 1 }, key, { algorithm: "HS384", issuer: LUQI_JWT_ISSUER, audience: LUQI_JWT_AUDIENCE });
    expect(() => parsePilotUserId(bearer(token), key)).toThrow("AUTH_REQUIRED");
  });
});
