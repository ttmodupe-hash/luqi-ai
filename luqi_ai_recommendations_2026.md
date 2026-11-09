# LUQI-AI architectural recommendations — KHORO-QUANTUM-V18

Revision: 6 November 2026. Scope: the quantum/PQC addition to the existing LUQI
platform. This is a verified implementation specification and migration plan,
not certification of the other capabilities advertised by a supplied prototype.

## Architectural decision

Keep the existing application, account/session system and routes. The production
repository uses `src/App.tsx` and a mirrored packaged frontend, not a standalone
`App.jsx`. Add a lazy `/quantum-lab` route and a Study Desk Track 7 link. Do not
replace the whole platform with the 3313-line pasted demonstration.

Source reviewed: `Pasted text(3).txt`, SHA-256
`6a7d184e5eee2f4166c674b57a8950002ee8e5eacdb1ab41fb4e4bc33791591d`.
The original input remains unmodified. Its `computeDeterministicSha256Hex` is
not SHA-256, its `pqcSealHex` does not perform lattice cryptography, and its QAOA
probabilities/fuel savings are assigned constants. They must not protect records
or be presented as measured outcomes.

No new paid API, quantum-cloud account, GPU service, background agent or budget
increase is required for this educational addition. Computation is local after
assets load; complete offline asset availability is not guaranteed by that fact.

## Five capabilities and their actual scope

| Capability | Implemented behavior | Explicit boundary |
|---|---|---|
| Two-qubit statevectors | Complex H, X, Rx, Rz, CX and CZ gates; Bell state; selectable Grover oracle and repeated diffusion; probabilities, concurrence and reduced-state entropy | Classical floating-point simulation, not a QPU or fault-tolerant hardware |
| FIPS 203/204 algorithms | Isolated ML-KEM-1024, HKDF-SHA384/AES-256-GCM and ML-DSA-87 experiment on the fixed public message `abc`; real tamper checks and SHA-256 vector | Not a FIPS-validated module, production archival seal or completed classical/PQ hybrid migration |
| QAOA/Ising | Calculated p=1 cost evolution and X mixer, bounded parameter grid, exact small classical comparison; local route and project-allocation references | No fabricated fuel gains, large-problem optimum guarantee or demonstrated quantum advantage |
| Surface-code estimates | Ideal rotated-patch counts and a clearly conditional below-threshold scaling model for odd distances 3–13 | Not a decoder simulation, measured suppression factor or hardware-resource certification |
| Track 7 academy | First-principles lessons, source links, bounded Mzansi analogies, OpenQASM 3 export and a local Qiskit example | No executed shell commands, automatic cloud jobs, formal language-quality certification or instant qualifications |

## Statevector and circuit contract

Basis labels are `|q(n-1)...q0>`; qubit 0 is the least significant index bit,
matching Qiskit's common statevector convention. UI circuits use four complex
amplitudes ordered `|00>, |01>, |10>, |11>`. All gates derive their amplitudes by
linear operations, with input normalization and finite-number checks.

Bell preparation is H(q0), CX(q0,q1), followed by optional Rz(theta) on q1.
Rz applies both diagonal phases exp(-i theta/2), exp(+i theta/2). It preserves
basis probabilities and Bell concurrence, while changing relative phase.

Grover uses a phase flip on a chosen marked basis state and diffusion
`2|s><s|-I`. One marked item among four has ideal success probability one after
one iteration. Further iterations can lower success. The exported OpenQASM
accounts for the diffusion decomposition's global sign with `gphase(pi)` and
exports the selected iteration count. General query complexity O(sqrt(N)) does
not imply a classical simulator runs in sublinear time or removes oracle costs.

Measurement Shannon entropy and pure-state entanglement entropy are separate.
For H⊗H|00>, measurement entropy is 2 bits and entanglement entropy is 0; for
an ideal Bell pair both are 1 bit. Concurrence uses 2|a00*a11-a01*a10|.

## Optimization contract and South African use cases

`HC = sum Jij ZiZj + sum hi Zi`, with classical spins zi∈{-1,+1}. The simulator
constructs exp(-i gamma HC)|+...+>, then exp(-i beta sum Xi). It reports expected
energy from the resulting probabilities. A finite gamma/beta grid compares
computed points; it is not a proof of a global variational optimum.

Bounded exact baselines provide a real comparison:

