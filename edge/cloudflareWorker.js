/**
 * Optional LUQI edge guard for a verified Cloudflare-fronted staging hostname.
 *
 * This Worker is NOT automatically deployed. Only activate after confirming
 * route ownership, configured rate-limit bindings and origin bypass controls.
 *
 * The previous Worker cached broad public-looking API paths and the root page.
 * Until cacheability can be proven per route, never use a shared edge cache:
 * upstream cookies / authentication and dynamic response data may be private.
 */
const AUTH_PATHS = new Set([
  "/api/auth/login", "/api/auth/register",
  "/api/v1/auth/login", "/api/v1/auth/register",
  "/auth/login", "/auth/register",
]);

function errorResponse(status, message) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...(status === 429 ? { "retry-after": "60" } : {}),
    },
  });
}

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    const isAuth = AUTH_PATHS.has(path);
    const isApi = path === "/api" || path.startsWith("/api/") || isAuth;

    // Non-API pages are forwarded without any Worker-side shared cache.
    if (!isApi) return fetch(request);

    // This header is managed by Cloudflare at its edge. Do NOT accept user
    // supplied x-forwarded-for or x-real-ip as a substitute for identity.
    // Cloudflare Worker routing must be verified; direct Cloud Run ingress
    // needs to be restricted separately or clients can bypass this guard.
    const clientIp = request.headers.get("cf-connecting-ip");
    if (!clientIp || clientIp.length > 64 || clientIp.includes(",")) {
      return errorResponse(503, "Edge request identity is unavailable.");
    }
    if (typeof env?.LUQI_API_RATE_LIMITER?.limit !== "function" ||
        (isAuth && typeof env?.LUQI_AUTH_RATE_LIMITER?.limit !== "function")) {
      return errorResponse(503, "Edge request protection is unavailable.");
    }

    try {
      // Binding counters live at Cloudflare, not inside one Worker isolate.
      // One key per managed client IP prevents attackers resetting quotas by
      // cycling URLs. Per-account limits remain enforced inside LUQI/MySQL.
      const apiLimit = await env.LUQI_API_RATE_LIMITER.limit({ key: clientIp });
      if (apiLimit?.success !== true) {
        return errorResponse(429, "Too many requests. Try again shortly.");
      }
      if (isAuth) {
        const authLimit = await env.LUQI_AUTH_RATE_LIMITER.limit({ key: clientIp });
        if (authLimit?.success !== true) {
          return errorResponse(429, "Too many authentication attempts.");
        }
      }
    } catch {
      // Never silently bypass a failed edge limiter.
      return errorResponse(503, "Edge request protection is unavailable.");
    }

    const response = await fetch(request);
    if (response.status === 101) return response; // WebSocket upgrades
    // Even if the origin accidentally marks an API response as public,
    // prohibit downstream/shared caching while the route audit is incomplete.
    const headers = new Headers(response.headers);
    headers.set("cache-control", "private, no-store");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
