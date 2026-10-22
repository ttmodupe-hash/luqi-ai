# Railway LUQI staging preflight — review-only

**Scope:** Source validation and a local GitHub Actions Docker build. This PR does NOT create Railway services, deploy, add domains, change DNS or apply database migrations.

## Verified Railway account inventory

Railway OAuth discovered the personal workspace and 14 projects. LUQI candidate project:
- Project `comfortable-illumination` ID `ea940606-e19a-4908-becc-3174ffc0c0a5`
- `production` environment ID `01a52328-40a9-414c-9a8b-a79bd4d95d5`
- Services `luqi-ai` and `luqi-mysql`; service ID names were listed through the Railway connector.

**Access blocker:** All attempts to read that project's deployment status, domains, service config, volumes and logs failed with `You don't have the required role (viewer) on this resource`. A separately readable Omega project does not establish the state of LUQI. No live Railway deployment or successful MySQL connectivity has been proven.

## Code limitations found in the previous production Dockerfile

- Its `pip install ... || ... || true` hides Python failures instead of surfacing them.
- It uses `npm install --legacy-peer-deps` rather than deterministic `npm ci`.
- Root `railway.json` and `railway.toml` both configure the service; verify which file the existing Railway service actually loads before applying changes.
- The legacy root `Procfile` starts Python, but the Docker `start.sh` selects the Node app first. Never assume Procfile applies to a Docker builder.
- `/v1/health` is an HTTP liveness response; it does not prove database connectivity, payment capability, owner-scoped authorization or AI provider budget protection.

## This PR's staging artifacts

1. `Dockerfile.railway.staging`: Node 22, deterministic `npm ci`, TypeScript check and build, non-root runtime, explicit FFmpeg; no hidden Python dependency installation.
2. `Dockerfile.railway.staging.dockerignore`: excludes local credentials, logfiles and generated archive data from the staging image context.
3. `railway.staging.example.json`: opt-in example; deliberately not named `railway.json`, so it does **not** reconfigure existing production.
4. `scripts/check-railway-staging.mjs`: fail-closed static checks. Dedicated Actions workflow builds the image with Docker without authenticating to Railway.

These staging files are not proof that legacy Python modules work in the staged Node image. Check any Python subprocess dependencies independently; do not represent disabled OMEGA features as recovered.

## Staging rollout gates

1. Verify Railway role access and identify current LUQI source branch, deployments, logs, endpoint, attached MySQL service, volumes and database backup method.
2. Confirm whether the database has actual user records and ensure tested backup/restore. Never run migration on the production database by assumption.
3. Resolve the main GitHub auto-deploy risk before merging to main (draft PR #100 and GCP issue #104); Railway source branch must be pinned to a protected branch or reviewed commit for staging.
4. Use a **separate existing staging environment or an explicitly approved new staging environment**, with separate credentials/DB and a service configured to use `Dockerfile.railway.staging`. Do not automatically connect a production DB through environment-variable references.
5. Verify `/v1/health` plus authenticated and cross-account negative-path integration tests against staging, real database ping, vendor cost limits, private object storage, error rates and rollback.
6. Change DNS only after confirmed success; Cloudflare `luqi-ai.com` is still pending HostAfrica NS delegation. Keep Google Cloud Run as a known-working rollback path until cutover approval.
7. Budget reminder: moving the app to Railway does not stop Gemini API usage charges in Google Cloud. Set vendor-side caps.

Release requires explicit human authorization for any Railway environment creation, deployment, production traffic or database mutation.
