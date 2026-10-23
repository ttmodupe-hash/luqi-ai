# Legacy edge Worker privacy boundary

`edge/cloudflareWorker.js` is a legacy route Worker, separate from Railway's
Node entrypoint. Its previous implementation read `caches.default` before
checking the request and forced the homepage and substring-matched API routes
to `public, max-age=86400`. It also reported an invented Johannesburg PoP.
Repository inspection establishes this unsafe policy; it does not establish
that the file was deployed or that account data was exposed.

The Worker now bypasses the Cache API entirely, including any old entries.
Its origin fetch uses `cache: 'no-store'` and manual redirects. It preserves
the request, origin response body/status and security headers while returning
`no-store` for browser, generic CDN and Cloudflare cache policies. Origin
failures produce a sanitized 502 without cached fallback. No guessed PoP,
zero-latency promise or token-cost claim remains. This deliberately gives up
shared caching, including public static assets, until the routing and privacy
policy have been reviewed.

References checked on 2026-10-23:
- [Cloudflare Fetch API](https://developers.cloudflare.com/workers/runtime-apis/fetch/)
  documents the supported `no-store` fetch mode.
- [Cloudflare Cache API](https://developers.cloudflare.com/workers/runtime-apis/cache/)
  describes response cache directives and cookie handling.

The regression suite uses synthetic requests and a poisoned cache fixture to
check authenticated/cookie requests, exports, status routes, path/query aliases,
public assets, cookie-bearing responses, redirects, mutations and errors. It
runs in the web CI workflow. These Node tests establish the handler policy;
they do not emulate every Cloudflare runtime or dashboard rule.

## Deployment gate

Cloudflare Workers Builds reports failure on main `54ceed32` and the preceding
`77545885`; GitHub exposes no error text. The dashboard build page requires a
separate Cloudflare sign-in. Automated sign-in was rejected by approval review
pending explicit authorization for that account. The cause remains unknown.

Before changing Cloudflare deployment configuration, inspect its build log,
entrypoint/build command, compatibility date, production routes/custom domains,
origin mapping and cache rules. Do not introduce a guessed Wrangler config or
enable another service just to clear the check. This legacy same-URL forwarding
handler assumes a Worker route with an existing origin; it does not configure a
workers.dev or custom-domain origin. Review and purge any affected old cache
entries through the account's normal cache controls if deployment evidence
shows the previous handler was serving traffic. Repository changes alone do
not purge existing caches or verify the live Cloudflare boundary.

## Verified Railway release

PR #181 merged as `54ceed32b9b7641bac7360a94a9adbf65ccbfd9f`. Railway deployment
`6a1b6109-512e-48d1-8023-488eaabc6e29` reached SUCCESS on 2026-10-23 at 07:44:44 UTC.
Public probes confirmed the new `/assets/index-CYWU-iUW.js` frontend, health 200,
MySQL connected, AI pilot disabled, 10 legacy/export denials, 8 tRPC checks,
five oversized auth alias rejections and authenticated Omega boundaries.
All private/status responses checked were uncacheable. These tests created no
production accounts or data. Positive owned-account export acceptance remains.
