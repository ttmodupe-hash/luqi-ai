import type { Hono } from "hono";
import type { HttpBindings } from "@hono/node-server";
import fs from "fs";
import path from "path";

type App = Hono<{ Bindings: HttpBindings }>;

const MIME: Record<string, string> = {
  ".html": "text/html; charset=UTF-8",
  ".js": "text/javascript; charset=UTF-8",
  ".css": "text/css; charset=UTF-8",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=UTF-8",
  ".webmanifest": "application/manifest+json",
};

const ROOT = "dist/public";
const IMMUTABLE_CACHE = "public, max-age=31536000, immutable";

export function serveStaticFiles(app: App) {
  const distPath = path.resolve(import.meta.dirname, "../dist/public");

  // Static file serving with precompressed variant negotiation:
  // serves file.br / file.gz (emitted by vite-plugin-compression at build)
  // when the client's Accept-Encoding allows it, raw file otherwise.
  app.use("*", async (c, next) => {
    if (c.req.method !== "GET" && c.req.method !== "HEAD") return next();

    const urlPath = decodeURIComponent(new URL(c.req.url).pathname);
    if (urlPath.startsWith("/api/")) return next();

    // Path traversal guard: normalize, strip leading ../, stay under ROOT
    const rel = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, "");
    const filePath = path.join(ROOT, rel);
    if (filePath !== ROOT && !filePath.startsWith(ROOT + path.sep)) return next();
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return next();

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME[ext] || "application/octet-stream";
    const acceptEncoding = c.req.header("accept-encoding") || "";
    const isHashedAsset = urlPath.startsWith("/assets/");

    if (acceptEncoding.includes("br") && fs.existsSync(filePath + ".br")) {
      c.header("Content-Encoding", "br");
      c.header("Content-Type", contentType);
      c.header("Vary", "Accept-Encoding");
      if (isHashedAsset) c.header("Cache-Control", IMMUTABLE_CACHE);
      return c.body(fs.readFileSync(filePath + ".br"));
    }

    if (acceptEncoding.includes("gzip") && fs.existsSync(filePath + ".gz")) {
      c.header("Content-Encoding", "gzip");
      c.header("Content-Type", contentType);
      c.header("Vary", "Accept-Encoding");
      if (isHashedAsset) c.header("Cache-Control", IMMUTABLE_CACHE);
      return c.body(fs.readFileSync(filePath + ".gz"));
    }

    c.header("Content-Type", contentType);
    if (isHashedAsset) c.header("Cache-Control", IMMUTABLE_CACHE);
    return c.body(fs.readFileSync(filePath));
  });

  // SPA fallback: non-API GET requests that accept HTML get index.html
  app.notFound((c) => {
    const accept = c.req.header("accept") ?? "";
    if (!accept.includes("text/html")) {
      return c.json({ error: "Not Found" }, 404);
    }
    const indexPath = path.resolve(distPath, "index.html");
    const content = fs.readFileSync(indexPath, "utf-8");
    return c.html(content);
  });
}
