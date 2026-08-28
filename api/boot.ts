import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";

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

app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export default app;

if (env.isProduction) {
  const { serve } = await import("@hono/node-server");
  const { serveStaticFiles } = await import("./lib/vite");
  serveStaticFiles(app);

  const port = parseInt(process.env.PORT || "3000");
  serve({ fetch: app.fetch, port }, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });

  // Seed traditional medicine data asynchronously
  (async () => {
    try {
      const { seedTraditionalMedicine } = await import("../db/seed-traditional-medicine");
      await seedTraditionalMedicine();
    } catch (e) {
      console.error("[Seed] Traditional medicine seed failed:", e);
    }
  })();
}
