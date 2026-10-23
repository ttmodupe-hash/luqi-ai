# LUQI-AI $100/month text-chat pilot — release runbook

**Plan (USD, UTC calendar month):** Gemini $60 (60%), OpenAI $40 (40%).
**Provider-spend approval:** explicitly GRANTED by the owner on 2026-10-23 for
Gemini and OpenAI within this allocation. This does not authorize LUQI customer
subscriptions, legacy payment endpoints, new infrastructure or Omega workers.
Approval is recorded separately from operational activation: paid generation
remains paused pending provider-account control verification and a monitored,
budgeted live roundtrip. Do not ask the owner to approve this same allocation again.

## In Railway (new `kind-spontaneity` project)
Set these non-secret variables (already prepared with `skipDeploys`):
- `LUQI_AI_MONTHLY_USD=100`
- `LUQI_GEMINI_MONTHLY_USD=60`
- `LUQI_OPENAI_MONTHLY_USD=40`
- `LUQI_AI_PROVIDER_ENABLED=false`
- `LUQI_AI_BILLING_APPROVED=true`

`LUQI_AI_BILLING_APPROVED` records owner consent to provider spending. It does
not attest to the provider's account balance, payment setup or spending caps,
and it cannot enable customer billing. Keep `LUQI_AI_PROVIDER_ENABLED=false`
until the operational checks below pass.

DO NOT set legacy `GEMINI_API_KEY` or `OPENAI_API_KEY` in this service:
other legacy endpoints may call them outside of the pilot gate.
Credentials may be saved with both activation flags OFF. Add the service-only secret names
`LUQI_PILOT_GEMINI_API_KEY` and `LUQI_PILOT_OPENAI_API_KEY` through
Railway's secure Variables UI (never GitHub, screenshots or chat).

## Provider-side controls (verify before operational activation)
- Google AI Studio: dedicated LUQI Gemini project with **$60/month** project
  spend cap at **Spend > Monthly spend cap > Edit spend cap** when available.
  Experimental project cap may overrun due to ~10 minute billing delay.
  Alerts around $48 and $54. With prepaid balance, keep **auto-reload OFF**
  unless separately approved. Confirm project is not shared by other products.
  Docs: https://ai.google.dev/gemini-api/docs/billing/
- OpenAI Platform: dedicated LUQI project with **$40/month** project spend
  limit, hard spend enforcement if present, plus alerts at $32 and $36.
  Alerts/soft project budgets **do not block API calls**, and hard enforcement
  may lag. Confirm which control exists in the user's account.
  Docs: https://help.openai.com/en/articles/8304786-keeping-your-openai-account-secure
- Assign separate project-scoped API keys, restricted model access and spending
  permissions where supported. Billing/payment is user-controlled, not automated.
- Match each deployed credential to its intended provider project. A matching
  display name or a successful metadata request does not prove that mapping.
  Retain existing lower caps; do not increase them just to match this ceiling.

## Authenticated-user and legacy-route protections
- `/#/ai-trial` is the explicit signed-in text trial. It checks configuration
  separately from inference, requires a provider-processing acknowledgement,
  and sends only the entered question. It never appends private notes, email,
  saved history or automatic context. Nothing is sent on sign-in alone.
- The page stores its session, prompt and reply only in memory. Sign-out and
  navigation cancel the client request and ignore late responses. A 45-second
  client timeout does not guarantee that provider processing was cancelled;
  ambiguous requests are never retried automatically. Starting another question
  requires an explicit action. Failed calls/fallback still consume attempts.
- Paid pilot chat requires a valid, unexpired LUQI account JWT using the
  server's `JWT_SECRET` plus a lookup of that user in persistent MySQL.
  Anonymous or deleted users cannot spend pilot credits.
- Every authenticated account is limited to **20 provider attempts per UTC
  day**, shared across Gemini and OpenAI, using a locked MySQL counter.
  Attempts that fail are still counted. This complements but does not replace
  global rate limits, abuse detection, provider-side spending caps or billing audits.
- The migration now creates both `ai_pilot_monthly_spend` and
  `ai_pilot_daily_user_usage`. The entire reservation transaction fails
  closed if either table is missing/unreachable.
- Legacy model endpoints, including unmetered companion/voice/video/agent
  tRPC namespaces, return 503 `AI_LEGACY_ROUTE_DISABLED` during this pilot;
  they must be reviewed for authentication and metering before re-enabling.
  Ordinary login/status/health and selected informational routes are unaffected.
- Users must obtain a valid account JWT through existing secure login before
  using the pilot chat. No shared browser secret or frontend API key is allowed.

## Technical safeguards
- Every `POST /api/v1/luqi-core` request routes exclusively via
  `api/services/aiPilotGateway.ts` (Gemini 3.8 Flash then OpenAI GPT-6 Luna).
