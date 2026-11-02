import { describe, expect, it } from "vitest";
import { restCompat } from "../api/rest-compat";

describe("legacy self-healing truthful status", () => {
  const unavailable = async (method: "GET" | "POST", path: string) => {
    const result = await restCompat.request(path, {
      method,
      ...(method === "POST" ? {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewer: "Fake administrator",
          code: "print('hello')",
          bug_report: "pretend to deploy",
        }),
      } : {}),
    });
    expect(result.status).toBe(503);
    expect(result.headers.get("Cache-Control")).toBe("no-store");
    const body = await result.json();
    expect(body).toMatchObject({
      status: "unavailable",
      code: "SELF_HEALING_PIPELINE_NOT_CONFIGURED",
    });
    expect(JSON.stringify(body)).not.toMatch(/DEPLOYED_TO_PROD|approved|pr_url|success":true|sandbox.*PASSED/i);
  };

  it("refuses fabricated job lists in both legacy route prefixes", async () => {
    for (const prefix of ["/api/v1", "/v1"]) {
      await unavailable("GET", `${prefix}/self-healing/pipeline/jobs`);
    }
  });

  it("never pretends to run tests, create PRs or execute generated code", async () => {
    for (const prefix of ["/api/v1", "/v1"]) {
      await unavailable("POST", `${prefix}/self-healing/pipeline/run`);
      await unavailable("POST", `${prefix}/self-healing/pipeline/sandbox-exec`);
    }
    await unavailable("POST", "/api/v1/sensing/dispatch-to-pipeline");
  });

  it("never lets an arbitrary reviewer claim a production deployment", async () => {
    for (const prefix of ["/api/v1", "/v1"]) {
      await unavailable("POST", `${prefix}/self-healing/pipeline/jobs/sh_job_918/authorize`);
      await unavailable("POST", `${prefix}/self-healing/pipeline/jobs/sh_job_918/reject`);
    }
  });
});