- Two-feeder load partition: 2–6 positive loads (at most 100 kW each), identical
  feeders, indivisible simultaneous loads, no capacity constraints or losses.
  With total W, Jij=2wiwj/W² and constant=sum wi²/W². Restoring that constant
  gives squared imbalance/W². A result is a model allocation, not an electrical
  installation design, measured energy saving or load-shedding forecast.
- Logistics: 2–7 stops, depot 0, a supplied finite nonnegative cost matrix, one
  visit per other stop and return to depot. Enumerates depot-fixed tours. Real
  use needs verified travel costs and additional time/capacity/safety constraints;
  the default numbers are illustrative rather than actual SA road distances.
- SMME capital: up to eight projects in the engine, three editable UI examples.
  Uses integer cents and supplied priority weights to maximize total priority
  within the budget. Priorities are not promised financial returns; no money moves.

The statevector engine is bounded to eight qubits. This prevents an educational
control from requesting unbounded exponential memory or computation.

## Surface-code contract

An ideal rotated planar patch uses d² data qubits and d²−1 syndrome ancillas:
17, 49 and 97 total patch qubits for d=3,5,7. Full hardware needs additional
routing, control, logical operations and possibly magic-state resources.

The input ratio Lambda=pth/pphys is calculated from user assumptions; it is not
an independently measured experimental suppression factor. The displayed
`pL ≈ 0.1 (pphys/pth)^((d+1)/2)` is an illustrative scaling approximation only
below the assumed threshold. At or above threshold, the lab refuses a logical
error prediction. Thresholds/prefactors depend on noise model, syndrome cycles,
layout and decoder; they are not universal constants.

## Cryptography implementation and isolation

Pin `@noble/post-quantum` 0.7.1 and its exact lockfile dependencies. Import the
actual `ml_kem1024` and `ml_dsa87` implementations in a dedicated module worker,
only on an explicit user action. The maintainer reports self-audit and test-vector
coverage, but not an independent security audit. Do not describe it as certified.

The fixed public experiment:

1. Generate fresh ephemeral ML-KEM and ML-DSA keys with a CSPRNG.
2. Encapsulate and decapsulate a 32-byte shared secret; check agreement.
3. Derive nonextractable AES-256-GCM keys with domain-separated HKDF-SHA384.
4. Encrypt/decrypt `abc` using a fresh 96-bit IV, random salt and authenticated
   suite/KEM metadata. Sign the complete fixed-layout binary envelope with ML-DSA.
5. Verify the original signature. Reject altered signatures and envelope bytes;
   fail AES authentication for modified ciphertext and a wrong KEM-derived key.
6. Compute actual Web Crypto SHA-256 of `abc` and compare with the known vector.
7. Return booleans, algorithm byte sizes and the public hash only. No private key,
   shared secret, ciphertext or signature is sent to the UI or persisted.

The worker accepts one fixed command and no uploaded record, secret seed or key.
Cancellation/unmount terminates it; timeouts and malformed responses fail closed.
Best-effort clearing of secret arrays is not a secure-erasure guarantee in JS.
Keys are not account identities and have no trusted external binding in this lab.

ML-KEM is key encapsulation, not a digital signature; ML-DSA is the signature
scheme. The experiment is KEM-DEM plus signing, not a claimed classical/PQ hybrid
standard. Algorithm names and security assumptions must not be reduced to an
unpickable "1024-dimensional lock" analogy. Review current NIST errata before
production evaluation. A conforming algorithm and CMVP/FIPS module validation
are different statements.

## Production archive and Stokvel migration: required follow-on gates

### 6 November 2026 implementation checkpoint

The owner subsequently requested activation. A separate **local encrypted text
archive pilot** is now implemented for release at `/archive` and `/vault`, with
fresh hybrid keys and both signatures, separately passphrase-encrypted recovery
custody, downloads and verified reopen. The browser worker implements the same
envelope suite; native interoperability tests verify the saved trust/digest
boundary. This accepts new standalone text copies only, requires no login or
paid service, and does not upload data or migrate stored/cloud/Stokvel records.
The interface states the unaudited/FIPS-unvalidated pilot scope. See the dated
runbook below for key-loss, file-retention, privacy and verification limits.

