# LUQI-AI — controlled launch operator packet

**Prepared:** 26 October 2026, Africa/Johannesburg (SAST).  
**Decision:** EXISTING LIMITED PILOT ONLY. **No broad promotion, paid checkout or subscription activation.**  
**Purpose:** Give the owner a concrete, evidence-led release procedure, without granting launch approval or performing any production action.

## Authoritative scope and evidence snapshot

- Repository: [ttmodupe-hash/luqi-ai](https://github.com/ttmodupe-hash/luqi-ai), production source branch `main`.
- Continuation tracker: [#202](https://github.com/ttmodupe-hash/luqi-ai/issues/202).
- Railway project **kind-spontaneity** `9f627cb8-3136-4b30-89d2-32ca648a1e5f`; production environment `1e192ef3-1fa6-4684-81fc-60165c7b0e22`.
- Web service `a9b293e0-1966-43be-80ef-3dd27acc6ab7`; MySQL service `8094576f-f2c7-4e50-b474-69661e7c0ba8`. Do **not** substitute the separate html-public-test or the older comfortable-illumination project.
- On 26 Oct around 05:48 SAST, GitHub `main` and the successful Railway web deployment both resolved to `032e60056d92c55e9935c568a61b73f0fbd8c0f0`. Both web and MySQL reported one running replica, zero crashed and no pending deployment.
- The bounded preceding **six-hour** Railway web HTTP aggregation contained **72 requests** (70 `2xx`, two `4xx`, zero `5xx`); GET `/` had 13 `2xx` of 13 requests and GET `/v1/health` had two `2xx` of two. These are route-specific and service aggregates, **not whole-app uptime, unique customers, latency percentiles or an SLA**.
- Railway reports `app.luqi-ai.com` ownership/DNS verified and a valid TLS certificate. Independent HTTPS GETs from the checking environment for `/`, `/v1/health` and source-confirmed `/v1/release` failed DNS resolution. **Monitoring visibility gap, not confirmed LUQI downtime.** Do not publish a custom-domain link based on Railway certificate status alone.
- Draft integration [PR #268](https://github.com/ttmodupe-hash/luqi-ai/pull/268) at `1adb4b68db9e0d1a42828419cdd9e2e8c15f1dfa` is unmerged. Last check: 33 successful, one skipped, one container-front-end check still in progress. This snapshot is **not** a final CI result; re-read the exact head.
- GitHub `main` was `protected:false` with no returned rulesets. Railway production web `checkSuites:false` means Wait for CI is **OFF**. Do not assume either was fixed by source changes.

**Evidence expires for decisions:** Re-read live GitHub, Railway and the public endpoints immediately before release. Do not treat this dated snapshot as current status or historical green checks as newly executed tests.

## Three distinct release decisions

| Scope | Current decision | Requirements |
| --- | --- | --- |
| Existing limited pilot | **Maintain only** | Preserve current safe paths, watch meaningful deterioration; do not imply 24/7 staffed monitoring |
| Invite more users / public promotion | **HOLD** | Reviewed exact-head release, enforced source/deploy gates, direct HTTPS + real-device account/privacy tests, verified private support and recovery, acceptable privacy/retention and production-derived recovery evidence |
| Charge customers / advertise subscriptions | **HOLD** | All public-promotion gates **plus** verified merchant/seller/settlement, live receipt and refund operations, server-bound entitlements, actual provider cost reconciliation, sustainable capacity and explicit owner approval |

## Before any controlled code release

1. **Freeze the candidate:** Confirm PR #268's exact head, full terminal CI outcomes and diff. No failed or unresolved checks; skipped checks must be understood. Arrange eligible independent human review later; assistant source review is not independent approval. Do not silently merge PRs #265/#267 separately.
2. **Enforce GitHub main rules:** An authorised owner configures an enforced main-only pull-request rule, appropriate independent review and required checks, blocks force-push/deletion and verifies no unsafe bypass. Confirm exact job names and avoid globally requiring a path-filtered check that will never run. Do not lock out the only administrator.
3. **Check release ordering:** PR #268 separates predeploy push checks from postdeploy public probes. Verify those source changes are actually present in the intended merged commit **before** enabling Railway Wait for CI. Confirm the Railway GitHub App permissions, required push workflow conclusions and the documented rollback route. Never enable Wait for CI blindly against the old workflows: they can wait for a deployment that Railway is holding.
4. **Record recovery readiness:** Obtain private current backup inventory, retention/access evidence and separately approved **production-derived isolated MySQL restore** with source comparisons and RPO/RTO. A fixture restore or attached volume does not prove recoverability. No production Restore button, live SQL export or secret-sharing is authorised here.
5. **Record security/support readiness:** Close the historical Oct 21 credential and access-use review; verify a private operator-owned support channel with inbound and outbound messages; rehearse account ownership challenge and recovery with separately approved designated accounts. No invented support email.
6. **Check public readiness:** Verify TLS with hostname validation and bounded unauthenticated GET `/`, `/v1/health` and source-confirmed `/v1/release`. Require the intended full commit SHA and no-store release response. Do not follow redirects to unverified origins, POST, query customer data or invoke paid AI merely for readiness.
7. **Authorise the window:** Name release owner, decision owner, a rollback operator, communications owner and a small acceptance group; record a launch window in SAST and an approved stop/rollback path. Do not promise staffed on-call coverage.

## Controlled release and postdeployment acceptance

- Do not merge or deploy until the owner approves the specific reviewed commit and safe release order. A successful Railway deployment is not itself customer acceptance.
- Verify Railway reports the **intended** web deployment `SUCCESS`, MySQL remains online, no unexpected staged work and public `/v1/release` returns that exact SHA.
- On GitHub Actions **main**, only **after** the intended revision is live, manually dispatch: **LUQI Public Release Checks**, **LUQI Custom Domain HTTPS Acceptance**, **LUQI Production Lab Framing**. Inspect terminal results for the exact revision. These manual checks are neither continuous monitoring nor independent physical-device acceptance.
- On a real iPhone-sized and Android-sized device, with an **authorised disposable human-owned account**, verify sign-up, sign-in, notes save/reload/export/delete, logout and private-account denial from another user. Confirm uncertain-response handling and no account content exposed to unauthenticated users. Check small-screen/keyboard accessibility. Do not use private customer records or publish identifiers.
- Confirm the limited AI trial is described accurately; provider configuration and readiness do **not** prove a real answer. Any separately approved live text test consumes real budget and needs actual provider-cost review. Preserve monthly USD100 allocation (USD60 Gemini, USD40 OpenAI), no automatic top-up and no unlimited promise.
- Record redacted pass/fail, operator, timestamp, exact revision and evidence owner in a **private** operations record. Only a redacted decision belongs in [#202](https://github.com/ttmodupe-hash/luqi-ai/issues/202).

## Stop conditions and safe response

**Stop promotion / pause the release decision** for confirmed customer-path unavailability, database failure affecting customers, unexpected successful anonymous private-account response, repeated materially worsening 5xx with counts, failed exact-revision release checks, confirmed provider overspend/limit trouble, broken signup/recovery or privacy regression. An expected 401/403 is not an outage; a disabled 503 endpoint is not an authentication success. Do not infer theft from a suspected access-control regression.

An authorised operator chooses rollback only after checking the intended revision, compatibility and preservation of authentication fixes. **Never** restore production MySQL for a code rollback, reset quota ledgers, expose secrets or automatically activate payments/providers to make tests green. Record any visibility gap separately from an outage.

## Human sign-off record — intentionally blank

| Gate | Evidence timestamp (SAST) | Named owner | Result / evidence location |
| --- | --- | --- | --- |
| Exact-revision CI and independent review | — | — | **OPEN** |
| GitHub rules + Railway CI gate proven | — | — | **OPEN** |
| Credential/access-use review | — | — | **OPEN** |
| Production-derived isolated restore and RPO/RTO | — | — | **OPEN** |
| Private support, recovery and real-device account acceptance | — | — | **OPEN** |
| Independent public HTTPS/release identity | — | — | **UNVERIFIED** |
| Actual Gemini/OpenAI costs and quotas | — | — | **OPEN** |
| Merchant, refund, receipts, entitlements and seller terms | — | — | **OPEN** |
| Explicit public-promotion decision | — | — | **NOT APPROVED** |
| Explicit paid-launch decision | — | — | **NOT APPROVED** |

**This packet prepares decisions. It does not make them, run probes on a schedule, deploy code, buy provider credits, invite users or take payments.** See `docs/PILOT_LAUNCH.md`, `docs/P0_OPERATOR_ACCEPTANCE_2026_10_25.md`, `docs/COMMERCIAL_LAUNCH.md`, and PR #268 for the underlying technical contracts.
