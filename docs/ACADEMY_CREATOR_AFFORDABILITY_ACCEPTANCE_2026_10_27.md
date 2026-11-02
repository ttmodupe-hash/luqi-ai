# LUQI learning + creator launch acceptance (27 October 2026)

Status: **engineering requirements and acceptance gates, not released features or approved prices**.

## Principles
- USD100/month (Gemini USD60, OpenAI USD40) is the current approved provider spending allocation, **not** a permanent product ceiling. Increasing the budget alone provides more capacity and potentially access to more capable model configurations; it does not automatically produce better teaching, safer answers, licensed study content, integrated publishing or successful delivery.
- Treat free as a **genuinely useful product**, not a deliberately inaccurate model. Paid tiers provide greater capacity, persistence and verified higher-cost workflows—not a promise of intelligence unavailable to people with low incomes.
- Target 15–20% **net operating profit margin** only after actual provider costs, platform costs, gateway fees, applicable taxes, support, fraud/refunds, content/licensing and staff time. Never call an illustrative contribution margin net profit.

## Academy: CCNA → CCNP → CCIE
Current starting point: `src/pages/CertMasterPage.tsx` contains CCNA/CCNP practice questions, simulated IOS terminal and subnet labs. **This is not a complete current Cisco curriculum, real network emulator or certification provider**.
- **CCNA 200-301:** structured modules for network fundamentals, network access, IP connectivity, IP services, security fundamentals, automation/programming. Each module needs original lessons, worked examples, formative quizzes, subnetting, topology tasks, troubleshooting and evidence-linked official blueprint mapping.
- **CCNP Enterprise:** ENCOR 350-401 core plus chosen concentration, e.g. ENARSI 300-410. Include deeper OSPF/BGP, redundancy, monitoring, security, automation and graded fault scenarios.
- **CCIE Enterprise Infrastructure:** ENCOR plus expert lab preparation: timed multi-site design/troubleshooting scenarios, IPv4/IPv6, virtualization, automation and configuration validation. **Never claim equivalence with Cisco's 8-hour lab or Cisco equipment without independent acceptance.**
- Build a learner progress model, accessibility/phone support, exported study notes and spaced repetition. Owner-owned projects and study data need authentication, deletion, retention and backup acceptance before persistent production writes.
- Teach with attributed official public objectives and **original materials**. Do not reproduce copyrighted Cisco books, paid exam banks or braindumps. Brand Cisco certification tracks accurately; clearly state LUQI is independent, not Cisco-endorsed.
- For tutor evaluation: fixed reviewed problem set across each track; factual accuracy, arithmetic/subnet correctness, command behavior, safe uncertainty, explanation clarity, learning gain and cost per **confirmed complete** response. Distinguish synthetic test from real approved inference.

## Creator studio → optional direct publishing
Today `src/pages/VideoStudioPage.tsx` routes to local Content Studio. Exports are not evidence of direct posting.
- First deliver editor + real export with aspect ratios, captions, media ownership acknowledgements, drafts and accessible previews. Respect upload size and processing capacity; no fictitious background render.
- Introduce per-platform adapters only after approved developer apps/scopes: YouTube Data API video upload, TikTok Content Posting API, Instagram/Facebook supported Graph publishing surfaces, LinkedIn and other platforms *only where their current APIs and account types authorize the workflow*. Do not promise "all social media": some personal accounts, formats or platforms may not support direct publishing.
- Each adapter: user OAuth, scope consent, encrypted token management, reconnection/revocation, platform-native validation, explicit preview + Publish button, idempotent job state, observable actual publish ID/status, safe rate limits, retry rules that prevent duplicate posts, queue/recovery, connected-account deletion. Never expose tokens to client logs or claim a draft upload is published.
- Real physical Android/iPhone and authorized user-account tests must prove each named platform independently before marketing it as available.

## Revenue/capacity gate
Proposed *research-only* retail points R49 / R99 / R199 / R399 monthly. No tier is approved for sale.
Per subscriber each month:
```
net revenue = selling price - VAT obligation (where applicable) - gateway fee - refunds/chargebacks
net operating profit = net revenue - actual AI inference - storage/rendering - infrastructure - support - acquisition - salaries/allocated fixed expenses
net profit margin = net operating profit / net revenue
```
Stress model at p50/p90/p99 **actual** metered consumption, failed/fallback calls, ZAR/USD volatility and support-intensive subscribers; aggregate free + paid usage under independently enforced global and per-provider ceilings. Maintain model-specific per-call reservation and actual expense reconciliation: unused reservations are not bills. The founder's desired 15–20% profit must be tested **after all costs** before price activation. A fixed message allowance alone is not safe if requests vary greatly in size.
For example, with illustrative R49 and VAT-exclusive status, Paystack-local-card estimate of 2.9%+R1 plus VAT on the fee yields ~R2.78 gateway fee, leaving ~R46.22 **before all other costs**. That does **not** prove any margin.

## Milestone sequencing
1. Fix incomplete AI generation and verified-account usage ledger, pass reviewed teacher-quality evals with strict budget safety.
2. Ship original CCNA curriculum and accepted interactive labs; expand by measured quality to CCNP and CCIE.
3. Deliver creator workflow and verified finished export before activating any social platform publishing.
4. Implement one authorized publishing adapter at a time with security and physical-device evidence.
5. Price tiers only from actual cohort costs and signed-off 15–20% net operating margin model; retain a useful free option.
6. Separate controlled free pilot, expanded public access and paid-launch decisions. Keep payments disabled until merchant/checkout/support/recovery acceptance.
