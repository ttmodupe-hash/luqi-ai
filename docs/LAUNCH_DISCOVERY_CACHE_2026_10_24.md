# Launch discovery and public-cache safety — 24 October 2026

## Why this release exists

The signed-in trial was absent from the workspace tool catalog/search, and the
search footer incorrectly said AI chat was disabled. The start page mentioned
the trial only in its detail copy. The catalog now includes a clearly limited,
sign-in-required text trial, and getting started offers a direct link. Visiting
these links does not authenticate, consent, submit a prompt or activate billing.
The existing per-request consent and runtime checks remain authoritative.

Both previous service workers cached broad successful GET responses without
checking Cache-Control. The Cache API does not automatically enforce HTTP cache
headers. This was a code-review finding, not evidence of a customer-data leak.

## New offline-storage boundary

Both application trees use an identical, new `luqi-ai-public-v2` cache. Only
known public shell/branding paths and filename-hashed build assets qualify.
API/server routes, bare route prefixes, arbitrary routes, cross-origin URLs,
query strings, Authorization, Range, write methods and request no-store/no-cache
bypass interception. A response must be a successful, non-redirected, correct-type
public response without private/no-store/no-cache or authentication-dependent
Vary headers. Uncacheable replacements evict an older entry for that URL.

The worker reads only its current cache, removes only older `luqi-ai-*` caches
on activation, and preserves unrelated origin caches. Old cache deletion takes
effect when the new worker activates; this is not account erasure or backup
cleanup. Storage failures cannot turn a successful network response into an
offline error. Offline cache misses return an explicit no-store 503, never an
undefined response or an HTML shell masquerading as a missing script.

Cache maintenance is registered with waitUntil and serialized. At most 64
entries of at most 1 MiB of actual decoded body data each are retained (browser
metadata/overhead is additional). Stream size is checked even if Content-Length
is missing or false. Browsers can evict data at any time; these are upper bounds,
not guaranteed offline availability. There is no background API sync, request
retry, paid inference, payment replay or offline private-note storage.

## Verification

The dependency-free Node suite has 93 checks across both workers, covering
bypass rules, privacy headers, eviction, bounded bytes, concurrent entry limits,
storage failures, namespace cleanup and public-only precaching. Eight discovery
checks cover search terms, limit labels and mirrored code. New browser cases
exercise the three discovery paths and a real-worker cache/offline boundary in
both existing desktop/mobile Chromium layouts, using synthetic fixtures only.
Physical iPhone/Safari and human acceptance remain separate requirements.

Run:

```sh
node --test tests/public-cache.test.mjs
node --experimental-strip-types --test tests/launch-discovery.test.mjs
```

Existing browser, dependency, MySQL, API-type, input-integrity, container and
mobile-payload checks must remain green. Final-head results, merged revision and
exact-revision public release probes are recorded in #202, not inferred here.

References:
- https://developer.mozilla.org/en-US/docs/Web/API/Cache
- https://playwright.dev/docs/service-workers

## Preserved launch limits

No account/database/schema changes, secrets, new dependencies, paid inference,
provider budget, DNS, merchant checkout or autonomous workers are changed.
The approved $100/month split remains $60 Gemini/$40 OpenAI. Historical credential
review, real backup/restore verification, billing reconciliation, private support,
OpenAI live acceptance, custom-domain and merchant requirements remain open.
These changes improve pilot readiness; they do not declare commercial launch.
