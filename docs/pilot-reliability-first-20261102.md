# Luqi 1,000 real-user pilot: reliability evidence handoff (2 Nov 2026)

Owner direction: reliability, simplicity, security and a successful pilot before expanding product scope. KHORO stays in Luqi with one login. Primary tracker: [#439](https://github.com/ttmodupe-hash/luqi-ai/issues/439); launch: [#202](https://github.com/ttmodupe-hash/luqi-ai/issues/202).

## Baseline (read-only connected Railway, previous 24h)

- Web production SHA `5fda81b0a30bb530a0f2c6bf10bab506b4e5f3ca`, deployment `6e3dfba6-f6e1-4b25-9bac-9b4d35d8e407` reported SUCCESS.
- All-path HTTP: 3,094 requests, 425 5xx (raw 13.74%). **Do not interpret as real user failure rate**.
- Twelve deliberately disabled legacy routes (10 retired REST routes and 2 retired tRPC procedures) each returned 32 x HTTP 503: 384 expected *unavailable-surface* responses. The original public-release acceptance script explicitly checks these denials.
- Remaining 41 503s align with historical self-healing endpoint traffic. The legacy self-healing frontend polls disabled backend endpoints on 5–6 second intervals and advertises unsupported autonomous actions. The backend intentionally refuses them with `SELF_HEALING_PIPELINE_NOT_CONFIGURED`. This change replaces the public route with an honest, zero-poll fallback; it **does not** enable autonomous repair.
- Path-scoped 24h metrics reported zero 5xx on `/` (144 requests), `/v1/health` (76), `/v1/release` (165), `/v1/readiness` (70) and `/api/v1/luqi-core` (35; most were anonymous 4xx denials). This **does not** attest to successful real provider replies, login, sustained traffic, or physical-device acceptance.
- The raw and expected-disabled error counts are retained. Excluding known-disabled routes from a *customer-journey* measure must not hide 503s on new/unexpected paths, or claim all other failures are impossible.

## Pilot delivery gates

1. **Reliable entry and guest AI:** test no-login trial -> successful real answer -> contextual follow-up -> signup -> signed-in chat -> sign-out. Preserve existing limits/consent; use fixtures until paid-provider approval. Report success and denial separately.
2. **Actual-device acceptance:** 320px and 390px Chromium, iPhone-sized WebKit, and physical Android/iPhone/Huawei/Xiaomi/Oppo as available. Verify safe PWA upgrade across releases and no misleading install-security guidance (#354).
3. **Security / recovery:** auth isolation, protected support, revocable device sessions (#312), trusted payments, production-derived restore and operator review (#381); no universal production readiness claim.
4. **First cohort of 25**, then 100, 250 and 1,000 distinct consenting real testers. Assign legitimate human testers, not fake signups or load scripts. A 3,000-attempt guest budget does not prove 1,000 users completed tasks.
5. **Truthful, privacy-minimal reporting:** track aggregate first usable guest response, follow-up completion, signup success, second-session return, broken CTA reports, real relevant 5xx, expired assets and approved spend reconciliation. Define unique-user and consent policy before instrumentation. Never persist raw prompts, JWTs, IPs, precise locations or identifiable feedback in a public issue.
6. **Evidence before declaration:** exact-head CI + human review + merged revision + Railway SUCCESS + public exact-SHA/browser acceptance. Report pilot outcomes only after real data exists; no undeclared provider or API spend.

**This file is a read-only plan and baseline, not an implemented analytics dashboard or a completed pilot.**
