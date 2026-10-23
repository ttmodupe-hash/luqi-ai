# Launch HTTP boundary

The live paid endpoint is isolated in `api/ai-pilot.ts`. Billing/configuration
and persistent account verification run before its body is parsed. It accepts
JSON only, with a 32 KiB body ceiling, exactly one nonempty question (maximum
6,000 characters), at most four explicitly supplied history entries of 350
characters each, and an optional language preference of 50 characters.
Unknown fields, caller identities, system-role history, conflicting question
aliases and oversized context fail before the budgeted gateway is invoked.
The ordinary trial UI sends only its entered question; it adds no saved notes.

The gateway remains responsible for durable reservations before every provider
attempt, per-user daily limits and independent $60/$40 monthly allocations.
This change neither activates a provider nor retries a paid request. Daily and
monthly quota failures have distinct messages. Provider/SQL exception text is
never returned by the trial route.

`api/lib/httpSafety.ts` applies `Cache-Control: no-store` and `Pragma: no-cache`
to dynamic API, auth, readiness and health responses, including denials and
unknown APIs. Public static asset caching is unchanged. Request telemetry
records a server-generated request ID and the registered route pattern; it
does not record caller parameter values, query strings or request bodies.

The global exception handler previously returned raw exception messages and
logged message/stack text. It now returns fixed messages and a correlation ID.
Only recognized HTTP exceptions retain their status; arbitrary objects cannot
select it. Validation values, embedded HTTP exception responses and driver/
provider messages are omitted from both this handler's logs and its response.
Abort failures return 408. This does not certify every legacy logging call.

Offline tests cover the actual Hono trial router and shared middleware with
synthetic account/provider outcomes. They verify body/auth ordering, streamed
and declared body limits, schema rejection, failure redaction, cache policy,
parameter-free telemetry, quota reporting and no retry. No provider key, real
account or paid call is used. CI also builds and exercises the production
container, restricted disposable MySQL and desktop/mobile browser journeys.

Production recovery acceptance, dedicated database identity provisioning,
private support and a designated-account paid reply remain separate launch
gates. See `PILOT_LAUNCH.md` and issue #144; green tests do not close them.
