# Luqi-Drive Tool 020 — Tourism concierge review handoff (5 November 2026)

**Candidate only; NOT merged or deployed.** One Luqi/KHORO login, no additional provider billing, GPS upload, autonomous booking, payment, third-party maps API, live weather fetch, live emergency routing or private customer data.

## Architecture
- The existing N1/N3 regional editorial stories are reused; this does **not** claim nationwide verified venue coverage.
- Four bounded lenses: heritage/history, biodiversity/wildlife, local economic/cultural context and route/safety context. Personas change ordering, not factual content.
- All claims must carry original source links. An invalid/missing source is omitted; a missing area displays an unavailable state, never generated filler.
- Lazy-mounted optional React panel means the normal Drive map and voice remain available without loading the new feature.
- Explicit passenger or stopped self-attestation; if GPS is active, the driver mode blocks when measured speed is >=5 km/h or unknown. GPS does not prove a parked car.
- Optional budget ceiling is informational only because there are no verified stop/venue prices. The separate pure selection helper uses cumulative integer cents and excludes unpriced stops rather than assuming zero.
- Six-character geohash is available for deterministic **cell identifiers**, not guaranteed accurate proximity matching. Exact-area lookups use an in-memory Map; larger curated catalogs require neighboring-bucket and radius testing.
- A WebCrypto SHA-256 checksum covers only the deterministic source-linked briefing. It is not a digital signature, proof of source identity, publisher authentication, or a tamper-proof audit trail.
- Editorial lens facts currently remain in English. Existing Luqi-Drive stop narratives retain English, Sepitori, Setswana and isiZulu.

## Release and evidence gates
1. Check exact branch/merge commit Web Build, full Vitest + TypeScript, mobile/WebKit/Chromium, source parity, accessibility/320px, startup payload and server-container CI. Synthetic checks are NOT real phone certification.
2. Test stale PWA/old-tab recovery separately (#354), without unsafe draft loss or automatic AI/payment replay.
3. Physically test at least one older Android, Huawei/Xiaomi/Oppo class device and iPhone; confirm moving-driver guard and offline input on real hardware before claiming vehicle compatibility. Do not claim Android Auto/CarPlay or OEM screen integration.
4. Human editorial review of original UNESCO/government sources and dates; additional local businesses, prices, weather, route hazards and booking information need new verification and licenses.
5. Preserve single-owner release-control process (#381): owner signoff, enforced exact-head CI and Railway wait-for-CI before approved merge/deploy. No extra cost or secrets.

## Rollback
Revert this additive feature commit on a review/release branch and re-run all exact-head CI. Production is currently pinned; do not force redeploy, wipe SW caches or delete visitor drafts without explicit owner approval.

## Future stages
Versioned public route packs with size/expiry limits, bounded IndexDB cache + source revision metadata, neighboring-geohash/radius lookup, carefully rate-limited optional provider weather and road advisories, verified business profiles and separate booking consent. Tool 05 credit/statutory logic remains a separate regulated-data design and cannot derive official bureau decisions from a utilization ratio. Performance/90% cost savings require measurement, not assertion.
