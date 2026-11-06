# KHORO V17.1 - Verified learning and bounded autonomy

Date: 5 November 2026
Status: development proposal with executable, tested foundation; NOT a production daemon.
Basis: owner's V16 message and attached V17 twelve-pillar specification. This review preserves the twelve areas but explicitly separates their aspirations, code actually supplied, new implementation, and remaining work.

## Release and integration scope

The main branch inspected for this change is `26901b95102d9b9674c12476056228fcb07fc4ad`. Universal Academy remains a separate draft in PR #481. This additive backend/operator change is based on main, does not overwrite the Academy branch, and introduces no database migration, live API route or public agent-control endpoint. Its six source tags match the Academy's `ccna`, `security`, `aws`, `python`, `matric`, and `solar` IDs. The last label groups separately scoped solar/K53/business paths; its current monitored page covers licensing guidance only, not solar standards.

No paid AI was called. No provider was activated, no budget changed, no production scheduler was enabled, and no generated code was hot-loaded. The public-source probe is explicitly run on demand by an operator. The CI suite uses synthetic responses and does not crawl the registry. It must not be described as an already-connected live Academy radar.

## 1. Findings in the supplied prototype

- `any(domain in source_url.lower())` accepts a trusted name in an attacker's hostname, URL path or query. It neither checks the intended destination nor retrieves supporting text.
- `primary_authority_verified=True` and `popia_pii_clean=True` are assertions, not measured verification.
- Only one URL is accepted; the claimed two-independent-source review is not implemented.
- The two canary calculations are constant and do not consume a candidate model, rule, tool, or corpus. A wrong proposed tax rule would not affect them. The raised rollback error has no actual rollback implementation.
- `knowledge_graph[topic] = discovery` overwrites history. There are no vectors, graph queries, durable storage, versioned evidence, retractions or temporal applicability checks.
- The hash is an unkeyed digest, not a digital signature. Concatenated delimiters also need unambiguous encoding. A hash cannot establish truth or prevent an attacker who controls the whole store from rewriting it.
- `strftime` labels the machine's local time SAST without selecting that timezone. Store canonical UTC timestamps and convert only for presentation.
- The regex masks some 13-15 digit sequences, but misses many names, emails, addresses, documents, formatted identifiers and indirect identifiers. It is not homomorphic encryption or a proof of POPIA compliance.
- The sample has no actual recurring scheduler, network client, model benchmarks, sandbox, DPO training, CRDT, visual parser or WhatsApp/USSD integration.
- The assertion that all 20 tools are restored/live is not demonstrated by the attached Python or a feature inventory. Existing route and feature acceptance tests must remain the source of release evidence.

## 2. Twelve pillars: implementation contract

| Pillar | Keep from the proposal | Engineering acceptance requirement |
|---|---|---|
| 01 SEEKER | Proactive discovery | Curated registry, permission/terms review, conditional requests where safe, source-specific cadence, durable queue leases, bounded retries/egress, change proposals; never promote from a hash change alone. |
| 02 Temporal GraphRAG | Time-aware grounded answers | Evidence-linked claims with valid-time and recorded-time, jurisdiction, source/version, conflicts, retractions and TTL. Add vector/graph indexes only after measuring benefit over simpler retrieval. |
| 03 ARBITRAGE | Provider independence | Exact model IDs, task/language-specific evaluation, privacy approval, cost reservation and bounded fallback. Select among qualified options, not whichever tops a general leaderboard. |
| 04 FORGE | Generate missing tools | Typed proposal, pure reference implementation, independent/property-based tests, isolated runner, supply-chain checks, immutable versioned artifact and reviewed promotion. No generated code in the production process. |
| 05 Debate/verifier | Extra scrutiny where useful | Risk-adaptive proposer and skeptic; authoritative evidence and deterministic checks where applicable. Correlated model agreement is not independent proof. Give concise decision/evidence summaries, not private reasoning logs. |
| 06 WOW | Better usefulness and speed | Explicit opt-in, minimal aggregate metrics, task success, retention of learning, accessibility and cost/task. Clicks are weak feedback, not correctness labels. DPO is separate controlled model training, not prompt prefetching. |
| 07 Quarantine | Protect knowledge ingestion | Claim-level evidence and source independence, source types, content/instruction separation, contradiction handling and human review. arXiv research is not automatically peer reviewed or legal authority. |
| 08 CANARY | Prevent regressions | Candidate- and suite-bound test artifacts, critical invariants, per-language/domain quality, held-out evaluation, measured canary rollout and rollback drill. Production authorization outside the agent. |
| 09 CRDT | Offline continuity | Use CRDTs for suitable notes/annotations, with ownership checks, revocation, deletions and conflict tests. Never let CRDT merge decide payments, balances, permissions or official facts. Chunk/resume sync; do not promise every sync is below 40 KB. |
| 10 VISION | Images/voice into useful structured tasks | Per-field confidence, region/time provenance, unit/schema validation and user correction before execution. Reuse existing visual-tutor consent and spend controls. No automatic upload of all camera frames. |
| 11 PRIVACY | Protect personal information | Data minimization, purpose-specific permission/legal basis, retention/deletion, tenant isolation, authorized providers and cross-border review. Redaction is defense in depth, not a compliance certificate. |
| 12 LITE | Reach low-data and basic-phone users | Useful local text-first lessons, user-approved channel delivery, length-aware summaries preserving caveats and applicability dates. Partner contracts, channel rules, costs and actual network coverage must be established before claims of zero-rating. |

