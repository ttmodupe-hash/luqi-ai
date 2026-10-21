import type { Hono } from "hono";
import { serveStatic } from "@hono/node-server/serve-static";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

/** Serve the Vite production bundle without intercepting API requests. */
export function serveStaticFiles(app: Hono<any>) {
  const root = resolve(process.cwd(), "dist/public");
  app.use("/*", serveStatic({ root }));
  app.get("*", async (c, next) => {
    const pathname = new URL(c.req.url).pathname;
    if (pathname.startsWith("/api/") || pathname === "/api" || pathname.startsWith("/auth/") || pathname.startsWith("/v1/") || pathname === "/health") return next();
    if (pathname.includes(".") || !existsSync(resolve(root, "index.html"))) return next();
    return serveStatic({ root, path: "index.html" })(c, next);
  });
}
