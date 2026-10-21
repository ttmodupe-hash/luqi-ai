import { TRPCError } from "@trpc/server";
import { getAuthDb } from "../queries/connection";

/**
 * Sensitive application data must never be read from the simplified memory
 * fallback. The same persistent database is used to validate auth sessions.
 */
export async function getPrivateDb() {
  const db = await getAuthDb();
  if (!db) {
    throw new TRPCError({
      code: "SERVICE_UNAVAILABLE",
      message: "Secure data storage is currently unavailable. Please try again later.",
    });
  }
  return db;
}

/**
 * Caller-supplied IDs are compatibility hints, never proof of identity.
 * Reject rather than silently switching account context.
 */
export function assertOwnUserId(
  requestedId: number | undefined,
  authenticatedId: number,
): void {
  if (requestedId !== undefined && requestedId !== authenticatedId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Access denied." });
  }
}
