# LUQI Business Desk: repeat-use customer follow-up board

25 October 2026 — source-only release candidate

## Real weekly outcome
The existing local quotation and price planner now feed a small sales follow-up
board. A self-employed user can:
- use the quoted customer alias and subtotal to create an open sales prospect
- track up to 50 draft/sent/follow-up/won/lost opportunities
- enter a follow-up date and see due or overdue tasks while the page is open
- distinguish unpaid open quote potential from *user-marked won value*, which
  does not prove receipt of cash
- explicitly download a versioned, small JSON file and reopen it next visit
- review and confirm replacement of an in-tab board before import
- remove an unwanted local record with an explicit second confirmation

This is no account storage, auto-reminder, CRM backend, invoice authority,
payment processor or sales forecast. There is no live network, API provider,
paid inference, user tracking or database migration. The JSON file is *not
encrypted*, so the UI recommends using nicknames and secure storage. Any
personal data a user includes remains their responsibility.

## Customer-funded product differentiation
Recurring membership value should come from saved/account-synced projects
and useful workflows people return to, not exaggerated claims of more AI
than major competitors. This pilot feature remains free. A proposed paid
R49 Starter/R99 Creator bundle CANNOT be put on sale until there is a
delivered, independently tested entitlement above the free pilot, privately
verified support, merchant onboarding, refund/terms and backup/security checks.

Examples of incremental premium value to build next:
- private account-owned cross-device quotation and follow-up history,
  reusable templates, additional backup/export safeguards
- optional bounded user-owned study/revision packs and creative projects
- a *measured*, server-enforced subscriber AI allowance with admission
  capacity matched to approved monthly $60 Gemini/$40 OpenAI limits

The present UI offers no cloud backup, recurring notifications, live
WhatsApp/email integrations, calendar sync, automatic collections,
invoicing, AI agent work or payment buttons.

## Required tests
Exact-cents, imported JSON schema, duplicate UUID/date rejection, file
size/record bounds, rendered text escaping, no account/API calls, 320px
accessibility, two-step removal, no silent data replacement, live code
parity, branch-head CI, Railway terminal SUCCESS and exact SHA HTTPS checks.
