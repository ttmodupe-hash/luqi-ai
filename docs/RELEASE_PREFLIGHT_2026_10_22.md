# LUQI production integration — release preflight (22 October 2026)

## Evidence-based status
This is a **release checklist**, not a deployment authorization or a claim that the draft features run in production.

- Main currently contains `.github/workflows/deploy.yml`, triggered on pushes to `main`, but its deployment job is gated by repository variable `GCP_DEPLOY_ENABLED == 'true'`. **The current value of that variable is not established by this review**. Separate Google Cloud Build triggers and Railway auto-deploys may still exist.
- Main's Python CI uses `requirements.txt` and three Python versions. The integrated agent evidence changes and consensus protections are in **draft stacked PRs**, not main.
- Stacked dependency chain: #95 → #96 → #108 → #109 → #115 → #116 → #117, with additional independent integration #110/#111/#113, and #105/#106/#107 and #99/#100/#101/#103. New Omega Six drafts #127–#132 target main independently.
- Latest recorded #117 CI passed on its branch, including MySQL and Python. That does not establish main branch compatibility, real model accuracy, migrations in staging or host readiness.
- HostAfrica screenshot shows apex Google A/AAAA and `www`/ `git` Google CNAME, `engine` Railway CNAME, and HostAfrica MX/SPF/DKIM/DMARC. Registrar delegation and live DNSSEC remain unverified. Do not change NS or delete MX records yet.

## Release gates (all must pass)
| Gate | Proof needed | Owner/action |
| --- | --- | --- |
| 1. Freeze release candidate | Single integration commit with reviewed PR dependency list; no unrelated Omega Six feature added during stabilization | Maintainer |
| 2. Deployment control | Verify `GCP_DEPLOY_ENABLED` value, Google Cloud Build triggers, Railway GitHub deployment triggers, and rollback path | Infra owner |
| 3. Secrets | Verify no exposed credentials, segregated staging credentials, rotation plan; never commit values | Security owner |
| 4. CI | Green TypeScript, Node tests, Python 3.10–3.12, lint, real MySQL integration, build, browser E2E | CI |
| 5. Database | Backed-up isolated staging, reviewed migration order, apply/rollback and restore rehearsal, least privilege | DBA |
| 6. Billing | Gemini/OpenAI provider-level spending caps/alerts, persistent user/global quota, safe provider failures, verified Paystack webhook and idempotency | Billing owner |
| 7. Authentication | Sessions, CSRF/CORS, admin boundaries, account recovery, audit log, abuse throttles | Security owner |
| 8. Agents | No host execution of untrusted AI code; independent reviewer; evidence tied to proposal; negative results; signed CI provenance | Agent owner |
| 9. Frontend | No browser-exposed API keys, real feature routes, responsive/accessibility E2E, browser security headers | Frontend owner |
| 10. Domains/email | Copy all A/AAAA/CNAME/MX/TXT records, preserve mail DNS-only, confirm Google/Railway domain ownership, DNSSEC, and test inbound/outbound mail | DNS owner |
| 11. Recovery | Working health/readiness probes, logs/alerts, DB restore, reversible rollout and verified rollback | Operations |
| 12. Human go/no-go | Signed checklist and explicit approval for production merge, DNS and cutover | Owner |

## Suggested implementation order
1. **Do not merge the draft stack directly to main.** Create a new integration branch and cherry-pick/reconcile changes after determining overlaps with #110/#111/#113 and #127–#132.
2. Run the existing CI plus MySQL, Python and Node tests on that exact integrated commit. Fail closed on missing credentials, unreviewed migration or any unsafe agent behavior.
3. Validate staged service domains and backend health, including actual database access; a static 200 from `/v1/health` is not sufficient.
4. Prepare Cloudflare records to match the HostAfrica screenshot, but verify live delegation and email before changing nameservers.
5. Ask for explicit deployment authorization only after a documented release candidate and rollback plan exist.

## Blockers this file does not resolve
No Railway API, Cloudflare or HostAfrica credentials were accessed; no nameserver, CI variable, cloud trigger, database, or production code was changed. The GCP job gate's configuration is **not** the same as proving all automatic deployment paths are disabled.