An isolated migration foundation now exists in `api/security/pqcArchive.ts`:
the pinned ML-KEM-1024/P-384 draft hybrid preset, HKDF-SHA384/AES-256-GCM,
mandatory ML-DSA-87 **and** ECDSA-P384 signatures, external trusted keys,
owner/record/revision/chain-head binding, canonical envelopes, retired/revoked
key policy and verified restoration of bounded record copies. Regression checks
exercise actual encryption, tamper rejection, stale replay, rotation, exact
legacy-byte preservation and absence from the live server import graph.

**This helper is not connected to production routes or storage.** The legacy
shared cloud archive is still unavailable; no active Stokvel ledger was found in the current
inventory. The existing JavaScript PQC library explicitly lacks an independent
audit and constant-time guarantee. No runtime key, private record, provider flag,
spending limit or database schema is changed. Independent review, actual key
custody/recovery, account-owned persistence and copy-first migration/restore
acceptance remain outstanding. See
[`docs/PQC_ARCHIVE_MIGRATION_2026_11_06.md`](docs/PQC_ARCHIVE_MIGRATION_2026_11_06.md)
for the concrete threat model, format, tests and remaining release criteria.

### Production release criteria

This feature changes no stored chain, account key, database schema, signing root,
TLS setting or financial record. Protecting every archival/financial record
requires a separate threat model, migration and recovery design:

- Inventory existing encryption/signing dependencies, retention periods and
  harvest-now/decrypt-later exposure. A hash chain alone supplies neither secrecy
  nor a trusted signing identity; anchoring and rollback detection need design.
- Select a reviewed classical/PQ hybrid key-establishment protocol and specified
  combiner, including transcript/key/ciphertext binding and downgrade resistance.
  Do not invent a concatenation-based protocol or mislabel draft hybrids as final
  NIST standards. Identify whether a FIPS-validated module is actually required.
- Choose audited/validated implementations and interoperable known-answer tests;
  assess performance, supported runtimes, deployment size and dependency updates.
- Define trusted public-key distribution, private-key custody/HSM or KMS boundaries,
  rotation, revocation, signing authorization, loss recovery and incident response.
- Specify a versioned, domain-separated, canonical record/envelope format and
  authenticated metadata. Verify signatures/authentication before publishing
  decrypted data. Require the intended hybrid verification policy explicitly.
- Test new/old record readability, backup restoration, incomplete migration,
  tampering, replay and concurrent updates on an isolated copy of representative
  data. Preserve historical verification keys and reject silent downgrade.
- Obtain a separate owner release decision for production key/data migration and
  discuss any paid KMS/HSM/compute cost before increasing spend or delaying work.

Until those gates pass, the UI must not state that all LUQI/Stokvel archives are
post-quantum protected, immutable, legally compliant or non-repudiable.

## Track 7 curriculum and language approach

`TRACK_QUANTUM_PQC` covers complex amplitudes/Born probabilities, Bell correlation
and no-signalling, Grover query complexity and over-iteration, Ising/QAOA versus
classical baselines, Shor versus Grover, KEM versus signature versus hash, and
surface-code assumptions. Each lesson supplies first-principles text, a bounded
local analogy, and a primary reference. Local phrasing is an aid, not a certified
Sepitori translation; fluent educator review is needed for a full language pack.

The Qiskit example uses QuantumCircuit and Statevector locally. OpenQASM is an
inspectable/downloadable circuit, not an executed command. Lesson completion
must never be marked solely because code was displayed. Experiments download as
`KHORO-QUANTUM-V18-LAB-v1` JSON with explicit implementation/assumption labels.
PQC experiment flags concern only `abc`, not a signature over the notebook itself.

## Verification and release evidence

Candidate code lives in `src/features/quantum/` with a mirrored packaged frontend.
Tests check analytical Bell/Rz/Grover values, normalization, entanglement versus
measurement entropy, analytical one-edge QAOA expectations, exact reference
minima, bounded input rejection, rotated-patch counts, real PQC/AEAD tamper checks,
worker result validation, cancellation, and no automatic network requests.
Browser acceptance uses the real worker on desktop and mobile and inspects the
exported notebook. These are software checks, not quantum hardware benchmarks,
cryptographic validation certificates or proof of general quantum advantage.

The release must pass the exact candidate's required CI, dependency audit,
production build and browser checks. A merged PR is distinct from a verified
production deployment; only report live status after observing the release.

