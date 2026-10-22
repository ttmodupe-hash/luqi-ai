/**
 * Authenticate paid pilot chat using the existing LUQI JWT login.
 * A signed token is not sufficient: the user must still exist in persistent
 * MySQL, preventing deleted accounts or volatile demo users from spending.
 */
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { users } from "../../db/schema";
import { getPersistentDb } from "../queries/connection";

export class PilotAuthError extends Error {
  constructor(public readonly code: "AUTH_REQUIRED" | "AUTH_UNAVAILABLE") {
    super(code);
  }
}

export function parsePilotUserId(authHeader: string | undefined,
                                 signingSecret: string | undefined): number {
  if (!signingSecret || signingSecret.length < 32) {
    throw new PilotAuthError("AUTH_UNAVAILABLE");
  }
  if (!authHeader?.startsWith("Bearer ") || authHeader.length > 4096) {
    throw new PilotAuthError("AUTH_REQUIRED");
  }
  const token = authHeader.slice(7).trim();
  if (!token) throw new PilotAuthError("AUTH_REQUIRED");
  try {
    const payload = jwt.verify(token, signingSecret, { algorithms: ["HS256"] });
    if (typeof payload === "string" || typeof payload.userId !== "number" ||
        !Number.isSafeInteger(payload.userId) || payload.userId <= 0) {
      throw new PilotAuthError("AUTH_REQUIRED");
    }
    return payload.userId;
  } catch {
    throw new PilotAuthError("AUTH_REQUIRED");
  }
}

export async function authenticatePilotUser(authHeader: string | undefined): Promise<number> {
  const userId = parsePilotUserId(authHeader, process.env.JWT_SECRET);
  let db;
  try { db = await getPersistentDb(); }
  catch { throw new PilotAuthError("AUTH_UNAVAILABLE"); }
  try {
    const [user] = await db.select({ id: users.id, isActive: users.isActive }).from(users)
      .where(eq(users.id, userId)).limit(1);
    if (!user || user.isActive === false) {
      throw new PilotAuthError("AUTH_REQUIRED");
    }
  } catch (e) {
    if (e instanceof PilotAuthError) throw e;
    throw new PilotAuthError("AUTH_UNAVAILABLE");
  }
  return userId;
}
