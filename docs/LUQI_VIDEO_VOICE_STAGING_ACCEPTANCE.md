# LUQI Video & Voice — Staging Acceptance and Release Gates
**Branch:** `fix/companion-audit-reliability` / PR #96  
**Security rule:** Do not merge, migrate production, turn on paid sales, or run paid vendor jobs without explicitly approved staged release.

## Tested without external costs
1. **Real MySQL integration:** `.github/workflows/mysql-video-integration.yml` creates a disposable MySQL 8 database and verifies:
   - Forged payment details cannot create credits.
   - Two simultaneous settlement calls credit a single Paystack checkout only once.
   - Two simultaneous render requests with the same UUID debit only once.
   - Reusing that UUID for different content is rejected; other users cannot retrieve it.
   - Refunds are transactional and idempotent; a refunded job cannot be marked successful.
   - A cross-account daily provider budget is enforced before any debit.
   This checks the exact application SQL and InnoDB locks, **not live Paystack processing**.
2. **Real FFmpeg integration:** `.github/workflows/video-media-integration.yml` installs FFmpeg and FFprobe, generates a local MP4 and MP3, mixes them using the production mixer, and checks the resulting MP4 has both audio and video tracks. **No ElevenLabs/Replicate calls are made.**
3. Unit security checks cover ownership, quote confirmation, narration text binding to idempotency, Paystack reference equality, invalid payment metadata, replay protection, media header validation, bounded download size and URL restrictions.
4. Standard Node CI checks TypeScript, Vitest and production build; Gitleaks and production dependency audit run separately.

## Code implemented
- **Modes:** `silent_mp4` (10 credits per second) and `narrated_mp4` (10 credits per second + 4 credits for one narration of up to 500 characters). Both are capped at 2–10 seconds.
- **Real vendor path:** Replicate WAN produces original video; optional ElevenLabs multilingual TTS produces MP3; FFmpeg combines audio+video; a private S3/R2-compatible object holds the final MP4. Failure cannot be reported as successful.
- **Billing:** pending Paystack checkouts are bound to server-defined credit packs. The server validates webhook HMAC and rechecks the payment with Paystack; exact reference, account, amount and currency must match. Credits are never created by the browser or a failed transaction.
- **Spending:** per-account daily caps, one render at a time, global daily provider cap, unique request ID, locked InnoDB debit/refund entries, and automatic/account/admin stale-request recovery.
- **Privacy and security:** objects are served through logged-in, owner-scoped access; arbitrary URLs, storage keys and provider response redirects are rejected; remote media reads have size caps and timeouts.
- **Risk limitations:** Narration is a provider voiceover—not character lip sync, automatic translation, or speech performed in the depicted character's own voice. No voice cloning is offered. Narration longer than the purchased clip is rejected and refunded, not silently truncated; the Studio also limits text based on requested duration.
- **Financial truthfulness:** pricing/margins from old provider assumptions are not verified current vendor costs; do not advertise guaranteed margins.

## Staging infrastructure and operator tasks still required
1. Create a **separate staging MySQL database** behind restricted networking. For Cloud SQL private IP, use a GitHub runner with approved VPC access or a properly scoped Cloud SQL Auth Proxy plus workload identity; **do not expose MySQL publicly** just to enable tests. Explicitly review and apply `db/migrations/20261021_video_credits_and_render_requests.sql` there. Check schema existence and restore a staging backup. Production must not use arbitrary startup DDL as its migration strategy.
2. Set up a **private** R2 or AWS S3 bucket with no public read, encryption, lifecycle rules, restricted service identity and least privilege. Confirm GET requires an authenticated owner.
3. Create a **Paystack sandbox** account/key (test key starts with `sk_test_`); register HTTPS callback `/api/v25/payments/webhook` at the staging domain. Exercise a real sandbox payment, duplicate webhook, amount/email/currency mismatch and database-failure retry. Verify ledger rows, bank/payment reconciliation and no cash withdrawal.
4. Configure restricted staging Replicate and ElevenLabs credentials, appropriate vendor spending limits and a reviewed FFmpeg executable path in the running container. The global job count cap is not a financial spending limit; set vendor-side USD limits and alerts as well. Do **not** run a billable render without separate explicit approval and a maximum authorized test budget.
5. In GitHub Settings → Environments, create `staging` with reviewer protection and secrets `STAGING_DATABASE_URL`, `STAGING_PAYSTACK_TEST_SECRET`, `STAGING_REPLICATE_API_TOKEN`, `STAGING_ELEVENLABS_API_KEY`, and either `STAGING_R2_ACCESS_KEY_ID`/`STAGING_R2_SECRET_ACCESS_KEY` or `STAGING_AWS_ACCESS_KEY_ID`/`STAGING_AWS_SECRET_ACCESS_KEY`. Configure associated environment variables `STAGING_VIDEO_BUCKET`, `STAGING_R2_ACCOUNT_ID` or `STAGING_AWS_REGION`, and optionally `STAGING_ELEVENLABS_VOICE_ID`.
6. Manual-only `.github/workflows/video-staging-readiness.yml` reads staging schema and calls **read-only** provider account endpoints and object-bucket HEAD. Dispatch with `VERIFY_ONLY_NO_CHARGES`. GitHub manual workflows may require the workflow to be available on the repository's default branch before dispatch.
7. Once the read-only checks pass and a test budget is approved, run a limited real vendor end-to-end test in staging: settled test funds → user account → render idempotency → actual Replicate + ElevenLabs MP4 → private viewing → duplicate request → intentional failure/refund → restart recovery.
8. Audit Cloud Run region/service/project, TLS, IAM, logs, Secret Manager, key rotation, backups, workload resource limits, monitoring, vendor spend limits and rollback. Independent penetration test and production authorization remain required.

## No-guess evidence policy
- Green MySQL CI does not mean the user's actual staging DB is migrated.
- Green FFmpeg CI does not prove ElevenLabs or Replicate accounts are configured, have rights to a model, or are funded.
- A read-only provider connection check is not a successful paid render.
- Private GitHub secrets should **never** be pasted into ChatGPT messages, source control or screenshots.
- The absence of an observed breach in a code review does not prove no historical access occurred; production access logs need incident analysis.

**Current deployment:** development branch only. No GCP project ID, actual staging service or supplier billing credentials have been verified in this work.
