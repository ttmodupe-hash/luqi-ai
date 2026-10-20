# Companion Authentication and Memory Access Audit

Date: 2026-10-20
Scope: `api/companion.ts`, `api/middleware.ts`, `api/context.ts`, `api/router.ts`, `api/archive.ts`, `api/boot.ts`, and `db/schema.ts`.

## Findings

### Critical: companion data endpoints are public
Every procedure in `api/companion.ts` uses `publicQuery`. The current `protectedQuery` in `api/middleware.ts` is not applied to these routes. In production, it compares the Authorization header to a single static `Bearer ${APP_SECRET}`; in non-production it bypasses the check entirely.

### Critical: client-supplied identifiers are treated as authority
- `createConversation` accepts an optional `userId` supplied by the caller.
- `getConversations` returns up to 50 conversations across users if `userId` is omitted.
- `getConversation` loads a conversation by ID without an owner check.
- `sendMessage` writes to any supplied conversation ID and then generates a response.
- `getMemories` and `addMemory` accept a caller-supplied `userId`.
- `search` searches messages across conversations; `updateFeedback` updates a message by ID.
- `updateTrustScore` mutates a conversation by ID.

These are authorization/tenant-isolation gaps, not merely input-validation issues.

### High: memory is not connected to persisted conversation history
`sendMessage` saves the current user and assistant messages, but the visible request to `orchestrateRequest` contains only the latest input and system prompt. It does not load earlier messages or retrieve `companionMemories`. The `chatDirect` route accepts caller-provided memory strings and uses them as context, but that is not durable, authenticated memory retrieval.

### High: the session schema is not an implemented session flow
`db/schema.ts` defines `users` and `sessions`, but the inspected request context only exposes the raw request. The inspected auth middleware does not look up a session, verify expiry, or derive a user identity. Presence of the schema and JWT/bcrypt dependencies alone does not establish working login/session handling.

### Additional transport concern
`api/boot.ts` sets CORS origin to `FRONTEND_URL || "*"` while also enabling credentials. Configure an explicit production origin rather than wildcard-plus-credentials.

## Safe implementation sequence

1. Implement and test session-token authentication using the existing `sessions` and `users` tables; reject expired sessions and inactive users. Never trust a body/query `userId` as identity.
2. Add authenticated user identity to tRPC context.
3. Add ownership checks for every conversation/message/memory read and write. Use the authenticated context user ID, not client-supplied IDs.
4. Keep personality listing public; decide explicitly whether direct chat is public or requires a session.
5. Load recent conversation messages and relevant user memories into the model context, with bounded limits and deterministic ordering.
6. Add tests for unauthenticated access, expired sessions, cross-user reads/writes, missing conversations, and history/memory retrieval.
7. Lock down production CORS to the configured frontend origin.

## Why this branch does not immediately convert all routes to `protectedQuery`

The current client-facing companion flow has no verified login/session exchange in the inspected files. Simply swapping `publicQuery` for the current `protectedQuery` would make production requests require the server's shared `APP_SECRET` and would not provide per-user ownership; shipping that change without a client login flow would break the feature while leaving the underlying identity model incomplete. Implement session identity first, then migrate the sensitive procedures with tests.
