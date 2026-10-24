# Private AI pilot spending review

## What is completed, and what remains

`scripts/review-ai-pilot-spend.py` compares **operator-normalized local evidence**
against LUQI's existing $100 USD monthly allocation: $60 Gemini, $40 OpenAI.
The runtime commits a 10-cent reservation before each attempted provider call.
That reservation is neither an invoice nor proof that a call succeeded. Failed
or ambiguous attempts keep their reservations; never refund/reset those rows
because a report shows lower cost.

This operator tool has no network client, database connector, subprocess or
credential input. It does not fetch accounts, infer missing evidence, stop the
pilot, send alerts, change settings, purchase credit or enable payments. It
writes only an explicitly requested new private report. It adds no app endpoint,
public dashboard, database table or production dependency.

**Actual provider-cost reconciliation is still an operational requirement.**
Implementation, passing fixtures and even a report with no comparison flags do
not close it. Every report permanently carries `human_review_required: true`,
`production_reconciliation_complete: false`, `source_authenticity_verified:
false`, and `launch_approved: false`. Source hashes and mapping declarations are
supplied by the operator, not authenticated by this tool.

## Obtain comparable evidence privately

Use an approved encrypted Linux/macOS workstation and an existing authorized
read-only access path. Do not paste credentials, database dumps, raw billing
exports or private reports in ChatGPT, GitHub issues, commits or workflow logs.
No new public database endpoint or privileged web route is needed or approved.

1. Record one UTC reporting month and exclusive cutoff, and obtain a consistent
   ledger snapshot covering that cutoff. The only required database values are
   the two providers' `reserved_cents` for that month in
   `ai_pilot_monthly_spend`. The script does not connect to MySQL. Preserve the
   snapshot and its SHA-256 privately. A missing row is **not automatically zero**:
   use an explicit zero only after establishing that it truly means no attempts,
   not a wrong database, missing migration, reset or incomplete export. Do not
   use a later cumulative row to represent an earlier cutoff.
2. Obtain the provider's usage-cost evidence for the **same dedicated LUQI
   project, UTC month start and cutoff**. Review organization/project/key
   mapping through authorized dashboards, not key display names alone. Shared,
   uncertain, non-USD or differently scoped costs remain incomparable. No
   exchange-rate conversion or project attribution is guessed.
3. Normalize only API usage cost, excluding tax, credits/refunds and prepaid
   purchases/top-ups. Do not substitute a prepaid balance, token estimate,
   project budget, cash payment, organization subscription or invoice total.
   Provider-specific pricing arrangements may need a separate reconciliation.
   Preserve the original evidence and its hash; do not silently change units,
   rounding, time zone, line-item coverage or pagination.
4. Mark current-month or not-yet-final billing **provisional**. Age alone cannot
   prove finality. Provider billing may lag; a zero can mean delayed reporting,
   free usage or a different pricing arrangement. Finality and completeness must
   be reviewed with the provider. Normalize both providers separately.

OpenAI's Usage Dashboard uses UTC and has its own project selector. Its Cost
data export can be grouped by line item and filtered to the relevant project;
Activity data is not a substitute for cost data. The Costs API uses an inclusive
start and exclusive end and may paginate. Google documents billing delays and
project-level aggregation across keys. Review those primary sources before
normalizing; this script is not a native parser for their changing CSV/API formats.

## Exact input contract

JSON must contain exactly the keys below. Money is a nonnegative decimal
**string**, without exponent notation, with up to 12 fractional digits. It is
not rounded. Timestamps are second-resolution UTC `Z`. `providers` and ledger
`rows` may omit evidence; omissions produce `incomplete`, not zero balances.
Duplicates, invalid numbers, malformed/future dates, unknown keys (including
credentials) and unbounded inputs are refused.

The example is **entirely synthetic**, not LUQI's actual spending or account data.
The repeated hashes stand for fixture evidence only; use real independent hashes
for a private operational review.

