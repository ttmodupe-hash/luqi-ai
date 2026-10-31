# Luqi · KHORO backend capabilities — draft integration contract

Status: **draft, not a public endpoint, not live**. KHORO is Luqi's integrated intelligence. This document supports [#365](https://github.com/ttmodupe-hash/luqi-ai/issues/365) and draft PR #366.

## Existing production foundations to preserve
- Existing Node/Hono API and Luqi AI gateways (no client-side provider keys).
- Customer identity, consent and session boundaries, durability controls, provider budgets and billing guardrails.
- Existing source-linked consumer rights, Study Desk, spatial vision and gated Circles work.
- Current homepage, guest Chat, PWA, language support, pricing, payment and all existing routes.

## Incremental capability matrix

| Module | New backend responsibility | Boundaries and acceptance |
| --- | --- | --- |
| Finance Explorer | Validate structured scenarios, calculate fixed-rate amortisation, return limitations | Pure evaluation in `api/lib/khoroFinanceScenario.ts`; **no route yet**. Strict numeric validation, no customer details. Compare independent calculation fixtures. |
| Consumer Rights | Link jurisdiction- and date-qualified original official sources, prepare applicant-reviewed documents | Do not make legal findings, promise exact remedies, or submit without approval. Preserve existing source expiry controls. |
| Mother-Tongue Learning | Route explanations to existing budgeted AI gateway; return source/context and explicit uncertainty | No fabricated memorandum, guaranteed marks, or unreviewed official translations. Learner answers remain private until explicit Send. |
| Spatial Vision | Validated uploads, inspectable detection results and audit metadata | Do not show simulated confidence as verified; restrict supported file types, size, personal data, duration and model cost. |
| Narrated creative tools | Render/export only when a genuine media pipeline is accepted | Existing canvas narration is not proof of AI video generation or 60 FPS export. |
| Private Circles | Registered identities, invitation, moderation and abuse reporting | No prototype state-array chat or fabricated AES/sha labels; production E2EE requires verified protocol, key lifecycle and two-device testing. |

## Backend draft (finance)
`evaluateKhoroFinanceRequest(unknown)` is a strict, stateless, side-effect-free function. It returns `ok=true` and an illustrative scenario envelope or `ok=false` for malformed inputs. It performs zero inference and zero network/database operations. Frontend currently uses the same pure arithmetic library.

Do not register a new public API route until:
1. Exact branch CI passes, including Vite build, Vitest, TypeScript, security and mobile preservation.
2. Independent amortisation examples and rounding have been reviewed.
3. A decision is made whether a server route offers meaningful value over the current local-only implementation.
4. If route is justified: use existing Hono rate-limiting, body size limits, strict schema, no sensitive logs, safe error semantics and appropriately scoped origin/CSRF/authorization controls; add tests.
5. Acceptance on mobile 320px and physical devices is separately documented; old-tab/PWA behavior tracked at #354.

No runtime flags, DNS, production configuration, public route, paid inference, database table or deployment is changed by this draft.
