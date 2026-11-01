# Luqi Civic Evidence — initial integrated release

Workstream of #377 / #378, not completion of the full political-information programme.

## Delivered scope

Chat → Civic evidence opens `/#/chat?civic=1` inside the existing Luqi workspace. Five dated educational records cover clean audits, irregular expenditure, municipal budget/actual distinctions, parliamentary oversight and the official IEC voter-information service. Each record has a claim, source-based status, original publisher link, short excerpt and location, publication date when available, review/expiry dates, coverage limits and correction history. These are Luqi educational examples, NOT statements attributed to parties.

`/#/chat?evidence=<approved-id>` opens a contextual conversation in the same Chat route and account. The free meaning/limits/next-step buttons display reviewed passages without accounts, inference or tracking. The optional AI supporter receives a question only after existing Luqi sign-in and a per-request approval. It selects from reviewed explanatory passages; it does not generate new factual prose, translations, rankings or URLs. Unsupported questions receive an explicit out-of-scope result.

## Evidence and publication limits

Sources were reviewed on 1 November 2026 using publicly retrieved publisher pages/excerpts. `civic-source-review.json` records metadata and SHA-256 hashes of the short excerpts retained in `src/lib/civic-evidence.ts`. Hashes are not full-document snapshots, authenticity certificates or proof of truth. The IEC record explicitly discloses that its publisher search excerpt was available but direct page retrieval was not. Publication dates are null when not stated; source review dates are not publication dates. Initial curation is automated, not independent human editorial/legal sign-off.

This release contains no party manifesto comparison, party ranking, actual municipal audit score, ward/councillor score, current election-date announcement, personal voter-status result, turnout claim or prediction. Basic civic participation is encouraged without endorsements or user political profiling. More contentious party-specific content requires separately verified original records and editorial review before publication. Existing issue #377 remains open for that work.

Source review expires after 8 November 2026 at 23:59:59 SAST. Old cards remain visibly dated. AI is blocked before and after selection if the review is no longer current. No background source-refresh worker is claimed or enabled by this release. Renewals require re-reading the publisher, updating the versioned registry and testing the new edition. A failed lookup cannot silently renew a source.

## Backend boundary

`POST /api/v1/luqi-core/civic-explain` is a child of the existing authenticated AI pilot router, AFTER its enablement, authentication and 32-KiB body limit. The child also rejects absent/invalid authenticated IDs. It accepts ONLY claimId, a question of at most 1000 characters, and up to three previous passage IDs from that same claim. It never accepts source text, source URLs, user IDs, model/provider choices, budgets, account profiles or arbitrary history from the browser.

The server resolves evidence from its reviewed registry and calls the existing durable-budget gateway. Existing per-user and provider budgets, credentials, approved fallback behaviour and output-completeness checks remain unchanged. Tests substitute provider responses; no paid inference is necessary for acceptance. The browser performs one explicit bounded same-origin POST, has no automatic retry and preserves uncertain-attempt warnings. No new environment variables, schema changes or provider allocations are introduced.

The model can return ONLY approved passage IDs and an out-of-scope flag. Unknown/cross-claim IDs, duplicates, additional keys, free prose, fake citations and malformed output are withheld. The response includes an exact evidence edition; mismatched old/new editions fail closed rather than rendering a misleading citation. Citations and text are resolved from the registry, never from model-generated links. Selection relevance can still be wrong, which is disclosed to users.

Likely SA ID numbers (including full-width and spaced/hyphenated forms) are blocked before provider traffic. Users are instructed not to enter other personal details or vote choices. Questions and consent are in-memory only; identity/claim changes abort pending display and clear the conversation. No voting profile is stored. The gateway still records ordinary quota/accounting metadata, not the political question. Remote-provider processing occurs only after explicit approval and is subject to existing provider/privacy terms.

## Acceptance

- Unit/contract tests: source references and excerpt hashes; ambiguous/absent dates; expiry; bounded prompts; source-ID injection; cross-record history; fabricated citations/prose; no party scores; frontend mirror parity.
- HTTP tests: existing auth and quota checks; no unauthenticated inference; body limits; strict request schema; review expiry before/during an attempt; no automatic output retry; ordinary Chat validation unchanged.
- Client tests: bounded no-cookie transport; minimal request; response/edition mismatch; cancellation; no retry; ID/stale rejection before traffic.
- Chromium desktop/mobile and WebKit desktop/iPhone-sized suites: 320px browsing, source links, free clarification, shared synthetic login, per-request consent, follow-up IDs, invalid-model withholding, sign-out clearing, expiry, malformed links and ID rejection. All accounts and provider replies are synthetic fixtures.

Release acceptance requires passing exact-head CI, a matching merged tree, canonical Railway SUCCESS and public exact-commit HTTPS checks. Physical Android/iOS PWA installation/recovery remains in #354/#374 and is not certified by browser emulation. No live model-quality assessment or independent human editorial review is implied by CI.
