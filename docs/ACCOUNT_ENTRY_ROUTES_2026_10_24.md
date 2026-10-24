# Account entry aliases — 24 October 2026

The current UI uses hash routing. Before this change, `/#/login`, `/#/signin`,
`/#/sign-in`, `/#/register`, `/#/signup` and `/#/sign-up` fell through to the
not-found page. This is a reproduced-by-routing-inspection navigation gap, not
a diagnosis of the owner's unspecified credential failure.

The first three now replace the current history entry with `/#/companion`,
which contains the existing sign-in form. Registration aliases use `/#/join`,
which starts the existing account form in signup mode. Both frontend entry
files retain their existing distinct optional-tool routes. No server auth,
password policy, rate limits, sessions, data, DNS, secrets or paid AI changes.

Alias destinations are fixed local paths. Query parameters are not forwarded,
including email/password/return URL parameters. Visiting an alias submits no
authentication, account creation, recovery or inference request. Real form
submission still requires deliberate user action and the unchanged server checks.
The browser tests use the built frontend on disposable CI hosting, not real
production credentials, and cover desktop and mobile configurations.

This does not implement automatic password reset, bind or verify a recovery
mailbox, alter an existing account, validate the owner's sign-in, or make a
plain `/login` (without the hash) a server route. It does not clear public DNS,
TLS, incident response, production-derived restore or merchant launch gates.

Pending execution: PR build and browser checks, reviewed merge, exact production
revision check. Record actual results in #202; do not infer a deployment from
this document's presence on a development branch.
