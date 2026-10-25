# LUQI — P0 operator-evidence handoff (25 October 2026)

**This is documentary completeness, not launch approval.** The optional tool reads
only a strictly redacted, local JSON packet from standard input. It does not
access Railway, GitHub, backups, MySQL, mail, accounts, actual AI-provider costs
or payment processors. No change to customer data, credentials, billing, DNS,
CI deployment triggers or production infrastructure is made.

The 10 checks cover historical credential/access review, production-derived
isolated restore, verified private inbound/outbound support, owner-verified
account recovery, real-device acceptance, actual provider charge comparison,
release controls, custom domain and mail tests, privacy/crypto review, and
merchant seller/checkout/refunds/delivery.

Each observation may be **not_observed**, **documented** or **problem_found**.
Documented observations need an opaque reference code, a real SAST (+02:00)
execution timestamp and a genuinely independent second human review. No raw
evidence enters the checker. Evidence older than 30 days is flagged as stale.
Do not reuse evidence codes across independent gates. A reference code or
boolean does not prove that a test was executed.

Even ten documented entries only produce HUMAN_SIGNOFF_REQUIRED, never a go-live
decision. Report results are designed for private operator review; do not
copy customer data, screenshots, account email addresses, provider invoices,
database dumps, secrets or access tokens into GitHub, CI, chat or this packet.

## Safe sample: missing evidence, not a claim of success

~~~json
{
  "format": "luqi.p0.operator-evidence.v1",
  "repository": "ttmodupe-hash/luqi-ai",
  "railway_project_id": "9f627cb8-3136-4b30-89d2-32ca648a1e5f",
  "environment_id": "1e192ef3-1fa6-4684-81fc-60165c7b0e22",
  "checks": {}
}
~~~

Only AFTER genuine performance and second review, a gate can reference a
restricted operator record using this illustrative structure:

~~~json
"verified_private_support": {
  "status": "documented",
  "reference": "OPR-EVIDENCE-001",
  "observed_at_sast": "2026-10-25T15:00:00+02:00",
  "independently_reviewed": true
}
~~~

The example is fictional and does not say LUQI email works.

## Offline procedure

Run locally from a reviewed checkout. Keep any actual evidence private.

~~~sh
node scripts/review-p0-operator-handoff.mjs < /private/luqi-redacted-p0.json
~~~

Exit 0: packet is ready for **independent human review**, not launch.
Exit 2: missing/stale/unreviewed evidence or a reported problem.
Exit 1: invalid, oversized or unsafe input, with no raw evidence printed.

The output contains only fixed gate names and aggregate counts; it never
echoes the supplied references. It always has public_or_paid_launch_approved=false.
A scheduled monitor is not continuous uptime monitoring. Backend readiness
does not prove paid AI replies. A backup listing is not a production-derived
isolated restore. Reserved USD cents are not invoiced provider charges.

Continue with the existing limited pilot under USD 100/month AI ceilings:
Gemini USD 60 and OpenAI USD 40. The operator must separately accept historical
credential review, recovery, verified private support, actual provider costs,
real-world customer journeys, seller legal identity and merchant settlement.
No new worker, paid checkout or subscription is authorised.

Source procedures: docs/P0_OPERATOR_ACCEPTANCE_2026_10_25.md,
docs/LOCAL_RECOVERY_DRILL.md and docs/RAILWAY_SECURITY_RESPONSE_2026_10_23.md.
Use GitHub issue #202 for REDACTED conclusions, not underlying evidence.

CI for this change uses Node's built-in test runner and synthetic records
only; it cannot independently verify operational proof.
