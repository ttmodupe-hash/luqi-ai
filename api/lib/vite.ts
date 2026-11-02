import type { Context, Hono } from "hono";
import { serveStatic } from "@hono/node-server/serve-static";
import { paymentDocumentHeaders } from "./paymentDocument";

// The public SPA is a navigation fallback, never a response for arbitrary
// file probes. Do not echo request paths or read response bodies in denials.
const privateDirectories = new Set([
  "backup", "backups", "backend", "cgi-bin", "config", "credentials", "db",
  "debug", "internal", "logs", "node_modules", "phpmyadmin", "prisma",
  "private", "scripts", "secret", "secrets", "src", "storage", "tmp",
  "vendor", "wp-admin", "wp-content",
  "wp-includes", "__pycache__", "phpinfo", "server-info", "server-status",
]);
const reservedFile = /^(?:\.?env(?:[._-].*)?|(?:service[-_]?account|application[-_]?default[-_]?credentials|(?:gcp|google|firebase|aws|azure)[-_]?(?:sa|key|credentials|adminsdk)|credentials?|config|secrets?|settings|appsettings|private|key(?:file)?|private[-_]?key|id_(?:rsa|ed25519)|phpinfo|dockerfile|package(?:-lock)?|composer|bun|sa)(?:[._-].*)?)$/i;
const privateExtension = /\.(?:env|bak|backup|old|orig|save|swp|tmp|log|ini|cfg|conf|config|toml|yaml|yml|pem|key|crt|cer|p12|pfx|jks|sql|sqlite3?|db|php\d*|phtml|phar|py|sh|bash|zsh|zip|tar|gz|7z|rar|lock|map|ts|tsx)$/i;
const nonSpaRoots = new Set(["api", "auth", "v1", "trpc", "assets", "labs"]);

/** Decode nested URL encoding conservatively; malformed/ambiguous paths fail closed. */
function canonicalPublicPath(rawPath: string): string | null {
  let path = rawPath;
  for (let i = 0; i < 4; i++) {
    let decoded: string;
    try { decoded = decodeURIComponent(path); } catch { return null; }
    if (decoded === path) break;
    path = decoded;
  }
  if (/[\\\0%]/.test(path)) return null;
  return path.replace(/\/+/g, "/").toLowerCase();
}

/** Deny sensitive-looking paths before the static file server can read a file. */
export function isSensitivePublicPath(rawPath: string): boolean {
  const path = canonicalPublicPath(rawPath);
  if (path === null) return true;
  const parts = path.split("/").filter(Boolean);
  if (parts.some((part, index) => part.startsWith(".") && !(index === 0 && part === ".well-known"))) return true;
  if (parts.some(part => privateDirectories.has(part))) return true;
  const file = parts.at(-1) ?? "";
  return reservedFile.test(file) || privateExtension.test(file);
}

/** Only extensionless, ordinary client navigation can fall back to index.html. */
export function isSpaNavigationPath(rawPath: string): boolean {
  const path = canonicalPublicPath(rawPath);
  if (path === null || isSensitivePublicPath(path)) return false;
  const parts = path.split("/").filter(Boolean);
  if (parts.length === 0) return true;
  if (nonSpaRoots.has(parts[0])) return false;
  // .well-known may serve actual public association files, never an HTML shell.
  return parts.every(part => !part.includes("."));
}

function notFound(c: Context) {
  c.header("Cache-Control", "no-store");
  c.header("X-Content-Type-Options", "nosniff");
  return c.json({ error: "Not Found" }, 404);
}

/** Serve real public files and keep the account shell off unknown file paths. */
export function serveStaticFiles(app: Hono<any>): void {
  app.use("/paystack-checkout.html", paymentDocumentHeaders);

  // This MUST run before serveStatic: a misplaced secret in dist/public must
  // never become public just because a file happens to exist.
  app.use("*", async (c, next) => {
    if (isSensitivePublicPath(c.req.path)) return notFound(c);
    await next();
  });

  // The public SPA shell must be revalidated on a user-approved reload;
  // its hashed JS/CSS versions change on every deployment. This still permits
  // the existing bounded service-worker offline shell cache, which rejects
  // no-cache/no-store but accepts max-age=0, must-revalidate.
  app.use("*", async (c, next) => {
    await next();
    const publicShell = c.req.path === "/index.html" || isSpaNavigationPath(c.req.path);
    if (c.req.method === "GET" && publicShell && c.res.status === 200 &&
        c.res.headers.get("Content-Type")?.toLowerCase().startsWith("text/html")) {
      c.header("Cache-Control", "public, max-age=0, must-revalidate");
    }
  });

  app.get("*", serveStatic({ root: "./dist/public" }));
  // Missing payment and teaching documents must not become the account SPA.
  app.get("/paystack-checkout.html", notFound);
  app.get("/labs/*", c => notFound(c));

  // Missing JS/CSS/JSON, hidden paths, backup files and unknown API routes are
  // not valid client navigation, even if index.html is present.
  app.get("*", async (c, next) => {
    if (!isSpaNavigationPath(c.req.path)) return notFound(c);
    await next();
  });
  app.get("*", serveStatic({ root: "./dist/public", path: "/index.html" }));
}
