# Luqi-Drive follow-on: read-only source observation status

## Scope
Continues draft PR #483 on top of 95d5c4621b9c99ccaf5a57d0ccf8ed821f40cf3d. This slice connects previously saved operator source-check metadata to a manual read-only UI. It does not activate the source worker, make publisher calls, retrieve traffic/weather facts, certify roads, merge, deploy or change billing.

## What a customer sees
A separate Saved source-check status panel beside the existing fuel/planner panels. Nothing is requested at mount or expansion. An explicit button sends one fixed same-origin GET with credentials omitted, no query, no body and no referrer. Existing map, GPS, audio, field notes, fuel and planning behavior remains unchanged.

The returned six-source snapshot is filtered locally to the current corridor. Each item distinguishes the last attempt from the last successful page read, retains a prior success after failure, and shows baseline, unchanged or changed-review-required bytes. A local timer updates observation age without polling. Empty, disabled, unavailable and overdue are not represented as healthy. Every timestamp describes source metadata, never a road-open or weather-clear conclusion.

A five-second UI deadline aborts reads, clears busy state and ignores late results. Closing, unmounting, corridor changes or account changes cancel/reset the panel. Repeated clicking is disabled while a request is outstanding. No private itinerary, precise position, raw source page, digest, secret, filesystem path or diagnostic is returned. Ordinary HTTP access metadata still exists at the hosting layer; this is not a claim of anonymous transport or zero logging.

## Server boundary
The only new tRPC public-read allowlist key is driveSources.status. Its input is z.undefined(); no new mutation, admin privilege, refresh or arbitrary URL/path parameter exists. Existing no-store transport headers and application ingress controls remain in place. A live HTTP/transport test exercises the real route and denies object inputs, mutations and an unapproved procedure.

Publication is disabled by default. readSavedDriveSourceStatus uses only operator-supplied configuration, not caller fields. When enabled, it reads only state.json under the configured absolute directory. It rejects symlinked final directory/files, non-regular files, invalid JSON/UTF-8, future or inconsistent times and files over 32 KiB. O_NOFOLLOW plus O_NONBLOCK and descriptor stat/read bounds reduce symlink and special-file races. All directory ancestors must remain trusted, locally mounted and operator-controlled; this is not a defense against a compromised host administrator or arbitrary filesystem replacement. Atomic worker replacement remains required. The reader never writes or initiates a source scan.

The public contract validates exact keys, all six known IDs, strict enum types, no duplicates and chronological consistency. The browser caps response bytes at 16 KiB, rejects redirected/non-JSON/error/old responses and renders fixed labels rather than server-provided narratives. safeToTravel is always null. A hash/fingerprint is not semantic verification or reviewer attestation; those still need a separate durable review workflow.

## Operator enablement prerequisites (not executed here)
After review and deployment, configure LUQI_DRIVE_STATUS_PUBLIC_ENABLED=true only when intentionally publishing these non-personal timestamps. Set LUQI_DRIVE_RADAR_STATE_DIR to the absolute operator-owned local state directory already used by the one-shot radar. Use read-only mounting for the API process where possible. No directory creation or fallback to an arbitrary working-directory path occurs in the reader. Leaving the flag unset returns disabled without accessing storage. Enabling status publication does not enable fetch approval or scheduling.

Before any recurring worker rollout: review publisher terms and egress/DNS controls; verify durable state across restarts; supervise failures; keep actual travel-condition feeds separate from this slow source-change monitor. Do not infer review completion from unchanged bytes.

## Verification to obtain on the exact candidate
Existing Drive tests retained. Added projection/schema, bounded-filesystem, actual tRPC, UI cancellation/account reset and built-browser tests. Browser responses are synthetic and cover 320-pixel layout, deliberate request privacy and graceful failure. Evidence must come from actual CI results rather than this document. No production operation, live-source availability or complete application readiness is asserted by a focused test pass.
