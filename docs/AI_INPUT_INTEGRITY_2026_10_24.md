# Paid text input integrity — 24 October 2026

## Defect

The gateway accepted a question of up to 6000 JavaScript string units, added
language/history/labels, and then sliced the entire formatted input to 6000.
A long question therefore lost its final qualifier without a visible error.
The previous 1400-unit history slice could also remove part of the fourth turn
because role labels and separators consumed additional space. This was a source
and synthetic-test finding; no affected customer request is claimed.

## Repair

The pure `src/lib/pilot-input.ts` contract is used by the HTTP route, gateway,
web client and displayed question counter. The standalone application has an
identical tested copy. Accepted provider input is never shortened or filtered.
Unsupported shapes and excessive combined size fail before provider credentials
are used, a budget reservation is made, or any provider request starts. The HTTP
route returns a fixed no-store 400 error without echoing the submitted content.

The existing total provider contents ceiling remains **6000 UTF-16 code units**.
With default language and no supplied history, its fixed formatting occupies
54 units, leaving **5946** for the question. The browser displays that honest
allowance, retains over-limit drafts for editing, prevents button/form submission
and distinguishes pre-spend validation failure from an ambiguous paid response.
Surrounding question whitespace is trimmed as before by HTTP/client validation;
accepted substantive text, supplied history and Unicode are not sliced.
API callers supplying language/history have a smaller remaining question budget
and must keep the complete formatted input within 6000. The limits remain four
history turns, 350 units per turn and 50 units for language. No private notes or
account metadata are added automatically. This is a string/input bound, not an
invoice estimate or a claim that all Unicode symbols occupy one counted unit.

## Verification and release criteria

31 dependency-free tests cover exact boundaries, overflows, Unicode, malformed
inputs, unchanged history, redacted errors and agreement between frontend trees.
The real Gemini SDK/OpenAI HTTP transport fixtures verify exact transmitted
text and reservations with synthetic responses only; route/client/page tests
verify pre-spend rejection and draft retention. Additional normalization tests
and a desktop/mobile Playwright flow check the complete browser interaction.
The permanent contents-read-only workflow runs offline checks, not paid probes.

Initial isolated validation passed the 31 pure tests, 62 targeted existing/new
Vitest tests and strict production API/both-page compilation. Its first publish
step failed on historical ignored lib paths; no production code was deployed.
The branch-only staging command was corrected without relaxing test thresholds.
Final-head CI, browser/dependency checks, review and exact-revision deployment
verification are required before calling the repair live. Record the result in
continuation issue #202. The temporary fixed-branch edit script/workflow is not
retained in the final release tree.

## Boundaries unchanged

No dependency upgrades, SQL migration, account/record changes, credential
rotation, live inference, new provider, budget increase, payment activation,
worker enablement, DNS or hosting-resource changes are part of this repair.
The approved allocation remains $100/month ($60 Gemini/$40 OpenAI), with existing
reservations, daily limits, fallback controls and output limits unchanged.
Historical credential review, production-derived restore, cost reconciliation,
OpenAI production acceptance, real human/support recovery, domain and merchant
setup, privacy, accessibility and the Six roadmap keep their separate gates.
