# Launch review — 2026-10-23

This records verified changes and open acceptance gates. It is not an unrestricted launch approval or a claim that every draft PR, Omega domain or professional service is complete.

## Merged and verified

- #191: original open-Q branding, valid 192/512px install artwork and current app descriptions. Design differentiation is not trademark clearance.
- #192: fixed global HTTP errors, route-pattern telemetry, private no-store responses and bounded authenticated AI request validation.
- #193: explicit private database role provisioning. CI exercised the real operator and production was moved to the dedicated web identity, with its one-time variable cleared. The root/operator credential was preserved; historical revocation is still open.
- #194: local six-scene, 90-second studio with 3D projection, camera/physical controls, time scrubbing, original graphics, storyboard/subtitle/script exports and explicit native video recording. No microphone, paid video provider, social connection or professional submission is enabled.
- #195: removed unverified active science/media claims and closed both legacy science endpoints. #196: the exact production container runs as the existing unprivileged node user; actual production startup reports runtime UID 1000.

The final #196 head passed 419 offline tests and 46 browser checks, all five
Actions workflows and all ten reported check runs. Production deployment
`9e432994-91d0-48ed-8a39-9ca3fa035328` reached SUCCESS at main
`22abfa4f2ed5a3f35884e1e2bc6fb7b5f5654886`. Read-only production schema
verification validated eight runtime tables. Public job `120452930472` passed
all 20 probes; two additional live science GET checks returned the expected
503/no-store denial. All three Railway services were online and MySQL's
deployment was unchanged.

## Subsequent security-disclosure gate

Railway's October 21 disclosure recommends rotating stored credentials and
reviewing usage. This does not establish whether LUQI was affected. On October
23 the operator replaced the active web session-signing/admin secrets and
paused `LUQI_AI_PROVIDER_ENABLED`; the existing $100 text approval and $60/$40
limits remain valid. This is partial containment, not completed incident
response. Provider keys and the historical database/operator credential were
not revoked here. See RAILWAY_SECURITY_RESPONSE_2026_10_23.md and issue #144
for the live deployment evidence, safe rotation sequence and remaining gates.

The studio head passed five workflows: 396 configuration/security/content tests, 20 transport/client/page tests, 44 browser checks, real MySQL integration/restore, container smoke, dependency audits and Python CI. Scope-specific strict checks passed; the legacy whole-repository TypeScript debt remains outside that evidence.

Production identity deployment `8faffbf1-bfd0-4f41-8768-2290fb37a8df` and studio deployment `cf244169-d4ad-4d2c-820b-5485d887b5b1` reached SUCCESS. All three existing services stayed online. The MySQL deployment and volume were preserved. A 941 MB snapshot and next scheduled backup were visible; a production-derived isolated restore is not verified.

## Final legacy route review

The old multimodal hub advertised active AlphaFold/confidence data, grounded
research, live voice and paid video. It now directs users to the working local
studio/physics tools and the separate text trial, without mounting those
unreviewed clients. The legacy science endpoints are closed for all methods
before their old synthetic-data/provider handlers. Native video timing is
explicitly approximate until media inspection/normalization. These changes
passed CI and live deployment/browser verification as recorded above.

## PR reconciliation

Closed #75 as superseded: its only PyJWT pin change is already in main from #179. Closed draft #156 as superseded: its scoped 24-hour JWT contract is already implemented, with additional password-bound revocation from #162. Merging that older draft would lose newer controls.

The remaining older PRs are inventoried below. This is a triage queue, not proof they are needed, safe, merged or compatible. Metadata/blob comparisons of 20 drafts did not establish any as fully identical to current main; #96 exceeded the first 100-file page and needs full pagination. Review intent, reconcile later protections, update/rebase safely and rerun current checks before merging each needed change. Keep useful work rather than accepting a stale snapshot solely because an old check was green.

