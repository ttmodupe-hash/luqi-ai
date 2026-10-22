# LUQI-AI production launch gates

A passing engine self-test or HTTP liveness check is not production launch approval.
Record evidence for the exact candidate commit and deployed release. An unchecked
item is outstanding; do not label the full product launch-ready until all applicable
gates pass. Offline modules must be described as offline until their user journeys
are integrated and verified.

## Release and rollback

- [ ] Candidate SHA identified; Python CI, web contract tests, production container
  smoke test, MySQL integration/isolated restore and production dependency audit pass.
- [ ] Railway web release for that SHA reaches terminal `SUCCESS` (queued, building,
  and an older successful deployment do not qualify).
- [ ] Public `/`, `/v1/health`, and intended user routes respond correctly over HTTPS.
- [ ] `/v1/readiness` is inspected separately: connected persistence does not prove
  provider entitlement, inference, backup retention or memory durability.
- [ ] Prior successful deployment identified and rollback procedure reviewed.
  Preserve the database; never restore production data merely to roll back code.

## Authentication and data protection

- [ ] Registration/login/logout and expired/invalid-token rejection verified with
  disposable test accounts; cross-account data access and privileged routes denied.
- [ ] Open security PRs reviewed, including JWT issuer/audience and expiry hardening.
- [ ] No credentials in source, logs, browser bundles or API error responses.
- [ ] Production backup schedule, encrypted destination, retention and failure
  alerting documented; a recent backup artifact exists and restores in isolation.
  The disposable CI restore proves the export code, not production backup coverage.
- [ ] Durable conversation memory is verified across a restart/deployment. Local
  checkpoint files on an unmounted container filesystem do not meet this gate.
- [ ] Account deletion, retention and privacy disclosures match actual behavior.

## Agents and product journeys

- [ ] Side effects require a boolean approval decision and literal `True` from the
  host authorization callback; malformed decisions never change task state.
- [ ] Failed external side effects require reconciliation; no automatic duplicate
  payment, submission or deletion. No fabricated self-healing/deployment outcomes.
- [ ] Persistent task state, worker ownership and crash recovery verified before
  claiming durable or exactly-once agent execution. The offline workflow runner
  currently uses process-local state.
- [ ] Six Omega modules tested through each advertised user journey before those
  integrations are marketed as live. Unit tests alone establish offline contracts.
- [ ] African-language selection, fallback, translated UI and representative answer
  quality checked per advertised language with suitable fluent reviewers.
- [ ] Mobile layout, keyboard navigation, loading/error states and critical browser
  journeys verified; performance and concurrency tested against an agreed target.
- [ ] Operational dashboards distinguish measured data from demos and unavailable
  telemetry. No simulated balance, health, remediation or success is presented as real.

## Paid AI and payments: separate approval required

- [ ] Owner explicitly approves activation independently of launch preparation.
- [ ] Keep provider and billing flags disabled until that approval. Preserve the
  agreed monthly allocation: $100 total, $60 Gemini / $40 OpenAI.
- [ ] After approval, verify configured model entitlement and bounded real inference,
  persistent budget enforcement, rate limits and error handling before an AI launch.
- [ ] Payments require their own approval and verified gateway/webhook flows.

## Evidence snapshot: 22 October 2026

This is a dated observation, not a live status dashboard:

- Main at `95dbf31b76c57ef9c204b4674862c4b41f006fbb` includes checkpoint hardening.
- Railway deployment `7fe6501e-7538-4458-8a7d-c83d03f4cbdb` for that commit failed
  at `BUILD_IMAGE`. Logs show app compilation and image export; no runtime logs were
  returned. Exact infrastructure failure cause remains unconfirmed.
- Prior billing-fix release `a6ee906d164b26cd903ee024e6f173be0772c742` has terminal
  `SUCCESS` in deployment `a8fb75a3-af54-4ba4-b596-4a30505604ad`.
- Public readiness returned HTTP 503: runtime up, persistence connected, AI disabled.
- MySQL has a mounted volume. The web service has no mounted persistent volume.
- Production backup scheduling/retention, full product acceptance, durable agent
  execution and language quality remain unverified. No paid service was activated.

## Sign-off

Record candidate SHA, deployed SHA, CI run URLs, smoke-test results, backup/restore
artifact date, rollback target, outstanding limitations, and owner launch decision.
A limited offline preview may have a narrower declared scope; never describe it as
an enabled paid-AI launch while the provider is disabled.
