# Luqi-Drive: motion estimates and optional Earth context

Owner request: activate useful satellite/GNSS capabilities within Luqi, without adding a provider subscription. This is an additive implementation, not a guarantee of lane-level accuracy or complete activation of the proposed tiers.

## What is implemented

- Existing opt-in `watchPosition(success, error, { enableHighAccuracy: true, ... })` is preserved. Raw coordinates, accuracy and landmark matching are not changed.
- On-device scalar-speed and east/north velocity Kalman smoothing provides labelled display estimates. Tuning is not sensor calibration. Stationary/unknown motion, stale fixes, duplicate timestamps, heading wrap and reset gaps are handled. Estimates are not used to steer, locate a lane or reduce the reported accuracy radius.
- An in-Luqi panel loads a bounded 640-pixel NASA GIBS MODIS Terra true-colour image for a selected public landmark and date, and a bounded NASA EONET regional event list. The two dates are independent and labelled.
- No NASA requests occur on mount, on GPS updates or without clicking Load. No exact phone coordinates, account credentials or referrers are sent. NASA receives the requesting IP address. No background polling, retries, new subscriptions or paid inference.
- EONET is a delayed, incomplete curated event source, not FIRMS, a weather forecast, emergency alert or road-closure service. Missing, empty or failed data never means safe. Imagery is not proof of groundwater/borehole viability.
- Provider failures are contained in this optional panel; existing local maps, guides, fuel planning and GPS remain usable.

## Explicitly not activated or certified

Browser constellation/frequency selection, raw carrier measurements, NTRIP/RTCM injection, TrigNet access, RTK positioning, a sub-metre/1–3 m guarantee, lane navigation, SANSA licensed data, Sentinel-2 raster/NDVI processing, live flood/fire alerts and physical phone/road acceptance are not claimed.

Free/open data does not make mobile data, hosting, computation or all SANSA products free. Current TrigNet access terms and compatible receiver/native integration would require separate verification. Historical zero tariffs do not establish current access.

## Evidence boundaries and release gate

Local pure TypeScript compilation and selected numerical smoke checks were run during implementation. The committed unit/React tests and Chromium/WebKit mobile browser tests must pass in CI before merging. These browser tests use fixtures and are explicitly not physical Samsung/iPhone acceptance or proof of real provider availability.

After a terminal Railway SUCCESS on the merged SHA, a read-only `verify/drive-earth-*` branch may be created at that exact SHA. The public-acceptance job checks `/v1/release` before and after the visible customer-page test, actually loads public NASA services, and retains screenshots/JSON evidence. A workflow failure is not successful public acceptance. No customer account, secret, paid AI, DNS or production mutation is part of that job. A downloaded image does not verify capture time or cloud-free coverage for every pixel.

No deployment or physical-device result is asserted by this document. Record exact PR/head checks, merge SHA, Railway deployment ID/status, public verification run and remaining caveats in the release conversation.

## Primary source review, 9 November 2026

- W3C Geolocation: https://www.w3.org/TR/geolocation/ — high accuracy is a request, not a guaranteed sensor mode.
- NASA GIBS: https://nasa-gibs.github.io/gibs-api-docs/access-basics/ and https://nasa-gibs.github.io/gibs-api-docs/access-advanced-topics/ — WMS layer and temporal/resolution semantics.
- NASA EONET v3: https://eonet.gsfc.nasa.gov/docs/v3 — event categories, time and regional filtering.
- Copernicus Sentinel-2: https://dataspace.copernicus.eu/data-collections/copernicus-sentinel-missions/sentinel-2 — open data, band-dependent resolution, not continuous imagery.
- SANSA Earth Observation: https://www.sansa.org.za/products-and-services/earth-observation/ — dataset-specific products/access conditions.
