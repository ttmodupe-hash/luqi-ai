# Luqi living workspace

The shared workspace now offers a discovery dialog on every route, including
Chat. The homepage also has an interest-based discovery deck. Choosing an
interest or mixing suggestions only changes local UI state. Opening a tool is
an explicit link to an existing catalog entry; it does not send an AI request,
submit a form, make a payment, or claim unavailable functionality is ready.

## Interaction and accessibility

- Responsive cards and province notice beacons use CSS, without new libraries,
  tiles, tracking pixels, sounds, or remote assets.
- The shared Calm mode disables decorative motion. Only this boolean preference
  is stored (`luqi:calm-mode`); no journey, province, account or browsing history
  is recorded. Storage failures leave the control usable for the current visit.
- The operating system's reduced-motion preference always takes precedence.
- Native dialog focus containment, Escape dismissal and return focus support
  keyboard use. Full-name province buttons remain alternatives to SVG regions.
- Device online/offline means the browser's connection signal. It does not mean
  Luqi's servers, AI providers, payments or other customers are online.

## Fresh source signals

The Opportunity Compass displays results from the existing fixed official
publisher checker (`GET /api/v1/opportunity-watch`). No request runs on entry.
The visitor can refresh once or enable five-minute refreshes while the page is
visible and the device reports online. Only one request can be in progress;
requests have a ten-second deadline and are aborted on unmount. The checkbox
is off on each new visit. Hidden/offline pages do not start interval requests.

The server coalesces concurrent checks and shares a 15-minute cache per process
(previously six hours). Each scan fetches only three fixed original publisher
pages with the existing per-response byte, timeout, content-type and redirect
restrictions. This needs no model request, credential change or AI budget
increase. Multiple application processes each maintain their own bounded cache.

The UI validates known source IDs, unique results, status, timestamps, scope and
bounded optional publication text. Failed or malformed responses clear previous
positive states. Results older than 16 minutes are labelled earlier checks.
Timestamps are shown in South African time. Cache timestamps are never replaced
with the time the browser fetched them.

Publisher reachability is **not** a new vacancy feed or proof a position is open.
The notice registry stays reviewed and source-linked, and changes through
verified releases. The UI shows its separate review date. Pulses identify
provinces with reviewed notices; they do not identify people, exact jobs,
business premises, customer presence or live applications. No business directory
or external map verification is implied by this change.

## Validation

Unit tests cover safe discovery routes, device connection semantics, storage
denial, strict evidence validation, stale states, offline/failure handling,
opt-in/hidden-page polling, abort and cleanup, and cache expiry/coalescing.
Browser regression checks exercise the discovery modal, focus return, calm
preference across reload/navigation, 320px layout, reduced motion and real
source-check response handling using synthetic fixtures. All public frontend
changes are mirrored in `src` and `app/src` and checked by Web Build.
