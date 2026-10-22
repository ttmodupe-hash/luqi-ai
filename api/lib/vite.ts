import type { Hono } from "hono";
import { serveStatic } from "@hono/node-server/serve-static";

/** Serve built Vite assets, then let client-side routing handle non-API URLs. */
export function serveStaticFiles(app: Hono<any>): void {
  app.get("*", serveStatic({ root: "./dist/public" }));
  app.get("*", serveStatic({ root: "./dist/public", path: "/index.html" }));
}
