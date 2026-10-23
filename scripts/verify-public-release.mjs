/**
 * Read-only probes for LUQI's fixed public Railway origin.
 * No credentials, account creation, AI inference, payment writes or DB access.
 * Run only with LUQI_VERIFY_PUBLIC=true after confirming the intended target.
 */
const origin = "https://web-production-a4b79.up.railway.app";
if (process.env.LUQI_VERIFY_PUBLIC !== "true") {
  console.error("Refusing public probes without LUQI_VERIFY_PUBLIC=true.");
  process.exit(1);
}
async function read(response, limit = 65_536) {
  const chunks = [];
  let bytes = 0;
  if (!response.body) return "";
  const reader = response.body.getReader();
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      bytes += next.value.byteLength;
      if (bytes > limit) throw new Error("Response exceeded the verification bound");
      chunks.push(Buffer.from(next.value));
    }
    return Buffer.concat(chunks).toString("utf8");
  } finally { await reader.cancel().catch(() => {}); }
}
async function get(path, limit) {
  const response = await fetch(origin + path, {
    method: "GET", cache: "no-store", credentials: "omit", redirect: "error",
    headers: { "Cache-Control": "no-cache" }, signal: AbortSignal.timeout(15_000),
  });
  return { status: response.status, cache: response.headers.get("Cache-Control"), text: await read(response, limit) };
}
function verify(ok) {
  if (!ok) throw new Error("Unexpected production response");
}
const checks = [
  { name: "HTTP health", path: "/health", status: 200,
    accept: body => body.status === "healthy" },
  { name: "MySQL connected and AI disabled", path: "/v1/readiness", status: 503,
    accept: body => body.checks?.persistence === "connected" && body.checks?.ai_pilot === "disabled" },
  ...[
    "/api/v1/companion/conversations", "/api/v1/companion/conversations/1/export",
    "/api/v1/omega/tasks", "/api/v1/omega/tasks/status",
  ].map(path => ({ name: "Anonymous account boundary " + path, path, status: 401, code: "AUTH_REQUIRED", private: true })),
  ...[
    ["/api/v1/billing/balance", "LEGACY_PAYMENTS_DISABLED"],
    ["/admin/billing-ledger", "LEGACY_PAYMENTS_DISABLED"],
    ["/api/v25/payments/balance", "LEGACY_PAYMENTS_DISABLED"],
    ["/api/v1/zta/status", "LEGACY_APPROVALS_UNAVAILABLE"],
    ["/api/v1/jobs/denial-probe", "LEGACY_JOBS_UNAVAILABLE"],
    ["/api/ussd", "USSD_INTEGRATION_UNAVAILABLE"],
  ].map(([path, code]) => ({ name: "Retired surface " + path, path, status: 503, code, private: true })),
  ...[
    ["/api/trpc/ping", 200, '"ok":true'],
    ["/api/trpc/archive.listThreads", 503, "TRPC_PROCEDURE_UNAVAILABLE"],
    ["/api/trpc/search.web", 503, "TRPC_PROCEDURE_UNAVAILABLE"],
    ["/api/trpc/offline.getPending", 401, "AUTH_REQUIRED"],
    ["/api/trpc/ping%2Carchive%2ElistThreads?batch=1", 207, "TRPC_PROCEDURE_UNAVAILABLE"],
  ].map(([path, status, contains]) => ({ name: "tRPC boundary " + path, path, status, contains, private: true })),
];
let failures = 0;
async function run(name, operation) {
  try {
    await operation();
    console.log("PASS " + name);
  } catch {
    failures++;
    // Never echo response bodies, driver messages, private identifiers or URLs
    // from a failed response. These probes need only status/contract evidence.
    console.error("FAIL " + name + " (response or transport did not satisfy the check)");
  }
}
// At most three concurrent reads; no retries and no writable API operations.
for (let start = 0; start < checks.length; start += 3) {
  await Promise.all(checks.slice(start, start + 3).map(check => run(check.name, async () => {
    const result = await get(check.path);
    verify(result.status === check.status);
    if (check.private) verify(result.cache === "no-store");
    if (check.code) verify(JSON.parse(result.text).code === check.code);
    if (check.accept) verify(check.accept(JSON.parse(result.text)));
    if (check.contains) verify(result.text.includes(check.contains));
  })));
}
await run("Published Omega and companion frontend", async () => {
  const home = await get("/", 131_072);
  verify(home.status === 200);
  const match = home.text.match(/<script[^>]*src="(\/assets\/index-[A-Za-z0-9_-]+\.js)"/);
  verify(match !== null);
  const bundle = await get(match[1], 8_388_608);
  verify(bundle.status === 200 && bundle.text.includes("Review before queuing") &&
    bundle.text.includes("Retry same submission") && bundle.text.includes("Export selected conversation"));
  console.log("Verified public bundle " + match[1]);
});
await run("Service worker excludes readiness paths from caching", async () => {
  const worker = await get("/service-worker.js", 131_072);
  verify(worker.status === 200 && worker.text.includes("url.pathname.startsWith('/v1/')"));
});
if (failures) {
  console.error("Public release verification failed: " + failures + " check(s). No raw response bodies were logged.");
  process.exitCode = 1;
} else {
  console.log("Public release verification passed. All requests were unauthenticated GETs; no data or provider activation changed.");
}
