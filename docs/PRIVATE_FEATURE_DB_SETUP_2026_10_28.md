# Private feature storage preparation — 28 October 2026

Owner authorised continuation of secure session restoration and private P2P messaging. Both customer feature flags remain OFF. No customer account, credential, AI budget or payment setting is part of this operation.

## Verified production baseline

The one-shot private inspector ran from pinned source `7f9ff780e04e435611229ba4acb8ffec75178da3`, Railway deployment `1892bd5a-74b2-4627-9875-53260162380b`. Railway reports SUCCESS. Its structured log attributes record `readOnly=true`, `customerRowsRead=false`, `productionFlagsChanged=false`, the dedicated web identity and no active roles. Core structure and restricted access validated; there were no unexpected grants. All six feature tables were absent and their six grant entries were missing. The empty feature-schema fingerprint was `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945`.

The first temporary checker used a conflicting repository web configuration and was removed, with no attached volumes. The replacement operational branch uses the reviewed checker as its root Dockerfile and omits root web Railway configuration. This does not alter the customer application's main branch or deployment settings. Structured JSON is captured in Railway log attributes, so inspecting only the message string misses the actual report.

## Exact additive correction

`db/prepareFeatureStorage.ts` is an explicit operator action, never HTTP or web startup. Its default image command remains read-only inspection. The separate setup entrypoint requires the exact `create-new-feature-storage-v1` intent, canonical project/environment, dedicated checker name, pinned source commit, private matching operator/runtime database, and disabled local feature switches.

Before writes it verifies the core structure, existing restricted role, no excess grants, supported MySQL 8 version and an advisory operator lock. Both migration files must match reviewed SHA-256 hashes. It creates only the six absent tables from the existing isolated migrations, seeds only the empty P2P audit head, and adds their exact table-level grants to the existing web identity. It does not alter existing tables, passwords, users, ordinary core grants or historical session data. It does not grant DELETE, DDL, global privileges or GRANT OPTION to the runtime.

Existing partial or mismatched feature storage is refused. Already fully verified storage is a no-op. MySQL DDL auto-commits: any partial failure preserves data and requires independent review; there is no automatic DROP, ALTER or replacement repair. After success a fresh read-only inspection must validate all 14 candidate runtime tables, the audit-head format, both feature structures and the combined exact grants.

The disposable CI test verifies missing-intent/active-feature refusal, exact additive creation, preservation of all synthetic customer rows, idempotency and refusal to replace altered storage. Production setup must not run before these checks pass on the chosen operator source.

## Release hold

Schema preparation does not enable either feature. Physical iOS/Android acceptance, safe restoration/replay/revocation, production-derived recovery, report-key backup/recovery, trustworthy eligibility and moderation/retention procedures remain distinct acceptance requirements. The session PR stays draft while these gates are unmet. No live inference or payment test is needed for database preparation.
