import { Hono } from "hono";

// The legacy page has no server-issued administrator session protocol. Never
// treat its default passkey or an SPA HTML response as successful verification.
export const legacyAdminUnavailable = new Hono();
legacyAdminUnavailable.all('/api/v1/admin/verify', c => {
  c.header('Cache-Control', 'no-store');
  return c.json({ code: 'ADMIN_SESSION_UNAVAILABLE',
    message: 'Browser administrator sign-in is unavailable pending a reviewed server-side session integration.' }, 503);
});
// The old matrix inferred health from key presence and invented wallet balances
// and latency. Public operational checks live at /v1/readiness instead.
legacyAdminUnavailable.all('/api/v1/system-api-matrix', c => {
  c.header('Cache-Control', 'no-store');
  return c.json({ code: 'PROVIDER_TELEMETRY_UNAVAILABLE',
    message: 'Verified provider health, latency and billing telemetry are unavailable.' }, 503);
});
