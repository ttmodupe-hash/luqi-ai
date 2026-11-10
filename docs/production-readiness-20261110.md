# Production engineering checkpoint — 10 November 2026

The account accessibility/parity release `8f581283b63243d4d52031419c5a85a874adec6e`
reached Railway SUCCESS and was observed through the public Launch Control page.
Its reviewed tree passed 53 checks. This confirms the source release, not full
commercial launch readiness. Existing budgets, provider activation, credentials,
databases and infrastructure sizing are unchanged by this work.

## Operations improvements

`scripts/production-health-monitor.mjs` performs ten bounded, credential-free GETs
against the fixed custom and Railway hosts. It binds observations to an exact
commit before and after checking HTTP liveness, a real MySQL query, and delivery
of the custom site's actual SPA entry. A disabled or billing-unapproved AI pilot
is reported separately from core availability; missing keys, unavailable ledgers,
stale health, unexpected statuses, redirects, cached JSON, malformed/oversized
responses, missing chunks and revision drift fail the observation. No provider
inference, account, payment, DNS, migration or rollback action is issued.

The Production Operations workflow runs this observation on the deployed PR base,
after the canonical successful production status, and on a nominal 15-minute
schedule after merge. GitHub may delay scheduled jobs. Failures produce a failed
Actions run using the owner's existing notification settings. **Notification
delivery and an independent paging channel are not verified.** No recipient,
webhook endpoint or secret is invented. This is a sampled check, not an uptime SLA.

The previous unused `tests/loadTestSimulator.ts` sent arbitrary USSD POSTs and
divided wall time by concurrency to report latency. It is replaced by
`scripts/http-load-probe.mjs`: loopback-only, allowlisted GETs, at most 20 workers
and 200 requests, response deadlines/body limits, early failure stopping, and
actual per-request mean/p50/p95/p99/max and throughput. It cannot be pointed at
production, a provider, customer accounts or a caller-selected API path.

The isolated MySQL workflow builds the actual production server and SPA and:

- Measures 120 public HTTP requests each at concurrency 5 and 20.
- Exercises ten concurrent durable note writes and thirty mixed owner/foreign
  reads through HTTP using the restricted runtime identity.
- Injects a real missing SELECT grant, requires a fixed 503 storage failure,
  restores that fixture grant and checks recovery without a volatile fallback.
- Checks graceful restart, then current → previous API bundle → current, with
  saved notes retained and new writes from the previous version readable.
- Runs the existing logical export/full schema-and-content comparison and the
  separate network-isolated import/readback/cleanup drill on synthetic data.

The previous API baseline is explicitly pinned to `8f58128`; its dependency lock
must match. Update this baseline only through a reviewed compatibility decision.
The local regression limits are public-HTTP p95 <2 seconds and private-HTTP p95
<3 seconds. These are fixture gates, **not measured production capacity, user
latency promises, production rollback or frontend rollback evidence**. No real
accounts, production credentials, SQL dumps or raw server logs enter artifacts.

## Production rollback procedure

Keep source pinned to the exact reviewed commit. Before any release, inspect all
staged changes; deploy only after the corresponding checks pass. Record the
current successful deployment and compatible source baseline. The 10 November
release changes no schema, key or account data, so its source rollback needs no
database restore. For later schema changes, review compatibility separately.

If a newly deployed release fails public checks, inspect scoped runtime/build
logs and confirm the failure before changing production. Select the known-good
compatible deployment through Railway's supported redeploy operation; wait for
SUCCESS, then verify public revision, health, persistence and relevant account
flows. Do not blindly select an older release with obsolete authentication or
broader database privileges. Do not restore the live database, drop tables,
change signing keys or disable security checks as a rollback shortcut. This
session does not intentionally interrupt live service to rehearse a rollback.

## Gates still requiring real operational access or acceptance

| Gate | Current boundary and concrete completion evidence |
|---|---|
| Production-derived recovery | The connector exposes no backup inventory/export/restore operation; no Railway CLI, local Docker or SQL connection is available here. The attempted private dashboard read required sign-in. A signed-in operator must verify the actual latest scheduled backup, retention and cost, create an approved private logical export on an encrypted operator host, and execute `docs/LOCAL_RECOVERY_DRILL.md`. Record source completeness and measured recovery time/point separately. Fixture evidence cannot close this gate. Never export production data to public CI or this chat. |
| Alerts | Verify the owner's Actions failure notification delivery and an agreed private incident destination. A failed run is not proof a person received an alert. No outbound messages were sent by this change. |
| Release enforcement | Main currently reports unprotected. The connector lacks administration permission to enforce branch rules, and Wait for CI is not exposed by its source configuration tool. Continue reviewed PRs plus exact-commit source pinning; an authorized repository/platform administrator must enforce and read back the branch/CI settings. |
| Real-world capacity | The new checks measure isolated HTTP/MySQL regressions. Sustained production-like staging traffic, infrastructure limits and a realistic usage mix need a separately scoped test. No additional replica, server or paid load-testing service is created. |
| AI quality and charges | No generation request or billing/activation change occurs here. Real model evaluation, language review and invoice-to-ledger reconciliation require approved provider access and actual results. Keep the existing live caps and switches unchanged. |
| Credential incident | Historical credential revocation and access-log review require actual provider/platform records; passing code checks does not establish that earlier credentials are safe. Do not print credentials or rotate them blindly without dependency/rollback review. |
| User acceptance and commercial services | Actual account recovery, physical-device acceptance, verified private support/mail delivery, merchant settlement/refunds and remaining gated modules require their own working integrations and acceptance. No placeholder is promoted to a functioning service. |

Railway's 24-hour aggregate HTTP metric included 121 5xx responses out of 4,172
requests (2.90%) at the initial inspection. The release verifier deliberately
expects 503 from retired/disabled surfaces, so this aggregate is **not** a usable
customer-outage rate without route classification. Core-route observations and
scoped failures must be assessed separately. No zero-error or uptime claim is made.

No additional paid infrastructure or AI budget is requested by these source
changes. If closing a remaining gate requires new recurring spending, first
provide its concrete resource, cost and approval decision to the owner.
