# Complete saved-notes archive

The signed-in notes page has an explicit **Download all saved notes** action.
It requests one private JSON snapshot of every owned conversation, their saved
messages and all owned memories, including unlinked memories. It does not use
the visible 50-conversation list as the export source. Existing individual
conversation exports remain available.

This is not a whole-account export: account/profile/authentication records,
offline queue entries, billing/spend records, Omega tasks, other legacy modules,
unsaved drafts and backups are excluded. No AI call, social upload, stored
export file or background export job is created. A user must keep the downloaded
file private and remove their own copies when appropriate. Export does not
delete records or erase backups.

## Server boundary

- GET `/api/v1/companion/conversations/export` requires the existing persistent,
  active account JWT and password-bound credential validation before storage.
  Caller-selected user IDs, filters, pagination or other query fields are
  refused. Errors are opaque and all responses are no-store.
- The route requires all three notes tables to be InnoDB, then uses a read-only
  REPEATABLE READ transaction. Its first aggregate read opens the snapshot;
  counts and selected content use that same snapshot without parent-row locks
  or writes. The installed Drizzle version cannot combine the explicit snapshot
  and access-mode options correctly, so only the valid READ ONLY start option
  is used with the explicit isolation level.
- Conversations and joined messages bind ownership on the actual reads.
  Memories always bind their own user ID. A legacy owned memory can reference
  another account's conversation or an orphan: export its owned content, but
  replace the unknown/foreign association with null. Never export another
  account's conversation identifier, content or memory.
- Allowlisted fields exclude user IDs, credentials, message metadata, token
  counters and legacy internal data. Results use deterministic ID order.
- Maximum 500 conversations, 5,000 messages, 5,000 memories, 4 MiB of title/message/
  memory UTF-8 text and 32 MiB of serialized JSON. Counts precede content reads,
  final serialization is bounded, and inconsistent/incomplete results fail.
  Over-limit archives return 422 without a partial file or changes to notes.
- At most two archive builds run simultaneously per web process; additional
  requests return 429/Retry-After. This is not a distributed user quota or a cap
  on slow sockets. Ingress/abuse controls and capacity acceptance remain open.
- Existing table-restricted SELECT privileges suffice, including table metadata
  visibility. No schema, grant, root credential or infrastructure change is needed.

## Browser boundary

The client uses only the same-origin account token, no cookies, redirects,
credential persistence or automatic retry. A 30-second deadline covers response
streaming; declared/actual bytes are bounded before JSON decoding and schema
validation. It validates the format/scope, unique IDs and all conversation
relationships before enabling the local download.

Unsaved drafts or uncertain writes block the action. Sign-out/navigation aborts
the pending archive and discards late data. An expired session clears the account
view. Errors/oversize/busy/malformed responses never trigger a download and the
UI explains that saved records are unchanged. Empty notes archives are valid.

## Verification

Required checks cover authentication/query rejection, opaque failures, row/byte
limits, missing snapshot support, concurrency release, malformed archives and
relationship rejection, stalled-stream cancellation/deadline, late sign-out,
and no partial download. Real MySQL fixtures check 61 owned conversations,
65 messages, owned/unlinked/foreign-linked memories, revocation, all overflow
categories, and a nonblocking snapshot during an uncommitted write. Restricted
runtime and real desktop/mobile browser fixtures exercise the compiled server
and native downloads. Synthetic accounts remain in the disposable CI database.

Issue #144 records completed CI and production results. Do not infer designated
human production-account acceptance or credential incident clearance from fixture
tests. The Railway incident gate and paid-text pause remain in force.

Primary MySQL transaction semantics:
https://dev.mysql.com/doc/refman/8.4/en/commit.html
