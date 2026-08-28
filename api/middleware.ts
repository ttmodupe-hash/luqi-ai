import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const createRouter = t.router;
export const publicQuery = t.procedure;

// ── AUTHENTICATION MIDDLEWARE ──────────────────────────────────────
// Usage: protectedQuery instead of publicQuery for authenticated endpoints

export const protectedQuery = t.procedure.use(async ({ ctx, next }) => {
  // In production, verify JWT token or session
  // For now, allow if APP_SECRET matches or if in development
  if (process.env.NODE_ENV !== "production") {
    return next({ ctx });
  }
  
  const authHeader = ctx.req?.headers?.get?.("authorization");
  const appSecret = process.env.APP_SECRET;
  
  if (!appSecret) {
    throw new Error("Server misconfigured: APP_SECRET not set");
  }
  
  if (!authHeader || authHeader !== `Bearer ${appSecret}`) {
    throw new Error("Unauthorized: Invalid or missing authentication token");
  }
  
  return next({ ctx });
});

// ── RATE LIMITING ──────────────────────────────────────────────────
const requestCounts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 100; // requests per minute
const RATE_WINDOW = 60 * 1000; // 1 minute

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
  
  // Cleanup old entries periodically
  if (Math.random() < 0.01) {
    for (const [ip, data] of requestCounts.entries()) {
      if (now > data.resetAt) requestCounts.delete(ip);
    }
  }
  
  return next({ ctx });
});
