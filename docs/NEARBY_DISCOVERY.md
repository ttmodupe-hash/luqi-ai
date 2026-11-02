# Near me — province discovery and external place searches

A no-account, low-data /near-me page reuses the reviewed municipal names and existing opportunity/news guides. Manual area choice always works. Optional one-time browser location proposes a province and requires confirmation. No precise location, IP lookup, background tracking, geocoder, map tiles, AI call or location history is added. No provider credentials or budget changes.

Only a province code is passed in internal guide URLs, never coordinates. Municipality selection is not inferred jurisdiction or nearest-office routing. Jobs are filtered by the advert province; no distances are invented. Local Pulse falls back to its existing national/directory coverage outside reviewed Gauteng and Western Cape sources.

External map searches require a typed town/township/village and explicit link click. Google Maps, Apple Maps and OpenStreetMap receive only the encoded search text, province and South Africa (Google/Apple also receive the selected category; OpenStreetMap opens the named area); no starting point, GPS coordinate, user token or account data is included. Links are HTTPS to fixed allowlisted provider hosts, use noreferrer/noopener, and do not prefetch or embed a map. External providers have their own data/permission policies. Opening hours, routes, safety and results must be checked there. This creates searches, not map edits or business verification.

No published reviewed Luqi businesses exist in this release. Business Connect owner registration, durable profiles, public-pin/service-area consent, moderation and review remain issue #360. Never use external search results as Luqi-verified records. Exact-distance discovery will require licensed/source-reviewed coordinates and location-quality handling.

Validation includes unit/UI tests for manual filters, encoded/allowlisted map links, no requests on mount/selection, mirrored frontend parity, and province handoffs; mobile Chromium and WebKit journey checks cover the actual navigation. The map-location tests independently verify permission/callback handling.

The service-status page is now lazy in both routers, behind the existing route loading/recovery boundary. The core task board and private-note release markers remain in the entry bundle. Local whole-graph measurement: 491,419 raw / 146,044 gzip JavaScript bytes; zero initial legacy-query modules. These are build-byte measurements, not measured network latency. All core release markers and existing deferred-tool boundaries were verified against the emitted manifest and entry.
