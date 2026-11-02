# Luqi Moon now — homepage implementation, not a production release

Owner requirement: a live Moon tracker visible on the front page, integrated into Luqi (KHORO is not a separate product). This is actual browser-local code, not a future-feature badge. Home.tsx renders MoonNowPanel directly after the hero in both source trees. The existing guest flow is unchanged.

## Implemented
- Phase silhouette, illuminated percentage, phase name and approximate Earth-centre distance at the device's current instant.
- One-minute refresh while foregrounded, immediate refresh on visibility/focus, pause/resume and manual refresh; cleanup on unmount.
- Global phase without location; optional one-shot browser location rounded to 0.1 degrees before state, or manually entered coordinates. No assumed user location, persistent storage, geocoding, paid API, accounts, telemetry transmission or background watch.
- True-north azimuth, apparent centre altitude, zenith-relative phase orientation, and bounded next-rise/next-set searches. Display dates and explicitly label the device timezone, not an assumed location timezone.
- Accessible source-based explanation of phases, no artificial lunar rotation loop, and no claim to camera imagery, weather visibility, telescope control, navigation accuracy or confirmed crescent sighting.

## Source and numerical scope
Lunar subset adapted from SunCalc 2.0.1 at bbc91f689ede3ff7173011947d435b3fb6c0485d, BSD-2-Clause. License is retained in code and shipped under /licenses/luqi-moon-suncalc.txt. The vendored subset and upstream fixes need explicit periodic review; Dependabot does not automatically update it. Equations include Meeus lunar longitude/latitude/distance terms, TT approximation, topocentric parallax, approximate refraction and bright-limb/parallactic orientation.

`tests/moon-reference.json` contains numeric results independently calculated locally with installed pyswisseph 2.10.03, explicitly FLG_MOSEPH, sea level, 1013.25 hPa, 10 C. Four fixed instants at six African coordinate fixtures are cross-checks, not user locations. Swiss Ephemeris code is not bundled. Current fixture positions are below the horizon; rise/set crossings cover horizon events, but an expanded above-horizon / near-zenith / polar accuracy matrix remains a release review item. Full astronomical accuracy is not certified by these fixtures.

The rolling horizon solver samples every 10 minutes then bisects observed crossings. It may miss a grazing polar crossing. Missing events are labelled 'not found in the next 48 hours', never 'always up/down'. Approximate atmospheric and unobstructed sea-level horizon assumptions exclude local terrain and elevation. Public input dates are bounded to 1900–2100; near the upper boundary, the search is truncated to the supported range. Wrong device clock means wrong predictions. No religious calendar or actual-sighting determination is made.

## Verification and release gates
35 local Node numerical/input/privacy/geometry tests passed before repository integration. TypeScript transpilation of the panel produced no syntax diagnostics; this is not full type/build or browser acceptance. A mirror/integration check and seven DOM lifecycle/privacy tests were then added to CI. Their actual results, complete exact-head CI, mobile layout at 320px, Chromium/WebKit, source/licence delivery and physical-device location-denial/old-tab behaviour must be inspected before merge. Do not infer CI success or deployment from this document. No production changes are authorised by this branch.

Coordinate with existing homepage copy PR #384 rather than overwriting it; the only Home.tsx changes here are one import and one render. Security work #381 and existing release gates remain separate. Rollback is removal/revert of this isolated UI feature through the reviewed release process, not a secret/config change.

## Shared video and educational roadmap
The owner supplied https://www.youtube.com/watch?v=z66EghynDCI. Public fetches did not yield the video's contents/transcript during preparation. No title, speaker, scientific claim or lesson has been invented or attributed to it. Retrieve a permitted transcript before integrating its claims. Proposed next layer: source-linked, timestamped explanations; native-reviewed African-language lessons/audio; compare predictions with voluntary observations; future lunar phase calendar and sky path. Cultural accounts should be attributed to the specific community/source and distinguished from measured astronomy. These roadmap items are not shipped by this PR.

Primary explanatory source: https://science.nasa.gov/moon/moon-phases/
Calculation source: https://github.com/mourner/suncalc/tree/bbc91f689ede3ff7173011947d435b3fb6c0485d
