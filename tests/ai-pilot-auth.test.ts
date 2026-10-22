import { describe, expect, it } from "vitest";
import jwt from "jsonwebtoken";
import { parsePilotUserId, PilotAuthError } from "../api/services/pilotAuth";

const key = "test-signing-secret-at-least-thirty-two-chars";
const bearer = (token: string) => "Bearer " + token;

describe("authenticated AI pilot gate", () => {
  it("accepts a valid existing-format signed user JWT", () => {
    const token = jwt.sign({ userId: 42 }, key, { expiresIn: "30d" });
    expect(parsePilotUserId(bearer(token), key)).toBe(42);
  });
  it("rejects anonymous callers and missing signing key", () => {
    expect(() => parsePilotUserId(undefined, key)).toThrow("AUTH_REQUIRED");
    expect(() => parsePilotUserId("Bearer bogus", key)).toThrow("AUTH_REQUIRED");
    expect(() => parsePilotUserId(bearer("a.b.c"), undefined)).toThrow("AUTH_UNAVAILABLE");
  });
  it("rejects tokens signed by another server or expired JWTs", () => {
    const foreign = jwt.sign({ userId: 1 }, "another-long-test-signing-secret-1234567890");
    const expired = jwt.sign({ userId: 1 }, key, { expiresIn: -10 });
    expect(() => parsePilotUserId(bearer(foreign), key)).toThrow("AUTH_REQUIRED");
    expect(() => parsePilotUserId(bearer(expired), key)).toThrow("AUTH_REQUIRED");
  });
  it("rejects forged identities and malformed claims", () => {
    for (const bad of [{ userId: -1 }, { userId: "2" }, { role: "admin" }]) {
      const token = jwt.sign(bad, key);
      expect(() => parsePilotUserId(bearer(token), key)).toThrow(PilotAuthError);
    }
  });
  it("rejects algorithms other than HS256", () => {
    const token = jwt.sign({ userId: 1 }, key, { algorithm: "HS384" });
    expect(() => parsePilotUserId(bearer(token), key)).toThrow("AUTH_REQUIRED");
  });
});
