# Private durable conversation storage

The API at `/api/v1/companion/conversations` stores user conversations in the
existing MySQL tables. Every request requires a LUQI Bearer token whose signature,
claims and credential binding match an active persisted account. Ownership comes
from that account, never from a caller-supplied user ID. Responses use `no-store`.

- `POST /` with `{ "personalityId": 1, "title": "My conversation" }` creates an
  owned conversation and returns its persisted ID. Personality IDs are 1–4.
- `GET /?limit=50` returns only the authenticated user's conversations, newest
  ID first. Optional `before=<id>` pages backward; the limit is 1–100.
- `POST /<id>/messages` with `{ "content": "My message" }` stores a user message.
  It returns the database ID only after the transaction commits. Content is
  trimmed and bounded to 8,000 characters. Clients cannot submit assistant or
  system roles, metadata, owner IDs or extra fields.
- `GET /<id>/messages?limit=50` returns that owner's messages, newest ID first;
  `before=<message-id>` pages backward. Clients reverse a page for chronological
  display. Absent and other users' conversations both return the same 404.

Message insertion and conversation count/timestamp updates share an InnoDB
transaction. A conversation row lock serializes concurrent writes to that
conversation. Errors return fixed codes, with no raw SQL or secret details.
MySQL unavailability yields an error; there is no in-memory success fallback.
Existing unowned conversations are not assigned to a user or exposed by this API.
No schema migration or production fixture inserts are performed.

## Limits and next integration

This API stores user-authored messages only. It does not generate assistant
responses, summarize memories, claim learned capabilities or activate providers.
The legacy companion tRPC namespace remains blocked. Both Companion frontend copies now use this API. The page signs into an existing
account and keeps its token only in component memory. Leaving/reloading the page
requires signing in again. Sign-out clears private UI state and invalidates pending
callbacks. Conversation and message lists page backward in batches of 50.
Only a validated persisted response marks a message saved. Failed writes retain
the draft and block another write until history is refreshed; users must check
for duplicates because transport failure can follow a committed transaction.
There are no seeded memories, fabricated fallback replies or learning scores.
Budgeted assistant-response persistence still requires separate work before
claiming complete companion memory.

Retries of a successful POST can create duplicates: this API does not yet offer
idempotency keys, so clients must not automatically retry ambiguous writes.
Account authorization is checked at request start; a reset or disable cannot
cancel a request already authorized. Storage administrators can access database
contents; this is not end-to-end encryption. Backup scheduling, retention and
user-facing deletion/export controls remain separate requirements.

Offline checks exercise authentication, forged-owner/role rejection and database
failure handling. Isolated MySQL CI uses separate account fixtures to verify
cross-account denial, concurrent inserts, counters, pagination, persisted reads
and rollback after an injected counter-update failure. It never accesses Railway
production data or invokes an AI provider.
