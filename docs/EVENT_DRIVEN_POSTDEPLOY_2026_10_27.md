# Release sequencing: post-deployment acceptance — 27 October 2026

## Why this is necessary
The current canonical Railway service is `kind-spontaneity / production / web`. Before this change, the `Public Release Checks` and `Custom Domain HTTPS Acceptance` workflows ran live, exact-revision checks on every `main` push. Railway's `Wait for CI` feature waits for GitHub Actions to finish **before** deploying a new commit. If enabled with those live checks still on push, each check would wait for a deploy that is itself waiting for the check. That is a release deadlock, not a customer outage.

## Event split
- `push: main` remains on both workflows, but runs **offline syntax/contract tests only**. This is safe to include in pre-deployment CI.
- `pull_request` continues path-scoped offline checks. `workflow_dispatch` preserves a manual, exact-main post-deploy acceptance path.
- `status` events from GitHub are filtered to a **successful** `kind-spontaneity - web` commit status on the current `main` SHA. A bounded offline verifier checks GitHub repository, main branch membership, HTTPS Railway origin, project, service, environment and deployment ID before either live script can run.
- Other Railway projects, failures, partial builds, unrelated statuses and stale commits cannot trigger live production release acceptance.
- These status-driven workflows rely on Railway publishing the expected GitHub status event. **Do not claim that trigger is operational until a real canonical production deployment has actually emitted it and the exact-revision public and TLS checks pass**. A manual dispatch remains available when needed.

## What is still outstanding
- Railway `source.checkSuites` was false on 27 Oct. This code **does not turn on Wait for CI**, alter GitHub branch protection, or prove that GitHub App permissions are sufficient. The connected Railway config tool cannot change the source's `checkSuites` value.
- A GitHub release can still deploy before its push CI is done until Wait for CI is enabled separately. Check exact-main push runs and a successful live deployment before changing the production setting.
- GitHub `main` is not branch protected; require independent review, status checks and recovery procedures before a broad launch.
- A matching Railway SUCCESS event is not itself HTTP health, user acceptance, security approval, provider inference or payment approval. These workflows verify only public routes. The prior good deployment should remain serving while a new build is in flight.
- Never send account data, payment secrets, provider bills or customer prompts to public issue comments, CI logs or workflow inputs. Merchant collection stays disabled and the AI budget remains USD100/month: Gemini USD60 / OpenAI USD40.

See [Railway Wait for CI](https://docs.railway.com/deployments/github-autodeploys#wait-for-ci), [GitHub status event](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#status), and [tracker #202](https://github.com/ttmodupe-hash/luqi-ai/issues/202).
