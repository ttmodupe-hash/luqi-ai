# LUQI-AI

**Pan-African and global learning, creativity, and AI pilot.** LUQI brings together browser-based educational tools, a local animation studio, personal notes, and a limited authenticated AI text trial. This is an actively developed pilot, **not a claim that every historic module, paid service, provider integration, or autonomous agent is production-ready**.

> **Verified checkpoint — 24 October 2026.** Current production source is this repository's `main`, deployed to Railway project `kind-spontaneity` as service `web` with a separate persistent **MySQL** service. The latest verified app revision was `5b6ff1b` (PR #201, 23 October), with a successful deployment and 24 public release probes. For newer updates use the [continuation hub](https://github.com/ttmodupe-hash/luqi-ai/issues/202) and [outstanding-work register](docs/OUTSTANDING_WORK.md). Passing probes does not mean launch acceptance is complete.

## Try the current pilot

**Railway-generated app:** https://web-production-a4b79.up.railway.app

Available pilot journeys include:

- First-time start screen and responsive tool navigation
- Browser physics experiments (some tutoring functions remain unavailable)
- Local six-scene **silent** animation/storyboard studio, with 90-second video, script and subtitle export; this is not remote text-to-video generation, synthetic voice or automatic social publishing
- Signed-in, account-owned private notes and archive/export flows
- Limited signed-in AI **text** trial at `/#/ai-trial`, gated by consent, per-user attempt limits, provider budgets and shared availability

Some legacy routes, unverified educational content, payments and autonomous OMEGA worker functions are deliberately disabled. Look for the product's explicit availability labels.

## Architecture and integration status

The current production web service is sourced from `ttmodupe-hash/luqi-ai` `main`, uses a reviewed Node/React application and **MySQL**, and starts with read-only validation of required schema tables. The restricted web DB identity is separate from operator/migration credentials.

OMEGA / Python components and the Six domain adapters are being integrated behind explicit security, data authority, consent, workflow and release gates. Worker execution is **not** enabled as a production autonomous self-healer.

The older [September unification concept](docs/UNIFICATION.md) proposed a different FastAPI/PostgreSQL arrangement. It is a historical design document, **not** permission to migrate or replace the present MySQL database. A different Railway project has a PostgreSQL service whose name contains `mysql`; it must never be substituted for the production LUQI MySQL service.

## AI pilot and spending

The owner-approved API allocation is **$100 USD per UTC calendar month: $60 Gemini and $40 OpenAI**. Provider caps/alerts and local durable reservation controls are documented in [AI pilot runbook](docs/AI_PILOT_100_USD.md). Provider metadata access has been verified, but a real designated-account paid reply and billing reconciliation have **not** yet been confirmed. Provider auto-reload remains off. Do not insert provider credentials in frontend bundles, GitHub issues or screenshots; legacy unrestricted AI endpoints remain closed.

The AI pilot budget is **not** a customer payment system or a Railway hosting budget.

## Commercial and safety status

The [commercial launch runbook](docs/COMMERCIAL_LAUNCH.md) outlines a proposed human-assisted animation offer. **No live checkout, paid LUQI product, automated wallet crediting, subscription or customer charge is enabled.** Merchant identity, supported processor, currency/prices, delivery/refund terms and private support contact must be verified before a sale. Legacy payment paths intentionally remain unavailable.

Railway's October 2026 security disclosure requires ongoing credential and usage review. Active web JWT/admin credentials were refreshed; historic database/operator and provider revocation evidence, isolated production-derived restore, designated real-user acceptance and incident clearance remain open. See [security response](docs/RAILWAY_SECURITY_RESPONSE_2026_10_23.md) and [production gate #144](https://github.com/ttmodupe-hash/luqi-ai/issues/144).

Do not advertise untested African-language answer quality, certified/clinical recommendations, self-modifying agents, paid generative voice/video or partner authorizations as production features.

## Development and deployment

Clone this repository, review the application-specific setup and [deployment guidance](DEPLOY.md), and use the existing CI test workflows and reviewed schema/migration runbooks. Do **not** run automatic `db:push`, rebuild a production schema, regenerate credentials, or blindly deploy legacy services as a general quick-start step. Use protected Railway variables for service configuration and run integration tests against disposable databases.

The continuation hub tracks active dependencies, evidence and work order: **[LUQI-AI — Project Continuation Hub (#202)](https://github.com/ttmodupe-hash/luqi-ai/issues/202)**. The current implementation and full pending acceptance criteria are kept in [OUTSTANDING_WORK.md](docs/OUTSTANDING_WORK.md), with [Six module integration #133](https://github.com/ttmodupe-hash/luqi-ai/issues/133).

## License

MIT. See the repository's license terms.