## Primary references

Reviewed 6 November 2026:

- NIST FIPS 203: https://csrc.nist.gov/pubs/fips/203/final
- NIST FIPS 204: https://csrc.nist.gov/pubs/fips/204/final
- NIST PQC: https://csrc.nist.gov/projects/post-quantum-cryptography
- OpenQASM 3 gates/global phase: https://openqasm.com/language/gates.html
- IBM Grover iterations: https://quantum.cloud.ibm.com/learning/en/courses/fundamentals-of-quantum-algorithms/grover-algorithm/number-of-iterations
- Farhi, Goldstone & Gutmann, QAOA: https://arxiv.org/abs/1411.4028
- Fowler et al., surface-code review: https://arxiv.org/abs/1208.0928
- Noble implementation/security notes: https://github.com/paulmillr/noble-post-quantum


## Chat intelligence workflow — 6 November 2026

Add task-aware instructions to the existing budgeted Gemini/OpenAI text path.
The approaches are Auto, Teach, Plan, Compare, Review and Draft. Signed-in Chat
exposes the selection under More options; the embedded AI form also exposes it.
The guest introduction uses the automatic policy with its shorter answer limit.
These are answer preferences, not newly trained model weights, autonomous agents,
a higher-priced model selection, a quality score or proof of expert correctness.

A strict enum crosses the authenticated HTTP boundary; arbitrary policies, model
IDs, tools, credentials and spending overrides are not accepted. The server adds
only its own approach instructions. The browser requires confirmation of an
explicit requested approach in a completed response. Invalid or ambiguous results
are not replayed automatically. Default requests remain backward compatible.

The guidance asks for the actual goal, supplied constraints, necessary workings,
assumptions, uncertainty and a useful next step. It does not grant browsing,
research, verification, attachment access or real-world execution. Any review
is model-generated assistance, not certification. Human checking remains needed.

Conversation sharing remains optional and previewable. Up to four messages,
350 UTF-16 code units each, use literal beginning/end excerpts when necessary;
[middle omitted] marks the gap. Nothing invents a summary of that gap. Surrogate
pairs are preserved. Full input still fits the existing 6000-character ceiling.
Notes and country context keep their separate approvals. Response approach resets
on a different account, chat switch, New chat and sign-out; it is not hidden memory.

Provider enablement, billing approval, models, reasoning settings, token ceilings,
daily quotas and monthly provider caps are unchanged. No extra reasoning, judging
or agent calls are added. The existing independently reserved fallback still
applies. The added instructions use tokens within existing reservations; a
reservation is not an external invoice cap. Token counting includes the complete
guest system instruction in the expanded guest profile.

Validation covers strict approach input, both actual SDK/HTTP request shapes with
synthetic provider replies, reservation-before-call, fallback scope, response
confirmation, literal context excerpts, Unicode boundaries, privacy and mobile
controls. Transport/browser fixtures do not benchmark live model answer quality;
no paid production inference is needed to validate these code boundaries.


## Tool 022 — six-workstream implementation (2026-11-08)

The six roles are implemented as user-controlled local workstreams, not six autonomous professionals or a claim of 5–15 years of experience. The user's latest six-role specification is part of this release scope and must remain in future upgrades.

| Workstream | Implemented | Boundary / next step |
| --- | --- | --- |
| S1 Product & PM | Editable PRD, bounded Fibonacci backlog, capacity-based proposed sprints, Given/When/Then, unresolved RAID, JSON export; exact-cent ZAR contribution, break-even, revenue/profit scenario | No invented velocity, delivery date, completed work or guaranteed demand; user supplies assumptions |
| S2 Design | Calculated sRGB contrast for four token pairs with >=7:1 export gate; Georgia/system fonts, 8px spacing, >=48px studio controls, reduced-motion CSS and escaped product preview | Color checks are not whole-site AAA certification; no promised 60 FPS |
| S3 Engineering | Typed references plus a bounded executable unit-economics draft workflow: confirmed idea/contract, local reference or consented AI draft, actual QuickJS/WASM tests, human acknowledgement and source-bound export | References remain unexecuted. Executable workflow is a pure synchronous JS function, not autonomous whole-app development, deployment or production approval |
| S4 Security | Real Babel JS/TS syntax-tree pattern inspection in a bounded cancellable worker; separately labelled Python/SQL/network text patterns; source-free findings export | No complete OWASP/SSRF/data-flow audit, POPIA certification, zero-PII guarantee or fabricated CVSS. ML-KEM encapsulates; ML-DSA signs. No automatic PQ signing |
| S5 Network | Strict IPv4/subnet calculations including /31 and /32; existing bounded VLSM and CSV; read-only Cisco references; Telnet/MD5/type7/broad ACL prompts | No device queries, config pushes, WireGuard tunnel, firewall or eBPF filter activation; no claimed line rate |
| S6 Compute | Actual nested/Set generated integer membership implementations, verified equal results, operation counts and browser timing; decimal token-cost/FX/budget scenarios | No GPU/SIMD/HPC/quantum execution or fixed speedup; Set workload is expected O(n+m), not O(1) total |

