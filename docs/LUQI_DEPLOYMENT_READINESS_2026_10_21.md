# LUQI controlled deployment readiness (2026-10-21)

## Observed blockers
- User HostAfrica screenshots show two DNS zone configurations: registrar-servers.com and host-ww.net nameservers. A screenshot of a zone is not evidence it is authoritative. Verify registrar delegation for each domain and public DNS responses before editing.
- Existing .github/workflows/deploy.yml triggers on pushes to main and targets us-central1 / luqi-ai-backend with GAR_LOCATION containing YOUR_PROJECT_ID, while the recorded production deployment is luqi-ai in europe-west1. **Do not run it until the actual GCP project, region, service, artifact repository and IAM are confirmed.**
- Existing workflow uses --clear-env-vars and inline --set-env-vars for secrets. This risks wiping runtime config and leaking sensitive data. Replace with secret-manager references and narrowly scoped runtime identity after inventory; never log secret values.
- Known package-lock mismatch means npm ci is expected to fail until lockfile is repaired. TypeScript/build/test status remains unverified. A release-preflight workflow has been added to fail closed rather than deploying.
- Recently added chat, opportunity and funding features are preparatory UI/domain models; do not claim live messaging, calls, automated funding searches, submissions or payments.

## Safe rollout sequence
1. Identify authoritative DNS for luqi-ai.com and luqi.ai.studio by checking registrar delegation, dig NS and DNS propagation. Record and back up current DNS zone.
2. Inventory actual GCP project ID, Cloud Run service, region, active revision, ingress, domains, service account, secrets, database connectivity, cost budget and rollback revision without exposing credentials.
3. Audit and repair package-lock and TypeScript errors; run npm ci, npm run check, npm test, npm run build. Add end-to-end and security tests for auth, messages, files and payments.
4. Fix unsafe production deploy workflow; require manual approval and environment protection. Prefer short-lived workload identity federation, scoped permissions, managed secret references and artifact digests.
5. Deploy a staging revision with a separate URL and test account. Verify authentication, data isolation, rollback, low-bandwidth access, DNS/HTTPS, health checks, and cost limits.
6. After passing gates and receiving explicit approval for production release, use traffic-split canary, monitor actual error rates and roll back on regression.
7. Only update DNS when necessary, in the authoritative zone, with documented TTL and rollback. Never delete existing MX, SPF, DKIM or DMARC records casually.

## Minimum go/no-go
- No production release with failing or unknown tests.
- No public chat/calls without authenticated durable services and privacy protections.
- No financial transfers or AI paid workloads without verified authorization, rate limits and budget safeguards.
- Do not claim successful deployment until the cloud provider confirms healthy serving revision and a live end-to-end smoke test succeeds.

## Inputs required before deployment
- Confirm actual GCP project and Cloud Run service/region (without secrets).
- Confirm which domain(s) are intended to serve production and whether the existing service must remain uninterrupted.
- Verify environment protection, staging target and rollback path.
