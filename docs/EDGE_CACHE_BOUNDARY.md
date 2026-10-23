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

Authenticated API inspection on 2026-10-23 established the failure, replacing
previous speculation based on GitHub's empty annotations. Build
`8cefaaca-276b-447f-b22c-54f4a97269eb` starts at `/`, automatically installs the
root Python dependencies and fails before the build command:
`Error: pg_config executable not found` while building `psycopg2-binary`.
The configured commands were `bun run build` followed by Wrangler. The
Railway Node/Python application is not the edge Worker's build target.

The edge Worker now has its own `package.json`, npm lockfile and Wrangler
configuration. Wrangler 4.152.0 is pinned; the compatibility date preserves
the existing 2026-10-22 setting. Local `npm run validate` checks syntax and
bundles with `wrangler deploy --dry-run`; it does not publish a preview or
contact an AI provider. Dependency CI also audits this complete tooling tree.

Cloudflare build settings for this repository should be:

| Setting | Production | Pull-request validation |
|---|---|---|
| Root directory | `/edge` | `/edge` |
| Build command | `npm ci --include=dev && npm run check` | same |
| Deploy command | `npm run deploy` | `npm run validate` |
| `SKIP_DEPENDENCY_INSTALL` | `true` | `true` |
| `WRANGLER_SEND_METRICS` | `false` | `false` |

Skipping automatic dependency installation prevents the root Python install;
the explicit npm command installs only edge tooling from its lockfile. Preview
checks intentionally validate the bundle without publishing an unreviewed
branch. Production deploys preserve dashboard variables with `--keep-vars`.

Before changing public routing, verify origin mapping and cache rules. API
inspection found no custom Worker domains, no matching zone route, and
workers.dev plus preview URLs disabled. The sole zone `luqi-ai.com` is pending.
The committed configuration preserves that routing state and adds no AI,
storage or other service binding. No DNS/nameserver change, public edge
activation or cache purge is included. A successful private Worker deployment
is not proof that this handler serves public production traffic.

This same-URL forwarding handler requires a Worker route with an existing
origin. Review and purge affected old cache entries only if deployment
inspection establishes that the previous handler served traffic. No such
exposure has been established. Repository changes cannot purge old caches.

References checked on 2026-10-23:
- [Workers Builds configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)
- [Workers build image and dependency installation](https://developers.cloudflare.com/workers/ci-cd/builds/build-image/)

## Verified Railway release

PR #181 merged as `54ceed32b9b7641bac7360a94a9adbf65ccbfd9f`. Railway deployment
`6a1b6109-512e-48d1-8023-488eaabc6e29` reached SUCCESS on 2026-10-23 at 07:44:44 UTC.
Public probes confirmed the new `/assets/index-CYWU-iUW.js` frontend, health 200,
MySQL connected, AI pilot disabled, 10 legacy/export denials, 8 tRPC checks,
five oversized auth alias rejections and authenticated Omega boundaries.
All private/status responses checked were uncacheable. These tests created no
production accounts or data. Positive owned-account export acceptance remains.

PR #183 subsequently merged as `fa7c37e730b703e872df26d3d0ae96d2b6c6ade5`.
Railway deployment `8fad0fe7-a412-4b1f-8f39-7e602aa8117e` reached SUCCESS
at 08:43:29 UTC on 2026-10-23. Startup verified/created 38 tables; public
checks verified the new sign-in retry UI, MySQL connectivity, synthetic invalid
login denials and the existing private/legacy/provider boundaries. No positive
production-account acceptance or production-derived restore is claimed.
