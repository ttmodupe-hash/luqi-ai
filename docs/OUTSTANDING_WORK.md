# Outstanding LUQI work

This is an evidence-based checkpoint, not a claim that all features are complete.
Paid provider activation and billing remain disabled. The $100/month split
($60 Gemini / $40 OpenAI) is a ceiling for any separately approved activation.
Do not infer activation approval from an instruction to fix the app.

| Priority | Work | Current evidence / next completion criterion |
|---|---|---|
| P0 | Dependency advisories | Root npm, standalone app, desktop, Bun and resolved Python scans now have zero known findings locally; CI coverage is added for all five trees. See DEPENDENCY_AUTH_HARDENING.md for scope and upgrade checks. Continue scan review and platform release acceptance; zero known advisories is not a complete security audit. |
| P0 | Database recovery | Isolated MySQL migration, concurrency and fixture restore CI exists. After explicit backup approval, daily Railway volume backups with 6-day retention are enabled and the initial 941 MB backup is listed. MySQL stayed online; PITR remains off. Verify subsequent scheduled backups, retention/cost and a production-derived isolated restore drill; a listed snapshot or fixture restore is not proof of production recoverability. |
| P0 | Authorization | PRs 170–171 closed unsafe admin/legacy operations. Node auth requires an explicitly active account and bounded request bodies. All login/signup aliases now reserve durable MySQL global and account/identifier limits before password work; the guard denies requests if storage fails, and handles collation-equivalent accounts consistently. See AUTH_THROTTLING.md for limits, tests and denial-of-service tradeoffs. Legacy Python auth removes its fallback key/default admin and adds salted hashes plus revocable scoped tokens, but is outside the new Node throttle. tRPC denies unreviewed procedures; offline queue operations enforce ownership and persistent MySQL. Legacy archive/shared knowledge and REST billing/job/approval/USSD bypasses are closed. Trusted-ingress controls, MFA, reviewed admin sessions/RBAC and the remaining-route audit are still required. |
| P0 | Credentials | Never commit or print secrets. Verify rotation/revocation metadata and deployment configuration without exposing values; no claim that all historic credentials have been rotated. |
| P0 | Release verification | Process health, DB readiness and fail-closed route probes exist. Test real registration/login/recovery and account ownership with a designated production test account; synthetic browser tests do not establish this. |
| P1 | Six Omega modules | The MySQL workflow engine has durable claims, leases, heartbeats and bounded recovery. An authenticated Node/Python bridge now adds owner-only task APIs, durable intake caps and an explicit worker for travel arithmetic/vehicle scheduling. Production intake/workers remain disabled. Migration, dedicated worker credentials, retention/erasure, monitoring, designated-account acceptance, remaining domain ownership, live providers and evaluated outcomes still gate rollout. The frontend dashboard now supports authenticated history, verified stored results and confirmed queued-task cancellation. Submission forms, running-task cancellation and automatic self-healing/self-improvement remain outstanding. |
| P1 | Private memory | Account-owned MySQL notes and in-memory browser sessions exist. Owner-confirmed transactional conversation deletion is implemented, including owned linked memories. A bounded, owner-only conversation JSON export now includes all saved messages and owned linked memories, with a private download control. Whole-account/bulk exports, backup retention/erasure policy, idempotent writes and separately approved metered AI replies remain. |
| P1 | African languages | Build source-grounded knowledge and language-quality evaluations with native-speaker review; a translated menu is not evidence of answer quality. |
| P1 | Product truthfulness | The workspace entry page now separates usable tools from previews, replaces canned chat/browser-provider fallback with an unavailable panel, and labels unverified language capabilities. The Physics lab tutor is explicitly unavailable; its simulation remains usable. The archive page now explains unavailable access and no longer presents sample files or polls shared records. Audit remaining legacy module pages, unused browser-key components and comparison claims; backend guardrails alone do not make their UI accurate. |
| P2 | Usability/accessibility | The shared workspace shell removes floating chat/voice/critique controls and adds responsive navigation, search, keyboard focus and tool filters. Browser checks cover desktop, mobile and 320px entry-page navigation plus private-note flows. Omega dashboard browser checks add disabled status, stored results, cancellation conflicts, credential expiry, keyboard focus and 320px layouts. Complete screen-reader, contrast, zoom and responsive review across remaining module pages. |

Preserve infrastructure and data. Record failures and limits alongside results.
Do not reopen legacy billing, admin or AI routes merely to remove unavailable UI.

## Known baseline type-check debt

A broader strict TypeScript check on 2026-10-23 also found existing errors in
legacy streaming/session code: unresolved `sessionId`, an unresolved
`ANTI_HALLUCINATION_PROMPT`, an unsupported orchestration `taskType` field and
untyped query rows. The focused authentication service/client checks do not
prove the whole legacy API is type-clean. Resolve and add regression coverage
before enabling those provider-backed paths. Provider activation stays off.
