# Railway security-disclosure launch gate

Railway disclosed possible access to customer environment variables on October
21, 2026 and recommends credential rotation and misuse review for all customers.
Its October 23 status update says workspace deployments run normally, while
the incident remains identified. These are vendor statements, not evidence
that LUQI was affected or unaffected. Check current guidance and account-specific
notifications before clearing the launch gate.

## Verified partial containment

On October 23 the operator replaced the active web `JWT_SECRET` and
`LUQI_ADMIN_MASTER_KEY` with independent random values through protected service
configuration, and set `LUQI_AI_PROVIDER_ENABLED=false`. No secret values belong
in chat, screenshots, source control, issue bodies or CI artifacts. The new
deployment intentionally expires prior app sessions/admin credentials; users
must sign in again. Issue #144 records the actual deployment result and probes.

The owner-approved $100/month text allocation ($60 Gemini/$40 OpenAI) persists;
provider auto-reload remains off. Preserve approval flags, budgets, usage/spend
rows, account data and backups. Customer billing, Omega workers, paid media and
social publishing remain closed. Pausing LUQI does not revoke a provider key
or prevent its use outside the app.

The dedicated table-restricted MySQL web account was newly created on October
23. That improves privileges but does not revoke the older root/operator
credential, establish an exposure window or prove no unauthorized access.

## Complete and verify the response

1. Preserve account-specific incident notifications and relevant usage/audit
   evidence. Review Railway variable/access history, provider usage by project
   and key, GitHub access, and database authentication/session/grant evidence.
   Record the reviewed time window and limitations. Do not claim a clean audit
   merely because HTTP probes or CI passed. Escalate anomalies to the provider.
2. The owner must replace/revoke potentially exposed Gemini/OpenAI credentials
   at their providers, review usage and update the protected pilot variables
   and masked identifier settings. Key creation/revocation must occur in the
   correct existing provider projects; never increase the approved caps or
   enable auto-reload. Keep the paid gateway paused throughout.
3. Inventory every database consumer before rotating the historical operator
   credential. The web service uses its independent restricted account; do not
   replace its DATABASE_URL with the root URL. Existing external consumers
   have not been ruled out. Keep private networking intact and confirm a usable
   backup/recovery procedure; a listed snapshot is not restore acceptance.
4. The owner performs MySQL **Database → Config → Regenerate**, Railway's
   supported operation that updates the database and variables together and
   restarts MySQL. Plan for dropped connections and verify all consumers can
   reconnect. Do not change only MYSQL_ROOT_PASSWORD/MYSQLPASSWORD or run an
   ad hoc root ALTER USER: those can leave the database and variables out of
   sync. The agent has not performed this credential change/restart.
5. Inventory legacy JWT/evaluator signing material and actual consumers before
   rotating it. Preserve the ability to verify retained evidence; an active
   web JWT replacement is not proof that every legacy signing key was revoked.
6. Verify fresh database connections and expected identities/grants, absence
   of unexpected sessions, application startup UID, all required schema tables,
   anonymous/private/legacy denials and disabled AI readiness. Investigate
   failures without dropping tables, resetting spend counters or restoring
   production over current data. Never roll back to potentially exposed secrets.
7. After credential and incident acceptance, use the existing bounded metadata
   preflight, then one harmless approved paid request through a designated
   authenticated LUQI account. Reconcile actual provider usage and reservation
   evidence. Reopening the existing text allocation does not need a second
   budget approval; new paid services still need separate approval.

Broad launch remains blocked by this response and the other gates in
OUTSTANDING_WORK.md. No compromise, complete revocation, production restore,
clean usage history or completed professional/social authorization is claimed.

## Primary sources

- https://blog.railway.com/p/security-disclosure-wednesday-october-21st
- https://status.railway.com/incident/QH8L8B3E
- https://blog.railway.com/p/security-disclosure-recommendation-rotate-mysql-database-credentials
- https://blog.railway.com/p/security-disclosure-recommendation-check-for-unexpected-openai-usage

The source pages may change. Use their current incident instructions and
account-specific evidence rather than treating this dated checkpoint as
permanent platform guidance.
