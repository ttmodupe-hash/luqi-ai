# Legacy browser admin boundary

The old admin page accepted a hard-coded passkey after failed or unreachable
verification, and trusted any string in sessionStorage. There was no implemented
server-issued admin session behind `/api/v1/admin/verify`. Its controls also
presented seeded approvals and fabricated operation outcomes.

The portal now explicitly reports administrator sign-in unavailable, removes
obsolete raw passkeys from sessionStorage and mounts no privileged controls.
The standalone knowledge console cannot submit operations. This is a fail-closed
boundary pending a reviewed server-side administrator session and authorization
model, not a claim that browser admin access has been implemented.

The legacy verify endpoint returns 503 `ADMIN_SESSION_UNAVAILABLE`, no-store,
for every method. The old provider matrix also returns 503/no-store, because
its balances, latencies and key-presence health statuses were not measurements.
Both frontend status components instead read `/v1/readiness` without credentials,
show its reported values and clear stale results on failure. Configured provider
status is displayed as `configured_not_verified`, never as verified health.

Existing operator-only API authorization remains unchanged. This patch does not
activate providers, alter credentials in Railway, change billing, or mutate
production data. The browser must not store the server master key; a future
admin session needs expiration, revocation, server-side role checks and tests
for each privileged operation before controls return.