| PR | State at review | Work |
|---|---|---|
| [#147](https://github.com/ttmodupe-hash/luqi-ai/pull/147) | Draft; reconcile before merge | Release preflight: map LUQI draft integration, deployment gates and HostAfrica DNS safety |
| [#117](https://github.com/ttmodupe-hash/luqi-ai/pull/117) | Draft; reconcile before merge | Agent evidence lifecycle + integrated fail-closed Python self-healing safeguards |
| [#116](https://github.com/ttmodupe-hash/luqi-ai/pull/116) | Draft; reconcile before merge | P0: Honest, quota-controlled multi-agent consensus — no fictitious audit approvals |
| [#115](https://github.com/ttmodupe-hash/luqi-ai/pull/115) | Draft; reconcile before merge | Measured agent-improvement scorecard: held-out quality, African languages, safety and cost |
| [#113](https://github.com/ttmodupe-hash/luqi-ai/pull/113) | Draft; reconcile before merge | Security incident response: intrusion radar, defensive canary routes and secret-rotation playbook |
| [#111](https://github.com/ttmodupe-hash/luqi-ai/pull/111) | Draft; reconcile before merge | P0: Retire unsafe legacy Python auth, billing, webhooks and simulated success |
| [#110](https://github.com/ttmodupe-hash/luqi-ai/pull/110) | Draft; reconcile before merge | LUQI foundation integration: security, memory, Python, Omega and full no-deploy gates |
| [#109](https://github.com/ttmodupe-hash/luqi-ai/pull/109) | Draft; reconcile before merge | Durable AI improvement ledger: independent reviewer, MySQL transitions and verifiable evidence |
| [#108](https://github.com/ttmodupe-hash/luqi-ai/pull/108) | Draft; reconcile before merge | Guard admin self-healing diagnosis with paid-AI quotas and safe telemetry |
| [#107](https://github.com/ttmodupe-hash/luqi-ai/pull/107) | Draft; reconcile before merge | P0: Stop unsafe Python self-healing execution and fabricated deployment outcomes |
| [#106](https://github.com/ttmodupe-hash/luqi-ai/pull/106) | Draft; reconcile before merge | Archive integrity: real checkpoint recovery, safe paths and honest cognitive memory |
| [#105](https://github.com/ttmodupe-hash/luqi-ai/pull/105) | Draft; reconcile before merge | Railway staging preflight + prevent browser AI key bypass and untrusted script execution |
| [#103](https://github.com/ttmodupe-hash/luqi-ai/pull/103) | Draft; reconcile before merge | Recover existing LUQI utility modules and fail closed on unavailable OMEGA features |
| [#101](https://github.com/ttmodupe-hash/luqi-ai/pull/101) | Draft; reconcile before merge | Repair fatal Python syntax and missing runtime imports |
| [#100](https://github.com/ttmodupe-hash/luqi-ai/pull/100) | Draft; reconcile before merge | Release safety: stop legacy automatic Cloud Run deploys before any merge |
| [#99](https://github.com/ttmodupe-hash/luqi-ai/pull/99) | Draft; reconcile before merge | Fix Python dependency resolver conflict for multi-version CI |
| [#97](https://github.com/ttmodupe-hash/luqi-ai/pull/97) | Draft; reconcile before merge | Security: isolate LUQI edge-rate protection and disable unsafe API caching |
| [#96](https://github.com/ttmodupe-hash/luqi-ai/pull/96) | Draft; reconcile before merge | LUQI security, verified billing, agent review and OMEGA knowledge — draft release gates |
| [#95](https://github.com/ttmodupe-hash/luqi-ai/pull/95) | Draft; reconcile before merge | Secure companion sessions and restore persistent memory |
| [#94](https://github.com/ttmodupe-hash/luqi-ai/pull/94) | Draft; reconcile before merge | Audit companion authentication and memory access |
| [#93](https://github.com/ttmodupe-hash/luqi-ai/pull/93) | Dependency/automation update; compatibility review | deps(frontend)(deps): bump @hono/vite-dev-server from 0.19.1 to 0.26.1 in /app |
| [#92](https://github.com/ttmodupe-hash/luqi-ai/pull/92) | Dependency/automation update; compatibility review | deps(frontend)(deps-dev): bump esbuild from 0.25.12 to 0.28.2 in /app |
| [#91](https://github.com/ttmodupe-hash/luqi-ai/pull/91) | Dependency/automation update; compatibility review | deps(frontend)(deps): bump @anthropic-ai/sdk from 0.120.0 to 0.135.0 in /app |
| [#90](https://github.com/ttmodupe-hash/luqi-ai/pull/90) | Dependency/automation update; compatibility review | deps(ci)(deps): bump actions/checkout from 4 to 7 |
| [#88](https://github.com/ttmodupe-hash/luqi-ai/pull/88) | Dependency/automation update; compatibility review | deps(ci)(deps): bump codecov/codecov-action from 3 to 7 |
| [#87](https://github.com/ttmodupe-hash/luqi-ai/pull/87) | Dependency/automation update; compatibility review | deps(ci)(deps): bump actions/setup-python from 5 to 6 |
| [#83](https://github.com/ttmodupe-hash/luqi-ai/pull/83) | Dependency/automation update; compatibility review | deps(py)(deps): bump asyncpg from 0.29.0 to 0.32.0 |
| [#82](https://github.com/ttmodupe-hash/luqi-ai/pull/82) | Dependency/automation update; compatibility review | deps(py)(deps): bump alembic from 1.13.2 to 1.20.0 |
| [#81](https://github.com/ttmodupe-hash/luqi-ai/pull/81) | Dependency/automation update; compatibility review | deps(py)(deps): bump click from 8.1.7 to 8.5.0 |
| [#79](https://github.com/ttmodupe-hash/luqi-ai/pull/79) | Dependency/automation update; compatibility review | deps(py)(deps): bump psycopg2-binary from 2.9.9 to 2.9.13 |
| [#78](https://github.com/ttmodupe-hash/luqi-ai/pull/78) | Dependency/automation update; compatibility review | deps(py)(deps): bump pydantic-settings from 2.3.0 to 2.15.0 |
| [#77](https://github.com/ttmodupe-hash/luqi-ai/pull/77) | Dependency/automation update; compatibility review | deps(py)(deps): bump rich from 13.7.1 to 13.9.4 |
| [#76](https://github.com/ttmodupe-hash/luqi-ai/pull/76) | Dependency/automation update; compatibility review | deps(py)(deps): bump redis from 5.0.6 to 5.3.1 |
| [#74](https://github.com/ttmodupe-hash/luqi-ai/pull/74) | Dependency/automation update; compatibility review | deps(py)(deps): bump sqlalchemy from 2.0.31 to 2.0.55 |

## Gates still open

- Designated human production account signup/sign-in/recovery and persistent-note acceptance; a failed prior sign-in does not prove an account exists or that recovery works.
- A real, approved paid text reply, actual usage reconciliation and ongoing caps/alerts. Configuration and model-metadata checks are not inference evidence. Approved text limits remain $100/month split $60 Gemini/$40 OpenAI, with provider auto-reload off; customer billing remains closed.
- Verified private support/operator contact, whole-account export/erasure and backup-retention/privacy acceptance before broader collection.
- Historic credential revocation, production-derived isolated restore, offsite recovery policy and explicit hosting/backup RPO/RTO/cost acceptance.
- The remaining Omega domains and evaluated outcomes; production workers remain disabled. Native-reviewed African-language/source-grounded evaluations remain open.
- Direct social OAuth scopes, developer/app reviews, rights/guest consent, destination/audience review and verified publish receipts. No social passwords in LUQI and no automatic repost after an ambiguous outcome.
- Professional/filing delegation: verified identity, a specific mandate, qualified review, final action approval and durable evidence. No automatic SARS filing or chartered-accountant authority is claimed.
- An independently measured 80/100 interaction target using the rubric in ASSISTANCE_QUALITY_AND_AUTHORITY.md. No verified 70 baseline or current 80 score exists.

A live full-length MP4 export completed and was visually reviewed across all six scenes. Native output measured 89.558767 seconds; the delivered file was normalized/padded to exactly 90.000000 seconds, H.264 1280×720, 24 fps, 2,160 frames, yuv420p, 3,517,678 bytes and no audio. A complete decode passed. This proves a local creation/export, not a published social post or generative video provider.
