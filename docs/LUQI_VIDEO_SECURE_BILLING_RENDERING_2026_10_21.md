# LUQI Video Payments & Rendering — Permanent Accounting Architecture
**Development branch:** `fix/companion-audit-reliability`. **Production deployment:** Not performed.

## What is implemented in code
- No free in-memory starter video credits. `video_credit_wallets` stores settled video credits, separate from the general ZAR cash wallet.
- `video_credit_ledger` records payment credits (`paystack:<reference>`), rendering charges (`render:<UUID>`), and refunds (`refund:<UUID>`) under unique references.
- Paystack webhook requires HMAC signature, provider-side transaction verification, exact currency, amount, owner email, and original server-created pending payment. A locked pending payment row permits **one** credit settlement even if webhooks are delivered repeatedly or concurrently.
- Pack classification uses the server-recorded pack ID and its known ZAR amount, never the client or webhook's claimed credit count. General cash deposits cannot silently mint video credits.
- `video.generate` requires authenticated identity, a UUID idempotency key, explicit `silent_mp4` mode and user-approved credit quote. A MySQL transaction serializes requests through a locked user row, checks credit balance, creates a project, debits the wallet and adds an audit entry before any provider call.
- Duplicate requests return the saved job state, not another provider invocation or credit debit. Simultaneous new jobs per user are rejected.
- The renderer requires genuine Replicate video output and private S3/R2-style object storage. Provider download/polling URLs are restricted to trusted HTTPS hosts; output size and MP4 signature are checked. No placeholder file can be charged as successful.
- Private media URLs are served only after a fresh authenticated owner-scoped database lookup.
- Provider/render failures trigger an idempotent transactional refund. Jobs abandoned longer than 15 minutes are recovered upon the next wallet, render-status or generation request. If the database is unavailable, the job remains in a reviewable state rather than falsely claiming repayment.
- No video credits can be sold if real video provider or durable storage credentials are absent.
- The Studio offers explicit **silent MP4 clips of 2–10 seconds at 10 credits/second**. Voiceover, dubbing, lip sync and mixed soundtrack are not included or billed.
- Legacy arbitrary in-memory `addCredits`, `deductCredits` and `refundCredits` now fail rather than invent balances or payments.
- Bootstrap no longer seeds the known-password `demo@luqi.ai` account; production bootstrap deactivates it when its password still matches the default.

## Environment and infrastructure requirements
- Persistent MySQL with transactions, row locking and unique indexes; provision `video_credit_wallets`, `video_credit_ledger`, `video_render_requests` by a reviewed migration.
- `PAYSTACK_SECRET_KEY` stored only in a managed secret store, configured Paystack webhook at `/api/v25/payments/webhook` on HTTPS.
- `REPLICATE_API_TOKEN` stored server-side with a commercial provider account and enforced vendor spending budget.
- `LUQI_VIDEO_BUCKET` dedicated private object bucket.
- Cloudflare R2: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`. Or AWS S3 with `AWS_REGION` and supported AWS private credentials/workload identity.
- Deploy with adequate memory/timeouts for ≤10-second video generation and up to 40 MB media download/proxy; restrict bucket access to the service identity and enable object encryption/lifecycle policy.
- Start application only when `NODE_ENV=production` and reviewed cloud config are set. Do not publish billing, database or provider secrets.

## Required integration and operations verification BEFORE real-money release
1. Run a reviewed schema migration against a staging database; prove restart does not drop money or credits. `CREATE TABLE IF NOT EXISTS` is **not** proof of a production migration.
2. Paystack sandbox: legitimate transaction, wrong amount, wrong email, wrong currency, duplicate and concurrent webhooks, failed settlement, provider timeout, incorrect signature.
3. Unit tests pass, then run actual MySQL transactional tests for concurrent credits, idempotent debits, refunds and user-object isolation. Unit tests with mocks alone are insufficient.
4. Verify actual Replicate model API contract and output, credentials, latency, size limits, MP4 playback, permanent private storage, and no SSRF redirects (including redirected media fetch).
5. Simulate Cloud Run process death between debit and rendering/asset finalisation; confirm recovery and audit log correctness. Automatic out-of-band recovery needs a scheduler for users who never return.
6. Implement and verify daily/global provider spending caps, billing monitoring and alerting, customer refund handling and financial reconciliation with bank/provider reports.
7. Audit the older `executeAnimationPipeline` entrypoint and existing app UI before broad rollout. Voiceover must use an independent approved, verified checkout and mixing pipeline; do not market silent MP4 as completed voiceover.
8. Review dependency scans, access-control/CSRF tests, Cloud IAM, backups, logs and rollback; obtain authorised production release approval.

## Important limitations
- A green CI run validates types, unit tests and builds, **not** live vendor credentials, actual payment settlement, a real MP4, the runtime object store, or production security.
- The published 10 credits/second price is a merchant-configured quote, **not a guarantee of provider prices, USD/ZAR conversion or margin**.
- Only development-branch code has changed. Existing production services and main branch must be inventoried before any merge.
