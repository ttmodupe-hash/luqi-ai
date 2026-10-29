/** Single JWT contract shared by registration, login and paid AI.
 * Tokens are scoped to the LUQI web audience and expire within 24 hours.
 * Never accept unsigned tokens, different audiences, or fallback secrets.
 */
import jwt from "jsonwebtoken";
import { createHmac, timingSafeEqual } from "node:crypto";

export const LUQI_JWT_ISSUER = "luqi-ai-web";
export const LUQI_JWT_AUDIENCE = "luqi-ai-user";

export function getSigningSecret(): string {
  const value = process.env.JWT_SECRET;
  if (!value || value.length < 32) {
    throw new Error("JWT_SECRET is unavailable");
  }
  return value;
}

function credentialVersion(userId: number, passwordHash: string, secret: string): string {
  if (typeof passwordHash !== "string" || !/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(passwordHash)) {
    throw new Error("Invalid stored credential");
  }
  return createHmac("sha256", secret)
    .update(`luqi-credential-v1\0${userId}\0${passwordHash}`).digest("hex");
}

export function signUserToken(userId: number, passwordHash: string, sessionDigest?: string): string {
  if (sessionDigest !== undefined && !/^luqi-rs1-[a-f0-9]{64}$/.test(sessionDigest)) {
    throw new Error('Invalid customer session binding');
  }
  if (!Number.isSafeInteger(userId) || userId <= 0) throw new Error("Invalid user ID");
  const secret = getSigningSecret();
  return jwt.sign({ userId, cv: credentialVersion(userId, passwordHash, secret), ...(sessionDigest ? { sid: sessionDigest } : {}) }, secret, {
    algorithm: "HS256",
    issuer: LUQI_JWT_ISSUER,
    audience: LUQI_JWT_AUDIENCE,
    expiresIn: sessionDigest ? "15m" : "24h",
  });
}

function verifiedClaims(token: string, secret: string): jwt.JwtPayload {
  if (secret.length < 32) throw new Error("JWT_SECRET is unavailable");
  const payload = jwt.verify(token, secret, {
    algorithms: ["HS256"],
    issuer: LUQI_JWT_ISSUER,
    audience: LUQI_JWT_AUDIENCE,
    maxAge: "24h",
    clockTolerance: 30,
  });
  if (typeof payload === "string" || !Number.isSafeInteger(payload.userId) ||
      payload.userId <= 0 || payload.iss !== LUQI_JWT_ISSUER ||
      payload.aud !== LUQI_JWT_AUDIENCE ||
      typeof payload.cv !== "string" || !/^[a-f0-9]{64}$/.test(payload.cv) ||
      (payload.sid !== undefined && (typeof payload.sid !== 'string' ||
        !/^luqi-rs1-[a-f0-9]{64}$/.test(payload.sid))) ||
      !Number.isSafeInteger(payload.iat) || !Number.isSafeInteger(payload.exp) ||
      payload.iat! > Math.floor(Date.now() / 1000) + 30 ||
      payload.exp! <= payload.iat! || payload.exp! - payload.iat! > 86400) {
    throw new Error("Invalid token claims");
  }
  if (payload.sid && payload.exp! - payload.iat! > 900) throw new Error('Invalid session token lifetime');
  return payload;
}

/** Session-bound JWTs are checked against a durable session row on EVERY
 * protected request. Older bearer-only pilot JWTs keep their original 24h
 * expiry and are not silently converted into revocable new sessions.
 */
export function getSignedSessionDigest(token: string, secret: string = getSigningSecret()): string | null {
  const digest = verifiedClaims(token, secret).sid;
  return typeof digest === 'string' ? digest : null;
}

/** Signature/claim verification alone is not a complete account authorization. */
export function verifyUserToken(token: string, secret: string = getSigningSecret()): number {
  return verifiedClaims(token, secret).userId;
}

/** Call after loading the current persisted account. A password reset changes
 * the HMAC and immediately invalidates previous tokens on subsequent requests.
 * The raw password hash is never carried in the JWT or returned to clients.
 */
export function verifyUserCredential(token: string, userId: number, passwordHash: string,
                                     secret: string = getSigningSecret()): void {
  const payload = verifiedClaims(token, secret);
  const expected = credentialVersion(userId, passwordHash, secret);
  if (payload.userId !== userId || !timingSafeEqual(Buffer.from(payload.cv, "hex"), Buffer.from(expected, "hex"))) {
    throw new Error("Credential changed");
  }
}
