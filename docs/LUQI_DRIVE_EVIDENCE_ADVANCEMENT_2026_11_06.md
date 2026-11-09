# Luqi-Drive: evidence-aware journey planning and bounded source curiosity

Status: development candidate, not deployed. Continues the owner's Academy/epistemic architecture request without overwriting drafts #481/#482 or replacing existing Drive. Base main: 26901b95102d9b9674c12476056228fcb07fc4ad.

## Implemented value
- Additive Smart journey planner and evidence desk integrated through the existing TripFuel slot. Original fuel calculator semantics, GPS, voice, map, provincial/heritage/highway guides, six roadside stories, external Maps handoff and FieldNotebook stay intact.
- Editable whole-trip road distance, fuel, toll/entry/other costs, contingency, time and cost-sharing calculations. Cent-exact split; explicit unfilled fields; input change clears stale results. Never converts straight-line GPS distance into road mileage or invents a pump price.
- User-ordered learning stops and visit durations, source-linked explanation, teach-back/reflection and bounded explicit JSON download. Export projects known fields rather than serializing arbitrary objects. Stops and notes remain personal itinerary data; do not represent the pack as anonymous. No GPS/account fields added.
- Safely parked confirmation for new planner controls. This is not vehicle-motion detection, a certified driving interface or a replacement for established navigation.
- Source directories filtered by corridor and marked with review dates. Fixed local question topics describe what is and is not verified. Not four live AI agents, not live traffic/weather or an open-ended conversational concierge.
- Backend fixed-source byte observer with exact URLs, redirects/credentials disabled, status/MIME/stream bounds and timeout. Metadata-only fingerprint; changes request review, no change is not proof of truth, errors never erase the last good fingerprint. No page text is executed, indexed or promoted.
- Claim selection checks review flag, source/category/corridor, direction, vehicle class, applicability, publication/observation times, expiry and freshness. Conflicts stay conflicts; safeToTravel is always null. Functions accept trusted server review records and are not authentication/attestation boundaries.
- Operator command defaults to plan-only. --fetch additionally requires LUQI_DRIVE_SOURCE_FETCH_APPROVED=true. Exclusive lock, permission-restricted state and atomic replacement. No cron, deployment activation, public refresh endpoint, provider call or new subscription.

## Source review
Directories corroborated using original publisher results during implementation; discovery dates in UI are directory reviews, not observations of actual road conditions. Rechecked 6 November 2026:
- https://www.dmpr.gov.za/Branches/Petroleum-Resources/Fuel-Prices (official search result available; direct fetch unavailable during this review; no current price imported).
- https://www.nra.co.za/press-releases (official search result; direct fetch unavailable; not a route-specific toll API).
- https://www.n3tc.co.za/category/route-updates/ (operator directory, scope is the N3 concession; not a real-time safety feed).
- https://www.weathersa.co.za/ (official weather source; automated access and warning-feed licensing require review).
- https://www.sanparks.org/travel/plan/travel-information/road-conditions (outbound provider directory with accuracy disclaimer).
- https://www.sanparks.org/travel (park visit planning; not all private destinations).
No fixed latest fuel price, route-open verdict, current weather warning, gate time or reservation is imported.

## Twelve-pillar mapping and next acceptance
SEEKER: metadata observation exists; approved recurrent worker and operator alerting outstanding. GRAPHRAG: applicability/freshness policy exists; persistent evidence graph and Academy-compatible reviewed records outstanding. ARBITRAGE: retain approved existing gateway; no new model auto-selection activated. FORGE: tools via tested PRs, no hot execution. Debate: four deterministic planning perspectives, not an agent-consensus truth guarantee. WOW: no new behavioral telemetry. Quarantine: byte observations remain unreviewed. CANARY: focused and regression CI, not automatic production rollback. CRDT: explicit compact export, not synchronization. VISION: no new camera ingestion. PRIVACY: browser-memory planning, reset by account/corridor, no GPS transfer; no compliance guarantee. LITE: capped JSON reference, no WhatsApp/USSD or zero-rating claim.

Next high-value slice: persist signed/reviewer-attributed public observations; show last successful check in Drive with source scope and expiry; establish licensed near-real-time road/weather feeds independently of six-hour background knowledge checks; validate a complete approved source-change -> affected trip/guide -> reviewed update -> controlled release cycle. Free-text concierge must use existing consent/budget gateway, not an unguarded new model endpoint. Optional offline packages need publisher rights, eviction/deletion, refresh semantics and expiry labels. Africa expansion should be country/operator-specific, not one regional all-clear.

## Operator usage (development, explicit only)
Compile src/features/drive/drive-intelligence.ts and api/services/drive-source-radar.ts with TypeScript target es2022/module es2022 into a scratch directory containing package.json with type=module. Set LUQI_DRIVE_RADAR_BUILD_DIR to that directory and LUQI_DRIVE_RADAR_STATE_DIR to a private state directory. Run node scripts/drive-source-radar.mjs to plan without requests. --fetch requires LUQI_DRIVE_SOURCE_FETCH_APPROVED=true after publisher access and outbound public-DNS/egress review. Do not schedule on production until persistent storage, health alerting and restart tests pass. A failed lock is not forcibly removed by another process.

## Verification boundary
Added engine/policy, React/privacy, mirror/source-boundary, existing Drive regression, strict type and built-browser tests. Test results must be read from the exact candidate commit. No fabricated production result or claim of all twelve pillars operating. Browser evidence is synthetic CI-rendered UI, not physical-device testing. No merge/deploy, billing activation, credentials or location history accessed.
