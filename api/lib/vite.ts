import type { Hono } from "hono";
import { serveStatic } from "@hono/node-server/serve-static";

/** Serve built Vite assets, then let client-side routing handle non-API URLs. */
export function serveStaticFiles(app: Hono<any>): void {
  app.get("*", serveStatic({ root: "./dist/public" }));
  // A missing teaching document must never become an embeddable account SPA.
  // Existing files are served above; missing /labs assets fail closed here.
  app.get("/labs/*", c => {
    c.header('Cache-Control', 'no-store');
    return c.json({ error: 'Not Found' }, 404);
  });
  app.get("*", serveStatic({ root: "./dist/public", path: "/index.html" }));
}
