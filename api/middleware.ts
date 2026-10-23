import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { authenticatePilotUser, PilotAuthError } from "./services/pilotAuth";
import { BoundedRateLimiter } from "./lib/httpGuard";

// Explicit procedure/type pairs. New procedures fail closed until reviewed;
// an ordinary account or a deployment secret is never an administrator role.
const publicReads = new Set([
  "ping", "knowledge.getArticles", "knowledge.searchLearning",
  "content.getHealthTips", "content.getAgricultureNews", "content.getSportsNews",
  "content.getBusinessTips", "content.getGovernmentInfo", "content.getTourismInfo",
]);
const accountProcedures: Record<string, "query" | "mutation"> = {
  "offline.queueAction": "mutation", "offline.getPending": "query",
  "offline.markSynced": "mutation", "offline.resolveConflict": "query",
};
const safeMessages = new Set([
  "TRPC_PROCEDURE_UNAVAILABLE", "AUTH_UNAVAILABLE", "AUTH_REQUIRED",
  "OFFLINE_STORAGE_UNAVAILABLE", "OFFLINE_QUEUE_LIMIT",
]);
const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    // Never serialize SQL, credentials, input payloads or stack traces.
    return { ...shape,
      message: safeMessages.has(error.message) ? error.message : error.code,
      data: { code: shape.data.code, httpStatus: shape.data.httpStatus },
    };
  },
});
export const createRouter = t.router;
export const publicQuery = t.procedure.use(async ({ ctx, path, type, next }) => {
  if (publicReads.has(path) && type === "query") return next({ ctx });
  if (!Object.hasOwn(accountProcedures, path) || accountProcedures[path] !== type) {
    throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "TRPC_PROCEDURE_UNAVAILABLE" });
  }
  let userId: number;
  try {
    userId = await authenticatePilotUser(ctx.req.headers.get("authorization") ?? undefined);
  } catch (error) {
    const unavailable = error instanceof PilotAuthError && error.code === "AUTH_UNAVAILABLE";
    throw new TRPCError({ code: unavailable ? "SERVICE_UNAVAILABLE" : "UNAUTHORIZED",
      message: unavailable ? "AUTH_UNAVAILABLE" : "AUTH_REQUIRED" });
  }
  return next({ ctx: { ...ctx, userId } });
});

// Shares the route policy; no development bypass and no shared APP_SECRET.
export const protectedQuery = publicQuery.use(({ ctx, next }) => {
  if (!("userId" in ctx) || !Number.isSafeInteger(ctx.userId) || Number(ctx.userId) < 1) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "AUTH_REQUIRED" });
  }
  return next({ ctx: { ...ctx, userId: Number(ctx.userId) } });
});

const throttle = new BoundedRateLimiter(100, 60_000, 5000);
export const rateLimitedQuery = publicQuery.use(({ ctx, next }) => {
  const key = ctx.req.headers.get("x-forwarded-for") ?? "unknown";
  if (!throttle.permit(key)) throw new TRPCError({ code: "TOO_MANY_REQUESTS" });
  return next({ ctx });
});
