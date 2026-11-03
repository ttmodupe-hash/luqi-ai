# Luqi-Drive · South African roadside knowledge and vehicle audio (review candidate)

Reviewed 3 November 2026. Integrated inside Luqi/KHORO Tool 020 (not another login, product or AI spending route).

## Supported in this first candidate
- Extends existing source-linked local route packs on the N1 Pretoria–Polokwane and N3 Johannesburg–Durban with four **approximate area markers** near Modimolle, Mokopane, Harrismith and Howick. No assertion that an attraction, mineral deposit or wild animal is on the user's road.
- Each area has six linked topics: geography, history, natural wealth (agriculture and mining/economy where supported), culture and languages, fauna and flora, and a "Did you know?" item. Sources are in plain-text public editorial code; no live claim of museum opening hours, wildlife sightings or traffic.
- The phone's standard Web Speech API may speak a short pre-reviewed introduction **only after the user independently enables automatic audio and grants location permission**. The selected route is user-selected, not map-matched.
- GPS data stays in the current tab's memory. Coarse location markers are evaluated on-device and are rejected when older than 45 seconds or horizontal accuracy is worse than 1.5 km. Narration is suppressed per area for 30 minutes and globally for at least 3 minutes. The app does not record an account trail, access Bluetooth pairing details or call AI.
- Automatic narration stops when location stops, route changes or the page becomes hidden. Some mobile browsers suspend location and speech in the background; neither continuous narration nor offline device voices are guaranteed.
- Full stories and original-source links require explicit **safely parked** or **passenger** mode. A vehicle moving at 25 km/h is still moving: speed alone is never proof of parking.

## Vehicle standards and truthful compatibility
- **Bluetooth:** When a phone is paired to a vehicle that supports Bluetooth media audio (e.g., A2DP), the operating system can route ordinary phone audio to the car speakers. A browser cannot force pairing, control every head unit or promise speech mixing with navigation/calls. This work does not ship an in-dash display integration.
- **Android Auto / Android Automotive OS:** Driver-display integration requires a compatible native Android app, a permitted category (navigation, POI, media/audio or other eligibility as actually approved), Google Car App Library or appropriate media APIs, design templates, real device/head-unit tests and distribution approval. Reference: https://developer.android.com/training/cars/apps/library and https://developers.google.com/cars/design/create-apps/app-types/overview
- **Apple CarPlay:** A native iOS app must meet Apple's supported CarPlay category, entitlement, template and driving-task review requirements. CarPlay/CarPlay Ultra displays are not provided by arbitrary web content or Bluetooth alone. Reference: https://developer.apple.com/carplay/
- **South African driving law:** Road traffic regulation 308A restricts hand-held use of communication devices. Driving-mode interactions must be hands-free, minimal, and subordinate to safe driving; no video, long reading, passengers-only quiz for the driver, or distracting popups. Check original regulation at https://api.acts.co.za/national-road-traffic-act-1996/r225_308a__prohibition_on_use_.php
- **Manufacturer support:** A single claim of "all manufacturers" is not technically supportable. BMW, Mercedes, Volkswagen, Toyota, Ford, Hyundai, Nissan, older aftermarket units and Huawei/non-GMS phones have different compatible profiles/platforms. Certify a compatibility matrix by actual device + OS + car/head unit, and fall back to phone audio or parked-only UI.

## Original source scope
- UNESCO Waterberg: https://www.unesco.org/en/mab/waterberg
- UNESCO Makapan Valley: https://whc.unesco.org/en/list/915
- UNESCO Maloti-Drakensberg: https://whc.unesco.org/en/list/985
- South African Government provinces: https://www.gov.za/about-sa/south-africas-provinces
- Howick and Midlands: https://www.southafrica.net/au/en/travel/article/howick-falls-kwazulu-natal-a-spectacular-cascade
- Howick uMngeni municipality: https://umngeni.gov.za/about-umngeni/
- Mandela chronology: https://www.sanews.gov.za/south-africa/nelson-mandela-chronology

## Coverage and release gates
This is **NOT** national all-roads coverage yet. Expand editorially, with original sources and geographic review, to N2 Cape Town–Gqeberha–East London–Durban, N4 to Mpumalanga, N7 west coast, N10/N12/N14, and R routes, adding provinces, municipalities, official heritage sites and culturally reviewed language pronunciations. Respect indigenous knowledge attribution, contested historical accounts, wildlife location security, landscape sensitivity and user-choice of audio themes.

Release gates: exact current-main reconciliation, mirrored frontend trees, deterministic tests for geofence geometry and stale GPS denial, jsdom opt-in/no-network/no-repeat acceptance, real Chromium/WebKit 320px journeys, startup payload and security checks. Real iOS/Android, Bluetooth hands-free, Siri/Google voice controls, OEM screens and old PWA acceptance must be separately evidenced. No payment, provider API, AI inference, DNS, production variable or deployment changes are part of this PR.

Rollback: revert only the area-story imports/cards/auto-narration from both `LuqiDrivePage.tsx` mirrors and the two public `luqi-drive-areas.ts` files. Existing offline route packs, geohash, manual audio and Business Connect stay in place.
