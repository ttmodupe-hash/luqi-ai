# Embedded contacts and online presence

The Contacts rail is a visible part of the workspace layout, not a chatbot,
support launcher, modal or overlay. Desktop layouts at 1280px and above allocate
a separate right-hand column. Its sticky rail stays inside that column; the main
content never sits underneath it. Smaller screens use an inline contacts card.
The same Luqi account and existing mutual-contact and school/adult eligibility
rules apply. No phone address book or new public name search is introduced.

## Meaning of the status dots

- Green / Online: a consenting contact has a recent foreground Online lease.
- Orange / Away: a consenting contact explicitly selected Away, its lease remains live,
  and no other tab has a live Online lease. This is not inferred from a closed tab.
- Red / Offline: a previously shared lease expired; this is app connection evidence,
  not proof of a person's whereabouts or activity outside Luqi.
- Grey / Status not shared: no current shared signal is known to this process.
- Failed or stale contact reads do not preserve green or orange indicators.

The contacts card refreshes every 30 seconds while visible and online. Snapshots
older than 40 seconds are marked unconfirmed. Sharing is off on each sign-in or
reload; users explicitly enable it, then may select Online or Away. The shared
layout retains the per-tab choice across routes, only in memory. A heartbeat
renews a 75-second lease every 30 seconds only while visible and connected.
Changing availability uses the same lease and increasing sequence, respecting
the existing 10-second rate bound. The interface reports pending or failed
changes rather than claiming the selected status has been shared successfully.
Hidden tabs stop sending updates. Sign-out, account switching, unmount and Hide
attempt a newer-sequence opt-out; deferred updates are cancelled and expiration
covers crashes or disconnection. One consenting Online tab takes precedence over
Away in another tab. No last-seen time, email or device identifier is returned.

## Authority, abuse limits and retention

`POST /api/v1/p2p/presence` uses the existing authenticated P2P boundary and
strictly accepts a UUID lease ID, increasing sequence, active boolean and optional
`availability: 'online' | 'away'`. Omitted availability remains Online for older
clients. The actor comes from authentication, never the body. Existing account
activity and eligibility are checked before accepting updates. Presence is
returned only through the current mutual contacts query after live block,
account, membership and eligibility checks. Read failures fail closed.

The in-process lease store holds at most 5,000 accounts and four leases per
account, throttles repeated active updates within ten seconds (including status
switches), and retains inactive tombstones briefly so reordered requests cannot
undo Hide. Idle state is removed within approximately 15 minutes plus the bounded
sweep interval. There is no durable presence history, new database table, AI
request or provider cost. Sharing intent and lease IDs stay in React memory.

## Deployment scope

The last inspected production configuration runs one web replica in `sfo`.
Presence is ephemeral and scoped to that process. A restart or another replica
has no lease evidence and returns grey, never fabricated online/offline state.
A shared lease store is needed before promising consistent multi-replica presence.
Rolling deployments can briefly produce unknown status until clients renew leases.
Older clients that cannot parse Away fail closed to unavailable; deploy matching
frontend/API and retain old-tab testing. The production P2P activation gate, report
key, schema/grants, independently verified roles and moderation prerequisites are
unchanged. Shipping this code alone does not activate customer messaging.

## Validation

Existing tests cover opt-in, expiry, bounded storage/rate, multi-tab semantics,
reordered Hide/heartbeat requests, authenticated actor binding, current mutual
contacts, blocks, stale UI, account changes and hidden-page polling. The Away
increment adds 14 deterministic local tests plus DOM and route regressions for
explicit choice, pending/failed confirmation, deferral cancellation and forged
identity rejection. Inspect actual CI results before calling those additional
DOM/API tests passed. Existing disposable MySQL and browser suites remain required;
physical two-device production acceptance is not established by unit tests.
