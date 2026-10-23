/**
 * Authenticate paid pilot chat using the existing LUQI JWT login.
 * A signed token is not sufficient: the user must still exist in persistent
 * MySQL, preventing deleted accounts or volatile demo users from spending.
 */
import { verifyUserToken, verifyUserCredential } from "../lib/userToken";
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
  if (!/^Bearer [^\s]+$/i.test(authHeader ?? "") || (authHeader?.length ?? 0) > 4096) {
    throw new PilotAuthError("AUTH_REQUIRED");
  }
  const token = authHeader!.slice(7);
  if (!token) throw new PilotAuthError("AUTH_REQUIRED");
  try {
    return verifyUserToken(token, signingSecret);
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
    const [user] = await db.select({ id: users.id, isActive: users.isActive, passwordHash: users.passwordHash }).from(users)
      .where(eq(users.id, userId)).limit(1);
    if (!user || user.isActive !== true) {
      throw new PilotAuthError("AUTH_REQUIRED");
    }
    try { verifyUserCredential(authHeader!.slice(7), userId, user.passwordHash); }
    catch { throw new PilotAuthError("AUTH_REQUIRED"); }
  } catch (e) {
    if (e instanceof PilotAuthError) throw e;
    throw new PilotAuthError("AUTH_UNAVAILABLE");
  }
  return userId;
}
