/** Single JWT contract shared by registration, login and paid AI.
 * Tokens are scoped to the LUQI web audience and expire within 24 hours.
 * Never accept unsigned tokens, different audiences, or fallback secrets.
 */
import jwt from "jsonwebtoken";

export const LUQI_JWT_ISSUER = "luqi-ai-web";
export const LUQI_JWT_AUDIENCE = "luqi-ai-user";

export function getSigningSecret(): string {
  const value = process.env.JWT_SECRET;
  if (!value || value.length < 32) {
    throw new Error("JWT_SECRET is unavailable");
  }
  return value;
}

export function signUserToken(userId: number): string {
  if (!Number.isSafeInteger(userId) || userId <= 0) throw new Error("Invalid user ID");
  return jwt.sign({ userId }, getSigningSecret(), {
    algorithm: "HS256",
    issuer: LUQI_JWT_ISSUER,
    audience: LUQI_JWT_AUDIENCE,
    expiresIn: "24h",
  });
}

export function verifyUserToken(token: string, secret: string = getSigningSecret()): number {
  const payload = jwt.verify(token, secret, {
    algorithms: ["HS256"],
    issuer: LUQI_JWT_ISSUER,
    audience: LUQI_JWT_AUDIENCE,
    maxAge: "24h",
    clockTolerance: 30,
  });
  if (typeof payload === "string" || !Number.isSafeInteger(payload.userId) ||
      payload.userId <= 0) {
    throw new Error("Invalid token claims");
  }
  return payload.userId;
}