## 3. Implemented in this change

### `api/services/epistemic-policy.ts`

- Immutable six-source registry with exact HTTPS URL/path matching. No wildcards, substring authorization, credentials, query parameters or arbitrary URLs.
- A bounded curiosity priority function with a nonzero importance/staleness contribution when user demand is zero. It rejects non-finite data and is labelled a heuristic, not Shannon entropy.
- Bitemporal approved-fact selection: effective time, known-at time, jurisdiction, retractions, conflicting values, stale/unavailable outcomes. This is a query primitive on trusted records, not a database, vector index or complete GraphRAG system.
- Explicit single-issuer versus independent-publisher evidence policy. Evidence is bound to a candidate digest; repeated pages from the same publisher do not count as independent corroboration. Human semantic review remains necessary.
- Canary proposal screening requires candidate, baseline and suite digests, all required case IDs, no failed cases and non-regressing required quality slices. Its result is always `productionApproved: false`. It does not independently authenticate CI attestations or grant release permission.
- Model selection applies approval, provider allowlist, privacy, task, exact-version evaluation freshness, context/output, quality, latency and USD micro-unit cost ceilings before choosing the cheapest qualified option. It returns no route rather than silently overspending. It does not call models or reserve spend in the database.
- Optional aggregate telemetry accepts only three enumerated fields. Free text, URLs, learner IDs, IPs and extra fields are rejected. Analytics permission does not imply training permission.
- Canonically framed SHA-256 digest chaining and verification against an independently supplied trusted head. This is tamper evidence, NOT signing, immutable infrastructure or proof of truth.

### `api/services/epistemic-probe.ts`

- Explicit one-shot public-source fingerprinting using registered IDs, GET only, no credentials, no redirects, bounded text/HTML/JSON MIME, 4.5-second request deadline and a 256,000-byte streamed-body ceiling.
- Reports baseline observed, bytes unchanged, bytes changed/review required, or unavailable. It returns no scraped document text and never claims to verify a fact.
- Six source mappings; daily cadence for the three issuer pages and weekly cadence for the other guides. A future six-hour worker wake-up does not require fetching every source every six hours.
- A failed probe does not erase the last successful fingerprint. Attempt times and successful observations are separate. It does not treat a failed check as fresh verified knowledge.
- Fixed URLs reduce SSRF exposure, but production still requires public-only DNS resolution, rebinding-resistant egress controls and source-access/robots/terms review. An allowlist is not immunity.

### `scripts/epistemic-radar.mjs`

- Operator plan mode by default; only explicit `--fetch` makes network requests.
- JSON metadata persisted with a state-path lock and atomic file replacement. A second process cannot remove another process's lock. Stale locks require operator reconciliation.
- No real facts or learner content stored; no agent is given production credentials. This is single-host tooling, not distributed transactional persistence or a multi-instance scheduler.

### Tests

Focused Node tests cover spoofed domains, protocol/userinfo/redirect rejection, invalid timestamps, priority bounds, future/expired/conflicting/retracted facts, source independence, candidate-bound canary coverage, slice regressions, provider privacy and budget failures, telemetry rejection, digest tampering/truncation, bounded source responses, cadence, failure retention and CLI lock ownership.

Local verification on 5 November 2026: strict TypeScript compilation succeeded; all 58 focused tests passed. That is code-level evidence only, not production acceptance, actual source connectivity, legal correctness, full POPIA compliance or measured learning outcomes. CI evidence is separate and must be read for the exact commit before release.

## 4. Mathematical corrections

### A. Curiosity

The proposed EIG expression is a valid information-theoretic form only when a probabilistic belief state and observation model are actually defined and evaluated. A model's self-reported confidence or an arbitrary `entropy_bits` input is not such a model. The present implementation deliberately uses:

`priority = 100 * (0.30 * uncertainty + 0.35 * importance + 0.15 * demand + 0.20 * staleness) / (1 + cost)`

where `demand = min(1, log2(1 + aggregate_query_count) / 10)` and `staleness = min(1, age_hours / cadence_hours)`. Inputs and weights are bounded. This avoids exponential overflow and avoids assigning zero priority to important changes merely because nobody has queried them yet. Future EIG experiments must be calibrated and compared with this transparent baseline.

### B. Routing

First build the feasible set of approved, privacy-compatible, healthy, task-compatible models within latency and full expected-call-cost limits. Then optimize cost subject to a measured minimum-quality threshold. Cost includes bounded retries, retrieval, input/output tokens and media overhead. The current selector accepts a trusted conservative cost estimate; a separate server transaction must reserve and settle actual spend. Existing Gemini/OpenAI allocations are unchanged. New providers and larger budgets need owner approval.

### C. Evaluation granularity

