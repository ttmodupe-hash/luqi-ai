# LUQI private, read-only account access diagnosis

**Status:** prepared for restricted operator review; not a real account or recovery acceptance. This procedure makes no change to accounts, passwords, users, sessions or billing.

## Purpose and safety boundary

A customer's generic login denial does not establish whether an account exists, is disabled, has an unsupported historical password-hash format or simply supplied the wrong credentials. The browser must not reveal which case applies. `scripts/diagnose-account-access.mjs` performs one **parameterized, bounded SELECT** as a private, interactive operator tool, without verifying a password or authenticating the customer.

The script refuses non-interactive execution and command-line parameters, requires the exact existing production project/environment/web service and the dedicated `luqi_web_runtime` MySQL role, and checks the **physical** Docker working directory `/srv/luqi`. The image retains `/app` as a symlink, but Node's `process.cwd()` resolves it to `/srv/luqi`. It does not echo credentials, database URLs, account email or password hashes. The only account identifier printed is for the authorized private terminal.

## Operator acceptance steps

1. Identify an accountable support operator and verify the customer's ownership of their specific LUQI account through an independent trusted private channel. A claimed email address is not evidence of ownership. Confirm access authorization in the private audit record, without secrets.
2. Confirm the target is Railway project `kind-spontaneity`, environment `production`, **web** service—not MySQL, OMEGA or an older project. Confirm the deployed reviewed revision and use an existing private interactive operator terminal. Do not add a public account-inspection endpoint, copy a database, or recreate accounts.
3. From inside that existing production web container, use the reviewed script in the deployed image:

   ```sh
   cd /srv/luqi
   node --experimental-strip-types scripts/diagnose-account-access.mjs
   ```

   If the guard refuses missing Railway IDs, runtime role or working directory, **stop** and review privately. Do not insert fake environment IDs or elevate MySQL privileges to make it run.
4. Type `CHECK` only after independent ownership verification. Provide the verified account email at the private prompt. Do **not** type a password or paste user records into chat/CI/GitHub.
5. Interpret **only** the returned code:
   - `ACCOUNT_NOT_FOUND`: no matching account in this database; investigate the intended email and environment privately. Do not automatically register a replacement.
   - `ACCOUNT_MATCH_AMBIGUOUS`: unexpected multiple matches under database collation; escalate to a database administrator, no password change.
   - `ACCOUNT_INACTIVE`: account is not active; no automatic reactivation.
   - `ACCOUNT_CREDENTIAL_FORMAT_UNSUPPORTED`: inspect historical credential migration through a separate approved procedure; do not expose the hash.
   - `ACCOUNT_ACTIVE_FORMAT_SUPPORTED`: account exists, is active and its hash has a supported format. **It does not prove the password is correct** or that sign-in succeeded.
6. Record only the non-identifying result, operator and UTC/SAST timestamp in an access-controlled incident record. Keep account IDs and verified contact out of public issue comments. If recovery is necessary, obtain separate explicit operator/owner consent and follow `docs/ACCOUNT_RECOVERY.md`.

## What automated tests do not prove

CI tests fake MySQL responses, verifies no writes, refusal of bad scope/TTY and redaction of errors. It never checks a production user. A deployed CLI cannot clear the human acceptance gate until a designated person successfully registers/signs in, stores and reloads notes, and separately verifies private assisted recovery on a test account.

## Dependencies and limitations

The operator must have a trusted terminal with the expected Railway injected context, Node 22, mysql2, the dedicated runtime DB connection and access granted by the Railway account owner. If the provider omits a required context value, the script deliberately refuses; its presence in configuration is not proof it has run. Do not use this script to enumerate users, measure signup success, recover unknown accounts, or infer private support readiness.