### Three resource tiers and budget decisions

1. **Local studio**: current browser, bounded workers and opt-in exports. This change introduces no additional paid service. Local calculations and references stay in page memory with no provider call. The executable draft extension below adds a separately consented AI option. Account changes clear private drafts and terminate workers before paint.
2. **Managed AI delivery proposal**: existing authenticated Chat and budget controls remain in force. Obtain dated model/hosting/storage/monitoring quotes, measure actual usage, then supply token rates and FX assumptions. Local-share defaults to zero and is never assumed to be 80%. The cost worksheet is not metering or a runtime cap.
3. **HPC/GPU research proposal**: identify a measured bottleneck and bounded benchmark; assess GPU/region/storage/queue/backup resources and obtain a workload-specific ZAR quote. Do not provision or increase budgets without notifying the user and receiving authorization for that spend.

No fabricated monthly ZAR prices or live-plan labels are used. User wants notice before cost causes any delay, and fast deployment of tested improvements. These local workstreams do not require a budget increase. Provider flags, caps, secrets, authentication and existing services are unchanged.

### Input provenance and rejected claims

Integrated ideas from `Pasted text(4).txt` (SHA256 `ab8303be9e31f1f29628d5e3c76b53dbf4a55325bb249099ff65083db83dd8ea`) and `Pasted text(5).txt` (SHA256 `a2f15a5be6794987387e37ba9e48f07824ceb86a414e753f1a380a365348de74`). These prototypes are requirements evidence, not trusted production code. Their placeholder hash, browser provider call, canned auto-fix, invented security/completion scores, debt-prescription conclusion, fake DDoS/packet metrics, static contrast and fixed FX/savings claims were not adopted. Existing Quantum/PQC and Archive pilots retain their stated limits.

Tool 022 is lazy-loaded at `/devsecnet` (alias `/tool-022`), listed in the workspace, and reachable through specific local intent phrases after urgent/rights routing. Tests cover real parser findings, safe/comment cases, malformed syntax, source-free boundaries, forged worker responses, cancellation/timeout/account changes, exact decimal costs, planning limits, contrast and browser worker execution. Release approval is limited to the tested website feature; it is not legal/security certification or approval for new paid infrastructure.

## Tool 022 — executable draft workflow (2026-11-08)

The S3 Engineering panel now supports one complete, deliberately bounded workflow: confirm an idea and the fixed integer-cent unit-economics contract; author code or load the explicitly labelled local reference; run the real interpreter tests; review the source and observed results; acknowledge human review; export the unchanged source, fixed cases, report and provenance in a ZIP. Source edits invalidate results and approval. SHA-256 binds the exact source; it is not an artifact signature or certification.

Optional AI drafting uses the existing authenticated `askPilot` gateway and `draft` response approach, only after specific per-request consent. The exact prompt is previewable; no private notes, saved history, source code or account profile is automatically attached. Malformed replies are unexecuted text and do not trigger automatic paid retries or a disguised local fallback. Existing gateway behavior and independently reserved fallback remain unchanged. No provider flag, billing approval, model, reasoning level, token ceiling, quota, cap or secret is changed. Local references and test execution require no paid AI call.

Guest source executes only in QuickJS compiled to WebAssembly inside a dedicated module worker. No host fetch, network, DOM, storage, process, require, parent messaging, account token or module loader is exposed. Each case gets a fresh runtime/context with an 8 MiB guest heap, 256 KiB stack and a 150 ms interrupt deadline; the UI terminates the worker after 12 seconds or on cancellation. These are guest limits, not a total browser-memory bound or an independently audited sandbox guarantee. Handles, runtime, context, worker and download URLs are disposed. Account changes clear drafts and abort work before paint; stale replies cannot restore another account's data.

