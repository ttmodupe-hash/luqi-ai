# Knowledge Gap & Guided Retrieval Policy — v1.0.0 (2026-09-20)

STATUS: ACTIVE. Adopted from the founder's `system_policy_patch` directive
(Knowledge Retrieval & Transparency module) after guardrail review.
Applies to: the OMEGA-LUQI engine (`omega-super-ai`) and every LUQI surface
that answers knowledge questions.

## The rule

LEGACY (retired): knowledge gap detected -> acknowledge the limit -> direct
the user to verify elsewhere. A static dead end.

ACTIVE: knowledge gap detected OR guidance required ->
  1. ACKNOWLEDGE — transparently signal the information boundary
     (confidence numbers, missing sources, unknowns are stated, never hidden).
  2. RESEARCH — offer/route into proactive retrieval (`POST /v1/deep-research`:
     query planning -> real retrieval -> synthesis WITH citations).
  3. GUIDE — incorporate the user's own hints (`context_hint`) back into
     retrieval so refinement actually changes what is retrieved.

Guiding principle: no static dead ends. An answer engine retrieves complete,
verified information when properly guided and routed.

## Guardrail review (binding constraints on the adoption)

The directive was reviewed against house law before adoption. It is adopted
WITH these constraints — they are not optional:

1. ANTI-HALLUCINATION LAW IS UNTOUCHED. If retrieval returns zero verifiable
   sources, the output stays labelled UNVERIFIED via the citation contract.
   "No dead ends" means there is always a next ACTION — never that the engine
   answers anyway from memory. (core/deep_research.py, core/citations.py)
2. COST GUARD IS UNTOUCHED. Proactive research never fires paid calls from
   public zero-cost surfaces. The hybrid front door (core/hybrid_ai.py) only
   OFFERS the route; research runs on opt-in. LLM synthesis flows through the
   unified Kimi client where spend is fail-closed at MONTHLY_TOKEN_BUDGET_USD
   (80% alarm, hard-stop 429 before money moves).
3. CITATIONS OR SILENCE. Every researched claim cites a real retrieved source
   (OpenAlex / Crossref / PubMed / arXiv). No invented citations, no
   unsourced "research". (House law: show we do not hallucinate.)
4. MONEY PATHS ARE OUT OF SCOPE. This policy governs knowledge retrieval and
   transparency only. The 30% human gate, single-path ledger, and fail-closed
   settlement are unaffected.

## Implementation map (what changed in the tree)

| Surface | File | Change |
|---|---|---|
| Engine - retrieval | `core/deep_research.py` | `context_hint` on `DeepResearchRequest`, folded into `plan_query` as a real sub-query; `guided: true` reported; zero-sources response now names the guided next action |
| Engine - front door | `core/hybrid_ai.py` | Phase 3 confidence gate: static dead-end question replaced by guided escalation payload (transparent boundary + research route + hint request); still zero-external-cost |
| This policy | `docs/KNOWLEDGE_GAP_POLICY.md` (luqi-ai) | Single source of truth for the rule |

## Verification contract

- Engine modules compile clean (py_compile) before every push; pushes are
  byte-verified against the raw tree.
- Behaviour is real only when the tree shows it: `/v1/deep-research` accepts
  `context_hint`; `/v1/hybrid/process` below-gate responses carry the
  `escalation` block.
- Live verification (post-deploy): a below-gate hybrid request returns the
  escalation payload; a deep-research call with a `context_hint` returns
  `"guided": true` in the plan.
