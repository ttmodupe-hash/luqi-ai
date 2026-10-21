# LUQI Priority Audit and Release Hold — 2026-10-21
**Change set:** `fix/companion-audit-reliability`, draft PR #96.  
**Policy:** No automatic merge, production deployment, cloud migration or provider charge.

## 1. Security architecture work completed in this branch
- `cloudbuild.yaml` now builds a validation container **without pushing a mutable production image, deploying Cloud Run or moving traffic**. The GitHub deployment guard remains blocking. The existing main-branch deployment configuration may still differ until reviewed and merged.
- Sensitive legacy HTTP diagnostics, incident logs, administrative AI controls, audit writes and student activity reads require authenticated session ownership or real administrator role, rather than caller-controlled identifiers.
- Legacy audit events derive actor identity from the authenticated administrator. In-process hashes are not described as durable forensic logs.
- Administrative security and DB-index dashboards execute bounded live database checks and enumerate unverified controls honestly instead of fabricating 'secure' status.
- Expensive Gemini and Khoro routes require validated sessions and persistent per-user usage limits. A MySQL global daily AI request quota now also spans **all** accounts and workers.
- Chunked uploads no longer bypass body-size limits. AI provider failures must not masquerade as successful chat replies. Internal 5xx errors no longer disclose exception details to API callers.
- Student learning progression is recorded to durable `analytics_events` with a verified user ID. Self-reports do not create academic marks or certifications.
- Security log scans only return bounded **heuristic** indicators and never assert that an attack was blocked or a code remediation applied.
- Production boot no longer automatically seeds traditional-medicine content. Schema evolution requires reviewed migrations.

## 2. Evidence-based, self-improving agent work
- Removed `child_process.execSync` evaluation of untrusted model-written JavaScript from the autonomous core. An application server, with access to secrets/network/files, is not a security sandbox.
- Administrator review agents can request a **real provider response**, reserve a persistent usage budget, and store an inert proposal and its evidence in `healing_patches` and `agent_activity_log`. Generated changes do **not** execute, deploy or claim to have passed tests.
- Dashboard reads actual proposal records and no longer seeds fictional success history.
- Reliability summaries derive trends and anomalies from recorded metrics, incidents and DB records rather than hard-coded success percentages or zero incidents. Forecast labels explicitly state their simple baseline limitations.
- Approval chain for actual code fixes remains: threat model → bounded task → proposal → independent code review → isolated CI → staging and security tests → explicit release approval → monitored rollout. Autonomous agents cannot bypass that chain.

## 3. Education advancements from OMEGA Super AI
- Previously integrated 49 African history, heritage and Indigenous Knowledge entries, with provenance, appropriate medical cautions and source-checking notices.
- Added 7 documented vocational/digital learning pathways adapted from OMEGA: electrician, fitter and turner, plumber, bricklayer, solar technician, software developer, data analyst.
- The new `#/vocational-skills` page and `omegaTrades` API provide skill-checklist comparison and safe learning exercises without importing private profiles or falsely issuing competence certificates.
- These are educational snapshots, **not** verified current job vacancies or formal qualifications.

## 4. Staging, Google Cloud and Remix — not yet verified
- GitHub's former deployment target is configured as `luqi-ai-backend` in `us-central1`; this is deployment configuration, not proof the service is live.
- The identified `gen-lang-client-0251020190` project and `remix-luqi-ai-1166` in `europe-west1` correspond to Remix, **not a confirmed main LUQI production target**.
- Added a manual `LUQI GCP Read-Only Inventory` workflow using GitHub OIDC and restricted Google Cloud viewer permissions. It requires verified `GCP_WIF_PROVIDER`, `GCP_INVENTORY_SERVICE_ACCOUNT`, `GCP_PROJECT_ID` and GitHub's protected `staging` environment. It must not be run as a privileged deployment identity.
- The earlier `LUQI Staging Provider Readiness` workflow validates staging DB, private media storage, Paystack sandbox, Replicate and ElevenLabs accounts **without charging providers**. These checks have not been run against the user's staging infrastructure.
- Create backup and staging database, review migrations `20261021_video_credits_and_render_requests.sql` and `20261021_global_ai_quota.sql`, configure private network/IAM and verify negative access tests before permitting live sandbox settlement.
- Real vendor end-to-end workflow and private media playback need an explicit capped test budget, least-privilege keys and human approval.
- Remix code/content cannot be merged from a Cloud Run Console link alone. Obtain its public service URL, authorised source repository, or a reviewed export first. Never copy private users or payment history based solely on project names.

## 5. Release hold / still open
1. Review the substantial multi-file PR, including compatibility of older HTTP routes and front-end sign-in. Compile/test passes are narrower than runtime user acceptance.
2. Confirm the real Cloud Run production and staging projects, IAM bindings and the source of deployment. Remove any other auto-deploy triggers not present in reviewed GitHub workflows.
3. Run OIDC read-only inventory and provider staging preflight with appropriately configured protected credentials; no secrets in chat.
4. Test migrations, DB backup restore, concurrency, scoped data/guardian consents, Playwright browser flows, OAuth/cookie CSRF, session expiration, brute-force registration limits and vendor spend alerting.
5. Independently review cultural/educational material with academic experts and community custodians.
6. Obtain human sign-off for staging and final production release; keep an immutable image digest, rollback revision, monitoring, cost caps and a verified restoration plan.

## Verification discipline
Only call a check 'passed' when a specific workflow run for its precise commit has finished successfully. Prior passing CI **must not** be attributed to later untested changes.
No current breach was confirmed by this code audit; historical access requires cloud access and application logs to investigate.
