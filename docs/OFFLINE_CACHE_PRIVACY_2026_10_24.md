# Public-file-only offline cache — 24 October 2026

## Defect and scope

The root worker previously cached almost every same-origin successful GET after
a short server-path denylist. The standalone worker similarly cached generic
responses and treated every /assets/ path as immutable. Neither inspected the
response's storage restrictions. CacheStorage does not enforce HTTP Cache-Control
itself. This code finding is not evidence that any real private response was
stored, disclosed or accessed; established account/API routes were already bypassed.

Both workers now use the same public-file allowlist: the static root/index shell,
manifest and named LUQI install artwork, and flat content-hashed Vite JS/CSS/image/
font assets. All other paths are network-only, including admin/diagnostic pages,
future account routes, lab HTML and arbitrary reports. Query URLs, cross-origin
requests, bearer requests, range requests and non-GET operations are not intercepted.
This deliberately narrows offline scope; not every tool can operate offline.

Successful status, same-origin basic response, no redirect, expected MIME type and
non-sensitive Vary are required before storing. No-store/private/no-cache/
must-revalidate responses and visible Set-Cookie are rejected; an older copy of
that public URL is deleted. A request requiring no-store/no-cache or network-only
behavior bypasses the worker. Opaque and wrong-MIME responses cannot enter the
cache. An HTTP error is returned as an error, never disguised as cached success.

The new named cache never searches unrelated caches. Offline responses are
rechecked before use; only / and /index.html may use the public index fallback.
Missing or unavailable storage yields a fixed no-store 503 Response rather than
undefined. Storage failures cannot break a valid network response. Serialized
writes are tied to event.waitUntil and cap this cache at 96 entries (an entry-count
bound, not a total-byte or disk-quota guarantee). Shell entries are retained while
older non-shell resources are removed; selected tools may require a new download.

Activation removes only the two exact known retired LUQI cache names, preserving
other CacheStorage entries, IndexedDB and localStorage. There is no forced page
reload or AI/payment replay. Existing clients receive the policy after their
browser installs/activates the updated worker, not instantly at server deployment.
This does not clear HTTP caches, browser history, downloaded exports or all
historical client storage, and is not whole-account erasure or incident clearance.

## Verification

55 dependency-free Node VM cases cover both entrypoints, private/header and route
boundaries, MIME validation, stale-copy eviction, offline fallback, storage
failure, bounded concurrent writes, anonymous precache and scoped migration.
Run `node --test tests/offline-cache-privacy.test.mjs` with Node 22.

The regular Web Build runs three additional browser journeys in desktop/mobile
Chromium layouts with the real worker: public-to-no-store invalidation, bypass of
account/admin/query/bearer requests, and actual CacheStorage migration without
removing unrelated local preferences. Fixtures are synthetic and local; they
abort external/non-GET requests and use no production accounts or providers.
Existing offline tool-recovery tests remain unchanged. Final-head CI, review,
Railway SUCCESS and exact-revision public probes are needed before calling it live.

References:
- https://developer.mozilla.org/en-US/docs/Web/API/Cache
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control
- https://playwright.dev/docs/service-workers

No SQL/schema/credential change, paid inference, API-budget increase, merchant
activation, DNS mutation, new hosting resource or autonomous worker is included.
The $100/month Gemini/OpenAI $60/$40 allocation remains unchanged. Domain,
production-derived restore, historical credential review, spend reconciliation,
human/support acceptance and merchant gates remain in #202; those require their
own evidence and are not cleared by this frontend safety release.