```json
{
  "format": "luqi.pilot-spend-evidence.v1",
  "provenance": "fixture",
  "month_utc": "2026-09",
  "cutoff_utc": "2026-10-01T00:00:00Z",
  "ledger": {
    "source_sha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "rows": [
      {"provider": "gemini", "reserved_cents": 100},
      {"provider": "openai", "reserved_cents": 100}
    ]
  },
  "providers": [
    {
      "provider": "gemini",
      "source_sha256": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      "reported_at_utc": "2026-10-02T00:00:00Z",
      "window_start_utc": "2026-09-01T00:00:00Z",
      "window_end_utc": "2026-10-01T00:00:00Z",
      "currency": "USD",
      "cost_basis": "api_usage_excluding_tax_credits_topups",
      "scope": "dedicated_pilot_project",
      "mapping_reviewed": true,
      "billing_status": "final",
      "usage_usd": "0.005"
    },
    {
      "provider": "openai",
      "source_sha256": "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      "reported_at_utc": "2026-10-02T00:00:00Z",
      "window_start_utc": "2026-09-01T00:00:00Z",
      "window_end_utc": "2026-10-01T00:00:00Z",
      "currency": "USD",
      "cost_basis": "api_usage_excluding_tax_credits_topups",
      "scope": "dedicated_pilot_project",
      "mapping_reviewed": true,
      "billing_status": "final",
      "usage_usd": "0.004"
    }
  ]
}
```

Set `provenance` to `production` for actual evidence; such input is refused in
recognized CI environments. This is a guard, not proof of provenance. Use
`shared_or_unknown`, `other_or_unknown`, `mapping_reviewed: false`, or omit the
provider when appropriate; never label uncertain data as verified to get green.
No project ID, API key, email, prompt, account-level user ID or response text is
needed. A normalized report can still be sensitive financial information.

## Execute locally

Use Python 3.10+ on POSIX. Input must be an owned regular private file, no final
symlink, FIFO or hard link, and at most 64 KiB. The output parent must already
be an owned private directory. Protect ancestor directories on your workstation;
these file checks are not a sandbox against another process running as you or root.

```sh
umask 077
mkdir -m 700 ./private-spend-review
# Save the independently reviewed evidence.json privately in this directory.
# Use an independently recorded checksum, not a placeholder or a downloaded hash
# whose source you have not checked. Replace SHA256 with its 64 lowercase hex digits.
python3 scripts/review-ai-pilot-spend.py \
  --input ./private-spend-review/evidence.json \
  --sha256 SHA256 \
  --report ./private-spend-review/review.json
```

The report is created with mode 0600 and cannot overwrite an existing file or
follow a final output symlink. A failed write is removed. Errors do not echo
file contents, file names or raw diagnostics. File permissions do not encrypt
the data; retain it according to the approved private retention process.

Exit code **0** means the supplied comparison has no configured flags, **3**
means a report was written with missing evidence or review findings, and **2**
means input/file validation failed and no new report was accepted. None is
permission to launch or spend more. The input remains unchanged.

## Read the result

Flags cover missing/duplicate evidence, incomparable project/currency/period/
cost basis, provisional billing, stale active-month snapshots (24-hour review
policy, not a billing SLA), a premature final-month claim, reservation steps,
80%-of-cap warning points, reached/exceeded caps, costs above reservations, and
zero reported cost despite reservations. No comparable total is produced when
either provider's cost is absent or incomparable.

`reservation_attempts` is reserved cents divided by 10, **not confirmed API
calls or successful replies**. `unallocated_reservation_usd` is remaining local
allocation, not available cash or guaranteed safe-to-spend funds. Costs above
reservations require investigation of timing, scope, pricing, external use and
possible unauthorized activity; they do not independently prove compromise.
Use the existing owner-authorized stop procedure when appropriate. The tool
does not enforce that decision or reconcile historical keys.

Close the real spending requirement only after a designated operator has
reviewed the source exports, mapping, cutoffs, lag, current project controls,
charges and discrepancies. Keep this acceptance independent of recovery,
merchant setup, customer support and physical-device acceptance in issue #202.

## Verification and references

Run `python3 -m unittest discover -s tests -p test_ai_pilot_spend_review.py -v`.
Tests use synthetic costs only. The workflow runs Python 3.10/3.12 and verifies
that the source reservation policy still matches 60/40/100 USD and 10 cents.
It uploads no private report or billing artifact and invokes no provider.

Primary references reviewed 24 October 2026:
- https://help.openai.com/en/articles/10478918-reviewing-api-usage-and-costs
- https://help.openai.com/en/articles/20001072
- https://developers.openai.com/api/reference/resources/admin/subresources/organization/subresources/usage/methods/costs
- https://ai.google.dev/gemini-api/docs/billing/
- LUQI `api/services/aiPilotBudget.ts` and `docs/AI_PILOT_100_USD.md`.
