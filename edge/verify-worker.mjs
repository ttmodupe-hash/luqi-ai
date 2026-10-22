import assert from "node:assert/strict";
import worker from "./cloudflareWorker.js";

const originalFetch = globalThis.fetch;
let calls = 0;
globalThis.fetch = async () => {
  calls++;
  return new Response('{"private":true}', {
    headers: { "cache-control": "public, max-age=86400", "set-cookie": "luqi_session=example" },
  });
};
const request = (path, headers = {}) => new Request("https://staging.luqi.invalid" + path, { headers });
const limiter = (allow = true) => ({ limit: async () => ({ success: allow }) });
try {
  const env = { LUQI_API_RATE_LIMITER: limiter(), LUQI_AUTH_RATE_LIMITER: limiter() };
  let res = await worker.fetch(request("/api/profile", { "cf-connecting-ip": "203.0.113.7" }), env);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("cache-control"), "private, no-store");
  assert.equal(res.headers.get("set-cookie"), "luqi_session=example");
  assert.equal(calls, 1);

  res = await worker.fetch(request("/api/profile", { "x-forwarded-for": "203.0.113.7" }), env);
  assert.equal(res.status, 503, "spoofed forwarding headers must not bypass missing edge identity");
  res = await worker.fetch(request("/api/profile", { "cf-connecting-ip": "203.0.113.7" }), {});
  assert.equal(res.status, 503, "absent limiter binding must deny API traffic");
  res = await worker.fetch(request("/api/profile", { "cf-connecting-ip": "203.0.113.7" }), {
    ...env, LUQI_API_RATE_LIMITER: limiter(false),
  });
  assert.equal(res.status, 429, "exhausted shared API limiter must reject requests");
  assert.equal(res.headers.get("retry-after"), "60");

  res = await worker.fetch(request("/api/auth/login", { "cf-connecting-ip": "203.0.113.7" }), {
    ...env, LUQI_AUTH_RATE_LIMITER: limiter(false),
  });
  assert.equal(res.status, 429, "authentication should have independent stricter limit");
  assert.equal(calls, 1, "denied requests must not contact upstream");

  res = await worker.fetch(request("/assets/main.js"), {});
  assert.equal(res.status, 200);
  assert.equal(calls, 2, "static pages should bypass API limiter and remain unmodified");

  console.log("Edge guard verification passed (6 assertions/scenarios).");
} finally {
  globalThis.fetch = originalFetch;
}
