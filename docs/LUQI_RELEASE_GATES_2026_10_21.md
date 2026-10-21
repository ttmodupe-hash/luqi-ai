# LUQI outstanding release gates (2026-10-21)

**Status: DEVELOPMENT ONLY — NO PRODUCTION DEPLOYMENT APPROVED**

## Completed in the development branch
- Imported 49 OMEGA public educational catalogue entries with bibliography and Indigenous Knowledge safety notes.
- Removed Cloud Build's automatic image push and 100% Cloud Run traffic deployment. The main branch must be separately reviewed; this development change does not affect it.
- Protected legacy administrative diagnostics, audit, governance, and self-optimization HTTP routes with verified administrator sessions.
- Applied owner checks to student ledger reads; protected paid Gemini and Khoro endpoints with account sessions and persistent quotas.
- Replaced simulated security certifications and index health badges with explicit evidence and live database probes.
- Retired in-process execution of generated JavaScript. AI suggestions are inert database proposals requiring isolated CI, human review and a separately approved release.
- Removed fake workspace upload success responses: no file or URL is promised until real private storage is implemented.
- Added regression tests for agent execution boundary and fake upload paths.

## Still required before staging or production
1. **CI evidence:** Confirm current head passes TypeScript, unit tests, build, integration suites and secret/dependency scans. A successful earlier SHA does not certify later commits.
2. **Cloud identity:** Confirm the actual primary LUQI GCP project, service, region, private network, identity permissions and immutable Artifact Registry target. The Remix project `gen-lang-client-0251020190` is not proof of LUQI's primary production project.
3. **Isolated staging:** Separate database, private object bucket, Paystack test mode, provider spending caps, FFmpeg runtime and least-privilege service accounts. Review database migrations and perform restore tests before application.
4. **Review agent security:** Proposals must never execute, change environment variables, mutate repository branches or deploy without human approval and independently executed tests. Disable legacy unsandboxed runners rather than relying on timeouts.
5. **Finish legacy compatibility:** Inventory fake responses and in-memory ledgers (calendar bookings, analytics progression, simulated labs) and either replace with persistent owner-scoped functionality or explicitly return unavailable. Do not certify a fake grade or transaction.
6. **Content integrity:** Independent source review of African history and heritage, and community rights and clinical safety review for Indigenous knowledge.
7. **Remix migration:** Obtain the Remix app URL or authorized export, inventory non-sensitive content, review licenses and data ownership, deduplicate against LUQI, then import through staging only.
8. **Release control:** Keep the existing draft PR on the development branch. Production `main` still has an auto-deploy workflow and must be separately safeguarded under explicit authorization. Require rollback plan, monitored canary, reviewed cloud IAM and signoff before merge/deploy.

**No cloud configuration, provider credentials, staging database or live Remix data has been accessed or changed by this checklist.**
