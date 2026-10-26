# LUQI — historical credential review: owner/operator execution matrix

**25 October 2026 SAST. Incident response NOT CLEARED.**

Railway's 21 October 2026 vendor notice describes possible access to stored environment secrets. LUQI-specific compromise **has neither been proven nor ruled out**. An October 23 limited web JWT/admin rotation and later model trial reopening do not establish historical credential revocation, clean provider usage or a recoverable production database. See [incident issue #114](https://github.com/ttmodupe-hash/luqi-ai/issues/114) and [existing response playbook](./RAILWAY_SECURITY_RESPONSE_2026_10_23.md).

This is an **operator checklist, not a credential scanner**. It collects **no secret values** and does not grant access to other accounts, recover keys or inspect private customer content.

| Credential/control class | Evidence currently supported | Status and what an authorised owner still must verify privately |
| --- | --- | --- |
| Active LUQI web JWT/admin signing | October 23 rotation is recorded in the incident runbook | **PARTIALLY CONTAINED**: verify consumed deployment revision and old sessions; separately inventory legacy JWT, evaluator and other signing consumers |
| Historical MySQL root/operator | Dedicated restricted LUQI web identity implemented; current MySQL service online | **OPEN**: map every real historical consumer, plan reconnect/rollback and backups, then *separately approve* Railway Database → Config → Regenerate; do not manually edit root variables or rotate during this checklist |
| Provider keys and billing projects | Bounded $100/month budget, $60 Gemini and $40 OpenAI, trial previously reopened | **OPEN**: verify old key revocations, creation time and per-project usage/cost, actual provider invoices versus reservations; do not treat reserved spend as bills, zero spend or lack of abuse |
| Railway web/shared variables | Current connected tool can read **names**, not a safe historical usage/revocation audit | **OPEN**: privately review the Oct 21 incident window, Railway access/deployment history, shared variables and old service consumers without copying values into tickets |
| GitHub/registry/cloud or other integrations | No full historical access-use review available in this check | **OPEN**: inspect project-scoped deploy tokens, registry access, OAuth/grants, external storage/service accounts and documented revocations |
| Customer accounts, trusted administrator, support | Login and recovery code/fixture tests exist | **OPEN**: designated real user+operator identity-verification process, MFA/admin review, secure private support inbox with inbound AND outbound test, existing-session denial; no forced password reset without direct permission |
| Operational restore | Isolated disposable MySQL CI passed historically; earlier snapshot/schedule listed | **OPEN**: current inventory AND owner-approved production-derived isolated restore plus independent source equivalence and RPO/RTO |
| Paid merchant/checkout | No verified LUQI merchant or active subscriptions | **OFF**: independent seller, processor, webhook, refunds and support approval needed; preserve zero customer charges |

**Safe next operator sequence:** retain evidence and identify current/legacy owners first; compare old active credential *identifiers and access/usage metadata* in each correct provider project; document affected consumers and planned maintenance; approve one rotation/revocation change at a time only after recovery readiness, then independently confirm actual revocation at the upstream provider. Preserve a restricted audit with the actual operator/time/scope and do not publish customer names, keys, token suffixes, raw SQL, invoices, or private access logs.

Current read-only connected Railway service variable **names** include `DATABASE_URL`, `JWT_SECRET`, `JWT_SECRET_KEY`, `EVALUATOR_SIGNING_SECRET`, `LUQI_ADMIN_MASTER_KEY`, the pilot Gemini/OpenAI API key and identifier variables, and `LUQI_RUNTIME_DB_PASSWORD`. Presence of a name is **not proof** that a value is active, rotated or compromised. No use of Railway `list_variables` is needed; it may expose fully rendered secret values. The separate older `comfortable-illumination` project must be kept distinct.

**Approval boundaries:** no production credential rotation, MySQL restart, production export, new key issue/revocation, provider invocation, budget adjustment, payment, user reset, infrastructure change or merge is performed by writing this checklist. The outstanding operational gates remain OPEN until independent evidence and a named human sign-off exist.
