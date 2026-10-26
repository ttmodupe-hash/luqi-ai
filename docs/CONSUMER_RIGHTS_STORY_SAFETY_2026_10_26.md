# LUQI Consumer Rights — truthful story-to-options foundation (26 October 2026, South Africa)

Status: **DEPLOYED FREE INFORMATION PILOT — NOT INDEPENDENTLY LEGALLY APPROVED**. Merged as [PR #273](https://github.com/ttmodupe-hash/luqi-ai/pull/273) to `main` and deployed to Railway production as commit `f851be0f84bec307f3d5a4be7055c7ddf0469e8d` on 26 October 2026. This browser-local consumer guide is live, but no generative legal AI, government filing, email sending, paid subscription, legal case determination or independent human/legal acceptance is confirmed.

## Purpose

A person should eventually be able to explain a complaint in their own language and receive a **balanced, source-cited, conditional** explanation of potential rights, missing facts, safe actions, options and official complaint pathways. The assistant must separate what the user alleges from what can be verified. Serious disputes need a qualified person. The AI can make mistakes.

### Existing implementation problem being repaired

The previous public consumer-rights page POSTed the raw narrative and supplier details to /api/v1/consumer-rights. The server's budget guard correctly denies that **unbudgeted** endpoint (legacyAiRoutes), but on failure the React page fabricated a successful-looking universal Consumer Protection Act demand letter, including for banking, privacy and credit disputes. Its labels claimed "Zero-Hallucination", and the old server consumer-rights engine also contained overconfident legal assertions and an external-model call.

**Do not enable that legacy model route, remove it from the paid-endpoint denylist, or bypass authentication.** The safe first version removes the browser POST and the fake fallback. Existing server route remains blocked; future activation would require its own security and FinOps review.

### What this version actually does

- Browser-only personal narrative input up to 1,800 characters, with visible redaction warning. Does not fetch or store the story, include it in the URL, call an AI model, create a legal case, or send any mail.
- User **selects a category**, not automated intent extraction. Categories: uncertain jurisdiction; defective goods; cancellations; online order/scam; disputed bank debit; POPIA; communications; lending/card coercion; debt counselling.
- The category drives a bounded general explanation, questions for the user to verify, safe options and source links. **No claim that the user's actual story has been interpreted or that a statute definitely applies**.
- Optional factual complaint template is editable and copies only on the user's explicit button click. It includes no invented statutory notice, deadline, legal threat, compensation amount, or allegation of criminality.
- Source check 2026-10-26. After 2026-11-02 SAST, detailed guidance and draft creation stop until reviewed; original source/referral links remain available. Reviewing a website is **not** legal practitioner signoff.
- No type-specific legal claim is shown under a different sector's category. No "absolute right" to a goods refund is asserted; Section 55/56 conditions must be evaluated.
- This is not yet approved for processing sensitive case documents or as a substitute for emergency assistance.

## Original sources and corresponding jurisdictions

- [Consumer Protection Act 68 of 2008 (SA Government)](https://www.gov.za/documents/consumer-protection-act): quality of goods, qualified remedies, cancellation, supplier conduct.
- [Consumer Goods and Services Ombud](https://www.cgso.org.za/consumer/): eligible retail and goods/services supplier disputes, often after supplier contact.
- [National Consumer Commission complaints](https://thencc.org.za/complaints/): complaint information and portal, eligibility and supporting evidence.
- [NCC service standards](https://thencc.org.za/service-standards/): remit limitations and referral to other regulators (banking, credit, employment and municipal matters are not automatically CPA complaints).
- [National Financial Ombud](https://nfosa.co.za/): eligible unresolved banking/financial complaints.
- [ICASA complaints portal](https://www.icasa.org.za/pages/consumer-complaints): communications service complaints.
- [National Credit Regulator](https://www.ncr.org.za/): credit providers, debt counselling and related matters.
- [Information Regulator](https://inforegulator.org.za/contact-us/): POPIA/PAIA complaint contact and processes.

URLs are for users to independently check. LUQI has **not** confirmed the user qualifies for any given regulator or remedy. There are no auto-generated regulator submissions.

## Next stage: real intelligent story interpretation (not implemented)

A more sophisticated version can use the approved, metered LUQI provider gateway **only after**:
1. Source retrieval/approval with law subsection, amendment date, original URL, claim-to-source traceability and uncertainty; no fabricated citations.
2. Explicit permission before submitting the redacted narrative to an external model; default no cross-user memory or upload and clear data retention/deletion terms.
3. Authenticated user consent, sector-specific privilege separation, prompt-injection guards, cost/quota ledger, redacted logs and bounded completion validation.
4. Distinct *allegation*, *verified records*, *possible legal rule*, *options*, *case-specific deadline unknown* and *next human referral* fields.
5. Human legal quality review with held-out disputes across refunds, reservations, telecoms, debt, POPIA and fraudulent stores; independent native-speaker Sepitori/other-language review.
6. No sending email, notifying a company, completing government forms or making payment without explicit confirmation of the actual recipients, attachments, content and consequences.

English text only in this version. Sepitori must remain distinct from Sepedi/Setswana. No native-language legal or voice-quality claim is made.

## Release gates

- Run isolated category + jSDOM + mobile browser tests, full GitHub CI and exact-frontend Railway-image checks.
- Obtain consumer law subject-matter review; validate each source/route, exclusion and terminology.
- No real customer stories should be used for testing. Use synthetic disputes only.
- Preserve the USD100/month Gemini USD60/OpenAI USD40 budget and existing paid-provider denylist.
- The original implementation was already merged and deployed via [PR #273](https://github.com/ttmodupe-hash/luqi-ai/pull/273). Future code changes require independent review, exact-revision CI and controlled release approval; do not infer legal or broad-launch acceptance from the earlier merge. No payments, unapproved AI routing or personal legal case submissions. See [issue #202](https://github.com/ttmodupe-hash/luqi-ai/issues/202) and [rights-guide PR #272](https://github.com/ttmodupe-hash/luqi-ai/pull/272).
