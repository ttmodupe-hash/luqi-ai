# LUQI AI — CONTINUITY / NEXT-CHAT HANDOVER
**Updated:** 2026-10-21
**Purpose:** Preserve the technical state and unfinished work across ChatGPT conversation limits. This document is a durable handoff, not a production deployment instruction.

## Ownership and immutable rules
- Main platform: **LUQI AI**. Integrate approved material from **OMEGA Super AI** and **Remix** only after verifying provenance, compatibility, authorization, and privacy.
- Repo: `ttmodupe-hash/luqi-ai`.
- Work branch: `fix/companion-audit-reliability`.
- Review: https://github.com/ttmodupe-hash/luqi-ai/pull/96
- **Never merge to main, deploy to production, modify live credentials, or apply production migrations without explicit user authorization and staging/rollback verification.**
- GitHub Actions main branch may still auto-deploy; the development branch guard does **not** protect the live main branch until an explicitly approved release strategy is in place.
- Do not call any feature, cloud service, payment settlement, historical source, security posture or AI agent behavior verified unless it was actually checked.

## Completed and observed
- Paid video/narration: transactional credit ledger, Paystack verification, Replicate, optional ElevenLabs, FFmpeg mux and owner-scoped storage. Separate real MySQL and FFmpeg integration tests previously passed. The staged SQL migration `db/migrations/20261021_video_credits_and_render_requests.sql` has **not** been applied to live environments.
- OMEGA migration: 49 educational entries, consisting of 29 African history, 14 heritage, 6 Indigenous Knowledge Systems entries, imported to `api/data/omega`; original MIT license retained. Typed validated read-only `omegaKnowledge` tRPC routes, `#/african-knowledge` page, source notes and traditional-knowledge cautions. Bibliographic references have not been independently verified.
- Security work on the development branch: `cloudbuild.yaml` changed to build-only; legacy admin diagnostics and grading-ledger access restricted; Gemini paid APIs require verified sessions and durable AI quota; false security badges replaced with live limited probes.
- Legacy AI self-improvement: `api/services/superIntelligenceCore.ts` was inspected on 2026-10-21 and now contains a compatibility facade that refuses in-process execution of generated JavaScript. Legacy self-optimize route reports `REVIEW_REQUIRED` and no code change. Inspect `api/services/agentReview.ts` and its tests to verify persistence, review workflow and role controls.
- GitHub code may be changing between checks; fetch branch HEAD and fresh workflow status before asserting CI is green.

## Current security audit priorities
1. Re-run all CI on latest development HEAD and fix any TypeScript, unit, integration, build, secret-scan, or dependency failures.
2. Audit every legacy Hono endpoint for authentication, authorization, CSRF, request limits, input validation, ownership, fabricated success/grades, and unverified compliance assertions. High-risk examples seen: `/api/v1/workspace/upload-asset` returning a fabricated public GCS URL; `/api/v1/analytics/log-progression` formerly returning fake `PASSED` without persistence. Confirm current behavior before editing.
3. Ensure all paid AI/Khoro, media and other model APIs enforce durable per-account budgets, input bounds and safe provider error handling.
4. Ensure agent review uses real persistence, a deny-by-default action allowlist, isolated CI for generated code, idempotent actions, least-privilege credentials, telemetry, human approval for merges/deploys and rollback.
5. Build or refresh staging-only infrastructure checklist and read-only preflight. Actual Google Cloud service and project for **main LUQI** remain unconfirmed.
6. Independent fact-check and community review for OMEGA source entries; review and transfer Remix material only after authorized source/export access.

## Cloud discovery
- User's Remix Cloud Run project: `gen-lang-client-0251020190`; service `remix-luqi-ai-1166`; region `europe-west1`. These identify **Remix**, not confirmed LUQI production.
- Legacy LUQI GitHub configuration referenced `luqi-ai-backend` in `us-central1`, but actual Cloud Run project ID and service existence remain unverified. Do not assume the same project.
- The `GCP_PROJECT_ID` GitHub Actions secret value cannot be retrieved from source code. Never request or expose service account keys in chat.

## Testing and release discipline
- Prior OMEGA merge checks reported 205 unit tests and passing independent MySQL/video media workflows. **Those are not proof the latest security commits pass.**
- Never confuse a successful build with live provider readiness, live DB migration, Cloud Run IAM, object-store ACL or production deployment.
- Preserve backups, DB schema compatibility and source attribution before any migration.
- Work only on development branch; keep PR #96 as review surface.

## User preferences and continuity
- User wants progress and direct action, lasting fixes, a self-healing/self-improving agent system with safe review, African knowledge integrated thoughtfully, and no repeated conversation-length loss.
- When a new ChatGPT conversation is needed, open a new chat (not a production deploy) and provide this exact GitHub document path plus PR #96. Ask the assistant to fetch the latest development HEAD, CI results, and this handover. This is a technical record, **not a copy of every chat message, attachment, private cloud dataset or user record**.
- Do not falsely promise automatic new-chat creation or full conversation transfer. Preserve future material in repository documentation or approved storage with the user's authorization.
