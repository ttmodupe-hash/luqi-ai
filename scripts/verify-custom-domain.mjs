/**
 * Real user-facing HTTPS acceptance. Fixed LUQI hostname and bounded unauthenticated
 * GETs only; no account creation, login POST, paid provider calls or DNS writes.
 * Must not be confused with private-support mailbox or full launch acceptance.
 */
import { pathToFileURL } from "node:url";
import { waitForPublicRevision } from "./verify-deployed-release.mjs";

export const CUSTOM_ORIGIN = "https://app.luqi-ai.com";
const SHA = /^[0-9a-f]{40}$/;

async function boundedBody(response, maxBytes = 4096) {
  if (!response.body) throw Error("UNVERIFIED_BODY");
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > maxBytes) throw Error("UNVERIFIED_BODY");
      chunks.push(Buffer.from(chunk.value));
    }
    return Buffer.concat(chunks).toString("utf8");
  } finally {
    void reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

async function readJson(request, path) {
  const response = await request(CUSTOM_ORIGIN + path, {
    method: "GET", cache: "no-store", credentials: "omit", redirect: "error",
    headers: { "Accept": "application/json", "Cache-Control": "no-cache" },
    signal: AbortSignal.timeout(12_000),
  });
  if (response.status !== 200 || response.redirected ||
      response.headers.get("Content-Type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    throw Error("UNVERIFIED_HTTPS_JSON");
  }
  const raw = await boundedBody(response);
  const result = JSON.parse(raw);
  if (!result || typeof result !== "object" || Array.isArray(result)) throw Error("UNVERIFIED_JSON");
  return { body: result, response };
}

async function readRedirect(request, path, destination) {
  const response = await request(CUSTOM_ORIGIN + path, {
    method: "GET", cache: "no-store", credentials: "omit", redirect: "manual",
    headers: { "Cache-Control": "no-cache" }, signal: AbortSignal.timeout(12_000),
  });
  try {
    if (response.status !== 302 || response.headers.get("Location") !== destination ||
        response.headers.get("Cache-Control") !== "no-store") throw Error("UNVERIFIED_REDIRECT");
  } finally {
    void response.body?.cancel().catch(() => {});
  }
}

export async function verifyCustomDomain(expected, request = fetch) {
  if (typeof expected !== "string" || !SHA.test(expected)) throw Error("INVALID_EXPECTED_REVISION");
  const health = await readJson(request, "/v1/health");
  if (health.body.status !== "healthy") throw Error("UNVERIFIED_HEALTH");
  const release = await readJson(request, "/v1/release");
  const keys = Object.keys(release.body).sort();
  if (release.response.headers.get("Cache-Control") !== "no-store" ||
      keys.join(",") !== "commit,format" || release.body.format !== "luqi.release.v1" ||
      release.body.commit !== expected) throw Error("UNVERIFIED_CUSTOM_REVISION");
  await readRedirect(request, "/signup", "/#/join");
  await readRedirect(request, "/login", "/#/login");
  return { format: "luqi.custom-https.v1", status: "verified", matched_commit: expected,
    signup_redirect_verified: true, login_redirect_verified: true,
    account_registration_executed: false, customer_login_executed: false,
    support_mail_verified: false, launch_approved: false };
}

// A revision superseded before it goes live is not proof of broken HTTPS.
export function domainCheckFailureMessage(stage) {
  if (stage === "preflight") return "FAIL Custom HTTPS check not authorized or revision invalid.";
  if (stage === "deployment") return "UNVERIFIED_DEPLOYMENT: expected release not observed; custom-domain HTTPS was NOT tested.";
  if (stage === "https") return "UNVERIFIED_CUSTOM_HTTPS: release observed but hostname HTTPS/redirect acceptance failed.";
  throw Error("INVALID_CHECK_STAGE");
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let stage = "preflight";
  try {
    if (process.env.LUQI_VERIFY_PUBLIC !== "true") throw Error("NO_PUBLIC_PROBE_APPROVAL");
    const expected = process.env.LUQI_EXPECTED_COMMIT;
    if (!SHA.test(expected || "")) throw Error("INVALID_EXPECTED_REVISION");
    stage = "deployment";
    await waitForPublicRevision(expected, { timeoutMs: 300_000 });
    stage = "https";
    await verifyCustomDomain(expected);
    console.log("PASS Custom LUQI HTTPS health, release identity and safe account entry.");
    console.log("No account created, user authenticated, mailbox checked or payment initiated.");
  } catch {
    // Redact private transport, DNS/TLS and HTTP diagnostics.
    console.error(domainCheckFailureMessage(stage));
    process.exitCode = 1;
  }
}
