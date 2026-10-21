import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

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

// ── RATE LIMITING ──────────────────────────────────────────────────
const requestCounts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 100;
const RATE_WINDOW = 60 * 1000;

export const rateLimitedQuery = t.procedure.use(async ({ ctx, next }) => {
  const clientIp = ctx.req?.headers?.get?.("x-forwarded-for") || 
                   ctx.req?.headers?.get?.("x-real-ip") || 
                   "unknown";
  
  const now = Date.now();
  const clientData = requestCounts.get(clientIp);
  
  if (clientData && now < clientData.resetAt) {
    if (clientData.count >= RATE_LIMIT) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }
    clientData.count++;
  } else {
    requestCounts.set(clientIp, { count: 1, resetAt: now + RATE_WINDOW });
  }
  
  if (Math.random() < 0.01) {
    for (const [ip, data] of requestCounts.entries()) {
      if (now > data.resetAt) requestCounts.delete(ip);
    }
  }
  
  return next({ ctx });
});
