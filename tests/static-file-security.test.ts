import { describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import type { MiddlewareHandler } from "hono";
import { privateResponsePolicy } from "../api/lib/httpSafety";
import { isSensitivePublicPath, isSpaNavigationPath, serveStaticFiles } from "../api/lib/vite";

// A synthetic file exists in the mock to prove that the guard precedes the
// static file server. No production data or network calls are used.
vi.mock("@hono/node-server/serve-static", () => ({
  serveStatic: (options: { path?: string }): MiddlewareHandler => async (c, next) => {
    if (options.path === "/index.html" || c.req.path === "/index.html") return c.html("<h1>Public account shell fixture</h1>");
    if (c.req.path === "/.env" || c.req.path === "/service-account.json")
      return c.text("SYNTHETIC_SECRET_DO_NOT_SERVE");
    if (c.req.path === "/manifest.json") return c.json({ name: "Luqi" });
    if (c.req.path === "/assets/index-test.js") return c.text("public-bundle", 200, {
      "Content-Type": "text/javascript",
    });
    if (c.req.path === "/.well-known/assetlinks.json") return c.json([{ relation: ["delegate_permission/common.handle_all_urls"] }]);
    if (c.req.path === "/login.html") return c.html("<h1>Public legacy login information</h1>");
    return next();
  },
}));

function server() {
  const app = new Hono();
  app.use("*", privateResponsePolicy);
  // Existing API routes are registered before the static server in boot.ts.
  app.get("/v1/health", c => c.json({ status: "healthy" }));
  serveStaticFiles(app);
  return app;
}

describe("public static-file security boundary", () => {
  it.each([
    "/.env", "/.env.production", "/test/.env", "/.git/config", "/.svn/entries",
    "/service-account.json", "/credentials.json", "/gcp-key.json",
    "/firebase-adminsdk.json", "/application_default_credentials.json",
    "/aws-credentials.json", "/sa.json", "/private.json", "/private-key.pem",
    "/key.json", "/appsettings.json", "/web.config", "/composer.json",
    "/config.json", "/config/app/settings.yaml", "/backup.zip",
    "/index.html.bak", "/phpinfo.php", "/server-status", "/.npmrc",
    "/package.json", "/Dockerfile", "/.well-known/.env",
    "/%2eenv", "/%252eenv", "/test/%2eenv", "/test%2f.env",
    "/%2e%67it/config", "/assets/.env", "/node_modules/secret.js",
  ])("denies sensitive or encoded path %s before serving static files", async path => {
    expect(isSensitivePublicPath(path)).toBe(true);
    const response = await server().request(path);
    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Content-Type")).toContain("application/json");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(await response.text()).toBe('{"error":"Not Found"}');
  });

  it.each([
    "/assets/does-not-exist.js", "/assets/does-not-exist.css", "/favicon.ico",
    "/missing.json", "/docs/notes.txt", "/.well-known/not-present.json",
    "/.well-known", "/api/not-found", "/v1/not-found", "/labs/unknown.html",
    "/not-a-real-file.html", "/__luqi_static_boundary_probe__.env",
  ])("never returns account HTML for missing file or reserved path %s", async path => {
    expect(isSpaNavigationPath(path)).toBe(false);
    const response = await server().request(path);
    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.text()).not.toContain("Public account shell fixture");
  });

  it.each(["/", "/start", "/learn", "/chat", "/workspace/new", "/explore?topic=math"])
  ("preserves client navigation %s", async path => {
    const response = await server().request(path);
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("Public account shell fixture");
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=0, must-revalidate");
  });

  it("does not give immutable cache lifetime to the index shell or change cached CSS/JS", async () => {
    const page = await server().request("/index.html");
    expect(page.status).toBe(200);
    expect(page.headers.get("Cache-Control")).toBe("public, max-age=0, must-revalidate");
    const chunk = await server().request("/assets/index-test.js");
    expect(chunk.status).toBe(200);
    expect(chunk.headers.get("Cache-Control")).not.toBe("public, max-age=0, must-revalidate");
  });

  it.each(["/manifest.json", "/assets/index-test.js", "/.well-known/assetlinks.json", "/login.html"])
  ("preserves existing safe static asset %s", async path => {
    const response = await server().request(path);
    expect(response.status).toBe(200);
    expect(await response.text()).not.toContain("SYNTHETIC_SECRET_DO_NOT_SERVE");
  });

  it("keeps earlier API handlers working and never returns SPA HTML for a HEAD secret request", async () => {
    const health = await server().request("/v1/health");
    expect(health.status).toBe(200);
    expect((await health.json()).status).toBe("healthy");
    const secret = await server().request("/.env", { method: "HEAD" });
    expect(secret.status).toBe(404);
    expect(secret.headers.get("Cache-Control")).toBe("no-store");
    expect(await secret.text()).not.toContain("SYNTHETIC_SECRET_DO_NOT_SERVE");
  });

  it("rejects malformed and deeply encoded path strings without throwing or exposing data", () => {
    for (const path of ["/%broken", "/%25252eenv", "/%252525252eenv", "/x%5c.env", "/foo%00bar", "/literal%25"]) {
      expect(isSensitivePublicPath(path)).toBe(true);
      expect(isSpaNavigationPath(path)).toBe(false);
    }
  });
});
