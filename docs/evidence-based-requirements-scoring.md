# Evidence-based requirements scoring standard

Status: audit methodology only; NOT a production acceptance or feature-completion claim.
Approved weighting: code 30%, automated/device tests 25%, verified live production 25%, security/operational readiness 20%.

## Unit and denominator
One distinct owner-requested, testable capability is one requirement. Preserve the original requested scope and later additions. Record each requirement with stable ID, owner request, acceptance criteria, source issue(s), source paths, and dependencies. Do not delete, merge away, or silently exclude outstanding requirements. Mark duplicate descriptions as aliases of one canonical requirement with traceability.

## Evidence ledger schema
| ID | Requirement | Code SHA / paths | Code (0/1/?) | Test run + exact SHA | Tests (0/1/?) | Live deployment + customer-path proof | Live (0/1/?) | Security / operations evidence | Ops (0/1/?) | Score | Unknown weight | Blocker / owner |

A dimension earns full weight only with directly relevant positive evidence; a documented failure earns zero; missing/inaccessible evidence is unknown (?). A CI green on unrelated paths is not feature acceptance. A successful Railway deploy is not a verified customer journey. Vendor features, demos, mock responses and synthetic policy tests are not proof of live integrations. A security checklist alone is not sign-off.

For each requirement, confirmed points = 30*C + 25*T + 25*L + 20*O, counting only confirmed 1. Unknown weight = sum of weights for ?. Report score as a bounded interval [confirmed points, confirmed points + unknown weight], not a single percentage when unknown exists. A confirmed 0 stays 0 in both bounds. Report requirement-level results, coverage, blockers and an aggregate only when the complete owner requirement inventory is reconciled. Aggregate bounds = arithmetic mean of requirement bounds (equal requirement weighting); state denominator and exclusions. Do not treat missing evidence as zero, or use provisional 2/10 ratings as measured completion.

## Evidence gates
- Code: merged default-branch source at identified SHA with functional route/service; draft PR code is 'proposed', not shipped.
- Tests: relevant passing exact-head CI plus integration/physical-device evidence where the requirement needs hardware.
- Live: canonical production SHA/deployment and successful customer-path acceptance with date, environment and observed result.
- Ops: feature-specific authorization, privacy, recovery, observability and operational/merchant requirements verified; no secrets in evidence.
- Safety: never activate physical gate control without manufacturer authorization, physical safety validation and explicit owner approval; never enable live billing before merchant acceptance.

## Starting audit references (not exhaustive)
- LUQI: issues #510 (release inventory), #550 (Companion), #360 (Business Connect), #349 (Tender), #381 (security), #439 (pilot).
- KayaGuard: issues #1 (evidence scan), #17 (merchant), #25/#26 (commercial readiness), #43 (device compatibility).

## Next evidence collection
1. Reconcile all owner-requested features to canonical IDs and GitHub issues/code.
2. Capture exact default-branch SHA, relevant CI runs, production SHA and acceptance for each.
3. Classify each dimension 1/0/? with source link and verification timestamp.
4. Publish bounds, not invented exact percentages, until the inventory and evidence are complete.
