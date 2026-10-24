# Lean public startup — 24 October 2026

First performance slice for #229, coordinated with launch hub #202.

The two browser entrypoints previously wrapped every route in TRPCProvider,
creating a React Query cache and tRPC client before the first screen. This
change removes only that global wrapper/import. Server tRPC routes, their
security boundaries, legacy provider source, installed packages, explicit REST
clients, account sessions and all route components remain unchanged.

The removal is valid ONLY if no emitted route still needs the provider.
Startup Payload CI examines the actual production-build module graph across
ALL emitted chunks, including lazy tools. It fails if the legacy provider,
@trpc, React Query/query-core or superjson remains in any browser chunk. This
is stronger than incomplete code-search results or checking one entry filename.
A future query-driven feature needs an intentional provider boundary and a
reviewed adjustment to this guard; do not simply bypass it.

## Measurement

Compare candidate with pinned released revision
`1e834c5fbbe42bed0444425db0e7cd0d2323fe65` on the same CI runner using locked
installs and the same production Vite configuration. The measurement builds
in memory, does not deploy and traverses all static entry imports once. It
reports raw emitted JavaScript bytes and the sum of per-file gzip sizes, plus
entry CSS and optional chunk count. Gzip here is an equivalent build metric,
not a claim about the server's actual compression or measured mobile latency.
The comparison requires at least a 5% reduction in both JavaScript measures.
Missing entry/module/import evidence fails closed. Ten offline tests cover
measurement errors, shared/cyclic imports, CSS and lazy provider dependencies.

The new browser case checks public home/start/login/signup/plans/help at 320px,
with no automatic API calls, script errors, horizontal overflow or persistent
browser storage. Existing Chromium, WebKit, real isolated-MySQL and account
journey suites must also pass. Physical-device and screen-reader acceptance
remain separate. Feature status labels and availability are not changed.

## Release limits

CI results, measured savings, reviewed merge and exact live revision must be
recorded in #202/#229 after actual execution. This document's presence is not
release evidence. No owner credential problem, recovery mailbox verification,
DNS/TLS, production-derived restore, incident response or merchant readiness
is claimed resolved. No DNS, mail, database, secret, budget or billing edits.

Build API references: https://vite.dev/guide/api-javascript and
https://rollupjs.org/plugin-development/#generatebundle .
