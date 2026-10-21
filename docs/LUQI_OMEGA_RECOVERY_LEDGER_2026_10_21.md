# LUQI / OMEGA capability recovery ledger — 2026-10-21

## Why this exists
Legacy `omega_ai` shipped unresolved `PASTE_*` tokens in dozens of module files. Those were source-upload placeholders, **not working capabilities**. The original package `__init__.py` imported `health_advisor.py` (placeholder) and `legal_assistant.py` (absent), making imports of unrelated modules fail.

### Verified low-risk recovery in this PR
| Public import | Real source already in LUQI | Tested boundary | Limitations |
| --- | --- | --- | --- |
| `omega_ai.LoanCalculator` | `loan_calculator.py` | 0%-interest estimate, invalid loan terms/nonfinite inputs | Generic estimates only; not a lending quote or eligibility decision |
| `omega_ai.SolarCalculator` | `solar_calculator.py` | Historical sizing formula; reject zero DoD and invalid quantities | Hard-coded sunshine, tariff and installation costs; not live or engineering-certified |
| `omega_ai.CommunityEvents` | `community_events.py` | Add/list/location filtering; verifies instance-local state | Not a durable event database, calendar or live discovery |

The wrappers reuse actual existing algorithms; the import gate lazily exposes restored names. These are **not OMEGA features proven to have been migrated from `omega-super-ai`**. The latter is a separate repository, `ttmodupe-hash/omega-super-ai`, with different source layout and provenance; migration requires an explicit implementation-by-implementation comparison and review.

### Missing, stubbed or high-risk functionality
- `omega_ai.HealthAdvisor` is not exported while its module is a placeholder. Medical information requires validated evidence, safeguards and clinical review.
- `omega_ai.LegalAssistant` has no importable implementation in this package. Do not treat legal advice as available.
- Other placeholder modules remain untranslated, especially tax, grants, loan origination, employment, government, healthcare, insurance, emergency, and geographic services; do not call them live.
- Many root-level counterparts exist in LUQI but may have stale prices, location assumptions, missing validations, and incomplete access controls. Presence of a file **is not proof of production readiness**.
- `tests/test_v27_endpoints.py` is a `PASTE_*` placeholder and not counted as a valid test.

### Recovery gates (for every subsequent module)
1. Identify exact original source path, license/provenance, expected public API and data origin. Never infer completion from a matching filename alone.
2. Test module import independently in a clean process and confirm the entire package remains importable if other capabilities are disabled.
3. Exercise positive and negative contracts, invalid/edge numeric input, ownership/data isolation, data retention and graceful fail-closed behavior.
4. For AI agents, payment, medical, tax, legal, location or government operations, obtain specialist security/domain review before exposing as a public capability.
5. Declare hard-coded data, offline/local-state behavior, provider APIs and disabled services truthfully.
6. After each reviewed slice, run targeted CI, then full Python CI and staging acceptance on the exact release commit.
7. Keep all pull requests drafts until `main` deploy triggers and the real Cloud Run project are inventoried and paused.

**Release truth:** A passing focused recovery test does NOT mean the entire OMEGA library, Python repository CI, Cloudflare, billing, or production is operational. Issue #102 tracks outstanding source recovery.