A 100-item binary pass/fail score changes in increments of one percentage point. It cannot directly resolve a 0.01-percentage-point accuracy change. More trials, per-slice counts, confidence intervals and an independent holdout are needed for statistical comparisons. Passing two arithmetic constants is not a candidate regression test. A 50 ms local pointer change is not a 50 ms complete detection-and-recovery guarantee.

### D. Time and law

Publication time, observation time and effective date differ. Preserve all of them. A future exam syllabus may be announced today but not apply to next week's exam. A law can be published, commenced, amended and interpreted on different dates. Math assertions do not establish legal applicability.

## 5. Highest-value behavior for learners and users

Example: an issuer changes an exam objective. SEEKER detects a document fingerprint change; a reviewer identifies the actual changed objective, version and effective date; approved claim revisions enter the temporal store. A coverage map identifies affected lessons, quizzes and practicals. FORGE proposes an original exercise in an isolated branch. Independent tests and educator review precede a controlled content release. The learner sees a short change note and relevant new exercise, not a silent deletion of their old course or a claim of instant mastery.

Measure: grounded answer correctness, citation support and effective-date accuracy; success at previously unseen practical tasks; learner retention after delay; translation quality by task/language; recovery time; p95 latency measured under target devices/networks; and total cost per successfully completed task. Do not optimize time spent chatting or emotional dependence.

The companion's private memory and the public knowledge corpus remain separate. No private chats, photos, IDs, errors containing secrets, or raw click streams are automatically used for public retrieval or training. Philosophical guidance should support humility, agency, constructive action and community benefit without becoming religious/ideological coercion.

## 6. Not yet implemented / deployment blockers

1. Production scheduler/queue, multi-instance leases, trusted content snapshots, robots/terms controls and hardened egress.
2. Persistent bitemporal schema and embeddings/graph retrieval with tenant/ACL tests, backup/restore, source retractions and citation entailment review.
3. Independent CI attestation verification, signed release manifests, approved reviewer identity, sandboxed generated tools, rollout controller and measured rollback.
4. Paid exact-model benchmark runs and real budget reservation reconciliation; no automatic provider upgrades or new billing.
5. DPO fine-tuning, CRDT replication, production multimodal extraction/confirmation, comprehensive privacy governance and real WhatsApp/USSD agreements.
6. Academy UI live-radar wiring after approved backend storage/read contracts. PR #481 and all older tools remain unchanged by this change.

Treat <5 ms graph changes, <15 ms prefetch, <50 ms rollback and <40 KB deltas as measurements to investigate for a defined workload, not guaranteed product claims. No claim of 'zero hallucination', 'zero staleness', '#1 model every week', 'tamper proof', 'zero PII' or universal intelligence is made.

## 7. Operator use

From repository root, use a disposable output directory. Do not load generated code into the production web process.

```sh
mkdir -p /tmp/luqi-epistemic-build
printf '{"type":"module"}\n' > /tmp/luqi-epistemic-build/package.json
node node_modules/typescript/bin/tsc --strict --skipLibCheck --target es2022 --module es2022 --moduleResolution bundler --lib es2022,dom --outDir /tmp/luqi-epistemic-build api/services/epistemic-policy.ts api/services/epistemic-probe.ts
LUQI_EPISTEMIC_BUILD_DIR=/tmp/luqi-epistemic-build node --test tests/epistemic-frontier.test.mjs
node scripts/epistemic-radar.mjs --build /tmp/luqi-epistemic-build --state /tmp/luqi-radar-state.json
```

The last command is plan-only. After source-access and egress review, the same command with `--fetch` makes bounded public GETs and persists observation metadata. No production schedule is installed by this PR. Protect the state directory against untrusted writers and symlinks; do not expose this developer CLI as an internet endpoint.

## 8. External research used for corrections (not claims from the owner's document)

- OWASP SSRF Prevention: exact allowlists, redirects and DNS/egress defenses: https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html
- OWASP LLM Prompt Injection Prevention: remote content and RAG poisoning; layered controls, not guaranteed immunity: https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html
- Microsoft GraphRAG indexing overview: entities, relationships, claims, summaries and vector embeddings: https://microsoft.github.io/graphrag/index/overview/
- Microsoft GraphRAG getting started: indexing cost and starting small: https://microsoft.github.io/graphrag/get_started/
- Rafailov et al., Direct Preference Optimization: preference-based model training: https://arxiv.org/abs/2305.18290
- arXiv's own description: submissions are not peer reviewed by arXiv: https://info.arxiv.org/about/index.html
- Information Regulator, conditions of lawful processing and security safeguards: https://inforegulator.org.za/knowledge-base/category/popia/chapter-3-conditions-for-lawful-processing/part-a-processing-of-personal-information-in-general/
- National Treasury POPIA information: https://ocpo.treasury.gov.za/POPIA/default.aspx
- WhatsApp Business pricing: https://whatsappbusiness.com/products/platform-pricing/ and FAQ https://whatsappbusiness.com/resources/faq/ . Retrieved pages differ on some service-message details; no rates are encoded. Verify applicable current contract/rate card before channel activation. Neither page establishes carrier zero-rating for Luqi.
