# Production frontend parity — 24 October 2026

Scope: #229 engineering blocker; full launch conditions remain in #202.

## Cause and repair
The repository contains both `index.html`/`src` and `app/index.html`/`app/src`.
Vite 7.3.7's resolver tests absolute-looking imports as root-relative URLs when
`path.join(root, root)` exists. At the former Docker working directory `/app`,
that directory is `/app/app`: a real source folder. The same source built in a
normal CI checkout does not have that collision. This explains the observed
nested HTML entry and mixed provider chunks; the regression workflow must
reproduce the old layout and reject it with `LUQI_FRONTEND_TREE_DRIFT`.
Upstream implementation: `vitejs/vite`, tag `v7.3.7`,
`packages/vite/src/node/plugins/resolve.ts`, rootInRoot / URL resolution branch.

The image uses physical working directory `/srv/luqi`. A root-level `/app`
symlink preserves existing operator CLI paths; it is not the nested app source
tree and does not reintroduce `/srv/luqi/srv/luqi`. Ports, source code, commands,
non-root web user and server security configuration are unchanged.

## Mandatory checks
Docker runs the frontend gate after the normal build and before selecting the
non-root web user. It checks the actual production module graph, root HTML and
browser entry, no mixed nested frontend, exactly one shared query provider,
unchanged module-preload policy, and that existing emitted JavaScript/CSS bytes
match the inspected graph. A sanitized filename/size/hash manifest is written
outside the public directory. It contains no user or environment data.

The parity workflow compares the normal checkout and exact-image JS/CSS
manifests, verifies non-root identity and legacy `/app` operator paths, proves
the former path collision is blocked, and runs search and all three deferred
query routes against the actual container in desktop/mobile Chromium and
WebKit configurations with synthetic API replies. No production credentials,
account records, inference or payment calls are used.

The first inspection harness incorrectly resolved Vite configuration using
its development defaults before production rebuilding. It was corrected to
capture configuration from the production build itself; byte-identity checks
were retained, not removed. A failed harness run is not production evidence.

## Clearance limits
Do not mark this change released until the exact merge-tree CI and Railway
release verification pass. An operational dashboard or rendered legacy tool
is not proof of active autonomous workers or educational-content accuracy.
Owner recovery, historic credential review, production-derived isolated
restore, actual provider-cost reconciliation, domain/TLS, merchant/refunds and
human acceptance remain separate. USD100/month Gemini60/OpenAI40 is unchanged.
