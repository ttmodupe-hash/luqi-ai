# Outstanding LUQI work

This is an evidence-based checkpoint, not a claim that all features are complete.
Paid provider activation and billing remain disabled. The $100/month split
($60 Gemini / $40 OpenAI) is a ceiling for any separately approved activation.
Do not infer activation approval from an instruction to fix the app.

| Priority | Work | Current evidence / next completion criterion |
|---|---|---|
| P0 | Dependency advisories | Root npm tree has zero findings locally after Tailwind migration; release requires CI/build/browser checks. Alternate app standalone dependencies, Bun lock and Python dependencies need separate audits. |
| P0 | Database recovery | Isolated MySQL migration, concurrency and fixture restore CI exists. Production backup configuration and a production-safe restore drill remain deferred; fixture restore is not proof of production recoverability. |
| P0 | Authorization | PRs 170–171 closed unsafe admin/legacy operations. Reviewed admin sessions/RBAC and a complete remaining-route audit are still required; closed endpoints are unavailable features, not completed replacements. |
| P0 | Credentials | Never commit or print secrets. Verify rotation/revocation metadata and deployment configuration without exposing values; no claim that all historic credentials have been rotated. |
| P0 | Release verification | Process health, DB readiness and fail-closed route probes exist. Test real registration/login/recovery and account ownership with a designated production test account; synthetic browser tests do not establish this. |
| P1 | Six Omega modules | Review each adapter's authorization, durable state, cancellation, retry/idempotency and truthful failure results. Demonstrate outcomes with tests before enabling orchestration. |
| P1 | Private memory | Account-owned MySQL notes and in-memory browser sessions exist. Add deletion/export/retention policy, idempotent writes and separately approved metered AI replies. |
| P1 | African languages | Build source-grounded knowledge and language-quality evaluations with native-speaker review; a translated menu is not evidence of answer quality. |
| P1 | Product truthfulness | Remove remaining unverified capability/comparison and home-page marketing claims; backend guardrails alone do not make those claims accurate. |
| P2 | Usability/accessibility | Browser checks cover selected desktop/mobile flows. Floating controls still overlap footer/help content; complete keyboard, screen-reader, contrast and all-page responsive review. |

Preserve infrastructure and data. Record failures and limits alongside results.
Do not reopen legacy billing, admin or AI routes merely to remove unavailable UI.