- Text-only; max 6,000 user characters; max 512 output tokens; last four
  conversation turns truncated; no tools, grounding, audio or video.
- BEFORE every attempted call, atomically reserve **$0.10** from its provider's
  calendar-month budget in dedicated MySQL via a transaction + row lock.
  $60/$40 is 600/400 *attempt reservations* per month, respectively.
- When Gemini fails, OpenAI fallback must reserve from OpenAI's $40 bucket.
  Failed calls retain their reservation so ambiguous timeouts cannot trigger
  an undetected second charge. Database unreachable, table absent, disabled
  flags or bad allocation all fail closed.
- Both provider requests have a 20-second timeout. Gemini explicitly makes only
  one transport attempt per reservation; the OpenAI fetch also has no retry.
  Synthetic HTTP tests exercise the installed Gemini SDK, including its real
  timeout and a 503 fallback. OpenAI redirects are rejected.
- Apply `db/migrations/20261022_ai_pilot_budget.sql` to dedicated MySQL
  after DB is provisioned; the older environment's `luqi-mysql` service is
  actually PostgreSQL and is INCOMPATIBLE with this Node MySQL schema.
- Reservation balances are **not measured billed costs**. Reconcile actual
  token usage/provider invoices daily. Additional AI endpoints outside the
  pilot chat, manual console calls or other projects are NOT covered.
- Strict provider-side limits are still essential. Neither these reservations
  nor delayed provider billing meters guarantee a mathematical $100 ceiling.

## Before turning anything on
1. Verify Railway can deploy the exact Docker image and secure production service.
2. Confirm database, migration, and locked reservation behavior across
   concurrent requests. Add dashboard reconciliation and alerts.
3. Confirm Gemini/ OpenAI model entitlements and their pricing on account.
4. Confirm provider project budgets and alerts, disable auto-reload.
5. Owner approval is recorded. Once steps 1–4 have direct evidence, set
   `LUQI_AI_PROVIDER_ENABLED=true` and run a single, measured harmless live
   request through the authenticated, budgeted route, subject to both limits.
   Never use an unmetered console request as proof of the gateway's behavior.
6. Monitor response quality across African languages and stop the pilot on
   errors, unauthorized traffic, overspend or unclear billing.

**No provider payment, purchase, top-up, or API credential creation is
initiated by this plan.**

## Read-only credential preflight

Set `LUQI_AI_CREDENTIAL_CHECK_ENABLED=true` on the web service to opt in to
one metadata check per provider per process startup. Keep
`LUQI_AI_PROVIDER_ENABLED=false`; owner-spend approval is independent.
The check sends only authenticated GET requests for the pilot's configured
models; it never calls generation APIs, reserves budget, changes provider
settings, or activates billing. It has no public HTTP trigger.

In Railway runtime logs, filter for `Pilot provider metadata check`. Only the
provider, reviewed model, fixed status, and explicit unverified generation and
billing markers are logged. Key values, raw errors, provider response bodies
and headers are never logged. Redirects are rejected and each request is bounded
to ten seconds and 16 KiB of response data. There are no automatic retries.

`metadata_accessible` means the supplied credential can retrieve the expected
model's metadata. It does not prove generation entitlement, paid balance,
provider spend caps, pricing, or successful inference. A restricted key can
return `permission_denied` even when it has other API permissions; do not widen
permissions automatically. Diagnose other statuses without turning on the pilot.
After observing the result, set the check flag to `false` with no immediate
redeployment; subsequent starts will skip the check.

On 2026-10-23 production deployment `2ad89d45-bbca-4fce-b062-059bff0941a4`
reached `SUCCESS`. Both reviewed models returned `metadata_accessible` in the
sanitized startup checks. Generation was `not_tested`, billing was
`not_verified`, and no inference request was made by that preflight.

References:
- https://ai.google.dev/api/models#method:-models.get
- https://developers.openai.com/api/reference/resources/models/methods/retrieve/

## Masked key identifier comparison

The startup metadata check can also compare the deployed key's final four
characters to the masked identifiers visibly listed in the intended provider
project. Set `LUQI_PILOT_GEMINI_KEY_IDENTIFIERS` or
`LUQI_PILOT_OPENAI_KEY_IDENTIFIERS` to a comma-separated list of those exact
four-character identifiers (at most 20). This is optional diagnostic configuration;
do not commit actual identifiers or credentials to this repository.

The log reports only `key_identifier=matched`, `mismatched`, `not_checked`,
`unavailable` or `invalid_configuration`. Neither the key fragment nor the
configured list is logged or exposed on a public endpoint. No permission or
credential is created or changed. A match is supporting masked-identifier
evidence, not a cryptographic proof of project ownership, billing setup or cap
enforcement. Review it alongside the intended project's visible key list and
billing controls, and recheck after key rotation. It is never an inference test.
