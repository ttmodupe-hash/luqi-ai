import { Hono } from "hono";

/** Retired namespaces have no reviewed account/operator authorization or
 * verified payment/provider integration. A key, arbitrary identity, fabricated
 * approval token or configured provider must never reopen them implicitly. */
export const legacyControlUnavailable = new Hono();
const closed = (path: string, code: string) => legacyControlUnavailable.all(path, c => {
  c.header("Cache-Control", "no-store");
  return c.json({ status: "unavailable", code,
    message: "This legacy integration is unavailable pending reviewed authorization and verified integrations." }, 503);
});
for (const prefix of ["/api/v1", "/v1"]) {
  for (const [namespace, code] of [
    ["billing", "LEGACY_PAYMENTS_DISABLED"],
    ["jobs", "LEGACY_JOBS_UNAVAILABLE"],
    ["zta", "LEGACY_APPROVALS_UNAVAILABLE"],
  ]) {
    closed(`${prefix}/${namespace}`, code);
    closed(`${prefix}/${namespace}/*`, code);
  }
}
for (const path of ["/api/v1/admin/billing-ledger", "/admin/billing-ledger", "/api/v1/finops-dashboard"]) {
  closed(path, "LEGACY_PAYMENTS_DISABLED");
}
for (const path of ["/api/ussd", "/api/ussd/*"]) closed(path, "USSD_INTEGRATION_UNAVAILABLE");

// The old Support Centre has no live, account-owned ticket database or reviewed
// authentication contract. Do not silently accept writes or invent success.
for (const path of ["/api/v25/support", "/api/v25/support/*"]) {
  legacyControlUnavailable.all(path, c => {
    c.header("Cache-Control", "no-store");
    return c.json({
      success: false,
      status: "unavailable",
      code: "SUPPORT_TICKETING_UNAVAILABLE",
      message: "Ticket submissions, replies, dashboards and FAQs are unavailable until a verified support service is launched. For private help, use your existing verified pilot contact; never post account details in public issues.",
    }, 503);
  });
}
