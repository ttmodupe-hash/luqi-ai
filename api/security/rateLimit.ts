import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import { getPrivateDb } from "./access";

const WINDOW_MS = 60_000;
const LIMIT = 100;

/** User accounts are isolated by validated session identity. Anonymous traffic
 * shares a conservative bucket; do not trust caller-controlled forwarding headers.
 * Requires the reviewed rate_limit_windows migration in staging before activation. */
export function rateLimitBucket(userId: number | undefined): string {
  return userId === undefined ? "anonymous:global" : `user:${userId}`;
}

export async function reserveRateLimit(bucket: string): Promise<void> {
  const db = await getPrivateDb();
  const windowStart = Math.floor(Date.now() / WINDOW_MS) * WINDOW_MS;
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      await db.transaction(async (tx: any) => {
      // The unique composite key serializes creation for concurrent instances.
      await tx.execute(sql`INSERT INTO rate_limit_windows (bucket, window_start, hits)
        VALUES (${bucket}, ${windowStart}, 0)
        ON DUPLICATE KEY UPDATE hits = hits`);
      const [entry] = await tx.execute(sql`SELECT hits FROM rate_limit_windows
        WHERE bucket = ${bucket} AND window_start = ${windowStart} FOR UPDATE`);
      // mysql2/drizzle raw SELECT yields an array of rows.
      const rows = Array.isArray(entry) ? entry : [];
      const hits = Number(rows[0]?.hits);
      if (!Number.isSafeInteger(hits) || hits < 0) {
        throw new Error("Invalid rate-limit state");
      }
      if (hits >= LIMIT) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Request limit reached. Try again shortly." });
      }
      await tx.execute(sql`UPDATE rate_limit_windows SET hits = hits + 1
        WHERE bucket = ${bucket} AND window_start = ${windowStart}`);
      });
      return;
    } catch (error) {
      if (error instanceof TRPCError && error.code === "TOO_MANY_REQUESTS") throw error;
      const dbError = error as { code?: string; cause?: { code?: string } };
      const code = dbError.code ?? dbError.cause?.code;
      if (attempt < 5 && (code === "ER_LOCK_DEADLOCK" || code === "ER_LOCK_WAIT_TIMEOUT")) {
        await new Promise((resolve) => setTimeout(resolve, 10 * (attempt + 1)));
        continue;
      }
      throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Request protection is unavailable." });
    }
  }
}
