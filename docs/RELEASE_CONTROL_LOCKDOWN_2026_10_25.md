# Luqi secured single-owner release path

**Updated 2 November 2026. THIS DOCUMENT/PR DOES NOT ENABLE GITHUB RULESETS OR RAILWAY SETTINGS.**

At verification GitHub `ttmodupe-hash/luqi-ai` `main` and Railway production web both matched successful SHA `5fda81b0a30bb530a0f2c6bf10bab506b4e5f3ca`. GitHub `main` was `protected:false` with zero rulesets, and Railway `source.checkSuites:false` (Wait for CI OFF). Treat these as dated observations until reread. Production web and MySQL were online.

## One-time setup by the sole GitHub/Railway owner

1. Open https://github.com/ttmodupe-hash/luqi-ai/settings/rules . Create an **active branch ruleset** targeting `main`. Require pull requests, passing checks, an up-to-date branch, and block normal force pushes and deletion. Set **zero required approvals**: no second account, fake collaborator, self-approval or automated impersonation. Record the real owner's deliberate acceptance before merging. Avoid routine bypass.
2. Require the actual globally triggered GitHub Actions job contexts, expected source **GitHub Actions**: `validate-web`, `verify-webkit-journeys`, `payload-and-recovery`, `verify-ingress-and-token-boundaries` and `public-cache-contract`. Confirm names in PR Checks. They run on every PR and main push. Do NOT make path-filtered `container-build-and-start` or `exact-container-frontend` jobs globally required, because GitHub may not run them for an unrelated PR.
3. Verify the ruleset applies to `main` and blocks a harmless untested PR before checks complete. Inspect effective rules, not only `protected` metadata.
4. In the existing Railway project `kind-spontaneity` production web service → **Settings → Source**, enable **Wait for CI** after confirming Railway GitHub App permissions. No new service, account or paid subscription is needed. [Railway docs](https://docs.railway.com/deployments/github-autodeploys#wait-for-ci) explain that it watches push workflow **conclusions**; skipped/neutral runs and some cancelled workflows do not block. This candidate makes WebKit and HTTP ingress **main push checks non-cancellable** while keeping per-PR supersession.
5. Review all applicable exact-head CI, the actual diff, security scope and integration SHA. Make a genuine owner sign-off; never count an AI COMMENT as an independent human approval. Merge using the standard protected PR path. Verify main SHA, Railway terminal SUCCESS, `app.luqi-ai.com`, `luqi-ai.com`, `www.luqi-ai.com`, public health/release/static assets, old PWA recovery and roll-back steps. Keep physical Huawei/Xiaomi/Oppo/iPhone and real guest journey acceptance open (#354, #439, #202) before large recruitment or paid launch.

## Strict evidence boundary

The offline `scripts/release-control-posture.mjs` reads only redacted exact-scope observations and fails closed on invalid/extra fields, mismatched SHA, inactive protection, disabled Wait for CI, unhealthy Railway state, staged changes or stale observation. It has **no network, secrets, customer records, billing, authentication, DNS or deployment access**. Its highest success state is `OWNER_RELEASE_SIGNOFF_REQUIRED`; `public_or_paid_launch_approved` stays false. A summary can be fabricated and is not proof that platform toggles are active. The CLI `scripts/review-release-controls.mjs` reads bounded stdin only, redacts raw values, exit 2 blocked, 1 invalid, 0 still requires explicit owner decision. Use `node scripts/review-release-controls.mjs < /private/release-observation.json` only on a trusted machine.

GitHub Web Build now runs these redacted release/P0 contract tests on PR and main push; the existing independent P0 evidence worksheet remains stricter for high-stakes operations. **A reviewed commit does not itself change GitHub/Railway admin settings.**
