import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { rateLimitBucket, reserveRateLimit } from "./security/rateLimit";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const createRouter = t.router;
export const publicQuery = t.procedure;

// Fail-closed guard for older routes without proven per-user/per-object access
// control. These are intentionally unavailable even to signed-in users until
// they are replaced with authenticated, authorised and tested procedures.
export const legacyRestrictedProcedure = t.procedure.use(() => {
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "This feature is temporarily unavailable pending security verification.",
  });
});

// ── AUTHENTICATION MIDDLEWARE ──────────────────────────────────────
// Never bypass authentication based on NODE_ENV. Identity is established
// from a validated, unexpired database session in api/context.ts.
export const protectedQuery = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Please sign in to continue." });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

/**
 * Server-validated administrator access, reserved for internal telemetry,
 * audit and agent-management operations. Never trust a role passed as input.
 */
export const adminQuery = protectedQuery.use(async ({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Administrator access required." });
  }
  return next({ ctx });
});

// ── DISTRIBUTED RATE LIMITING ──────────────────────────────────────
// Persistent InnoDB row locks serialize reservations across Cloud Run instances.
// No client-controlled x-forwarded-for/x-real-ip value is trusted.
export const rateLimitedQuery = t.procedure.use(async ({ ctx, next }) => {
  await reserveRateLimit(rateLimitBucket(ctx.user?.id));
  return next({ ctx });
});
