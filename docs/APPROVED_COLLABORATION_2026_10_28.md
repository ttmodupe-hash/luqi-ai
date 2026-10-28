# Luqi collaboration — 28 October 2026

The owner requests one shared login, bottom-right Circles & Chat, approved
individual and group collaboration, and name discovery without exposing live
presence to unapproved people. Use cases include learning, business and general
assistance. The distinction below is deliberate: an **active account** is not
proof that a person is online now.

## Implemented in this change

- A bottom-right launcher across customer tools, above the mobile Chat dock.
  The contact view is loaded only when opened, and closing it returns keyboard
  focus to the launcher. It does not submit a draft or call a model.
- The existing shared Luqi account is used. Navigation to Circles uses the
  router and never starts another login or reloads the document. A separate
  encrypted-device-vault unlock remains necessary to protect local message keys;
  this is not a second Luqi account or a server password submission.
- Authenticated `GET /api/v1/p2p/contacts` returns only current mutual
  two-person approvals. It derives the actor from the verified bearer, rechecks
  account activity, current eligibility and both-direction blocks, and excludes
  pending or invalidated relationships. Database failures return unavailability,
  never a former cached directory. Responses are no-store and contain no email,
  last login, online indicator or last-seen timestamp.
- Names can be filtered locally within those approved contacts. No all-user
  directory is fetched or hidden in the client. Contact names are rendered as
  text. A profile, topic code or displayed name never authorizes a private room.
- The exact contact contract explicitly reports `presence: not_shared`. No
  heartbeat, tracking, push service, public presence endpoint or new provider
  was introduced. UI labels do not turn account-active into a green online dot.

`LUQI_P2P_ENABLED` remains off in production; the panel states this truthfully.
The peer store/report key, verified adult/cohort enrolment, moderation, retention,
private recovery and two-real-account acceptance gates in
`P2P_MESSENGER_REVIEW_2026_10_27.md` remain applicable. No production table,
permission, account role, key, flag, payment or AI allocation is changed here.

## Repeated-login repair is a separate release candidate

PR #315 is being reconciled with current main. It uses explicit private-device
consent, short memory-only access tokens, rotating host-only Secure/HttpOnly/
SameSite cookies, CSRF checks, durable replay detection and revocation. It remains
a disabled draft until the recorded operational/device acceptance is satisfied.
The launcher does not claim that an unshipped session-restoration feature is live.

## Required remaining product work

| Capability | Required behaviour before release |
| --- | --- |
| Name discovery outside approved contacts | Owner opt-in to discoverability and a chosen public name/handle; authenticated, eligible, bounded and throttled lookup; no private email or numeric-identifier directory; no cross-cohort disclosure to children |
| Unapproved search result | Only the opted-in profile and “active Luqi account”; no online/offline, last seen, exact recent activity, private groups, contacts or message content |
| Contact request | Explicit sender request, recipient approval and sender confirmation; duplicate/spam limits; refusal/block removes future contact and discovery eligibility; a name match alone never opens a conversation |
| Approved presence | Separate owner consent, relationship checks on every read/subscription, expiry of stale heartbeats, immediate block/membership revocation, hidden-by-default state and no definite offline claim from a failed request |
| Multi-person groups | Explicit invitations and membership approval; scoped roles; membership-change encryption-key rotation; removed members denied new traffic and new keys; old-history access rules; no public reusable topic code as admission |
| Recovery and abuse | Verified moderator/support operation, reporting confidentiality, encrypted-key/data recovery and retention/export/erasure acceptance before activation |

The current encrypted peer protocol supports two people per circle. Do not
rename a pair or show a member list and claim group chat is implemented. Prefer
a reviewed group encryption protocol over extending one shared invitation key:
removal must actually exclude the removed participant from future messages.

These boundaries follow relationship-based, deny-by-default authorization:
https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
and secure session handling:
https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
They are implementation/test requirements, not a security certification.

## Verification

Tests cover guest/disabled denial, authenticated actor derivation, absence of
unapproved presence fields, late-account response rejection, safe name rendering,
and real disposable-MySQL approval/block/eligibility/account-state changes.
Chromium desktop/mobile and desktop/iPhone-sized WebKit exercise launcher
position, dialog keyboard behaviour, one login across routes, retained unsent
AI draft and zero automatic inference. Production feature activation and physical
customer acceptance remain separate from synthetic results.
