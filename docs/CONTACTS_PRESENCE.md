# Embedded contacts and online presence

The Contacts rail is a visible part of the workspace layout, not a chatbot,
support launcher, modal or overlay. Desktop layouts at 1280px and above allocate
a separate right-hand column. Its sticky rail stays inside that column; the main
content never sits underneath it. Smaller screens use an inline contacts card.
The same Luqi account and existing mutual-contact and school/adult eligibility
rules apply. No phone address book or new public name search is introduced.

## Meaning of the status dots

- Green / Online: a consenting contact sent a foreground activity lease recently.
- Red / Offline or away: a previously shared lease expired.
- Grey / Status not shared: no current shared signal is known to this process.
- Failed or stale contact reads do not preserve green indicators.

The contacts card refreshes every 30 seconds while visible and online. Snapshots
older than 40 seconds are marked unconfirmed. Sharing is off on each sign-in or
reload; users explicitly enable it. The shared layout retains that choice across
routes. A heartbeat renews a 75-second lease every 30 seconds only while visible
and connected. Hidden tabs stop sending updates. Sign-out, account switching,
unmount and Hide attempt a newer-sequence opt-out, and expiration covers crashes
or disconnection. One consenting foreground tab can keep the account online even
if another tab stops sharing. No last-seen time, email or device identifier is
returned to contacts.

## Authority, abuse limits and retention

`POST /api/v1/p2p/presence` uses the existing authenticated P2P boundary and
strictly accepts only a UUID lease ID, increasing sequence and active boolean.
The actor comes from authentication, never the body. Existing account activity
and eligibility are checked before accepting updates. Presence is disclosed
only through the current mutual contacts query, after its live block, account,
membership and eligibility checks. Read failures fail closed.

The in-process lease store holds at most 5,000 accounts and four leases per
account, throttles repeated active updates within ten seconds, and retains
inactive tombstones briefly so reordered requests cannot undo Hide. Idle state
is removed within approximately 15 minutes plus the bounded sweep interval.
There is no durable presence history, new database table, AI request or provider
cost. Sharing intent and lease IDs stay only in React memory.

## Deployment scope

Production was independently observed to run one web replica in `sfo` before
implementation. Presence is deliberately ephemeral and scoped to that process.
A restart or another replica has no lease evidence and returns grey, never
fabricated online/offline state. A shared lease store must replace this local
implementation before promising consistent multi-replica presence. Rolling
deployments can briefly produce unknown status until clients renew leases.

## Validation

Tests cover opt-in, lease expiry, bounded storage and rate, multi-tab semantics,
reordered Hide/heartbeat requests, authenticated actor binding, current mutual
contact restrictions, opt-out, no outsider disclosure, block enforcement, stale
UI, account changes and hidden-page polling. Real disposable MySQL and two-account
browser journeys verify consent-to-heartbeat-to-contact-online delivery without
AI credentials or production customer messages.
