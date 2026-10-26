# LUQI — one customer login and Chat-first access (review candidate, 26 October 2026 SAST)

## User problem and scope
Previously Notes, the metered AI text trial and authenticated Omega task history each held a separate component-local JWT. Route navigation discarded it, forcing another login. Chat was absent from the primary navigation. This change shares **one customer account session in React memory across those three authenticated public tools** and makes Chat discoverable on desktop, mobile, homepage and installed PWA entry.

## User-centred Chat acceptance

- **Chat is the primary customer journey**. The first prominent input must reach the real, consent-based AI text gateway when configured; it is not a disguised Notes form or a local keyword classifier.
- The free local intent/tool guide is secondary, and Notes remain optional. AI follow-up context exists only in page memory and is shared with a provider only after an explicit, reviewed opt-in.
- Test both the signed-out and signed-in mobile journeys at 320px, without invoking paid AI in automated browser acceptance. Real-provider quality and physical-device acceptance remain separate.

## Security and truthfulness
- The existing authenticated account transport, MySQL ownership checks, JWT and per-route server authorisation are unchanged. This is **shared customer login**, not an administrator SSO or elevation of privileges. Admin remains isolated.
- No JWT, password, account content or AI question is written to cookies, localStorage, sessionStorage, URL, service worker, analytics or browser caches. Full reload/tab close still requires a fresh sign-in; cross-tab persistence is **not** implemented. A later HttpOnly/SameSite cookie design would require CSRF, revocation and independent security review.
- Signing out from any participating customer tool clears the shared identity; pages drop private local state and ignore stale async completions. HTTP 401 on protected operations also clears the shared identity.
- Chat now presents the **actual consent-based AI text trial first**, rather than requiring Notes or making the local tool finder the main experience. Users can ask the provider a question and, within the current page only, review recent replies. Sending a short conversation preview with a follow-up requires separate explicit opt-in; Notes and account email are never included. Free browser-local intent guidance remains available below Chat, including an honest no-booking state. This is not a persistent-memory, always-on, live-data, voice or booking agent.
- No server, database, merchant, payment, AI model, secret, spending cap, DNS or infrastructure changes. Existing USD100/month (USD60 Gemini, USD40 OpenAI) remains unchanged.

## Release verification required
- Root and app frontend mirrors must remain identical for shared files; preserve all existing rights/consumer and legacy guarded routes.
- Exact-revision TypeScript/web build, unit tests, WebKit/mobile and disposable-MySQL first-user journeys must pass. New browser acceptance signs in once, navigates Notes → Chat → Omega → Notes without another authentication POST, checks no paid AI POST, then signs out and verifies sign-in is required.
- Validate 320px visible Ask LUQI header action and honest booking empty state. Verify account creation, login, session expiration and logout on a real iPhone and Android device. No production account creation or provider inference in CI.
- Independent security/product review, protected release ordering and explicit deployment acceptance before merging to auto-deploy main. This follow-up review candidate is **not deployed** and depends on shared customer-session PR #283. The live app still runs the older main revision.
