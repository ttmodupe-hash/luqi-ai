# Legacy control retirement and private conversation export

## Confirmed gaps and changes

The prior `/api/v25/payments` probes did not cover the older `/api/v1/billing`
and `/v1/billing` namespace. Those handlers granted volatile credits from
unsigned webhooks and caller-supplied emails. The related job polling returned
invented pending status, approval resolution trusted arbitrary reviewer/token
fields, and the USSD flow could call Gemini outside the approved pilot budget.

The Node REST router now denies both billing/job/ZTA namespaces, including
unknown aliases, before parsing a body. Billing ledgers and FinOps are unavailable;
USSD is unavailable until authenticated carrier integration and metering exist.
Removed the old in-memory credits/jobs, fake security events and approval/MFA
implementation rather than retaining them behind a new key switch.

The Python async compatibility router now denies its jobs, billing, ZTA,
self-healing, sensing and chat namespaces without importing workers, payment,
security or model clients. This is regression protection for that alternate
runtime; Railway continues to run Node. Other Python/REST surfaces still need
review. No reviewed administrator RBAC or actual MFA is claimed by this change.

## Private conversation export

`GET /api/v1/companion/conversations/:id/export` requires the same revocable,
active-account JWT as private notes. It returns a versioned JSON attachment
containing one owned conversation, all its saved messages and only memories
linked to both that conversation and the authenticated owner. Null-owner,
unlinked and foreign-owned memories are excluded. Internal message metadata,
token usage and account credentials are excluded.

The export holds the conversation lock shared by writes/deletion and uses a
repeatable-read transaction. It is a read operation: it does not change rows,
generate replies or delete data. At most 1,000 messages, 1,000 memories and
1 MiB of combined text are allowed, with an 8 MiB serialized JSON ceiling.
Over-limit requests return 422 without a partial attachment. Existing paginated
reads remain available. All private-note request bodies now have a 32 KiB limit.

Both frontend copies provide an explicit download button, explain local file
privacy, exclude unsaved drafts, validate the requested conversation ID and avoid
persistent browser storage. A response after sign-out/unmount is discarded.
Authentication failure clears private state; storage/limit errors never produce
a download or silently retry. This is not a whole-account export or an encrypted
backup; the user controls the downloaded file after it leaves the app.

## Validation and release

- Node tests cover both namespace prefixes, fake operator/approval/payment
  fields, malformed bodies, every mutating verb and USSD provider non-execution.
- Python tests cover retired namespace denial and absence of worker/client imports.
- The initial GitHub Actions run passed 17 real MySQL tests and the isolated
  restore drill. Removed the optional npm cache from MySQL/Omega workflows after
  cache storage egress errors delayed setup by 10 minutes; lockfile-based installs
  and all database checks remain required.
- Real MySQL CI adds foreign-owner denial, 60-message export, owned/foreign/null
  memory handling, metadata exclusion, revocation, row/byte limits, preservation
  and export serialization with a concurrent write.
- Component/client/browser checks cover the explicit download, actual JSON file
  content, 320px keyboard use, expiration and late responses after sign-out.
- `scripts/verify-legacy-controls.mjs [base-url]` performs only denial probes and
  unauthenticated export checks. A real production account export is still an
  acceptance task; CI uses synthetic/disposable fixtures only.

No migration, production data write, new infrastructure, provider activation or
billing change is needed. Prefer a forward fix or preserve the closure guards
when rolling back; the preceding release exposes the additional legacy aliases.
After separate user approval, daily MySQL volume backups (6-day retention) and
an initial 941 MB snapshot were created through Railway. See
MYSQL_BACKUP_RECOVERY.md for verified metadata, costs and the remaining isolated
restore drill; AI/provider activation remains disabled.
