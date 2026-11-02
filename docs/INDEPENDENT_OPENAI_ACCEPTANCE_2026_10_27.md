# Independent production OpenAI acceptance — 27 October 2026

## Why the previous test was insufficient

Run [40465090272](https://github.com/ttmodupe-hash/luqi-ai/actions/runs/40465090272)
verified one complete authenticated Gemini answer against production `f1240c04`.
The default gateway uses Gemini first and OpenAI only after a transport failure
or Gemini budget exhaustion. Repeating that success cannot verify OpenAI.

## Bounded verification pathway

- The ordinary authenticated `POST /api/v1/luqi-core` optionally accepts
  `provider: "openai"`. Other provider values, models, endpoint overrides and
  account IDs are rejected by the strict input schema. The existing browser
  Chat continues using its default Gemini-first behavior.
- Explicit OpenAI mode skips Gemini entirely, uses the same configured OpenAI
  model and output validation, and performs one transport attempt after its
  own durable reservation. It never silently substitutes Gemini.
- Both approval flags, the exact approved allocation profiles, the monthly
  provider caps, the 20-attempt daily account limit, the 512-token output limit
  and the 20-second provider deadline remain enforced. The current approved
  application profile is USD300: Gemini 165, OpenAI 135. Application reservations
  do not establish provider-side hard caps or invoice reconciliation.
- The existing audited synthetic production script accepts
  `LUQI_ACCEPTANCE_PROVIDER=openai` and verifies both an exact unique challenge
  and the returned provider identity. A Gemini answer cannot pass it.
- A production run must pin the observed deployed commit, execute once on a
  dedicated branch, and refuse reruns. No provider/admin secrets are needed
  in GitHub Actions. A failed, incomplete or lost reply must not be replayed.
- The report contains safe status codes and a reply hash, never passwords,
  tokens, account email, note content or raw generated text. Its own synthetic
  notes are removed and the account password randomized to revoke sessions;
  the inert account and budget/throttle counters remain for accounting.

## Customer acceptance boundaries

Registration, login, password changes and owner-scoped notes have a previous
real HTTP acceptance result. Browser fixtures separately exercise the shared
login across Chat and tools, session expiry/sign-out, previous-answer retention,
readiness recovery and refusal to replay an uncertain inference. Browser
fixture replies are not live provider evidence.

The shared login is held in memory for the current tab. A full reload requires
sign-in again and clears unsaved conversations. Recent Chat is not durable
cross-device history. Password recovery is assisted-only; the public contact
page has no verified private support address. Automated mobile/WebKit checks
do not establish physical-phone usability or suspended-app behavior.

An independent OpenAI success, if obtained, establishes one more controlled
production result. Sustained reliability, real-device acceptance, private
support/recovery, production-derived restore acceptance and provider billing
reconciliation remain separate requirements. Payments remain outside this work.
