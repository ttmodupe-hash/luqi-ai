# LUQI-AI $100/month text-chat pilot — release runbook

**Plan (USD, UTC calendar month):** Gemini $60 (60%), OpenAI $40 (40%).
**Billing approval:** NOT GRANTED. Provider calls disabled until a separate explicit
user authorization. A planned payment is not authorization.

## In Railway (new `kind-spontaneity` project)
Set these non-secret variables (already prepared with `skipDeploys`):
- `LUQI_AI_MONTHLY_USD=100`
- `LUQI_GEMINI_MONTHLY_USD=60`
- `LUQI_OPENAI_MONTHLY_USD=40`
- `LUQI_AI_PROVIDER_ENABLED=false`
- `LUQI_AI_BILLING_APPROVED=false`

DO NOT set legacy `GEMINI_API_KEY` or `OPENAI_API_KEY` in this service:
other legacy endpoints may call them outside of the pilot gate.
Only after payment confirmation, provider-side limits, migration and separate
approval, add the service-only secret names
`LUQI_PILOT_GEMINI_API_KEY` and `LUQI_PILOT_OPENAI_API_KEY` through
Railway's secure Variables UI (never GitHub, screenshots or chat).

## Provider-side controls (to be configured by the account owner later)
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

## Authenticated-user and legacy-route protections
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
- Legacy model endpoints return 503 `AI_LEGACY_ROUTE_DISABLED` during this
  pilot; they must be reviewed for authentication and metering before
  re-enabling. Ordinary login/status/health routes are unaffected.
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
5. After the user explicitly approves activation, flip
   `LUQI_AI_BILLING_APPROVED=true` and `LUQI_AI_PROVIDER_ENABLED=true`
   and run a single, measured harmless live request, subject to both limits.
6. Monitor response quality across African languages and stop the pilot on
   errors, unauthorized traffic, overspend or unclear billing.

**No provider payment, purchase, top-up, or API credential creation is
initiated by this plan.**