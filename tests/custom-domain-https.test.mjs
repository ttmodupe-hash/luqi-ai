import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CUSTOM_ORIGIN, verifyCustomDomain } from "../scripts/verify-custom-domain.mjs";

const revision = "a".repeat(40);
const reply = (body, headers = {}) => new Response(JSON.stringify(body), {
  status: 200, headers: { "Content-Type": "application/json", ...headers },
});
function fixture(change = {}) {
  const calls = [];
  const request = async (url, options) => {
    calls.push({ url, method: options.method, redirect: options.redirect,
      credentials: options.credentials, body: options.body });
    if (!url.startsWith(CUSTOM_ORIGIN + "/")) throw Error("unexpected origin");
    const path = url.slice(CUSTOM_ORIGIN.length);
    if (path === "/v1/health") return change.health ?? reply({ status: "healthy" });
    if (path === "/v1/release") return change.release ??
      reply({ format: "luqi.release.v1", commit: revision }, { "Cache-Control": "no-store" });
    if (path === "/signup" || path === "/login") return change[path] ??
      new Response(null, { status: 302, headers: {
        "Location": path === "/signup" ? "/#/join" : "/#/companion",
        "Cache-Control": "no-store",
      } });
    throw Error("unexpected route");
  };
  return { request, calls };
}

describe("fixed LUQI custom-domain HTTPS checks", () => {
  it("checks only four fixed read-only GET URLs without credentials, queries or provider calls", async () => {
    const f = fixture();
    const result = await verifyCustomDomain(revision, f.request);
    assert.deepEqual(f.calls.map(c => c.url), [
      CUSTOM_ORIGIN + "/v1/health", CUSTOM_ORIGIN + "/v1/release",
      CUSTOM_ORIGIN + "/signup", CUSTOM_ORIGIN + "/login",
    ]);
    assert.deepEqual(f.calls.map(c => c.redirect), ["error", "error", "manual", "manual"]);
    assert.ok(f.calls.every(c => c.method === "GET" && c.credentials === "omit" && c.body === undefined));
    assert.equal(result.matched_commit, revision);
    assert.equal(result.status, "verified");
    for (const name of ["account_registration_executed", "customer_login_executed",
      "support_mail_verified", "launch_approved"]) assert.equal(result[name], false);
  });

  it("rejects a non-revision before issuing any request", async () => {
    const f = fixture();
    await assert.rejects(verifyCustomDomain("short", f.request), /INVALID_EXPECTED_REVISION/);
    assert.equal(f.calls.length, 0);
  });

  it("rejects an old release or unavailable cache assurance", async () => {
    const wrong = fixture({ release: reply({ format: "luqi.release.v1", commit: "b".repeat(40) },
      { "Cache-Control": "no-store" }) });
    await assert.rejects(verifyCustomDomain(revision, wrong.request), /UNVERIFIED_CUSTOM_REVISION/);
    const cached = fixture({ release: reply({ format: "luqi.release.v1", commit: revision }) });
    await assert.rejects(verifyCustomDomain(revision, cached.request), /UNVERIFIED_CUSTOM_REVISION/);
  });

  it("rejects extra release metadata and false health", async () => {
    const extra = fixture({ release: reply({ format: "luqi.release.v1", commit: revision, user: "private" },
      { "Cache-Control": "no-store" }) });
    await assert.rejects(verifyCustomDomain(revision, extra.request), /UNVERIFIED_CUSTOM_REVISION/);
    const degraded = fixture({ health: reply({ status: "degraded" }) });
    await assert.rejects(verifyCustomDomain(revision, degraded.request), /UNVERIFIED_HEALTH/);
  });

  it("rejects redirects to arbitrary hosts or query-bearing destinations", async () => {
    for (const location of ["https://example.invalid/login", "/#/join?token=private", "/#/companion"]) {
      const f = fixture({ "/signup": new Response(null, { status: 302,
        headers: { "Location": location, "Cache-Control": "no-store" } }) });
      await assert.rejects(verifyCustomDomain(revision, f.request), /UNVERIFIED_REDIRECT/);
    }
  });

  it("rejects a success payload larger than 4 KiB and a wrong content type", async () => {
    const large = fixture({ health: reply({ status: "healthy", data: "a".repeat(4100) }) });
    await assert.rejects(verifyCustomDomain(revision, large.request), /UNVERIFIED_BODY/);
    const html = fixture({ health: new Response("<html>SPA fallback</html>", {
      status: 200, headers: { "Content-Type": "text/html" } }) });
    await assert.rejects(verifyCustomDomain(revision, html.request), /UNVERIFIED_HTTPS_JSON/);
  });

  it("fails on DNS/TLS-style transport error instead of inventing a successful response", async () => {
    await assert.rejects(verifyCustomDomain(revision, async () => {
      throw new TypeError("network unreachable");
    }));
  });
});
