# Security review: archive, offline sync and self-healing

## Findings (development branch; not a production exploit confirmation)
- `api/archive.ts` uses `publicQuery` for checkpoint timelines, cognitive memory, fact storage and artifact operations. These endpoints lack demonstrated per-user ownership enforcement.
- `api/offline.ts` accepts a caller-provided `userId` and `deviceId` in public procedures; device identifiers are not authorization credentials. Pending items and mark-synced actions need server-derived ownership.
- `api/self-healing.ts` exposes operational data and state-changing repair/patch routes as public procedures. Several endpoints return simulated success without executing tests or patches.
- `api/middleware.ts` rate limiting uses untrusted forwarding headers and an in-memory map. It is not a distributed enforcement mechanism.

## Required remediation
1. Require validated authentication for personal archives and offline sync; authorize each record by session user, not a supplied user ID or device ID.
2. Introduce a verified server-side administrator role for self-healing operational routes. Never infer admin rights from client-provided fields.
3. Replace simulated patch/test success with honest not-implemented responses until actual isolated execution and human approval exist.
4. Restrict artifact payload size, safe file names, content types and storage quotas; scan untrusted uploads.
5. Add negative integration tests for anonymous callers, cross-account access and unauthorized mutations.
6. Use a trusted-proxy configuration and shared rate-limit storage before multi-instance production rollout.
7. Do not merge or deploy these routes until the access model and migrations are reviewed.

## Implementation note
An attempted bulk edit to switch archive procedures to authenticated procedures was blocked by the repository write safety checks. No security fix is claimed for those endpoints yet. This document records the risks so they remain visible in release review.
