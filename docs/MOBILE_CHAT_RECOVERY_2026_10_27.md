# Mobile LUQIChat and owner-controlled history — 27 October 2026

## Problem and solution
The screenshot supplied by the owner shows an external ChatGPT conversation-load error, not a verified LUQI outage. LUQI should nevertheless make its own mobile chat simple and preserve useful work when saved-note loading fails.

### Mobile-first interface
- Always-visible, safe-area-aware four-item bottom navigation: **Chat, Services, Recents, Account/My notes**. The full left rail remains accessible from the top button and dock.
- The unauthenticated main conversation view uses a compact sign-in invitation; users can sign in through the existing shared `/login` route or expand the unchanged in-chat account form.
- Clearer compact welcome, first-question suggestions, reduced scrolling and sufficient touch targets. The full desktop workspace remains.
- No separate login, no new credential storage, background polling, paid AI call, booking, payment or external image dependence.

### Two histories, not conflated
1. **Recent LUQIChat (current browser tab):** Only server-confirmed AI replies following explicit consent are held in React memory; a maximum of **100 threads**, up to eight recent local turns each, with a searchable, 12-at-a-time list. Users can explicitly forget a thread with confirmation. History is cleared on account switch, expiry, sign-out or full reload. This is **not permanent AI chat memory**.
2. **Saved private notes (database):** A separate section only reads owner-scoped saved note titles after a signed-in user clicks **Load saved notes**. The client already enforces a 15-second response deadline, HTTP/JSON validation and redacted errors. Requests are manual, never silently repeated. Page size is 50, display batch 10, preview maximum 200. Loading failure preserves any previously displayed notes and never blanks active LUQIChat; **Try again** is deliberate. Links navigate to existing `/companion`; they do not misrepresent notes as AI replies.

### Residual work
- Durable, account-bound **AI conversation** history across devices still requires a separate reviewed schema, consent, read/write ownership tests, idempotent saves, retention/deletion and a production-derived restore drill. Do not label current in-tab threads 'cloud saved'.
- If the platform or a service worker cannot load a route, use the existing `RouteLoadBoundary` recovery route. No infinite retry, cookie persistence, offline data resurrection or automatic provider resubmission.
- Merchant Live activation, settled provider cost, official data feeds, private support and production recovery acceptance remain separate launch gates. The **USD100/month** Gemini 60/OpenAI 40 budget and Paystack disabled configuration are unchanged.

### Release acceptance
Verify mirrored source trees, small-screen layout, correct sidebar and dock navigation, honest guest entry, bounded saved-note failure/recovery, real MySQL private-note acceptance, WebKit and Chromium workflows, and no auto-paid POST. Require exact-merge main-push CI, canonical Railway terminal SUCCESS, release-identity and HTTPS acceptance before announcing website update.
