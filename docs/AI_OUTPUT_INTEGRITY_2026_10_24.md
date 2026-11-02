# Provider output integrity — 24 October 2026

## Defect and selected policy

The budgeted gateway previously accepted a nonempty Gemini SDK `.text` value,
or flattened OpenAI content, without checking the provider's terminal status.
An unfinished, filtered or otherwise unverified payload could be presented as a
successful answer. This is a source/fixture finding, not evidence of a real
customer receiving one.

The text-only pilot now requires Gemini `STOP` and a single model text candidate,
or OpenAI completed response/message status and assistant output-text parts.
Reasoning metadata is ignored. Tool/media parts, malformed responses, absent
completion markers, empty text and conflicting metadata are not accepted.
OpenAI JSON is read with a 128 KiB decoded-body cap; the Gemini SDK still handles
its own transport decoding before the candidate contract is evaluated.

Provider-declared refusal/filtering is terminal (`AI_RESPONSE_BLOCKED`).
Token-limited or continued output is terminal (`AI_REPLY_INCOMPLETE`); unfinished
text is withheld rather than advertised as a complete answer. Unknown or
malformed output is `AI_RESPONSE_INVALID`. These outcomes neither try another
provider nor trigger automatic continuation. Ordinary transport failure and
provider-budget exhaustion retain the existing independently reserved fallback.
No content-filter settings, provider models, 512-token output cap, daily quota,
$100 monthly allocation, $60/$40 split or reservation accounting are loosened.

The HTTP endpoint uses fixed messages and no-store responses (422 for a provider
block, 502 for incomplete/invalid output). Both frontend trees explain the outcome,
retain the editable question and warn that the attempt may still count. They do
not display provider diagnostics or partial text and do not resubmit automatically.
A user can deliberately edit and send a new question; that is another metered
attempt. A completed reply is not a guarantee of factual accuracy.

## Primary specifications reviewed

- Gemini generate-content candidate finish reasons and prompt feedback:
  https://ai.google.dev/api/generate-content
- OpenAI Responses status, incomplete_details and output/refusal items:
  https://developers.openai.com/api/reference/resources/responses/methods/create

## Verification and rollout

The local dependency-free suite passed 67 synthetic tests. CI repeats them,
checks actual installed Gemini SDK mapping with mocked HTTP, proves terminal
outcomes do not reserve or call OpenAI, retains the original outage-fallback,
timeout, budget and complete-input tests, verifies HTTP/client redaction and
compiles the production API plus both pages. New desktop/mobile Chromium browser
cases exercise all three messages at 320px with synthetic authentication and
API replies; they do not create accounts or spend provider credit.

No paid production inference is scheduled by this workflow. Final-head CI and
exact-revision public-release verification are required before claiming the patch
live. The earlier real Gemini acceptance is historical evidence, not a new
post-change provider test. OpenAI live inference and billing reconciliation remain
separate launch gates. Record actual rollout evidence in continuation hub #202.

No production DB schema/data/account write, credential rotation, DNS operation,
new infrastructure, customer-payment activation or autonomous-worker enablement
is part of this change. Human/support acceptance, historical credential review,
production-derived isolated restore and merchant setup remain open.
