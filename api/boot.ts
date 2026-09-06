import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { ZodError } from "zod";
import { appRouter } from "./router";
import { restCompat } from "./rest-compat";
import { createContext } from "./context";
import { env } from "./lib/env";
import { logger } from "./lib/logger";
import { closeDb } from "./queries/connection";
import { closeCache } from "./services/cache";

const app = new Hono<{ Bindings: HttpBindings }>();

// ── SECURITY MIDDLEWARE ────────────────────────────────────────────

// CORS — allow frontend origin
app.use("/*", cors({
  origin: process.env.FRONTEND_URL || "*",
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  exposeHeaders: ["Content-Length", "X-Request-Id"],
  maxAge: 86400,
  credentials: true,
}));

// Security headers
app.use("/*", async (c, next) => {
  await next();
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("X-XSS-Protection", "1; mode=block");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (process.env.NODE_ENV === "production") {
    c.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
});

// Rate limiting (simple in-memory)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 100; // requests per minute
const RATE_WINDOW = 60 * 1000;

app.use("/api/*", async (c, next) => {
  const ip = c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown";
  const now = Date.now();
  const data = rateLimitMap.get(ip);
  
  if (data && now < data.resetAt) {
    if (data.count >= RATE_LIMIT) {
      return c.json({ error: "Rate limit exceeded" }, 429);
    }
    data.count++;
  } else {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
  }
  
  return next();
});

// ── REQUEST CORRELATION + STRUCTURED LOGGING ───────────────────────
app.use("/*", async (c, next) => {
  const requestId = crypto.randomUUID();
  const start = Date.now();
  c.header("X-Request-Id", requestId);
  await next();
  logger.info({
    requestId,
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    durationMs: Date.now() - start,
  }, "request");
});

// ── BODY LIMIT ─────────────────────────────────────────────────────
app.use(bodyLimit({ maxSize: 50 * 1024 * 1024 }));

// ── tRPC ───────────────────────────────────────────────────────────
app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
});

// ── REST COMPAT (legacy frontend endpoints → real services) ──────────
app.route("/", restCompat);

app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

// ── GLOBAL ERROR HANDLER ───────────────────────────────────────────
// Uncaught exceptions format cleanly instead of crashing the process.
app.onError((err, c) => {
  const requestId = c.res.headers.get("X-Request-Id") ?? crypto.randomUUID();

  if (err instanceof ZodError) {
    return c.json({ success: false, error: "Validation Error", details: err.issues, requestId }, 400);
  }

  if (err?.name === "AbortError") {
    return c.json({ success: false, error: "Client closed request", requestId }, 499);
  }

  logger.error({ err: err?.message, stack: err?.stack?.slice(0, 500), requestId }, "unhandled error");
  const status = typeof (err as any)?.status === "number" ? (err as any).status : 500;
  return c.json({ success: false, error: err?.message || "Internal Server Error", requestId }, status as 500);
});

export default app;

if (env.isProduction) {
  const { serve } = await import("@hono/node-server");
  const { serveStaticFiles } = await import("./lib/vite");
  serveStaticFiles(app);

  const port = parseInt(process.env.PORT || "3000");
  const server = serve({ fetch: app.fetch, port }, () => {
    logger.info({ port }, "Server running");
  });

  // Graceful shutdown — Railway sends SIGTERM on every redeploy.
  // Stop accepting, drain in-flight requests, close DB pool + Redis, exit.
  const shutdown = (signal: string) => {
    logger.info({ signal }, "Shutdown signal received — draining");
    server.close(() => {
      void (async () => {
        try { await closeDb(); } catch { /* non-fatal */ }
        try { await closeCache(); } catch { /* non-fatal */ }
        logger.info("Cleanup complete — exiting");
        process.exit(0);
      })();
    });
    setTimeout(() => {
      logger.error("Forced shutdown after 10s drain timeout");
      process.exit(1);
    }, 10000).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  // Provision database tables, then seed reference data (both non-fatal)
  (async () => {
    try {
      const { bootstrapDatabase } = await import("../db/bootstrap");
      await bootstrapDatabase();
    } catch (e) {
      console.error("[Bootstrap] Database bootstrap failed:", e);
    }
    try {
      const { seedTraditionalMedicine } = await import("../db/seed-traditional-medicine");
      await seedTraditionalMedicine();
    } catch (e) {
      console.error("[Seed] Traditional medicine seed failed:", e);
    }
  })();
}
