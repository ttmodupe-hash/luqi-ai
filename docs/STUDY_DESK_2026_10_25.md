# LUQI Study Desk — low-cost self-directed practice (25 October 2026)

## Verified feature contract on the candidate branch

A small browser-only learning loop addresses a customer problem not solved by
a generic AI chat screen: review the things they personally want to remember.
- Author up to 30 question/answer cards and edit or delete them in-tab.
- Explicitly reveal answers; self-rate remembered or needs-practice.
- Schedule a suggested next review date (2+ days for recalled cards, next
  day for needs-practice cards). This is a simple heuristic, not evaluated
  spaced-repetition pedagogy or verified exam proficiency.
- Estimate topics/day for an exam from the learner's own topic count (1–120)
  and a date 1–365 days away. It is NOT a guaranteed revision schedule,
  curriculum coverage or actual exam registration.
- Export a small bounded, versioned JSON deck with user-acknowledged progress;
  re-import after reload. File contents are plain text, not encrypted.
- All work runs in browser RAM, with no localStorage, account login, AI
  request, uploads, cross-device sync, cookies, background jobs, payments
  or provider usage. An imported deck never executes markup or remote code.
- The public site makes this clear: there is no automatic cloud backup,
  no official answer-generation or exam grading, and no active subscription.

## Value-led membership strategy, NOT an active offer

LUQI can serve three practical use cases using one shared low-cost platform:
small-business tools, learning tools, and local creator/production aids.
The R49 Starter and R99 Creator figures remain *willingness-to-pay
hypotheses*. Free local functionality stays free during the pilot. Paid
members must get additional, shipped outcomes, such as truly account-bound
synchronization of locally encrypted work (under separate PR review),
durable saved progress and strictly controlled AI entitlements. No free
function may be relabelled 'premium' without a real incremental benefit.

Initial rollout order: prove user demand and repeated use, recover
production backups, verify historical credentials, actual provider bills,
private support and owner recovery, complete merchant/KYC and refund terms,
then implement a server-enforced order/entitlement ledger with resilient
webhooks and refunds. Do not accept money until those pass. $100 Gemini/OpenAI
pilot ceiling remains unchanged: $60 Gemini and $40 OpenAI, no expansion.

No production DB schema or provider configuration changes are part of
this Study Desk release. Browser/mobile, bundle-parity, unit and
production exact-SHA acceptance are required before reporting it live.
