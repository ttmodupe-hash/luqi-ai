# Africa-context evaluation protocol

The seed cases in `evals/africa-learning.seed.json` are illustrative examples, **not a completed benchmark**. No score can be inferred from them. The current release gate is a library function, not yet a CI deployment blocker.

## Dataset expansion
- Recruit educators, language specialists, accessibility reviewers and vocational trainers from multiple African regions.
- Obtain consent, provenance and licensing for each contributed case. Do not put real learner records or private memories in test prompts.
- Include varied African languages, dialects, urban/rural bandwidth contexts, disability accommodations, educational stages and vocational domains.
- Separate public development cases from held-out evaluation cases. Keep adversarial cases reviewed and versioned.
- Require multiple reviewers and record disagreements; report results by language and domain, not only a pooled average.

## Evaluation workflow
1. Freeze candidate model, system policy, tools and retrieval corpus versions.
2. Run model outputs in a non-production sandbox with strict request and cost caps.
3. Score factual accuracy and math with reference answers where possible; use qualified human reviewers for nuance, cultural appropriateness and pedagogical effectiveness.
4. Evaluate safety, prompt-injection resistance, privacy, uncertainty calibration, learner agency and practical learning outcomes.
5. Record sample counts, confidence intervals, regression comparisons and critical incidents.
6. Require human release approval; unresolved critical failures block promotion.
7. Connect the typed gate to CI only when the scoring pipeline produces verifiable, signed or access-controlled reports. Never allow user-supplied or self-reported model scores to authorize deployment.

## Release note
The numerical gate thresholds are provisional. No Gaokao-inspired benchmark has yet demonstrated that Luqi-AI meets them. Production promotion requires independent validation and an auditable approval trail.
