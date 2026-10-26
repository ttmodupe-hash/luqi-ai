# LUQI-AI — chat-first Africa companion and AI capacity planning

**Prepared 26 October 2026 (SAST). DRAFT PRODUCT DESIGN, NOT A DEPLOYED LAUNCH OR BUDGET INCREASE.**

## North star: a person tells LUQI what they need

The product is an **African-first, globally useful personal AI companion**, not a catalogue of disconnected tools. Residents, students, entrepreneurs, visitors and tourists should be able to begin with **Chat / Ask LUQI**. The companion should understand a user's goal, clarify what matters, explain what is truly available, and help complete an authorised next step. The same front door can guide people to travel, education, creativity, business and opportunities. Do not reduce the product to tourism alone.

**Tourist journey:** Someone arriving in South Africa (then other African countries) can ask where to stay, how to get around, what to see, how to be respectful, how to prepare for safety/weather/entry requirements, and how to book. Current live prices, transport, visa rules, weather and accommodation are **not connected**; country-by-country verified integrations and multilingual local evaluation are required. Never invent a partner, listing, map pin, live rate, travel alert, opening hour or official advice.

**Trustworthy booking contract:** Show an authentic property/activity/transport image, verified provider identity and location, dates and guests, dated inventory and availability, total price with fees/currency, inclusions, cancellation/refunds and merchant of record **before** any explicit booking confirmation. If any essential evidence is missing, show **No verified booking offers**, not a fake option or a working Book button. Payment, booking writes, supplier credentials, support and refund processing require independent acceptance and owner approval.

## What the draft chat-first UI actually does

- `/#/chat` and `/#/ask`: persistent Chat entry in desktop/mobile navigation, first homepage action and an intent-first page. Users describe a need in up to 500 characters. A deterministic **browser-local guide** routes them to an available local tool or explains the unavailable integration; this is **not a model answer**.
- The same page embeds the existing authenticated, consent-based **single-question AI text trial**. It is not yet a persistent multi-turn AI companion; account sign-in for notes remains a separate in-memory session. User input is not sent to AI automatically and is never put in URL query strings or localStorage.
- Travel bookings show a clear **empty state** until real provider offers can be independently verified. No payment or reservation APIs are enabled.
- Real local tools remain usable: travel budget and vehicle scheduling, study/business desks, silent local content studio and physics. The six Omega adapters remain source-gated; production workers/intake disabled.
- No new paid inference, credentials, provider connections, maps, external images, user tracking, customer booking, merchant or production changes are introduced by this draft.

## AI budget: how many people can LUQI support?

**Existing approved budget remains USD 100/month**, Gemini USD 60 and OpenAI USD 40. The pilot currently reserves **USD 0.10 per provider attempt** in MySQL, and limits each account to 20 attempts per UTC day. This is deliberately padded internal reservation, **not an actual provider charge**. The Gemini-first gateway may call OpenAI as a separately reserved fallback; a failure or fallback can consume more than one reservation per question.

For planning, assume a **30-day month**, **no guaranteed fallback capacity**, and use only the Gemini-primary 60% reservation bucket. The table is a conservative illustration of how many **daily active AI users** can be sustained if each makes the stated number of attempts every day. It is **not** registered users, confirmed capacity, provider cost, revenue or an SLA.

| Illustrative total AI allocation | Gemini primary / OpenAI backup | Primary reserved attempts/month | 1 attempt/day per active user | 3 attempts/day per active user |
| --- | --- | ---: | ---: | ---: |
| **USD 100 (approved now)** | 60 / 40 | 600 | 20 | 6 |
| USD 250 (future scenario only) | 150 / 100 | 1,500 | 50 | 16 |
| USD 500 (future scenario only) | 300 / 200 | 3,000 | 100 | 33 |
| USD 1,000 (future scenario only) | 600 / 400 | 6,000 | 200 | 66 |
| USD 1,500 (future scenario only) | 900 / 600 | 9,000 | 300 | 100 |

For **100 daily active users making three AI attempts/day**, the primary reservation arithmetic implies **9,000 Gemini attempts/month**, requiring USD 900 in the Gemini primary bucket, or **USD 1,500 total** at the proposed 60/40 split. Actual token invoices may differ substantially, and not every user will need paid AI for local navigation or calculations. Hosting, maps, supplier APIs, support, payment processing and marketing are **additional costs**, not included in this table.

**Practical staged recommendation:** Keep USD 100 now. When real pilot evidence shows repeated helpful replies, actual Gemini/OpenAI invoices, errors, abuse rates and unit costs, *consider* USD 250 with explicit approval and updated enforcement. Consider USD 500 or more only when observed daily active demand and sustainable revenue justify it. There is no automatic increase, billing activation or provider cap change in this work.

**Critical engineering constraint:** `api/services/aiPilotBudget.ts` currently hard-codes 100/60/40 and fails closed on different runtime values. Increasing a dashboard cap alone **does not scale the application**. A separately reviewed versioned configuration, MySQL ledger tests, provider-side controls, alerting, actual-cost reconciliation and owner-approved rollout are required before any increase. The offline `scripts/ai-capacity-scenarios.mjs` does not change runtime.

## What a premium Africa companion must earn over time

1. **One conversation surface** that stays visible after sign-in; secure session continuity and opt-in private memory. Real multi-turn continuity, clarifying questions, tool execution and permissioned user context must be built and tested, not merely simulated.
2. **Verified country packs**: begin with South Africa and expand country-by-country with official visa/entry rules, tourism and emergency sources, transport options, current weather/safety advisories, local language/culture and provenance timestamps. Avoid a monolithic or stereotyped description of Africa.
3. **Transparent visual discovery**: real listings, photos, maps, provider identity, availability, pricing and cancellation conditions. Only show a booking action after supplier integration and explicit user confirmation.
4. **Mobile-first excellence**: 320px accessibility, screen readers, low-bandwidth handling, privacy-safe public offline assets, installable PWA where supported, consent-based location and notifications. The existing manifest/service worker do not prove App Store distribution.
5. **Real acceptance**: ask first-time users to find Chat, describe a need, understand the truthful response, view actual verified options when integrated, and complete a safe next step. Measure task success, not merely traffic or green CI.
6. **Governed intelligence**: no autonomous payment, bookings, account changes, self-modifying agents, unverified recommendations or secret exposure. Preserve separate security, recovery, private support and merchant release gates.

## Release sequencing

This draft UX is a **separate candidate** from security integration [PR #268](https://github.com/ttmodupe-hash/luqi-ai/pull/268) and operator launch kit [PR #269](https://github.com/ttmodupe-hash/luqi-ai/pull/269). Review the combined code and exact-head CI; do not merge into unprotected, auto-deploying `main` without approved safeguards. A passing UI test is not customer acceptance or paid-launch clearance. Track product direction and blockers in [issue #202](https://github.com/ttmodupe-hash/luqi-ai/issues/202).