The 12 public contract cases cover exact integer arithmetic, ceiling division, losses, zero/nonpositive contribution, upper bounds and invalid inputs. An independent BigInt reference computes expectations outside guest code. Passing known cases does not prove general correctness or security; a draft can overfit them. No guest-supplied pass flag is trusted. Export approval is a local human acknowledgement, without verified reviewer identity, not permission for the product to write repositories, deploy code or act on business finances.

Validation includes the actual interpreter (correct/wrong/syntax/async inputs, CPU interruption, memory exhaustion, state isolation and absence of host APIs), UI request consent/identity/cancellation/report binding, and real Chromium/WebKit worker tests. The QuickJS runtime is lazy-loaded only when tests are explicitly run. A future general-purpose build agent still needs a separate isolated build service, scoped repository integration, broader acceptance tests and a workload-specific cost decision. This release provisions no new paid infrastructure.

Download activation uses a temporary connected anchor with a separate browsing target and no opener/referrer access, preserving the live editor during WebKit download navigation. Browser coverage waits for the actual ZIP to finish, verifies the exported source digest and review record, then edits the still-open draft and confirms approval is invalidated. The new panel wraps long JSON and digests on narrow screens. WebKit runs this focused flow before its unchanged full suite on shard 1; every desktop/iPhone journey, deadline and failure threshold remains in force.

The continued-editing regression selects the exact accessible textbox name. A controlled textarea can add its contents to wrapping-label text used by strict label-text lookup; this is not proof that the editor is absent or uneditable. The browser check retains ordinary editing, download completion, ZIP integrity and approval invalidation without force, retries or relaxed deadlines.

## Civic ward verification and mutation research requirements — 9 November 2026

The new attachment requests are retained as requirements, not claims that autonomous self-improvement or a complete political encyclopedia is live. Tool 016 and Luqi-Drive now share an official-source verification guide covering party statements, contributions, boundaries, election results, current leadership and statutory context. It makes no location-to-ward inference and collects no party preference, ID number or GPS fix. Party manifestos are self-descriptions; independently verified contributions need dated evidence and careful attribution. Every party and independent must face the same standard. Missing evidence remains unknown, not a negative judgment or an invented achievement. Official election results alone cannot identify a current coalition or mayor. Nationwide verified boundary and office-holder feeds, refresh rules and correction handling remain required before live coverage can be claimed.

Mutation research acceptance requirements: generate three separately versioned candidates in an isolated environment; retain a production baseline digest; define at least 100 distinct reviewed assertions across statutory, networking, physics and cryptographic domains; keep assertion provenance, versions and applicability dates; measure actual outputs and repeated latency observations; record failures and uncertainty. A zero-observed-regression result applies only to that suite and environment, not all future inputs. Prompt compression must preserve instruction and consent semantics. AST mutation must never execute in the host process. No fabricated IQ increments, fixed latency/token savings, counters as evidence, automatic live-memory replacement or undisclosed paid calls are acceptable. Promotion requires reviewed test results, staged canary observation and rollback; the current website has no autonomous promotion engine. SHA-256 is a digest, ML-KEM provides encapsulation and ML-DSA provides signatures; a hash or KEM is not a signing scheme or FIPS certification.

The attachments contain a non-SHA-256 mixing function, canned mutation results, fixed performance gains, insufficiently sourced ward/party claims and redaction described as POPIA verification. Those implementations were not adopted. No live-provider setting, budget, model or infrastructure tier is changed.

Official guide sources were retrieved on 9 November 2026: gov.za political-party directory, IEC results portal, Municipal Demarcation Board, Tshwane ward directory, Constitution chapter 2, Municipal Structures Act landing page and AGSA. A guide-link review does not verify every linked record or current council appointment.

Input provenance: Pasted text(6).txt — SHA-256 c908504cf9d167e0e3a1923cf11d9061c3faa37aad22969c061339e2cee6bc0f.

Input provenance: Pasted text (2)(1).txt — SHA-256 ef7a8eac956d1e99fd799378ad6343667cbfaa403654f2736e36ab77172b8050.
