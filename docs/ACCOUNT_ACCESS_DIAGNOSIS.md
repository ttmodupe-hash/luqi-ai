# Private account-access diagnosis — not a completed login repair

24 October 2026. Continues #202. Reviewed against production source
`ff768087b2c9116ffc0be00f9e55dad9222e67f5`.

## Why this exists

The reported owner login is still unresolved. The current HTTP login handler
returns a generic 401 for missing/inactive accounts, unsupported stored password
formats or a non-matching password. Historical 401 metadata cannot distinguish
these cases. It is not evidence that the owner used the wrong password, that the
database failed or that an account was deleted. The current source normalizes
email and uses the persisted MySQL users table; no reproducible source defect has
been established for the reported account.

This script narrows the account condition privately, without guessing passwords,
registering replacement users, weakening authentication or performing a reset.
It is preparation, not an operational result. A successful CI run does not mean
the script has inspected production or restored the owner's access.

## Required access

An authorized operator needs a trusted interactive terminal inside the existing
`kind-spontaneity` / production / **web** service. The script requires its exact
Railway project/environment/service IDs and `NODE_ENV=production`, `/app` as its
working directory, and the existing `luqi_web_runtime` database identity. It
refuses a different service, environment, root identity, redirected/non-TTY
execution and command-line arguments. These checks prevent accidental targeting;
Railway permissions and independent ownership verification remain the real access
controls. Do not set fake environment IDs to get past the guard.

No Railway SQL or terminal action is available in the connected tools used for
this investigation. A local Railway CLI was also unavailable. Do not compensate
by creating infrastructure, adding a public account lookup/reset endpoint,
dumping credentials, changing startup commands or logging account rows.

## Run without deploying or restarting the app

1. Privately verify the person's ownership of the specific LUQI account. Do not
   assume that their hosting/GitHub email is the email registered in LUQI.
2. Review `scripts/diagnose-account-access.mjs` at the approved PR revision. Using
   the operator's existing trusted terminal/transfer method, place that exact
   script in `/tmp/luqi-account-diagnosis.mjs` in the existing web container.
   Do not paste passwords, connection strings or account records into chat,
   issues, CI or runtime logs. Do not pipe an unreviewed remote script to Node.
3. In the private interactive terminal run:

   ```sh
   cd /app
   node --experimental-strip-types /tmp/luqi-account-diagnosis.mjs
   ```

   The existing image includes `/app/api/lib/mysqlConfig.ts` and `mysql2`, per the
   reviewed Dockerfile. The script reuses that parser and dependency; it installs
   nothing. The PR need not be merged and the web app need not be redeployed.
4. Confirm ownership with `CHECK` and enter the **verified LUQI account email**
   in the private terminal. No password is requested. Cancel with Ctrl+C.
5. Keep the account ID/output in the private operator channel. Record only a
   non-identifying outcome and next action in #202. Remove the temporary script
   through the approved terminal when finished; it contains no customer data.

## What is read, and what is not

Exactly one parameterized `SELECT`, limited to two matching rows with a
five-second query timeout, returns account ID, active flag and a boolean indicating
whether the stored credential has the reviewed bcrypt shape. MySQL evaluates the
format check internally: the password hash, email, session token and saved notes
are **not selected into the result**. The connection timeout is four seconds.
No HTTP login attempt, bcrypt comparison, write, reset, session revocation, schema
operation, throttle reservation or provider request is performed. Errors are
replaced with fixed text. A database/query failure is never reported as a missing
account. A compatible credential shape does not validate its content or password.

## Interpret the private result

| Result | Next action |
| --- | --- |
| `ACCOUNT_NOT_FOUND` | Privately confirm the exact email and original deployment. Do not create a replacement identity to conceal a migration or recovery failure. |
| `ACCOUNT_INACTIVE` | Investigate why it is inactive and obtain the appropriate authorization. This script never activates it. |
| `ACCOUNT_CREDENTIAL_FORMAT_UNSUPPORTED` | Investigate the credential origin/migration and use the reviewed ownership-verified recovery procedure where appropriate. Never convert an unknown hash or accept it as a password. |
| `ACCOUNT_ACTIVE_FORMAT_SUPPORTED` | The account is present/active with a compatible stored shape; password correctness and end-to-end login are still unverified. Check the actual browser/error path; use verified recovery only when appropriate. |
| `ACCOUNT_MATCH_AMBIGUOUS` | Stop and investigate identity/collation integrity; never pick a row automatically. |
| Fixed unavailable/refusal message | Resolve approved terminal/context/runtime-role/query access; do not change account state to make the check pass. |

A password reset remains a distinct write requiring independently verified
ownership and the reviewed interactive `dist/reset-account-password.js` procedure.
Do not run it solely because a diagnosis script exists. Success requires the real
person to sign in, save a harmless note, sign out/back in and retrieve it.

## Validation and scope

34 native Node tests passed locally, with no skipped tests. They cover context
refusal, normalization, parameterized/limited query construction, result
classification, no retry, redaction and noninteractive refusal. They use fake
query results: **MySQL query execution, interactive production execution and real
account acceptance have not occurred**. No whole-product recovery or launch
clearance follows. The existing PR-triggered request-safety workflow includes the
new tests; no recurring schedule was added.

No production code/configuration/data/password changes or payments. Existing
USD 100/month allocation remains Gemini 60 / OpenAI 40.

References checked 24 October 2026:
- https://dev.mysql.com/doc/refman/8.4/en/regexp.html (REGEXP_LIKE and case matching).
- https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
  (generic public authentication errors, private diagnosis and recovery controls).
