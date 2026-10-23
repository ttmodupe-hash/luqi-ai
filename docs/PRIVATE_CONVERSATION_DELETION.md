# Private conversation deletion

`DELETE /api/v1/companion/conversations/:id` requires a valid active-account
Bearer token and the exact JSON confirmation `{ "confirm": true }`.
The account ID comes only from authentication. Missing and other-owned
conversations both return 404. Responses are `Cache-Control: no-store`.

An InnoDB transaction locks the owned parent row with `FOR UPDATE`, using the
same locking order as message writes. It deletes the owner's linked
`companion_memories`, all `companion_messages` for that conversation, then the
owned parent. Confirmation is returned only after commit. An error rolls back
all three operations and returns a sanitized 503. There is no schema migration.
Other accounts' memories, unrelated conversations and unlinked memories remain.
Legacy unauthenticated companion writers remain blocked and must not be enabled
without adopting the same ownership and transaction rules.

The UI requires selecting a conversation, clearing/saving any draft, and an
explicit second confirmation. Cancel receives initial focus. Deletion is not
automatically retried. On an ambiguous response the active view is cleared,
the list entry is retained, and writes stay blocked until saved history is
refreshed. Signing out prevents late responses from restoring private state.
Floating assistant/search/critique widgets are hidden on all Companion aliases.

This deletes active database records only. It does not promise erasure from
backups, logs, exports, all account memory, or external systems. A complete
retention/export policy and production recovery plan remain outstanding.
No production records are deleted as part of deployment or verification.

Validation covers auth and confirmation rejection, cross-owner isolation,
confirmed/cancelled/ambiguous UI flows, desktop/mobile browser interactions,
forced database rollback and concurrent message-write/deletion races. MySQL
checks run only in an explicitly marked ephemeral local CI database.
