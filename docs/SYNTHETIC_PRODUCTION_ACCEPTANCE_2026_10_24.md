# Synthetic production acceptance — 24 October 2026

## Direct evidence

One owner-authorized synthetic HTTP journey ran against the fixed public LUQI
Railway origin. The actual live revision was
`2bb5ac2686d921cebffea246c383bb36e6e92f6e`, verified before the journey,
immediately before inference, and after cleanup.

- Actions run: https://github.com/ttmodupe-hash/luqi-ai/actions/runs/40060232072
- Job: `120771922942`; probe revision: `bd4f848fbbf911f035c4520f9cae05790839e475`.
- Production execution: `2026-10-24T03:54:56.504Z`–`03:55:03.933Z`.
- Result: **22 recorded production checks passed**, after **17 offline safety tests**.

The production journey used ordinary signup and login, not an admin identity,
prebuilt token or direct database access. Synthetic account ID 2 was created.
Notebook/message persistence, known-password change, old-session rejection,
fresh login, note survival across the new session, conversation export and the
complete notes archive all succeeded.

**A real authenticated gateway request returned a Gemini reply** from the
configured `gemini-3.8-flash` model that exactly matched a fresh random challenge.
There was one application-level inference request and no client retry. The
existing server independently reserves any fallback attempt; the successful
Gemini reply returns before OpenAI fallback. This run does not independently
verify OpenAI. No private note/history was included in the provider request.
Only a reply digest and provider/model were retained in the redacted report,
not the raw challenge/reply, account email, password, token or provider key.

## Cleanup and effects

The test's notebook and messages were deleted through the owned API and their
absence verified. A final password change to an unretained random value revoked
issued sessions, and token rejection was observed. The synthetic account row,
authentication counters and ordinary gateway budget reservation remain. This is
**not whole-account erasure**, disabled-account status or a retention-policy test.
No customer data was edited. No schema changes, database restart, provider-key
change, budget increase, checkout enablement or Omega-worker activation occurred.

The $100/month allocation ($60 Gemini/$40 OpenAI) is unchanged. Actual invoice,
token usage and ledger reconciliation remain unverified; a reservation is not
an invoice amount. This run incurred the ordinary configured provider request,
not a customer payment or a new subscription.

## Deliberate limits

This is automated production HTTP evidence, not designated human/browser/mobile
acceptance, email ownership, support-assisted password recovery, cross-user
production isolation, server/database restart survival or a production-derived
restore. The recovery endpoint correctly reported assisted-only availability;
no automated email or actual recovery was claimed. Historical credential/usage
review, private support identity, merchant setup, domain/mail cutover, privacy,
accessibility and the Six integrations retain their separate launch gates.

The readiness endpoint still reports `configured_not_verified`: it checks
configuration and ledger availability, not persisted acceptance-test history.
Do not infer that generation never worked from that string after this dated
checkpoint, or change it to blanket launch clearance based on a single test.

## Safe reuse

The one-time production workflow was removed after execution. No retained
workflow performs account writes or paid requests. The retained
`production-pilot-probe-tests.yml` runs only injected synthetic HTTP fixtures:

```sh
node --test tests/production-pilot-probe.test.mjs
```

A future live run needs a newly reviewed, explicit owner-authorized invocation,
exact expected live revision and write/paid flags. It is not a recurring paid
healthcheck. The script refuses repeat Actions attempts and does not retry
writes or ambiguous paid responses. The first workflow definition was rejected
before any job ran because of YAML condition quoting; it caused no production
request. The corrected single execution above succeeded.

Keep dated evidence in continuation hub #202, separately from invoice and broad
launch acceptance. Supersedes older statements that no authenticated production
AI reply had ever been observed; it does not supersede their other limitations.
